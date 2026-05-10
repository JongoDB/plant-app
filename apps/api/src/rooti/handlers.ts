/**
 * Rooti tool handlers.
 *
 * Built as a factory so handlers can close over service implementations
 * (storage, plantId, etc.) without having to thread them through every
 * call site. The SSE endpoint constructs the map once per server boot.
 *
 * The SSE endpoint catches thrown errors and feeds them back to Claude as
 * tool_result with is_error: true; the LLM then surfaces a friendly
 * "couldn't do that" to the user.
 *
 * `schedule_reminder` deliberately throws with a clear "coming in a future
 * slice" message — that lands in the care-reminders slice.
 */

import { and, eq } from 'drizzle-orm';
import type { RootiToolHandlerMap } from '@plant-app/shared';

import { getDb } from '../db/client.js';
import { careEvents, plants } from '../db/schema.js';
import { identifyPhoto } from '../lib/identifyPhoto.js';
import type { Services } from '../services/index.js';

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

export function buildRootiToolHandlers(services: Services): RootiToolHandlerMap {
  return {
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

    identify_plant: async (input, ctx) => {
      const result = await identifyPhoto({
        userId: ctx.userId,
        photoId: input.photo_id,
        storage: services.storage,
        plantId: services.plantId,
      });

      // Optionally apply the top match to a plant in the user's collection.
      if (input.attach_to_plant_id && result.species[0]) {
        await assertPlantBelongsToUser(input.attach_to_plant_id, ctx.userId);
        const top = result.species[0];
        const db = getDb();
        await db
          .update(plants)
          .set({
            scientificName: top.scientificName,
            commonName: top.commonNames[0] ?? null,
          })
          .where(
            and(
              eq(plants.id, input.attach_to_plant_id),
              eq(plants.userId, ctx.userId),
            ),
          );
      }

      return {
        ok: true,
        candidates: result.species.slice(0, 5).map((c) => ({
          scientific_name: c.scientificName,
          common_names: c.commonNames,
          confidence: c.confidence,
        })),
      };
    },
  };
}
