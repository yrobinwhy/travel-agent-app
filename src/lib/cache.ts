// Redis cache layer using Upstash — falls back to in-memory Map for dev
import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

// In-memory fallback for dev (no Redis)
const memCache = new Map<string, { data: string; expiresAt: number }>();

// Clean up expired entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of memCache) {
      if (now > val.expiresAt) memCache.delete(key);
    }
  }, 60_000);
}

/**
 * Get a cached value. Returns null if not found or expired.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (r) {
    try {
      const val = await r.get<T>(key);
      return val ?? null;
    } catch {
      // Redis error — try in-memory
    }
  }

  const mem = memCache.get(key);
  if (mem && Date.now() < mem.expiresAt) {
    return JSON.parse(mem.data) as T;
  }
  return null;
}

/**
 * Set a cached value with TTL in seconds.
 */
export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const r = getRedis();
  if (r) {
    try {
      await r.set(key, JSON.stringify(value), { ex: ttlSeconds });
      return;
    } catch {
      // Redis error — fall back to in-memory
    }
  }

  memCache.set(key, {
    data: JSON.stringify(value),
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

// --- Cache key builders ---

/** TripAdvisor ranking for a specific hotel (cached 24 hours — rankings don't change fast) */
export function taCacheKey(hotelName: string, location: string): string {
  const normalized = hotelName.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 60);
  const loc = location.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30);
  return `ta:${loc}:${normalized}`;
}

/** Hotel detail for a property token (cached 6 hours — prices change) */
export function hotelDetailCacheKey(propertyToken: string, checkIn: string, checkOut: string): string {
  return `hd:${propertyToken}:${checkIn}:${checkOut}`;
}

/** Flight search results (cached 15 minutes — prices volatile) */
export function flightCacheKey(origin: string, dest: string, date: string, cabin: string): string {
  return `fl:${origin}:${dest}:${date}:${cabin}`;
}

// --- TTLs ---
export const CACHE_TTL = {
  tripAdvisorRanking: 86400,  // 24 hours
  hotelDetail: 21600,          // 6 hours
  flightSearch: 900,           // 15 minutes
} as const;
