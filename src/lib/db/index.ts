import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Use a getter that initializes on first access at runtime
// This prevents build-time errors when DATABASE_URL isn't set
function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
}

// Cache the DB instance
let _db: ReturnType<typeof createDb> | undefined;

export function getDb() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

// For backward compatibility — most imports use `db` directly
// This works because it's only accessed at runtime in route handlers
export const db = (() => {
  // During build, DATABASE_URL may not exist — that's OK
  // The routes that use `db` are only called at runtime
  if (process.env.DATABASE_URL) {
    return createDb();
  }
  // Return a dummy that will throw on actual use
  return new Proxy({} as ReturnType<typeof createDb>, {
    get() {
      throw new Error("DATABASE_URL is not set — database not available");
    },
  });
})();

export type Database = ReturnType<typeof createDb>;
