// Slice 8 replaces this with phone-native STT (the call lives on the mobile side
// for the phone-native tier; this stub exists for the optional server-side tier
// that proxies to the MacBook AI worker).
import type { SpeechToTextEngine, SttRequest, SttResult } from '@plant-app/shared';

export class StubSpeechToTextEngine implements SpeechToTextEngine {
  async transcribe(_req: SttRequest): Promise<SttResult> {
    throw new Error('SpeechToTextEngine not wired yet — see Slice 8.');
  }
}
