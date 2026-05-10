import type { TextToSpeechEngine, TtsSpeakRequest } from '@plant-app/shared';

/**
 * Web TTS via the browser's SpeechSynthesis API. Skips expo-speech (which
 * exists on web but has had patchy availability across SDK versions) and
 * goes straight to the platform.
 *
 * Behavior matches the native engine:
 *  - speak() resolves on end (or stop / error — we never reject so the UI
 *    doesn't blow up on engines that don't fire 'end' reliably).
 *  - calling speak() while speaking pre-empts the current utterance.
 *  - isSpeaking() reflects our own flag for sync access; the browser API
 *    has speechSynthesis.speaking but reading it can race.
 */
class WebSpeechEngine implements TextToSpeechEngine {
  private speakingFlag = false;

  async speak(req: TtsSpeakRequest): Promise<void> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      // No platform support — succeed silently rather than throw.
      return;
    }
    if (this.speakingFlag) {
      window.speechSynthesis.cancel();
    }
    this.speakingFlag = true;
    return new Promise<void>((resolve) => {
      const utter = new SpeechSynthesisUtterance(req.text);
      if (req.rate != null) utter.rate = req.rate;
      if (req.pitch != null) utter.pitch = req.pitch;
      if (req.locale) utter.lang = req.locale;
      const finish = () => {
        this.speakingFlag = false;
        resolve();
      };
      utter.onend = finish;
      utter.onerror = finish;
      window.speechSynthesis.speak(utter);
    });
  }

  async stop(): Promise<void> {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.speakingFlag = false;
  }

  isSpeaking(): boolean {
    return this.speakingFlag;
  }
}

export const tts: TextToSpeechEngine = new WebSpeechEngine();
