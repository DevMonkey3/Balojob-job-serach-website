import { revalidateTag } from "next/cache";
import { CACHE_TAGS, INTERNAL_HEADER, isInternalToken, type CacheTag } from "@/server/cache-tags";

// One copy of the app telling another to drop a cached list (see
// src/server/cache-tags.ts). Only reachable inside the Docker network: Caddy
// answers 404 for /api/internal/* from the internet, and a request without the
// internal token gets the same 404 here.

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  if (!isInternalToken(request.headers.get(INTERNAL_HEADER))) return notFound();

  let tag: unknown;
  try {
    tag = ((await request.json()) as { tag?: unknown }).tag;
  } catch {
    return notFound();
  }
  if (typeof tag !== "string" || !(CACHE_TAGS as readonly string[]).includes(tag)) return notFound();

  // expire 0: the next visitor gets fresh data, never the old list.
  revalidateTag(tag as CacheTag, { expire: 0 });
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
