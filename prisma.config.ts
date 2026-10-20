import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// Prisma doesn't read .env files. Load them the same way Next.js does, so the
// CLI and the app both take DATABASE_URL from .env.local. A value already set in
// the environment wins over the files.
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Master data only (dropdown lists, popular industries, settings).
    seed: "prisma db execute --file db/seed.sql",
  },
  datasource: {
    // Unset on a build server without secrets: `prisma generate` doesn't need it,
    // and migrate / db commands fail with a clear message.
    url: process.env.DATABASE_URL,
  },
});
