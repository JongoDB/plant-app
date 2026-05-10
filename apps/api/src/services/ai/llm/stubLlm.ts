// Slice 3 replaces this with AnthropicLlmProvider that streams Claude responses.
import type { LlmProvider, LlmStreamEvent, LlmStreamRequest } from '@plant-app/shared';

export class StubLlmProvider implements LlmProvider {
  streamMessage(_req: LlmStreamRequest): AsyncIterable<LlmStreamEvent> {
    throw new Error('LlmProvider not wired yet — see Slice 3 for the Anthropic implementation.');
  }
}
