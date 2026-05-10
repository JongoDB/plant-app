import type { FastifyRequest } from 'fastify';
import { fromNodeHeaders } from 'better-auth/node';

import { auth } from './auth.js';

/**
 * Pulls the current session for an incoming request, or null if unauthenticated.
 * Routes that require auth do:
 *
 *   const session = await getSession(request);
 *   if (!session) return reply.status(401).send({ error: 'unauthorized' });
 *
 * Inline check beats a hidden middleware here — easier for a junior to follow.
 */
export async function getSession(request: FastifyRequest) {
  return auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });
}

export type SessionResult = NonNullable<Awaited<ReturnType<typeof getSession>>>;
