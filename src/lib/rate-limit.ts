// Rate limiter with Redis (Upstash) support, falls back to in-memory for dev
// Production: Set KV_REST_API_URL and KV_REST_API_TOKEN env vars

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// --- Redis-backed rate limiter (production) ---
let redisRatelimiters: Record<string, Ratelimit> | null = null;

function getRedisLimiters(): Record<string, Ratelimit> | null {
  if (redisRatelimiters) return redisRatelimiters;

  // Support both Upstash direct and legacy Vercel KV env var names
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });

  redisRatelimiters = {
    chat: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "60 s"),
      prefix: "rl:chat",
    }),
    flightSearch: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      prefix: "rl:flight",
    }),
    api: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "60 s"),
      prefix: "rl:api",
    }),
    chatRead: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "60 s"),
      prefix: "rl:chatRead",
    }),
    chatDelete: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      prefix: "rl:chatDelete",
    }),
    hotelDetails: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "60 s"),
      prefix: "rl:hotelDetails",
    }),
  };

  return redisRatelimiters;
}

// --- In-memory fallback (dev / no Redis) ---
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries periodically (only in long-lived processes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitMap) {
      if (now > value.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }, 60_000);
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

function inMemoryRateLimit(
  userId: string,
  endpoint: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const key = `${userId}:${endpoint}`;
  const now = Date.now();
  const existing = rateLimitMap.get(key);

  if (!existing || now > existing.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  existing.count++;
  if (existing.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  return { allowed: true, remaining: config.maxRequests - existing.count, resetAt: existing.resetAt };
}

// --- Unified rate limit function ---
export async function rateLimit(
  userId: string,
  endpoint: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const redisLimiters = getRedisLimiters();

  if (redisLimiters && redisLimiters[endpoint]) {
    try {
      const result = await redisLimiters[endpoint].limit(userId);
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetAt: result.reset,
      };
    } catch {
      // Redis error — fall back to in-memory
    }
  }

  return inMemoryRateLimit(userId, endpoint, config);
}

// Preset configs
export const RATE_LIMITS = {
  chat: { maxRequests: 30, windowMs: 60_000 },
  flightSearch: { maxRequests: 10, windowMs: 60_000 },
  api: { maxRequests: 60, windowMs: 60_000 },
  chatRead: { maxRequests: 60, windowMs: 60_000 },
  chatDelete: { maxRequests: 10, windowMs: 60_000 },
  hotelDetails: { maxRequests: 20, windowMs: 60_000 },
} as const;
