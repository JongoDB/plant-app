import type { FastifyInstance } from 'fastify';
import { fromNodeHeaders } from 'better-auth/node';

import { auth } from '../auth/auth.js';

/**
 * GET /me — returns the logged-in user's session, or 401 if no session.
 * Used by the mobile app to greet the user and decide auth state on cold-start.
 */
export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get('/me', async (request, reply) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
    if (!session) {
      return reply.status(401).send({ error: 'unauthorized' });
    }
    return reply.send({
      user: session.user,
      session: { expiresAt: session.session.expiresAt },
    });
  });
}
