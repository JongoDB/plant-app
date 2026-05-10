import { and, eq, lte } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';

import { getDb } from '../db/client.js';
import { reminders } from '../db/schema.js';
import type { Services } from '../services/index.js';

/**
 * Reminder scheduler.
 *
 * Slice 6 ships an in-process tick that runs every 60 seconds and
 * structured-logs any due reminders. Push delivery (APNs + FCM) lands
 * in a follow-up slice once those credentials are wired — at that point
 * this is the place that hands off to `services.push`.
 *
 * In-process is deliberately the cheapest thing that works: one Node
 * process, one DB. Multi-instance / leader election can come later
 * with a job queue.
 */

export interface ReminderScheduler {
  stop: () => void;
}

interface SchedulerOptions {
  logger: FastifyBaseLogger;
  services: Services;
  /** Tick interval in ms; defaults to 60s. */
  intervalMs?: number;
}

const DEFAULT_INTERVAL_MS = 60_000;

export function startReminderScheduler(opts: SchedulerOptions): ReminderScheduler {
  const log = opts.logger.child({ component: 'reminder-scheduler' });
  const intervalMs = opts.intervalMs ?? DEFAULT_INTERVAL_MS;
  let stopped = false;
  let inFlight = false;

  const tick = async (): Promise<void> => {
    if (stopped || inFlight) return;
    inFlight = true;
    try {
      const db = getDb();
      const due = await db
        .select()
        .from(reminders)
        .where(and(eq(reminders.active, true), lte(reminders.nextDueAt, new Date())));

      if (due.length === 0) return;

      log.info({ dueCount: due.length }, 'reminders due');
      for (const r of due) {
        log.info(
          {
            reminderId: r.id,
            plantId: r.plantId,
            userId: r.userId,
            kind: r.kind,
            nextDueAt: r.nextDueAt.toISOString(),
            recurring: r.intervalDays != null,
          },
          'reminder fired',
        );
        // Push delivery hooks here when APNs/FCM creds arrive.
        // For now we don't auto-advance — the user is expected to mark
        // the reminder complete themselves, which advances or deactivates
        // it. This avoids accidentally firing the same reminder twice
        // during the window between "due" and "user complete".
      }
    } catch (err) {
      log.error({ err }, 'reminder scheduler tick failed');
    } finally {
      inFlight = false;
    }
  };

  const handle = setInterval(() => void tick(), intervalMs);
  // Run once at boot so we don't have to wait the first interval.
  void tick();

  // Mark services as referenced even though Slice 6 doesn't use it yet —
  // push delivery will hang off `opts.services.push` next.
  void opts.services;

  return {
    stop() {
      stopped = true;
      clearInterval(handle);
    },
  };
}
