import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { updateTag } from "next/cache";
import { after } from "next/server";

// Cached lists ("use cache" + cacheTag) live in each server process's own
// memory. Production runs two copies of the app (docker-compose.yml: app and
// app2), so when staff approve a job the copy that handled the click must tell
// the other one, or half the visitors would keep seeing the old list.
//
// refreshTag() is used wherever the code used to call updateTag(): it refreshes
// this copy at once, then (after the response is sent) asks every other copy to
// drop the same tag through POST /api/internal/refresh-tag.

/** Every tag the app uses. The internal endpoint accepts nothing else. */
export const CACHE_TAGS = ["listings", "options", "popular-industries"] as const;
export type CacheTag = (typeof CACHE_TAGS)[number];

export const INTERNAL_HEADER = "x-bj-internal";
export const REFRESH_PATH = "/api/internal/refresh-tag";

/** The other copies of the app, e.g. "http://app2:3000". Empty on a single server process. */
function peerOrigins(): string[] {
  return (process.env.PEER_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter((s) => /^https?:\/\/[A-Za-z0-9.-]+(:\d+)?$/.test(s));
}

/**
 * The password the copies use between themselves. It is derived from
 * APP_ENCRYPTION_KEY, which every copy already has, so there is no extra
 * secret to generate, store or keep in step.
 */
function internalToken(): string | null {
  const key = process.env.APP_ENCRYPTION_KEY;
  if (!key) return null;
  return createHmac("sha256", key).update("bhalojob:internal:refresh-tag:v1").digest("hex");
}

/** True when `value` is the token above (compared in constant time). */
export function isInternalToken(value: string | null): boolean {
  const token = internalToken();
  if (!token || !value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Drop the cached data under `tag`, here now and on the other copies a moment later. */
export function refreshTag(tag: CacheTag): void {
  updateTag(tag);

  const origins = peerOrigins();
  const token = internalToken();
  if (origins.length === 0 || !token) return;

  // After the response: the person who clicked never waits for the other copy.
  after(async () => {
    await Promise.all(
      origins.map((origin) =>
        fetch(`${origin}${REFRESH_PATH}`, {
          method: "POST",
          headers: { "content-type": "application/json", [INTERNAL_HEADER]: token },
          body: JSON.stringify({ tag }),
          signal: AbortSignal.timeout(3000),
          cache: "no-store",
        }).catch((error: unknown) => {
          // The other copy is restarting or busy. Its cache expires by itself
          // within minutes (cacheLife), so this is logged, not retried.
          console.warn(`[cache] could not refresh "${tag}" on ${origin}:`, error instanceof Error ? error.message : error);
        }),
      ),
    );
  });
}
