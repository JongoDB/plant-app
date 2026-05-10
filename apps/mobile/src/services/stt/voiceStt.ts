import Voice, {
  type SpeechErrorEvent,
  type SpeechResultsEvent,
} from '@react-native-voice/voice';

/**
 * Push-to-talk STT wrapper around @react-native-voice/voice.
 *
 * The shared SpeechToTextEngine interface is batch-only today
 * (transcribe(audio) -> result). For push-to-talk we want a streaming
 * session with onPartial / onFinal hooks, which doesn't fit that
 * contract cleanly. Keeping the streaming API local to mobile until it's
 * worth promoting into the shared package.
 *
 * iOS uses SFSpeechRecognizer (offline on iOS 13+ when available;
 * otherwise routes through Apple's servers). Android uses SpeechRecognizer
 * which on most devices uses Google services. We document this in the
 * privacy copy — fully offline STT is the upgrade to whisper.rn later.
 */

export interface SttListener {
  onPartial?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (err: Error) => void;
}

export interface SttSession {
  stop: () => Promise<void>;
}

export async function startListening(
  listener: SttListener,
  opts?: { locale?: string },
): Promise<SttSession> {
  const detach = (): void => {
    Voice.removeAllListeners();
  };

  Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
    const text = e.value?.[0];
    if (text) listener.onPartial?.(text);
  };
  Voice.onSpeechResults = (e: SpeechResultsEvent) => {
    const text = e.value?.[0];
    if (text) listener.onFinal?.(text);
  };
  Voice.onSpeechError = (e: SpeechErrorEvent) => {
    const message = e.error?.message ?? 'Speech recognition error.';
    listener.onError?.(new Error(message));
  };

  await Voice.start(opts?.locale ?? 'en-US');

  return {
    async stop() {
      try {
        await Voice.stop();
      } catch {
        // best-effort
      }
      detach();
    },
  };
}

export async function isVoiceAvailable(): Promise<boolean> {
  try {
    return Boolean(await Voice.isAvailable());
  } catch {
    return false;
  }
}
