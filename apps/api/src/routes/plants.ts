import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import type { CareEvent, HomeLocation, Plant, PhotoEntry } from '@plant-app/shared';
import { max as drizzleMax } from 'drizzle-orm';

import { getSession } from '../auth/requireSession.js';
import { findSpecies } from '../data/species.js';
import { getDb } from '../db/client.js';
import { careEvents, photos, plants } from '../db/schema.js';

// --- request validation -----------------------------------------------------

const lightExposureSchema = z.enum(['direct', 'bright_indirect', 'medium', 'low']);

const createPlantBody = z.object({
  nickname: z.string().trim().min(1).max(120),
  scientificName: z.string().trim().max(255).optional(),
  commonName: z.string().trim().max(255).optional(),
  homeLocation: z
    .object({
      description: z.string().trim().min(1).max(255),
      lightExposure: lightExposureSchema.optional(),
      averageTempC: z.number().optional(),
      averageHumidityPct: z.number().min(0).max(100).optional(),
    })
    .optional(),
  acquiredOn: z.iso.date().optional(),
  notes: z.string().trim().max(2000).optional(),
});

const updatePlantBody = z
  .object({
    nickname: z.string().trim().min(1).max(120).optional(),
    scientificName: z.string().trim().max(255).nullable().optional(),
    commonName: z.string().trim().max(255).nullable().optional(),
    homeLocation: z
      .object({
        description: z.string().trim().min(1).max(255).optional(),
        lightExposure: lightExposureSchema.nullable().optional(),
      })
      .optional(),
    acquiredOn: z.iso.date().nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'no fields to update' });

const idParam = z.object({ id: z.uuid() });

// --- mapping ----------------------------------------------------------------

type Row = typeof plants.$inferSelect;

function rowToPlant(row: Row): Plant {
  const homeLocation: HomeLocation | undefined = row.homeLocationDescription
    ? {
        description: row.homeLocationDescription,
        ...(row.homeLocationLight ? { lightExposure: row.homeLocationLight } : {}),
      }
    : undefined;
  return {
    id: row.id,
    userId: row.userId,
    nickname: row.nickname,
    ...(row.scientificName ? { scientificName: row.scientificName } : {}),
    ...(row.commonName ? { commonName: row.commonName } : {}),
    ...(homeLocation ? { homeLocation } : {}),
    ...(row.acquiredOn ? { acquiredOn: row.acquiredOn } : {}),
    ...(row.notes ? { notes: row.notes } : {}),
    ...(row.primaryPhotoId ? { primaryPhotoId: row.primaryPhotoId } : {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// --- routes -----------------------------------------------------------------

export async function plantsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/plants', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.status(401).send({ error: 'unauthorized' });

    const db = getDb();
    const rows = await db
      .select()
      .from(plants)
      .where(eq(plants.userId, session.user.id))
      .orderBy(desc(plants.createdAt));

    if (rows.length === 0) return [];

    // Most recent water event per plant, in one query — used by the home
    // screen to show a "due / overdue" pill on each card.
    const lastWaterRows = await db
      .select({
        plantId: careEvents.plantId,
        lastAt: drizzleMax(careEvents.occurredAt),
      })
      .from(careEvents)
      .where(
        and(
          eq(careEvents.userId, session.user.id),
          eq(careEvents.kind, 'water'),
        ),
      )
      .groupBy(careEvents.plantId);
    const lastWaterByPlant = new Map<string, Date>();
    for (const r of lastWaterRows) {
      if (r.lastAt) lastWaterByPlant.set(r.plantId, r.lastAt);
    }

    return rows.map((row) => {
      const plant = rowToPlant(row);
      const lastAt = lastWaterByPlant.get(row.id);
      const species = row.scientificName ? findSpecies(row.scientificName) : undefined;
      return {
        ...plant,
        ...(lastAt ? { lastWaterAt: lastAt.toISOString() } : {}),
        ...(species?.waterFrequencyDays
          ? { waterFrequencyDays: species.waterFrequencyDays }
          : {}),
      };
    });
  });

  app.get('/plants/:id', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.status(401).send({ error: 'unauthorized' });

    const params = idParam.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_id' });

    const db = getDb();
    const rows = await db
      .select()
      .from(plants)
      .where(and(eq(plants.id, params.data.id), eq(plants.userId, session.user.id)))
      .limit(1);
    const row = rows[0];
    if (!row) return reply.status(404).send({ error: 'not_found' });
    return rowToPlant(row);
  });

  // Growth timeline — photos taken of this plant, newest first.
  app.get('/plants/:id/photos', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.status(401).send({ error: 'unauthorized' });

    const params = idParam.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_id' });

    const db = getDb();
    // Verify the plant belongs to the user before disclosing anything.
    const owner = await db
      .select({ id: plants.id })
      .from(plants)
      .where(and(eq(plants.id, params.data.id), eq(plants.userId, session.user.id)))
      .limit(1);
    if (owner.length === 0) return reply.status(404).send({ error: 'not_found' });

    const rows = await db
      .select()
      .from(photos)
      .where(
        and(eq(photos.userId, session.user.id), eq(photos.plantId, params.data.id)),
      )
      .orderBy(desc(photos.takenAt));

    const out: PhotoEntry[] = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      ...(r.plantId ? { plantId: r.plantId } : {}),
      storageKey: r.storageKey,
      ...(r.thumbnailKey ? { thumbnailKey: r.thumbnailKey } : {}),
      width: r.width,
      height: r.height,
      takenAt: r.takenAt.toISOString(),
      ...(r.mode ? { mode: r.mode } : {}),
      ...(r.notes ? { notes: r.notes } : {}),
    }));
    return out;
  });

  // Care log — events written by reminder completions or by Rooti tools.
  app.get('/plants/:id/care-events', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.status(401).send({ error: 'unauthorized' });

    const params = idParam.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_id' });

    const db = getDb();
    const owner = await db
      .select({ id: plants.id })
      .from(plants)
      .where(and(eq(plants.id, params.data.id), eq(plants.userId, session.user.id)))
      .limit(1);
    if (owner.length === 0) return reply.status(404).send({ error: 'not_found' });

    const rows = await db
      .select()
      .from(careEvents)
      .where(
        and(
          eq(careEvents.userId, session.user.id),
          eq(careEvents.plantId, params.data.id),
        ),
      )
      .orderBy(desc(careEvents.occurredAt))
      .limit(50);

    const out: CareEvent[] = rows.map((r) => ({
      id: r.id,
      plantId: r.plantId,
      userId: r.userId,
      kind: r.kind,
      occurredAt: r.occurredAt.toISOString(),
      ...(r.notes ? { notes: r.notes } : {}),
      ...(r.metadata ? { metadata: r.metadata as Record<string, unknown> } : {}),
    }));
    return out;
  });

  app.post('/plants', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.status(401).send({ error: 'unauthorized' });

    const parsed = createPlantBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'validation_failed',
        issues: parsed.error.issues,
      });
    }
    const input = parsed.data;

    const db = getDb();
    const inserted = await db
      .insert(plants)
      .values({
        userId: session.user.id,
        nickname: input.nickname,
        scientificName: input.scientificName,
        commonName: input.commonName,
        homeLocationDescription: input.homeLocation?.description,
        homeLocationLight: input.homeLocation?.lightExposure,
        acquiredOn: input.acquiredOn,
        notes: input.notes,
      })
      .returning();
    const row = inserted[0];
    if (!row) return reply.status(500).send({ error: 'insert_failed' });

    return reply.status(201).send(rowToPlant(row));
  });

  app.patch('/plants/:id', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.status(401).send({ error: 'unauthorized' });

    const params = idParam.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_id' });
    const body = updatePlantBody.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send({ error: 'validation_failed', issues: body.error.issues });
    }

    const set: Partial<typeof plants.$inferInsert> = {};
    if (body.data.nickname !== undefined) set.nickname = body.data.nickname;
    if (body.data.scientificName !== undefined)
      set.scientificName = body.data.scientificName ?? null;
    if (body.data.commonName !== undefined) set.commonName = body.data.commonName ?? null;
    if (body.data.acquiredOn !== undefined) set.acquiredOn = body.data.acquiredOn ?? null;
    if (body.data.notes !== undefined) set.notes = body.data.notes ?? null;
    if (body.data.homeLocation !== undefined) {
      if (body.data.homeLocation.description !== undefined) {
        set.homeLocationDescription = body.data.homeLocation.description;
      }
      if (body.data.homeLocation.lightExposure !== undefined) {
        set.homeLocationLight = body.data.homeLocation.lightExposure;
      }
    }

    const db = getDb();
    const updated = await db
      .update(plants)
      .set(set)
      .where(and(eq(plants.id, params.data.id), eq(plants.userId, session.user.id)))
      .returning();
    const row = updated[0];
    if (!row) return reply.status(404).send({ error: 'not_found' });
    return rowToPlant(row);
  });

  // Set the plant's cover photo. Owner-scoped on both sides so a stray
  // photoId from another plant or another user is rejected.
  app.post('/plants/:id/cover', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.status(401).send({ error: 'unauthorized' });

    const params = idParam.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_id' });
    const body = z.object({ photoId: z.uuid() }).safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send({ error: 'validation_failed', issues: body.error.issues });
    }

    const db = getDb();
    const photo = await db
      .select({ id: photos.id })
      .from(photos)
      .where(
        and(
          eq(photos.id, body.data.photoId),
          eq(photos.userId, session.user.id),
          eq(photos.plantId, params.data.id),
        ),
      )
      .limit(1);
    if (photo.length === 0) return reply.status(404).send({ error: 'photo_not_found' });

    const updated = await db
      .update(plants)
      .set({ primaryPhotoId: body.data.photoId })
      .where(and(eq(plants.id, params.data.id), eq(plants.userId, session.user.id)))
      .returning();
    const row = updated[0];
    if (!row) return reply.status(404).send({ error: 'not_found' });
    return rowToPlant(row);
  });

  // GET /journal — a single mixed feed of recent photos + care events
  // across all of the user's plants. Used by the Garden Journal screen
  // for "what have I been up to" browsing.
  app.get('/journal', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.status(401).send({ error: 'unauthorized' });

    const db = getDb();
    const [photoRows, careRows] = await Promise.all([
      db
        .select({
          id: photos.id,
          plantId: photos.plantId,
          plantNickname: plants.nickname,
          takenAt: photos.takenAt,
          mode: photos.mode,
        })
        .from(photos)
        .leftJoin(plants, eq(plants.id, photos.plantId))
        .where(eq(photos.userId, session.user.id))
        .orderBy(desc(photos.takenAt))
        .limit(100),
      db
        .select({
          id: careEvents.id,
          plantId: careEvents.plantId,
          plantNickname: plants.nickname,
          occurredAt: careEvents.occurredAt,
          kind: careEvents.kind,
          notes: careEvents.notes,
        })
        .from(careEvents)
        .leftJoin(plants, eq(plants.id, careEvents.plantId))
        .where(eq(careEvents.userId, session.user.id))
        .orderBy(desc(careEvents.occurredAt))
        .limit(100),
    ]);

    type JournalEntry =
      | {
          kind: 'photo';
          id: string;
          plantId: string | null;
          plantNickname: string | null;
          takenAt: string;
          mode: 'health' | 'growth' | 'general' | null;
        }
      | {
          kind: 'care';
          id: string;
          plantId: string;
          plantNickname: string | null;
          occurredAt: string;
          careKind: 'water' | 'fertilize' | 'prune' | 'repot' | 'rotate' | 'other';
          notes: string | null;
        };

    const entries: JournalEntry[] = [];
    for (const r of photoRows) {
      entries.push({
        kind: 'photo',
        id: r.id,
        plantId: r.plantId ?? null,
        plantNickname: r.plantNickname ?? null,
        takenAt: r.takenAt.toISOString(),
        mode: r.mode ?? null,
      });
    }
    for (const r of careRows) {
      entries.push({
        kind: 'care',
        id: r.id,
        plantId: r.plantId,
        plantNickname: r.plantNickname ?? null,
        occurredAt: r.occurredAt.toISOString(),
        careKind: r.kind,
        notes: r.notes ?? null,
      });
    }
    entries.sort((a, b) => {
      const at = a.kind === 'photo' ? a.takenAt : a.occurredAt;
      const bt = b.kind === 'photo' ? b.takenAt : b.occurredAt;
      return at < bt ? 1 : at > bt ? -1 : 0;
    });
    return entries.slice(0, 100);
  });

  app.delete('/plants/:id', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.status(401).send({ error: 'unauthorized' });

    const params = idParam.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_id' });

    const db = getDb();
    const removed = await db
      .delete(plants)
      .where(and(eq(plants.id, params.data.id), eq(plants.userId, session.user.id)))
      .returning({ id: plants.id });
    if (removed.length === 0) return reply.status(404).send({ error: 'not_found' });
    return reply.status(204).send();
  });
}
