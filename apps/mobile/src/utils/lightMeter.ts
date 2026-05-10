import jpeg from 'jpeg-js';
import type { LightExposure } from '@plant-app/shared';

/**
 * Pure-JS light meter. Reads a JPEG capture, computes per-pixel luminance
 * (Rec. 601 weights), averages, and bins to the LightExposure category.
 *
 * jpeg-js is a pure JS decoder — no native module needed, works on web +
 * native. Fine for a one-shot capture; we'd want a Skia / native path if
 * we ever did this live on every camera frame.
 */

export interface LightReading {
  /** 0..255 average luminance. */
  averageLuminance: number;
  category: LightExposure;
}

/**
 * Coarse luminance buckets. Calibrated for indoor scenes captured with
 * default camera auto-exposure — they're a starting point, not absolute.
 */
function categorize(lum: number): LightExposure {
  if (lum < 50) return 'low';
  if (lum < 110) return 'medium';
  if (lum < 180) return 'bright_indirect';
  return 'direct';
}

export async function measureLightFromUri(uri: string): Promise<LightReading> {
  const res = await fetch(uri);
  if (!res.ok) throw new Error(`Couldn't read image (HTTP ${res.status}).`);
  const buffer = new Uint8Array(await res.arrayBuffer());

  // jpeg-js's `useTArray: true` returns the pixel array as a Uint8Array.
  const decoded = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true });
  const data = decoded.data;

  // Sample every pixel — for a 1568x1568 image that's ~2.5M iterations,
  // a few hundred ms in JS. Could downsample if it ever feels slow.
  let sum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    sum += 0.299 * r + 0.587 * g + 0.114 * b;
    count++;
  }
  const averageLuminance = count > 0 ? sum / count : 0;
  return { averageLuminance, category: categorize(averageLuminance) };
}
