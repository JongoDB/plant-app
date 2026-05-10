import type { FastifyInstance } from 'fastify';

/** Liveness + readiness in one endpoint for now. Split later if we add a real readiness check (DB ping, etc). */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({
    status: 'ok',
    service: 'plant-app-api',
    time: new Date().toISOString(),
  }));
}
