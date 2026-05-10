import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { and, asc, eq } from 'drizzle-orm';
import type { Reminder } from '@plant-app/shared';

import { getSession } from '../auth/requireSession.js';
import { getDb } from '../db/client.js';
import { careEvents, plants, reminders } from '../db/schema.js';

const REMINDER_KINDS = ['water', 'fertilize', 'prune', 'repot', 'rotate'] as const;
const reminderKindSchema = z.enum(REMINDER_KINDS);

const createBodySchema = z.object({
  plantId: z.uuid(),
  kind: reminderKindSchema,
  nextDueAt: z.iso.datetime(),
  intervalDays: z.number().int().positive().max(365).optional(),
});

const updateBodySchema = z
  .object({
    active: z.boolean().optional(),
    nextDueAt: z.iso.datetime().optional(),
    intervalDays: z.number().int().positive().max(365).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'no fields to update' });

const completeBodySchema = z
  .object({
    notes: z.string().trim().max(2000).optional(),
  })
  .optional();

const idParam = z.object({ id: z.uuid() });
const plantIdParam = z.object({ id: z.uuid() });

type Row = typeof reminders.$inferSelect;

function rowToReminder(row: Row): Reminder {
  return {
    id: row.id,
    userId: row.userId,
    plantId: row.plantId,
    kind: row.kind,
    nextDueAt: row.nextDueAt.toISOString(),
    ...(row.intervalDays != null ? { intervalDays: row.intervalDays } : {}),
    active: row.active,
    createdAt: row.createdAt.toISOString(),
  };
}

async function assertPlantBelongsToUser(plantId: string, userId: string): Promise<void> {
  const db = getDb();
  const rows = await db
    .select({ id: plants.id })
    .from(plants)
    .where(and(eq(plants.id, plantId), eq(plants.userId, userId)))
    .limit(1);
  if (rows.length === 0) {
    throw new Error(`Plant ${plantId} is not in your collection.`);
  }
}

export async function remindersRoutes(app: FastifyInstance): Promise<void> {
  // ---- POST /reminders ----------------------------------------------------
  app.post('/reminders', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.status(401).send({ error: 'unauthorized' });

    const parsed = createBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: 'validation_failed', issues: parsed.error.issues });
    }
    const input = parsed.data;
    try {
      await assertPlantBelongsToUser(input.plantId, session.user.id);
    } catch {
      return reply.status(404).send({ error: 'plant_not_found' });
    }

    const db = getDb();
    const inserted = await db
      .insert(reminders)
      .values({
        userId: session.user.id,
        plantId: input.plantId,
        kind: input.kind,
        nextDueAt: new Date(input.nextDueAt),
        intervalDays: input.intervalDays,
        active: true,
      })
      .returning();
    const row = inserted[0];
    if (!row) return reply.status(500).send({ error: 'insert_failed' });
    return reply.status(201).send(rowToReminder(row));
  });

  // ---- GET /reminders -----------------------------------------------------
  app.get('/reminders', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.status(401).send({ error: 'unauthorized' });

    const db = getDb();
    const rows = await db
      .select()
      .from(reminders)
      .where(eq(reminders.userId, session.user.id))
      .orderBy(asc(reminders.nextDueAt));
    return rows.map(rowToReminder);
  });

  // ---- GET /plants/:id/reminders ------------------------------------------
  app.get('/plants/:id/reminders', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.status(401).send({ error: 'unauthorized' });

    const params = plantIdParam.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_id' });
    try {
      await assertPlantBelongsToUser(params.data.id, session.user.id);
    } catch {
      return reply.status(404).send({ error: 'plant_not_found' });
    }

    const db = getDb();
    const rows = await db
      .select()
      .from(reminders)
      .where(
        and(eq(reminders.userId, session.user.id), eq(reminders.plantId, params.data.id)),
      )
      .orderBy(asc(reminders.nextDueAt));
    return rows.map(rowToReminder);
  });

  // ---- PATCH /reminders/:id ----------------------------------------------
  app.patch('/reminders/:id', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.status(401).send({ error: 'unauthorized' });

    const params = idParam.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_id' });
    const body = updateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send({ error: 'validation_failed', issues: body.error.issues });
    }

    const set: Partial<typeof reminders.$inferInsert> = {};
    if (body.data.active !== undefined) set.active = body.data.active;
    if (body.data.nextDueAt) set.nextDueAt = new Date(body.data.nextDueAt);
    if (body.data.intervalDays !== undefined) {
      set.intervalDays = body.data.intervalDays ?? null;
    }

    const db = getDb();
    const updated = await db
      .update(reminders)
      .set(set)
      .where(
        and(eq(reminders.id, params.data.id), eq(reminders.userId, session.user.id)),
      )
      .returning();
    const row = updated[0];
    if (!row) return reply.status(404).send({ error: 'not_found' });
    return rowToReminder(row);
  });

  // ---- DELETE /reminders/:id ---------------------------------------------
  app.delete('/reminders/:id', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.status(401).send({ error: 'unauthorized' });

    const params = idParam.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_id' });

    const db = getDb();
    const removed = await db
      .delete(reminders)
      .where(
        and(eq(reminders.id, params.data.id), eq(reminders.userId, session.user.id)),
      )
      .returning({ id: reminders.id });
    if (removed.length === 0) return reply.status(404).send({ error: 'not_found' });
    return reply.status(204).send();
  });

  // ---- POST /reminders/:id/complete --------------------------------------
  // Logs a care event with the reminder's kind, then advances nextDueAt
  // by intervalDays (if recurring) or marks active=false (one-shot).
  app.post('/reminders/:id/complete', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.status(401).send({ error: 'unauthorized' });

    const params = idParam.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_id' });
    const body = completeBodySchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply
        .status(400)
        .send({ error: 'validation_failed', issues: body.error.issues });
    }
    const notes = body.data?.notes;

    const db = getDb();
    const rows = await db
      .select()
      .from(reminders)
      .where(
        and(eq(reminders.id, params.data.id), eq(reminders.userId, session.user.id)),
      )
      .limit(1);
    const reminder = rows[0];
    if (!reminder) return reply.status(404).send({ error: 'not_found' });

    const now = new Date();
    const inserted = await db
      .insert(careEvents)
      .values({
        plantId: reminder.plantId,
        userId: session.user.id,
        kind: reminder.kind,
        occurredAt: now,
        notes,
        metadata: { reminderId: reminder.id },
      })
      .returning();
    const event = inserted[0];
    if (!event) return reply.status(500).send({ error: 'insert_failed' });

    let next: Reminder;
    if (reminder.intervalDays && reminder.intervalDays > 0) {
      const advanced = new Date(now);
      advanced.setUTCDate(advanced.getUTCDate() + reminder.intervalDays);
      const updated = await db
        .update(reminders)
        .set({ nextDueAt: advanced })
        .where(eq(reminders.id, reminder.id))
        .returning();
      next = rowToReminder(updated[0] ?? reminder);
    } else {
      const updated = await db
        .update(reminders)
        .set({ active: false })
        .where(eq(reminders.id, reminder.id))
        .returning();
      next = rowToReminder(updated[0] ?? reminder);
    }

    return {
      ok: true,
      reminder: next,
      eventId: event.id,
      occurredAt: event.occurredAt.toISOString(),
    };
  });
}
