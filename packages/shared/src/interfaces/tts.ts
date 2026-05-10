/**
 * Text-to-speech engine. MVP impl is `expo-speech` on the phone
 * (AVSpeechSynthesizer / Android TextToSpeech). Upgrade path is Piper TTS
 * via `onnxruntime-react-native`, or Piper running on the MacBook AI worker.
 *
 * For voice mode, the API server streams text deltas to the mobile app, which
 * accumulates them into sentences and feeds each sentence to `speak()` as it
 * completes. That sentence-buffering happens in the mobile app, not here.
 */

export interface TtsSpeakRequest {
  text: string;
  /** Engine-defined voice ID, if the impl supports voice selection. */
  voice?: string;
  /** Speaking rate; 1.0 = default. */
  rate?: number;
  /** Pitch; 1.0 = default. */
  pitch?: number;
  locale?: string;
}

export interface TextToSpeechEngine {
  /** Resolves when speech finishes (or is interrupted). */
  speak(req: TtsSpeakRequest): Promise<void>;
  /** Cancels any in-flight speech immediately. */
  stop(): Promise<void>;
  /** True while speaking. */
  isSpeaking(): boolean;
}
