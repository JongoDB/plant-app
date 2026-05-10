import * as Speech from 'expo-speech';
import type { TextToSpeechEngine, TtsSpeakRequest } from '@plant-app/shared';

/**
 * Phone-native TTS via expo-speech (AVSpeechSynthesizer on iOS, Android
 * TextToSpeech on Android). Free, instant, decent quality.
 *
 * For higher-quality voices we'd swap in Piper TTS via
 * onnxruntime-react-native — same TextToSpeechEngine contract,
 * one-class change in the consumer.
 */
class ExpoSpeechEngine implements TextToSpeechEngine {
  private speakingFlag = false;

  async speak(req: TtsSpeakRequest): Promise<void> {
    // Stop anything currently speaking — overlapping TTS is never what you want.
    if (this.speakingFlag) {
      Speech.stop();
    }
    this.speakingFlag = true;

    return new Promise<void>((resolve, reject) => {
      Speech.speak(req.text, {
        ...(req.voice ? { voice: req.voice } : {}),
        ...(req.rate != null ? { rate: req.rate } : {}),
        ...(req.pitch != null ? { pitch: req.pitch } : {}),
        ...(req.locale ? { language: req.locale } : {}),
        onDone: () => {
          this.speakingFlag = false;
          resolve();
        },
        onStopped: () => {
          this.speakingFlag = false;
          resolve();
        },
        onError: (err) => {
          this.speakingFlag = false;
          reject(err);
        },
      });
    });
  }

  async stop(): Promise<void> {
    Speech.stop();
    this.speakingFlag = false;
  }

  isSpeaking(): boolean {
    return this.speakingFlag;
  }
}

export const tts: TextToSpeechEngine = new ExpoSpeechEngine();
