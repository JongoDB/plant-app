import type { FastifyInstance } from 'fastify';
import { fromNodeHeaders } from 'better-auth/node';

import { auth } from '../auth/auth.js';

/**
 * Mount Better Auth's catch-all handler at /api/auth/*. Better Auth speaks
 * Web standard Request/Response, so we adapt Fastify's Node-style req/res
 * around it.
 */
export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    async handler(request, reply) {
      try {
        const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
        const headers = fromNodeHeaders(request.headers);

        const init: RequestInit = {
          method: request.method,
          headers,
        };
        if (request.body) init.body = JSON.stringify(request.body);

        const fetchRequest = new Request(url.toString(), init);
        const response = await auth.handler(fetchRequest);

        reply.status(response.status);
        response.headers.forEach((value, key) => {
          reply.header(key, value);
        });

        const text = await response.text();
        return reply.send(text || null);
      } catch (err) {
        request.log.error({ err }, 'auth handler failed');
        return reply.status(500).send({ error: 'authentication_error' });
      }
    },
  });
}
