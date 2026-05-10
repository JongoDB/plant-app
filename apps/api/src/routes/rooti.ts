import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import {
  ROOTI_SYSTEM_PROMPT,
  ROOTI_TOOL_DEFINITIONS,
  type RootiContentBlock,
  type RootiToolContext,
  type RootiToolName,
} from '@plant-app/shared';

import { getSession } from '../auth/requireSession.js';
import { getDb } from '../db/client.js';
import { photos, plants, rootiConversations, rootiMessages } from '../db/schema.js';
import { buildRootiToolHandlers } from '../rooti/handlers.js';
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
 * Body: { conversationId?, anchorPlantId?, text, photoIds? }
 *
 * The endpoint:
 *  1. Resolves (or creates) the conversation for the signed-in user.
 *  2. Loads context (anchor plant + recent care + recent plants).
 *  3. Validates and attaches any photoIds (verifying ownership).
 *  4. Appends the user's message — image blocks first, then context, then text.
 *  5. Streams Claude's reply, running tools server-side and feeding
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
  // 4 was the casual-chat ceiling; bumped to 12 so a "walkthrough" can
  // attach a photo per plant in one turn without splitting the request.
  photoIds: z.array(z.uuid()).max(12).optional(),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
});

export async function rootiRoutes(
  app: FastifyInstance,
  opts: { services: Services },
): Promise<void> {
  const toolHandlers = buildRootiToolHandlers(opts.services);

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
    // reply.hijack() bypasses Fastify's CORS middleware, so for cross-origin
    // browser callers (e.g. web bundle on :19006 calling API on :3000) we
    // have to set the CORS headers ourselves — otherwise the browser blocks
    // the response before any events are read.
    reply.hijack();
    const raw = reply.raw;
    const origin = request.headers.origin;
    const corsHeaders: Record<string, string> = origin
      ? {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
          Vary: 'Origin',
        }
      : {};
    raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      ...corsHeaders,
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

      // Resolve any attached photos: verify ownership and pull the storage
      // key + mime type so we can persist them as image content blocks.
      // Storing only the key (not the bytes) means re-loads on each turn
      // pull from disk fresh — Anthropic's prompt cache absorbs that.
      const attachedImages: Array<{ storageKey: string; mimeType: string }> = [];
      if (input.photoIds && input.photoIds.length > 0) {
        const db = getDb();
        const rows = await db
          .select({ id: photos.id, storageKey: photos.storageKey })
          .from(photos)
          .where(and(inArray(photos.id, input.photoIds), eq(photos.userId, userId)));
        const byId = new Map(rows.map((r) => [r.id, r]));
        for (const id of input.photoIds) {
          const row = byId.get(id);
          if (!row) {
            send('error', { message: `Photo ${id} is not in your collection.` });
            send('done', {});
            raw.end();
            return;
          }
          const ext = row.storageKey.split('.').pop()?.toLowerCase() ?? '';
          const mimeType =
            ext === 'png'
              ? 'image/png'
              : ext === 'webp'
                ? 'image/webp'
                : 'image/jpeg';
          attachedImages.push({ storageKey: row.storageKey, mimeType });
        }
      }

      // Build the user message: image blocks first (good for Claude's
      // attention), then context, then text. Per-turn context is
      // regenerated each call and stored once on this turn — so the wire
      // prefix accumulates context for every turn the user has had.
      const ctx = await loadRootiContext({
        userId,
        anchorPlantId: input.anchorPlantId,
        ...(input.location ? { location: input.location, weather: opts.services.weather } : {}),
      });
      const userContent: RootiContentBlock[] = [];
      for (const img of attachedImages) {
        userContent.push({
          type: 'image',
          storageKey: img.storageKey,
          mimeType: img.mimeType,
        });
      }
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
      const storage = opts.services.storage;
      const tools = ROOTI_TOOL_DEFINITIONS;

      // Tool-use loop. Each iteration is one Claude turn; if Claude asks
      // for tools, we run them and loop again.
      const MAX_TURNS = 6;
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        if (aborted) break;
        const messages = await toLlmMessages(await loadMessages(conversationId), storage);
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
          const handler = toolHandlers[tu.name as RootiToolName] as
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

  // ---- GET /rooti/conversations -----------------------------------------
  // List the user's chats, newest activity first. The first user-text block
  // serves as a preview "title" — anchored chats also surface the plant
  // nickname so they're easy to skim.
  app.get('/rooti/conversations', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.status(401).send({ error: 'unauthorized' });

    const db = getDb();
    const convoRows = await db
      .select({
        id: rootiConversations.id,
        anchorPlantId: rootiConversations.anchorPlantId,
        anchorPlantNickname: plants.nickname,
        createdAt: rootiConversations.createdAt,
        updatedAt: rootiConversations.updatedAt,
      })
      .from(rootiConversations)
      .leftJoin(plants, eq(plants.id, rootiConversations.anchorPlantId))
      .where(eq(rootiConversations.userId, session.user.id))
      .orderBy(desc(rootiConversations.updatedAt))
      .limit(50);

    if (convoRows.length === 0) return [];

    const ids = convoRows.map((r) => r.id);
    const allMessages = await db
      .select({
        conversationId: rootiMessages.conversationId,
        role: rootiMessages.role,
        content: rootiMessages.content,
        createdAt: rootiMessages.createdAt,
      })
      .from(rootiMessages)
      .where(inArray(rootiMessages.conversationId, ids))
      .orderBy(asc(rootiMessages.createdAt));

    const byConv = new Map<string, typeof allMessages>();
    for (const m of allMessages) {
      const arr = byConv.get(m.conversationId) ?? [];
      arr.push(m);
      byConv.set(m.conversationId, arr);
    }

    return convoRows.map((c) => {
      const msgs = byConv.get(c.id) ?? [];
      const firstUser = msgs.find((m) => m.role === 'user');
      const userBlocks = (firstUser?.content as RootiContentBlock[] | undefined) ?? [];
      // The persistence layer prepends a "<context>…" text block to every
      // first turn before the user's actual text. Skip that one and take the
      // last text block, which is the user's real message.
      const textBlocks = userBlocks.filter(
        (b): b is { type: 'text'; text: string } => b.type === 'text',
      );
      const lastUserText = textBlocks[textBlocks.length - 1]?.text?.trim();
      const preview =
        lastUserText && !lastUserText.startsWith('<context>') ? lastUserText : undefined;
      const lastMessageAt =
        msgs[msgs.length - 1]?.createdAt.toISOString() ?? c.updatedAt.toISOString();
      return {
        id: c.id,
        anchorPlantId: c.anchorPlantId ?? undefined,
        anchorPlantNickname: c.anchorPlantNickname ?? undefined,
        preview: preview ? truncate(preview, 80) : undefined,
        messageCount: msgs.length,
        createdAt: c.createdAt.toISOString(),
        lastMessageAt,
      };
    });
  });

  // ---- GET /rooti/conversations/:id -------------------------------------
  // Returns the message list for a single chat so the UI can rehydrate.
  app.get('/rooti/conversations/:id', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.status(401).send({ error: 'unauthorized' });

    const params = z.object({ id: z.uuid() }).safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_id' });

    const db = getDb();
    const owner = await db
      .select({ id: rootiConversations.id })
      .from(rootiConversations)
      .where(
        and(
          eq(rootiConversations.id, params.data.id),
          eq(rootiConversations.userId, session.user.id),
        ),
      )
      .limit(1);
    if (owner.length === 0) return reply.status(404).send({ error: 'not_found' });

    const messages = await loadMessages(params.data.id);
    return { id: params.data.id, messages };
  });

  // ---- DELETE /rooti/conversations/:id ----------------------------------
  app.delete('/rooti/conversations/:id', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.status(401).send({ error: 'unauthorized' });

    const params = z.object({ id: z.uuid() }).safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_id' });

    const db = getDb();
    // Cascade messages first — schema doesn't declare an FK with onDelete
    // since rootiMessages.conversationId is a plain uuid column, so we have
    // to clear them ourselves.
    await db
      .delete(rootiMessages)
      .where(eq(rootiMessages.conversationId, params.data.id));
    const removed = await db
      .delete(rootiConversations)
      .where(
        and(
          eq(rootiConversations.id, params.data.id),
          eq(rootiConversations.userId, session.user.id),
        ),
      )
      .returning({ id: rootiConversations.id });
    if (removed.length === 0) return reply.status(404).send({ error: 'not_found' });
    return reply.status(204).send();
  });
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
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

