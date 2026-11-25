import "server-only";
import { headers } from "next/headers";

// Brakes on guessing and on sign-up floods, counted in this server's memory.
// Enough for one server process; with several servers the counts would have
// to move to a shared store (Redis / Valkey).
//
// Every counter is a fixed window: `max` events are allowed per `windowMs`,
// then the key is refused until the window ends.

type Counter = { count: number; until: number };

const counters = new Map<string, Counter>();
/** Upper bound on remembered keys, so random login IDs cannot fill the memory. */
const MAX_KEYS = 20_000;

function prune(now: number) {
  for (const [key, c] of counters) if (c.until <= now) counters.delete(key);
  // Still full of live keys (an attack in progress): forget the oldest ones.
  if (counters.size > MAX_KEYS) {
    let extra = counters.size - MAX_KEYS;
    for (const key of counters.keys()) {
      counters.delete(key);
      if (--extra <= 0) break;
    }
  }
}

/** True while `key` has used up its allowance. Does not count anything. */
export function isBlocked(key: string, max: number): boolean {
  // No address to tell visitors apart (no reverse proxy): a per-address limit
  // would then be one limit for everybody, so it is not applied.
  if (key.endsWith(":unknown")) return false;
  const c = counters.get(key);
  return !!c && c.until > Date.now() && c.count >= max;
}

/** Counts one event for `key`. */
export function record(key: string, windowMs: number): void {
  const now = Date.now();
  const c = counters.get(key);
  if (c && c.until > now) {
    c.count += 1;
    return;
  }
  if (counters.size >= MAX_KEYS) prune(now);
  counters.set(key, { count: 1, until: now + windowMs });
}

export function clear(key: string): void {
  counters.delete(key);
}

/**
 * The visitor's address as the reverse proxy reports it. Behind Caddy (see
 * deploy/aws) the last entry of X-Forwarded-For is the one the proxy itself
 * saw, so a visitor cannot choose it. "unknown" when there is no proxy.
 */
export async function clientIp(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for");
  const last = forwarded?.split(",").pop()?.trim();
  return last ? last.slice(0, 45) : "unknown";
}

const MINUTE = 60 * 1000;

/** Wrong passwords for one login ID: 10, then locked for 15 minutes. */
export const LOGIN_ID = { max: 10, windowMs: 15 * MINUTE };
/** Wrong passwords from one address, across all login IDs: 40 per 15 minutes. */
export const LOGIN_IP = { max: 40, windowMs: 15 * MINUTE };
/** New accounts from one address: 10 per hour. */
export const SIGNUP_IP = { max: 10, windowMs: 60 * MINUTE };

export const TOO_MANY_ATTEMPTS = "試行回数が多すぎます。15分後に再度お試しください。";
export const TOO_MANY_SIGNUPS = "登録の回数が多すぎます。しばらくしてから再度お試しください。";
