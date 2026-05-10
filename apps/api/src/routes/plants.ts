import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import type { HomeLocation, Plant } from '@plant-app/shared';

import { getSession } from '../auth/requireSession.js';
import { getDb } from '../db/client.js';
import { plants } from '../db/schema.js';

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
    return rows.map(rowToPlant);
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
