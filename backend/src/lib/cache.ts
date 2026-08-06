import { getRedis } from "../db/redis";

/**
 * Returns a cached JSON value for `key` if present, otherwise calls
 * `fetcher`, stores the result for `ttlSeconds`, and returns it. If Redis
 * isn't configured or reachable, just calls `fetcher` directly - this is
 * a performance/rate-limit optimization, not something correctness
 * should depend on.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const redis = getRedis();
  if (!redis) return fetcher();

  try {
    const existing = await redis.get(key);
    if (existing) return JSON.parse(existing) as T;
  } catch {
    // fall through to fetching fresh
  }

  const fresh = await fetcher();

  try {
    await redis.set(key, JSON.stringify(fresh), "EX", ttlSeconds);
  } catch {
    // caching is best-effort; a failure here shouldn't fail the request
  }

  return fresh;
}
