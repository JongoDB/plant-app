import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';

import type { AppEnv } from './config/env.js';
import { authRoutes } from './routes/auth.js';
import { healthRoutes } from './routes/health.js';
import { meRoutes } from './routes/me.js';
import { plantsRoutes } from './routes/plants.js';

/**
 * Build (but do not start) the Fastify server. Splitting this out makes it
 * trivial to spin up an in-memory instance for tests.
 */
export async function buildServer(env: AppEnv): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: { translateTime: 'SYS:standard', ignore: 'pid,hostname' },
            }
          : undefined,
    },
    // Generate request IDs even when no upstream proxy provides one.
    genReqId: () =>
      // 22-char base36, plenty unique for our scale
      Math.random().toString(36).slice(2, 13) + Date.now().toString(36),
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(meRoutes);
  await app.register(plantsRoutes);

  // Future slices register here:
  //   - rooti SSE route (Slice 3)
  //   - photo upload (Slice 4)
  //   - reminders + push (later)

  return app;
}
