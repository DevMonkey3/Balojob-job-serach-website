// Runs inside the one-shot "migrate" container (Dockerfile target "migrate")
// before the app starts, on every deploy. Safe to run again and again:
//
//   1. prisma migrate deploy   applies only the migrations that have not run yet
//   2. db/seed.sql             master data, loaded only while the master tables are empty
//
// db/sample-data.sql (demo rows) is not in the image and is never loaded here.

import { spawnSync } from "node:child_process";
import pg from "pg";

const PRISMA_CLI = "node_modules/prisma/build/index.js";
const SEED_FILE = "db/seed.sql";
// The tables db/seed.sql fills. selection_options is the one seed.sql itself checks.
const MASTER_TABLES = ["selection_options", "popular_industries", "site_settings"];

const log = (message) => console.log(`[migrate] ${message}`);

function prisma(...args) {
  const result = spawnSync(process.execPath, [PRISMA_CLI, ...args], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`"prisma ${args.join(" ")}" failed (exit code ${result.status}). See the lines above.`);
  }
}

async function connect() {
  // Compose starts this job only after the database reports healthy; the
  // retries cover a database that is still settling.
  let lastError;
  for (let attempt = 1; attempt <= 15; attempt++) {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
    // Without a listener a dropped connection would crash the process with a stack trace.
    client.on("error", () => {});
    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => {});
      log(`The database is not answering yet (attempt ${attempt} of 15).`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw new Error(`Could not connect to the database: ${lastError?.message ?? "unknown error"}`);
}

async function masterRowCounts() {
  const client = await connect();
  try {
    const counts = {};
    for (const table of MASTER_TABLES) {
      const { rows } = await client.query(`SELECT count(*)::int AS n FROM "${table}"`);
      counts[table] = rows[0].n;
    }
    return counts;
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");

  log("Applying database migrations (prisma migrate deploy)...");
  prisma("migrate", "deploy");

  const counts = await masterRowCounts();
  const summary = MASTER_TABLES.map((table) => `${table}: ${counts[table]}`).join(", ");
  const filled = MASTER_TABLES.filter((table) => counts[table] > 0);

  if (filled.length === 0) {
    log(`Master tables are empty: loading ${SEED_FILE} (dropdown lists, popular industries, settings)...`);
    prisma("db", "execute", "--file", SEED_FILE);
    log("Master data loaded.");
  } else if (counts.selection_options > 0) {
    log(`Master data is already there (${summary}). Seed skipped.`);
  } else {
    // Unusual: the dropdown lists are empty but another master table is not.
    // seed.sql would fail half way, so leave the decision to a person.
    log(`WARNING: selection_options is empty but other master tables are not (${summary}).`);
    log(`WARNING: ${SEED_FILE} was NOT loaded. Check the data, then fill the lists on the console's master screens.`);
  }

  log("Done.");
}

main().catch((error) => {
  console.error(`[migrate] FAILED: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
