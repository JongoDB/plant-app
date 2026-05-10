import { loadEnv } from './config/env.js';
import { buildServer } from './server.js';

async function main(): Promise<void> {
  const env = loadEnv();
  const app = await buildServer(env);
  try {
    await app.listen({ host: env.HOST, port: env.PORT });
    app.log.info({ port: env.PORT }, 'plant-app api listening');
  } catch (err) {
    app.log.error(err, 'failed to start');
    process.exit(1);
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
