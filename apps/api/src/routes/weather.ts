import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { getSession } from '../auth/requireSession.js';
import type { Services } from '../services/index.js';

/**
 * GET /weather?lat=&lng=&days=3 — current + daily forecast.
 *
 * Auth-scoped for consistency with the rest of the API even though weather
 * isn't user-specific. Query params instead of a body so it can be cached
 * and so the mobile client can hit it via plain fetch without ceremony.
 */

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  days: z.coerce.number().int().min(1).max(7).default(3),
});

export async function weatherRoutes(
  app: FastifyInstance,
  opts: { services: Services },
): Promise<void> {
  app.get('/weather', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.status(401).send({ error: 'unauthorized' });

    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: 'validation_failed', issues: parsed.error.issues });
    }
    const { lat, lng, days } = parsed.data;

    try {
      const [current, forecast] = await Promise.all([
        opts.services.weather.current({ lat, lng }),
        opts.services.weather.forecast({ lat, lng }, days),
      ]);
      return reply.send({ current, forecast });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      request.log.error({ err }, 'weather lookup failed');
      return reply.status(502).send({ error: 'weather_failed', message });
    }
  });
}
