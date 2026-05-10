import { and, eq } from 'drizzle-orm';
import type { Id, PlantIdProvider, PlantIdResult, StorageProvider } from '@plant-app/shared';

import { getDb } from '../db/client.js';
import { photos } from '../db/schema.js';

/**
 * Shared helper used by both POST /identify and the identify_plant Rooti
 * tool handler. Loads bytes from storage, calls the plant-ID provider,
 * returns the normalised result.
 *
 * Throws if the photo isn't owned by the user — both call sites surface
 * that as a 4xx-equivalent (Rooti turns it into an is_error tool result).
 */
export async function identifyPhoto(opts: {
  userId: Id;
  photoId: Id;
  storage: StorageProvider;
  plantId: PlantIdProvider;
}): Promise<PlantIdResult> {
  const db = getDb();
  const rows = await db
    .select({ id: photos.id, storageKey: photos.storageKey })
    .from(photos)
    .where(and(eq(photos.id, opts.photoId), eq(photos.userId, opts.userId)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error(`Photo ${opts.photoId} is not in your collection.`);

  const bytes = await opts.storage.get(row.storageKey);
  const ext = row.storageKey.split('.').pop()?.toLowerCase() ?? '';
  const mimeType =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  return opts.plantId.identifyByPhoto({ image: bytes, mimeType });
}
