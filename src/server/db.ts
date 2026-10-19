import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// One client (and one connection pool) per server process. Hot reload in
// development re-runs this module, so the client is kept on globalThis.
const globalForDb = globalThis as unknown as { db?: PrismaClient; dbUrl?: string };

const isProduction = process.env.NODE_ENV === "production";

function createClient(connectionString: string | undefined) {
  // Undefined during a build without secrets. Nothing queries at build time,
  // so only a request that reaches the database would fail.
  //
  // Prisma reads and writes timestamps as UTC, so the session must run in UTC.
  // A local PostgreSQL on a Japanese PC defaults to Asia/Tokyo, which shifted
  // every app-written timestamp by nine hours; this pins it regardless of the
  // server's setting (Aurora is UTC already).
  const adapter = new PrismaPg({ connectionString, options: "-c TimeZone=UTC" });
  return new PrismaClient({
    adapter,
    log: isProduction ? ["error"] : ["warn", "error"],
  });
}

function client(): PrismaClient {
  const url = process.env.DATABASE_URL;
  // In development `next dev` reloads .env files without restarting, so a
  // changed DATABASE_URL gets a new client instead of the cached pool.
  if (!globalForDb.db || (!isProduction && globalForDb.dbUrl !== url)) {
    globalForDb.db = createClient(url);
    globalForDb.dbUrl = url;
  }
  return globalForDb.db;
}

// Resolved on every access so the check above runs; methods are bound to the
// real client because Prisma uses private fields.
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const c = client();
    const value = Reflect.get(c, prop);
    return typeof value === "function" ? value.bind(c) : value;
  },
});
