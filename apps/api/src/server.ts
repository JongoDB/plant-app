import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';

import type { AppEnv } from './config/env.js';
import { authRoutes } from './routes/auth.js';
import { healthRoutes } from './routes/health.js';
import { identifyRoutes } from './routes/identify.js';
import { meRoutes } from './routes/me.js';
import { photosRoutes } from './routes/photos.js';
import { plantsRoutes } from './routes/plants.js';
import { remindersRoutes } from './routes/reminders.js';
import { rootiRoutes } from './routes/rooti.js';
import { weatherRoutes } from './routes/weather.js';
import { buildServices } from './services/index.js';
import { startReminderScheduler, type ReminderScheduler } from './scheduler/reminders.js';

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
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  });

  const services = buildServices(env);

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(meRoutes);
  await app.register(plantsRoutes);
  await app.register(photosRoutes, { services });
  await app.register(identifyRoutes, { services });
  await app.register(remindersRoutes);
  await app.register(weatherRoutes, { services });
  await app.register(rootiRoutes, { services });

  // Future slices register here:
  //   - push notifications (when APNs/FCM creds arrive)

  let scheduler: ReminderScheduler | undefined;
  if (env.NODE_ENV !== 'test') {
    scheduler = startReminderScheduler({ logger: app.log, services });
  }
  app.addHook('onClose', async () => {
    scheduler?.stop();
  });

  return app;
}
