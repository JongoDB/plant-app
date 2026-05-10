// Slice 7 replaces this with phone-native TTS (also lives on the mobile side
// for the phone-native tier). This stub stays for any future server-side TTS.
import type { TextToSpeechEngine, TtsSpeakRequest } from '@plant-app/shared';

export class StubTextToSpeechEngine implements TextToSpeechEngine {
  private speaking = false;
  async speak(_req: TtsSpeakRequest): Promise<void> {
    throw new Error('TextToSpeechEngine not wired yet — see Slice 7.');
  }
  async stop(): Promise<void> {
    this.speaking = false;
  }
  isSpeaking(): boolean {
    return this.speaking;
  }
}
