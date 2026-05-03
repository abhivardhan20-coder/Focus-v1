import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Lazily initialised so that importing this module does not crash in
// environments where DATABASE_URL is not set (e.g. during type-checking,
// test runs, or future API routes that are loaded before the DB is ready).
let _pool: pg.Pool | null = null;
let _db: NodePgDatabase<typeof schema> | null = null;

function getPool(): pg.Pool {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
    }
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _pool;
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}

// Convenience re-export for callers that want the legacy direct references.
// These are getters so the module can be imported safely without DATABASE_URL.
export const pool = new Proxy({} as pg.Pool, {
  get(_t, prop) { return (getPool() as any)[prop]; },
});
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_t, prop) { return (getDb() as any)[prop]; },
});

export * from "./schema";
