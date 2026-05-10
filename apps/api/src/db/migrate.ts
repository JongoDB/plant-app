import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { getDb, closeDb } from './client.js';

async function main(): Promise<void> {
  const db = getDb();
  await migrate(db, { migrationsFolder: './drizzle' });
  // eslint-disable-next-line no-console
  console.log('migrations applied');
  await closeDb();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
