import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  ROOTI_SYSTEM_PROMPT,
  ROOTI_TOOL_DEFINITIONS,
  type RootiContentBlock,
  type RootiToolContext,
  type RootiToolName,
} from '@plant-app/shared';

import { getSession } from '../auth/requireSession.js';
import { rootiToolHandlers } from '../rooti/handlers.js';
import { loadRootiContext } from '../rooti/context.js';
import {
  appendMessage,
  findOrCreateConversation,
  loadMessages,
  toLlmMessages,
} from '../rooti/persistence.js';
import type { Services } from '../services/index.js';

/**
 * POST /rooti/messages — Server-Sent Events stream of one Rooti turn.
 *
 * Body: { conversationId?, anchorPlantId?, text }
 *
 * The endpoint:
 *  1. Resolves (or creates) the conversation for the signed-in user.
 *  2. Loads context (anchor plant + recent care + recent plants).
 *  3. Appends the user's message.
 *  4. Streams Claude's reply, running tools server-side and feeding
 *     results back until Claude stops calling tools.
 *
 * SSE events emitted (one JSON payload per event):
 *  - conversation     { id }
 *  - text_delta       { text }
 *  - tool_use_start   { id, name }
 *  - tool_use_input   { id, partialJson }
 *  - tool_result      { id, output }
 *  - tool_error       { id, message }
 *  - done             {}
 *  - error            { message }
 */

const bodySchema = z.object({
  conversationId: z.uuid().optional(),
  anchorPlantId: z.uuid().optional(),
  text: z.string().trim().min(1).max(8000),
});

export async function rootiRoutes(
  app: FastifyInstance,
  opts: { services: Services },
): Promise<void> {
  app.post('/rooti/messages', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.status(401).send({ error: 'unauthorized' });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'validation_failed',
        issues: parsed.error.issues,
      });
    }
    const input = parsed.data;
    const userId = session.user.id;

    // SSE plumbing: take over the raw response, write events manually.
    reply.hijack();
    const raw = reply.raw;
    raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const send = (event: string, data: unknown): void => {
      raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    let aborted = false;
    request.raw.on('close', () => {
      aborted = true;
    });

    try {
      const { id: conversationId } = await findOrCreateConversation({
        userId,
        conversationId: input.conversationId,
        anchorPlantId: input.anchorPlantId,
      });
      send('conversation', { id: conversationId });

      // Append the user's text. Per-turn context is regenerated each call
      // and prepended to the user's text as a system note inside the user
      // turn, so it's present in the on-the-wire prefix exactly once.
      const ctx = await loadRootiContext({ userId, anchorPlantId: input.anchorPlantId });
      const userContent: RootiContentBlock[] = [];
      if (ctx.text) {
        userContent.push({
          type: 'text',
          text: `<context>\n${ctx.text}\n</context>`,
        });
      }
      userContent.push({ type: 'text', text: input.text });
      await appendMessage({
        conversationId,
        role: 'user',
        content: userContent,
      });

      const llm = opts.services.llm;
      const tools = ROOTI_TOOL_DEFINITIONS;

      // Tool-use loop. Each iteration is one Claude turn; if Claude asks
      // for tools, we run them and loop again.
      const MAX_TURNS = 6;
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        if (aborted) break;
        const messages = toLlmMessages(await loadMessages(conversationId));
        const accumText: string[] = [];
        const toolUses = new Map<string, { id: string; name: string; inputJson: string }>();
        let stopReason: string | undefined;
        let llmError: string | undefined;

        for await (const event of llm.streamMessage({
          messages,
          system: ROOTI_SYSTEM_PROMPT,
          tools,
        })) {
          if (aborted) break;
          switch (event.type) {
            case 'text_delta':
              accumText.push(event.text);
              send('text_delta', { text: event.text });
              break;
            case 'tool_use_start':
              toolUses.set(event.id, { id: event.id, name: event.name, inputJson: '' });
              send('tool_use_start', { id: event.id, name: event.name });
              break;
            case 'tool_use_input_delta': {
              const tu = toolUses.get(event.id);
              if (tu) tu.inputJson += event.partialJson;
              send('tool_use_input', { id: event.id, partialJson: event.partialJson });
              break;
            }
            case 'tool_use_end':
              // No SSE event needed; the next tool_result/tool_error closes it.
              break;
            case 'message_stop':
              stopReason = event.stopReason;
              break;
            case 'error':
              llmError = event.message;
              break;
          }
        }

        if (llmError) {
          send('error', { message: llmError });
          break;
        }

        // Persist the assistant turn we just streamed.
        const assistantContent: RootiContentBlock[] = [];
        const joinedText = accumText.join('');
        if (joinedText) assistantContent.push({ type: 'text', text: joinedText });
        for (const tu of toolUses.values()) {
          const input = parseToolInput(tu.inputJson);
          assistantContent.push({
            type: 'tool_use',
            toolUseId: tu.id,
            toolName: tu.name,
            input,
          });
        }
        if (assistantContent.length > 0) {
          await appendMessage({
            conversationId,
            role: 'assistant',
            content: assistantContent,
          });
        }

        if (stopReason !== 'tool_use') break;

        // Run the tools and append their results as a tool-role message.
        // The dynamic dispatch by tu.name means TS can't pick a single
        // handler signature, so we narrow to a permissive call shape and
        // trust the JSON-Schema validation Claude already did on the input.
        const toolResults: RootiContentBlock[] = [];
        const handlerCtx: RootiToolContext = {
          userId,
          conversationId,
          ...(input.anchorPlantId ? { anchorPlantId: input.anchorPlantId } : {}),
        };
        for (const tu of toolUses.values()) {
          const handler = rootiToolHandlers[tu.name as RootiToolName] as
            | ((input: unknown, ctx: RootiToolContext) => Promise<unknown>)
            | undefined;
          if (!handler) {
            const message = `Unknown tool: ${tu.name}`;
            toolResults.push({
              type: 'tool_result',
              toolUseId: tu.id,
              output: message,
              isError: true,
            });
            send('tool_error', { id: tu.id, message });
            continue;
          }
          try {
            const toolInput = parseToolInput(tu.inputJson);
            const output = await handler(toolInput, handlerCtx);
            toolResults.push({
              type: 'tool_result',
              toolUseId: tu.id,
              output,
            });
            send('tool_result', { id: tu.id, output });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            toolResults.push({
              type: 'tool_result',
              toolUseId: tu.id,
              output: message,
              isError: true,
            });
            send('tool_error', { id: tu.id, message });
          }
        }
        if (toolResults.length > 0) {
          await appendMessage({
            conversationId,
            role: 'tool',
            content: toolResults,
          });
        }
      }

      send('done', {});
      raw.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      request.log.error({ err }, 'rooti stream failed');
      try {
        send('error', { message });
        raw.end();
      } catch {
        // already closed
      }
    }
  });
}

function parseToolInput(json: string): Record<string, unknown> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

