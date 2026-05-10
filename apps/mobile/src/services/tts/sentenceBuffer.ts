/**
 * Sentence-aware text buffer for streaming TTS.
 *
 * As Claude streams text deltas back, accumulate them and flush each
 * complete sentence as soon as one arrives. This is the single biggest
 * factor in making voice mode feel responsive — Rooti starts speaking
 * within a beat of the first sentence finishing rather than waiting
 * for the whole message.
 *
 * "Sentence" here is `[.!?]` followed by whitespace or end-of-buffer.
 * We don't try to handle Mr./Dr./decimal-point edge cases — for plant
 * advice the false positives are rare and the cost is "Rooti sounds
 * like he paused mid-thought," which is still better than waiting.
 */
export class SentenceBuffer {
  private buffer = '';

  /** Push a delta. Calls `onSentence` for each complete sentence found. */
  push(delta: string, onSentence: (sentence: string) => void): void {
    this.buffer += delta;
    while (true) {
      const match = /[.!?](\s|$)/.exec(this.buffer);
      if (!match) break;
      const end = match.index + 1;
      const sentence = this.buffer.slice(0, end).trim();
      this.buffer = this.buffer.slice(end).replace(/^\s+/, '');
      if (sentence) onSentence(sentence);
    }
  }

  /** Flush whatever's left as a final sentence (called on stream end). */
  flush(onSentence: (sentence: string) => void): void {
    const remaining = this.buffer.trim();
    this.buffer = '';
    if (remaining) onSentence(remaining);
  }

  reset(): void {
    this.buffer = '';
  }
}
