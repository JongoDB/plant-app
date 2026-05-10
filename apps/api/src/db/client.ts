import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import { loadEnv } from '../config/env.js';
import * as schema from './schema.js';

let pool: pg.Pool | undefined;
let db: NodePgDatabase<typeof schema> | undefined;

/** Lazily initialised so unit tests that never touch the DB don't open connections. */
export function getDb(): NodePgDatabase<typeof schema> {
  if (db) return db;
  const env = loadEnv();
  pool = new pg.Pool({ connectionString: env.DATABASE_URL });
  db = drizzle(pool, { schema });
  return db;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
    db = undefined;
  }
}

export { schema };
