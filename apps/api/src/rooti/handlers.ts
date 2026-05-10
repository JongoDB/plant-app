/**
 * Rooti tool handlers.
 *
 * Each entry implements one of the typed contracts defined in
 * @plant-app/shared/rooti. The SSE endpoint catches thrown errors and feeds
 * them back to Claude as tool_result with is_error: true; the LLM then
 * surfaces a friendly "couldn't do that" to the user.
 *
 * `schedule_reminder` and `identify_plant` deliberately throw with a clear
 * "coming in a future slice" message — Slice 6 and Slice 5 respectively.
 */

import { and, eq } from 'drizzle-orm';
import type { RootiToolHandlerMap } from '@plant-app/shared';

import { getDb } from '../db/client.js';
import { careEvents, plants } from '../db/schema.js';

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

export const rootiToolHandlers: RootiToolHandlerMap = {
  log_care_event: async (input, ctx) => {
    await assertPlantBelongsToUser(input.plant_id, ctx.userId);
    const db = getDb();
    const occurredAt = input.occurred_at ? new Date(input.occurred_at) : new Date();
    const inserted = await db
      .insert(careEvents)
      .values({
        plantId: input.plant_id,
        userId: ctx.userId,
        kind: input.kind,
        occurredAt,
        notes: input.notes,
        metadata: input.metadata,
      })
      .returning();
    const row = inserted[0];
    if (!row) throw new Error('Failed to log care event.');
    return {
      ok: true,
      event_id: row.id,
      occurred_at: row.occurredAt.toISOString(),
    };
  },

  add_plant: async (input, ctx) => {
    const db = getDb();
    const inserted = await db
      .insert(plants)
      .values({
        userId: ctx.userId,
        nickname: input.nickname,
        scientificName: input.scientific_name,
        commonName: input.common_name,
        homeLocationDescription: input.location_in_home,
        acquiredOn: input.acquired_on,
        notes: input.notes,
      })
      .returning();
    const row = inserted[0];
    if (!row) throw new Error('Failed to add plant.');
    return { ok: true, plant_id: row.id };
  },

  save_plant_note: async (input, ctx) => {
    // Notes ride on the careEvents table with kind='other' for now. A
    // dedicated `plant_notes` table can come if notes grow richer.
    await assertPlantBelongsToUser(input.plant_id, ctx.userId);
    const db = getDb();
    const inserted = await db
      .insert(careEvents)
      .values({
        plantId: input.plant_id,
        userId: ctx.userId,
        kind: 'other',
        occurredAt: new Date(),
        notes: input.text,
      })
      .returning();
    const row = inserted[0];
    if (!row) throw new Error('Failed to save note.');
    return { ok: true, note_event_id: row.id };
  },

  schedule_reminder: async () => {
    throw new Error(
      "Reminder scheduling isn't wired up yet — that lands in the care-reminders slice.",
    );
  },

  identify_plant: async () => {
    throw new Error(
      "Plant identification isn't wired up yet — that lands in the Plant ID slice.",
    );
  },
};
