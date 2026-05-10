import type { Id, IsoDateTime } from './common.js';

/** Type of care action. */
export type CareEventKind = 'water' | 'fertilize' | 'prune' | 'repot' | 'rotate' | 'other';

/**
 * A logged care action — either user-recorded or scheduled.
 */
export interface CareEvent {
  id: Id;
  plantId: Id;
  userId: Id;
  kind: CareEventKind;
  occurredAt: IsoDateTime;
  notes?: string;
  /** Optional structured detail, e.g. {"amountMl": 250} for water events. */
  metadata?: Record<string, unknown>;
}

/** Type of recurring reminder. */
export type ReminderKind = 'water' | 'fertilize' | 'prune' | 'repot' | 'rotate';

/**
 * A reminder for a future care action. MVP supports a simple
 * `nextDueAt + intervalDays` model; richer cron support comes later.
 */
export interface Reminder {
  id: Id;
  userId: Id;
  plantId: Id;
  kind: ReminderKind;
  nextDueAt: IsoDateTime;
  /** If set, after firing the reminder rolls forward by this many days. */
  intervalDays?: number;
  active: boolean;
  createdAt: IsoDateTime;
}
