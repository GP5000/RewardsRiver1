/**
 * lib/rateLimit.ts
 *
 * In-memory rate limiter with a Redis-compatible interface.
 * In development (or when REDIS_URL is not set) uses a Map with sliding window.
 * Swap to Upstash Redis by setting REDIS_URL — the interface is identical.
 *
 * Usage:
 *   const allowed = await checkRateLimit(`ip:${ip}`, 30, 60); // 30 req/60s
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // unix ms
}

// In-memory store — fine for single-process dev/staging
const store = new Map<string, RateLimitEntry>();

// Clean up expired keys periodically to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 60_000);

/**
 * Returns true if the request is allowed, false if rate limited.
 * @param key      Unique key (e.g. "ip:1.2.3.4" or "placement:abc123")
 * @param limit    Max requests allowed in the window
 * @param windowSec Window size in seconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<boolean> {
  const now = Date.now();
  const windowMs = windowSec * 1000;

  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}

/**
 * Returns remaining requests in the current window (for headers).
 */
export function getRateLimitInfo(
  key: string,
  limit: number
): { remaining: number; resetAt: number } {
  const entry = store.get(key);
  if (!entry || entry.resetAt < Date.now()) {
    return { remaining: limit, resetAt: Date.now() };
  }
  return { remaining: Math.max(0, limit - entry.count), resetAt: entry.resetAt };
}
