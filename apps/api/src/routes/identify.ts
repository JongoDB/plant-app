import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { getSession } from '../auth/requireSession.js';
import { identifyPhoto } from '../lib/identifyPhoto.js';
import type { Services } from '../services/index.js';

const bodySchema = z.object({
  photoId: z.uuid(),
});

/**
 * POST /identify — body: { photoId } -> PlantIdResult
 *
 * The mobile client uploads via /photos first, then references the resulting
 * id here. Auth-scoped, so cross-user reads return 404. The Rooti
 * identify_plant tool calls the same code path via lib/identifyPhoto.
 */
export async function identifyRoutes(
  app: FastifyInstance,
  opts: { services: Services },
): Promise<void> {
  app.post('/identify', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.status(401).send({ error: 'unauthorized' });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: 'validation_failed', issues: parsed.error.issues });
    }

    try {
      const result = await identifyPhoto({
        userId: session.user.id,
        photoId: parsed.data.photoId,
        storage: opts.services.storage,
        plantId: opts.services.plantId,
      });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('not in your collection')) {
        return reply.status(404).send({ error: 'not_found' });
      }
      if (message.includes('not wired') || message.includes('PLANTNET_API_KEY')) {
        return reply.status(503).send({ error: 'plant_id_unavailable', message });
      }
      request.log.error({ err }, 'identify failed');
      return reply.status(502).send({ error: 'identify_failed', message });
    }
  });
}
