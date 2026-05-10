/**
 * Cloud LLM provider interface. Production impl is Claude via the Anthropic SDK,
 * called from the API server (never from the mobile bundle).
 *
 * Streaming is mandatory — perceived latency depends on it.
 */

export type LlmRole = 'user' | 'assistant';

export type LlmContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; mediaType: string; base64Data: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; toolUseId: string; content: string; isError?: boolean };

export interface LlmMessage {
  role: LlmRole;
  content: LlmContentBlock[];
}

export interface LlmToolDefinition {
  name: string;
  description: string;
  /** JSON Schema describing the tool's input. */
  inputSchema: Record<string, unknown>;
}

export interface LlmStreamRequest {
  messages: LlmMessage[];
  system?: string;
  tools?: LlmToolDefinition[];
  /** Optional model override; provider has a sensible default. */
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Events emitted while streaming a response. The shape is normalised across
 * providers — implementations translate from their wire format.
 */
export type LlmStreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_use_start'; id: string; name: string }
  | { type: 'tool_use_input_delta'; id: string; partialJson: string }
  | { type: 'tool_use_end'; id: string }
  | { type: 'message_stop'; stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence' }
  | { type: 'error'; message: string };

export interface LlmProvider {
  /**
   * Stream a response. Yields events as the provider produces them.
   * Caller is responsible for consuming the stream and assembling state.
   */
  streamMessage(req: LlmStreamRequest): AsyncIterable<LlmStreamEvent>;
}
