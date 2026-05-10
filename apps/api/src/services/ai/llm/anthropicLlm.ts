import Anthropic from '@anthropic-ai/sdk';
import type {
  MessageParam,
  ContentBlockParam,
  TextBlockParam,
  ImageBlockParam,
  Base64ImageSource,
  ToolUseBlockParam,
  ToolResultBlockParam,
  Tool,
} from '@anthropic-ai/sdk/resources/messages';
import type {
  LlmContentBlock,
  LlmMessage,
  LlmProvider,
  LlmStreamEvent,
  LlmStreamRequest,
  LlmToolDefinition,
} from '@plant-app/shared';

/**
 * Anthropic implementation of LlmProvider.
 *
 * Authentication: prefer authToken (OAuth from `claude setup-token`,
 * Pro/Max subscription) over apiKey (billed key). The SDK sends
 * `Authorization: Bearer <token>` for authToken and `x-api-key: <key>` for
 * apiKey — they're mutually exclusive on the wire.
 *
 * Caching strategy:
 *  - The last system block carries an explicit `cache_control: ephemeral`
 *    so the system prompt + tool list are cached together.
 *  - We also pass top-level `cache_control: ephemeral` on the request so the
 *    SDK auto-places a second breakpoint on the last user-turn block, which
 *    grows the cached prefix turn by turn.
 *  - Ceiling is 4 cache breakpoints; we use 2.
 *
 * One-turn semantics: streamMessage performs a single Claude turn. Tool-use
 * loops live one layer up, in the Rooti service that owns the conversation.
 */

export interface AnthropicLlmOptions {
  /** OAuth token from `claude setup-token`. Preferred. */
  authToken?: string;
  /** Billed API key. Used if authToken is absent. */
  apiKey?: string;
  /** Default model to use when LlmStreamRequest doesn't override. */
  defaultModel: string;
}

export class AnthropicLlmProvider implements LlmProvider {
  private readonly client: Anthropic;
  private readonly defaultModel: string;

  constructor(opts: AnthropicLlmOptions) {
    if (!opts.authToken && !opts.apiKey) {
      throw new Error(
        'AnthropicLlmProvider requires ANTHROPIC_AUTH_TOKEN or ANTHROPIC_API_KEY.',
      );
    }
    this.client = new Anthropic(
      opts.authToken ? { authToken: opts.authToken } : { apiKey: opts.apiKey },
    );
    this.defaultModel = opts.defaultModel;
  }

  async *streamMessage(req: LlmStreamRequest): AsyncIterable<LlmStreamEvent> {
    const messages = req.messages.map(toAnthropicMessage);
    const tools = req.tools?.map(toAnthropicTool);

    const systemBlocks: TextBlockParam[] | undefined = req.system
      ? [
          {
            type: 'text',
            text: req.system,
            cache_control: { type: 'ephemeral' },
          },
        ]
      : undefined;

    let stream;
    try {
      stream = this.client.messages.stream({
        model: req.model ?? this.defaultModel,
        max_tokens: req.maxTokens ?? 4096,
        messages,
        ...(systemBlocks ? { system: systemBlocks } : {}),
        ...(tools ? { tools } : {}),
        // Auto-cache the last cacheable block (final user turn) — grows the
        // cached prefix turn by turn without us having to track positions.
        cache_control: { type: 'ephemeral' },
      });
    } catch (err) {
      yield { type: 'error', message: errorMessage(err) };
      return;
    }

    // Tracks the active content block by index, so input_json_delta deltas
    // can be tagged with the right tool_use id.
    const activeToolBlocks = new Map<number, { id: string; name: string }>();

    try {
      for await (const event of stream) {
        switch (event.type) {
          case 'content_block_start': {
            if (event.content_block.type === 'tool_use') {
              activeToolBlocks.set(event.index, {
                id: event.content_block.id,
                name: event.content_block.name,
              });
              yield {
                type: 'tool_use_start',
                id: event.content_block.id,
                name: event.content_block.name,
              };
            }
            break;
          }
          case 'content_block_delta': {
            if (event.delta.type === 'text_delta') {
              yield { type: 'text_delta', text: event.delta.text };
            } else if (event.delta.type === 'input_json_delta') {
              const block = activeToolBlocks.get(event.index);
              if (block) {
                yield {
                  type: 'tool_use_input_delta',
                  id: block.id,
                  partialJson: event.delta.partial_json,
                };
              }
            }
            // Ignore thinking_delta etc. — not used in Slice 3.
            break;
          }
          case 'content_block_stop': {
            const block = activeToolBlocks.get(event.index);
            if (block) {
              yield { type: 'tool_use_end', id: block.id };
              activeToolBlocks.delete(event.index);
            }
            break;
          }
          case 'message_delta': {
            const stopReason = event.delta.stop_reason;
            if (stopReason && isLlmStopReason(stopReason)) {
              yield { type: 'message_stop', stopReason };
            }
            break;
          }
        }
      }
    } catch (err) {
      yield { type: 'error', message: errorMessage(err) };
    }
  }
}

// ---------------------------------------------------------------------------
// Translators between shared LlmMessage and Anthropic MessageParam shapes.
// ---------------------------------------------------------------------------

function toAnthropicMessage(msg: LlmMessage): MessageParam {
  return {
    role: msg.role,
    content: msg.content.map(toAnthropicContent),
  };
}

function toAnthropicContent(block: LlmContentBlock): ContentBlockParam {
  switch (block.type) {
    case 'text':
      return { type: 'text', text: block.text } satisfies TextBlockParam;
    case 'image':
      return {
        type: 'image',
        source: {
          type: 'base64',
          media_type: block.mediaType as Base64ImageSource['media_type'],
          data: block.base64Data,
        },
      } satisfies ImageBlockParam;
    case 'tool_use':
      return {
        type: 'tool_use',
        id: block.id,
        name: block.name,
        input: block.input as ToolUseBlockParam['input'],
      } satisfies ToolUseBlockParam;
    case 'tool_result':
      return {
        type: 'tool_result',
        tool_use_id: block.toolUseId,
        content: block.content,
        ...(block.isError ? { is_error: true } : {}),
      } satisfies ToolResultBlockParam;
  }
}

function toAnthropicTool(tool: LlmToolDefinition): Tool {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema as Tool['input_schema'],
  };
}

function isLlmStopReason(
  reason: string,
): reason is 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence' {
  return (
    reason === 'end_turn' ||
    reason === 'tool_use' ||
    reason === 'max_tokens' ||
    reason === 'stop_sequence'
  );
}

function errorMessage(err: unknown): string {
  if (err instanceof Anthropic.APIError) {
    return `${err.status ?? ''} ${err.message}`.trim();
  }
  if (err instanceof Error) return err.message;
  return String(err);
}
