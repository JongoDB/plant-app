/**
 * Web stub for the voice STT module. The native impl uses
 * @react-native-voice/voice which has no web equivalent. Metro picks
 * this file when bundling for web; the native sibling (voiceStt.ts) is
 * picked for iOS/Android.
 *
 * We could plug in the Web Speech API later — same shape — but for now
 * the mic button gracefully reports "not available" on web.
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
  _opts?: { locale?: string },
): Promise<SttSession> {
  listener.onError?.(new Error('Voice input is not available on the web build.'));
  return { async stop() {} };
}

export async function isVoiceAvailable(): Promise<boolean> {
  return false;
}
