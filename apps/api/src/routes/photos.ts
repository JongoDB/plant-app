import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';

import { getSession } from '../auth/requireSession.js';
import { getDb } from '../db/client.js';
import { photos, plants } from '../db/schema.js';
import type { Services } from '../services/index.js';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const photoIdParam = z.object({ id: z.uuid() });

const PhotoModeValues = ['health', 'growth', 'general'] as const;
type PhotoModeValue = (typeof PhotoModeValues)[number];
function isPhotoMode(v: string | undefined): v is PhotoModeValue {
  return !!v && (PhotoModeValues as readonly string[]).includes(v);
}

export async function photosRoutes(
  app: FastifyInstance,
  opts: { services: Services },
): Promise<void> {
  // ---- POST /photos -------------------------------------------------------
  app.post('/photos', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.status(401).send({ error: 'unauthorized' });

    if (!request.isMultipart()) {
      return reply.status(400).send({ error: 'expected_multipart' });
    }

    let buffer: Buffer | null = null;
    let mimetype: string | null = null;
    const fields: Record<string, string> = {};

    try {
      for await (const part of request.parts()) {
        if (part.type === 'file') {
          if (buffer) {
            // Only one file per request — drain extras to avoid hangs.
            await part.toBuffer();
            continue;
          }
          if (!(ALLOWED_MIME as readonly string[]).includes(part.mimetype)) {
            return reply
              .status(400)
              .send({ error: 'unsupported_mime', mimeType: part.mimetype });
          }
          buffer = await part.toBuffer();
          mimetype = part.mimetype;
        } else {
          fields[part.fieldname] = typeof part.value === 'string' ? part.value : '';
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('reached size limit')) {
        return reply.status(413).send({ error: 'file_too_large', maxBytes: MAX_BYTES });
      }
      throw err;
    }

    if (!buffer || !mimetype) {
      return reply.status(400).send({ error: 'no_file' });
    }
    if (buffer.length === 0) {
      return reply.status(400).send({ error: 'empty_file' });
    }

    const width = Number(fields.width) || 0;
    const height = Number(fields.height) || 0;
    const plantId = fields.plantId || undefined;
    const mode: PhotoModeValue | undefined = isPhotoMode(fields.mode) ? fields.mode : undefined;

    const ext = mimeToExt(mimetype);
    const storageKey = `photos/${session.user.id}/${randomUUID()}.${ext}`;
    await opts.services.storage.put({
      key: storageKey,
      data: new Uint8Array(buffer),
      contentType: mimetype,
    });

    const db = getDb();
    const inserted = await db
      .insert(photos)
      .values({
        userId: session.user.id,
        plantId,
        storageKey,
        width,
        height,
        mode,
      })
      .returning();
    const row = inserted[0];
    if (!row) return reply.status(500).send({ error: 'insert_failed' });

    // First photo for a plant becomes its thumbnail until the user
    // explicitly picks another. Scope-limited to the owner so we don't
    // touch someone else's plant if a stale plantId leaks through.
    if (plantId) {
      await db
        .update(plants)
        .set({ primaryPhotoId: row.id })
        .where(
          and(
            eq(plants.id, plantId),
            eq(plants.userId, session.user.id),
            isNull(plants.primaryPhotoId),
          ),
        );
    }

    return reply.status(201).send({
      id: row.id,
      plantId: row.plantId,
      width: row.width,
      height: row.height,
      takenAt: row.takenAt.toISOString(),
      mode: row.mode,
    });
  });

  // ---- GET /photos/:id (auth-scoped) --------------------------------------
  app.get('/photos/:id', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.status(401).send({ error: 'unauthorized' });

    const params = photoIdParam.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'invalid_id' });

    const db = getDb();
    const rows = await db
      .select()
      .from(photos)
      .where(and(eq(photos.id, params.data.id), eq(photos.userId, session.user.id)))
      .limit(1);
    const row = rows[0];
    if (!row) return reply.status(404).send({ error: 'not_found' });

    const bytes = await opts.services.storage.get(row.storageKey);
    const ext = row.storageKey.split('.').pop() ?? '';
    return reply
      .header('Content-Type', extToMime(ext))
      .header('Cache-Control', 'private, max-age=3600')
      .send(Buffer.from(bytes));
  });
}

function mimeToExt(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'bin';
  }
}

function extToMime(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}
