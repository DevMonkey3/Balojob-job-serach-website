import { connection } from "next/server";
import { db } from "@/server/db";

// Health check for Docker, the reverse proxy and uptime monitors (see
// docs/aws-deploy.md). No sign-in and no cache. 200 only when the database
// answers a trivial query, 503 otherwise. The body never says why a check
// failed; the reason goes to the server log.

const TIMEOUT_MS = 4_000;
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  // Answered per request, never prerendered: there is no database during `next build`.
  await connection();

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      db.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("no answer from the database in time")), TIMEOUT_MS);
      }),
    ]);
    return Response.json({ status: "ok" }, { headers: NO_STORE });
  } catch (error) {
    console.error("[health] database check failed:", error instanceof Error ? error.message : "unknown error");
    return Response.json({ status: "unavailable" }, { status: 503, headers: NO_STORE });
  } finally {
    clearTimeout(timer);
  }
}
