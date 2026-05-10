import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { getSession } from '../auth/requireSession.js';
import {
  SPECIES_LIBRARY,
  findSpecies,
  searchSpecies,
  speciesSlug,
} from '../data/species.js';

/**
 * Species reference library.
 *
 * GET /species?q=foo — search by scientific or common name (case-insensitive
 *                      substring). Returns full SpeciesInfo[].
 * GET /species/:slug  — single species by url-safe slug derived from the
 *                      scientific name (e.g. monstera-deliciosa).
 *
 * Auth-scoped for consistency with the rest of the API even though the
 * data is the same for everyone.
 *
 * Each response decorates entries with their `slug` so the client doesn't
 * need to compute one — keeps the slug logic in one place.
 */

const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
});

const slugParam = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
});

function decorate(entry: (typeof SPECIES_LIBRARY)[number]) {
  return { ...entry, slug: speciesSlug(entry.scientificName) };
}

export async function speciesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/species', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.status(401).send({ error: 'unauthorized' });

    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: 'validation_failed', issues: parsed.error.issues });
    }
    const results = parsed.data.q ? searchSpecies(parsed.data.q) : SPECIES_LIBRARY;
    return results.map(decorate);
  });

  app.get('/species/:slug', async (request, reply) => {
    const session = await getSession(request);
    if (!session) return reply.status(401).send({ error: 'unauthorized' });

    const params = slugParam.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid_slug' });
    }
    const entry = findSpecies(params.data.slug);
    if (!entry) return reply.status(404).send({ error: 'not_found' });
    return decorate(entry);
  });
}
