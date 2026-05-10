/**
 * Speech-to-text engine. Three implementation tiers are anticipated:
 *  - phone-native: SFSpeechRecognizer (iOS) / SpeechRecognizer (Android), in-app on the phone.
 *  - local-server: whisper.cpp running natively on the MacBook AI worker.
 *  - cloud: not currently planned (privacy-first).
 *
 * MVP scope is batch transcription (push-to-talk: record then transcribe).
 * Streaming will be added in a later slice for continuous voice mode.
 */

export interface SttRequest {
  /** Raw audio bytes. */
  audio: Uint8Array;
  /** MIME type, e.g. "audio/m4a", "audio/wav". */
  mimeType: string;
  /** BCP-47 locale, e.g. "en-US". Defaults to "en-US". */
  locale?: string;
}

export interface SttResult {
  transcript: string;
  /** 0..1 if the engine reports confidence; undefined otherwise. */
  confidence?: number;
  /** Word-level timestamps if the engine produces them. */
  words?: Array<{ text: string; startMs: number; endMs: number }>;
}

export interface SpeechToTextEngine {
  transcribe(req: SttRequest): Promise<SttResult>;
}
