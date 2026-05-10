import type { Id, IsoDateTime } from './common.js';

/** What the user was checking when they took the photo. */
export type PhotoCheckMode = 'health' | 'growth' | 'general';

/**
 * A photo of a plant (or pre-identification photo without a plant link yet).
 * The bytes live in storage at `storageKey`; thumbnail is generated on-device
 * before upload to keep bandwidth low.
 */
export interface PhotoEntry {
  id: Id;
  /** May be undefined for "identify a new plant" photos. */
  plantId?: Id;
  userId: Id;
  storageKey: string;
  thumbnailKey?: string;
  width: number;
  height: number;
  takenAt: IsoDateTime;
  mode?: PhotoCheckMode;
  notes?: string;
}

/**
 * A short video walk-through used by Rooti. Bytes never go to the cloud LLM
 * directly — frames are sampled on-device and only selected frames are sent.
 */
export interface VideoEntry {
  id: Id;
  plantId?: Id;
  userId: Id;
  storageKey: string;
  thumbnailKey?: string;
  durationMs: number;
  takenAt: IsoDateTime;
  notes?: string;
}
