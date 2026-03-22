// Simple in-memory rate limiter for serverless
// In production, replace with Redis-backed (Upstash) for multi-instance support

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap) {
    if (now > value.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 60_000);

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export function rateLimit(
  userId: string,
  endpoint: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const key = `${userId}:${endpoint}`;
  const now = Date.now();

  const existing = rateLimitMap.get(key);

  if (!existing || now > existing.resetAt) {
    // New window
    rateLimitMap.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  existing.count++;

  if (existing.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  return { allowed: true, remaining: config.maxRequests - existing.count, resetAt: existing.resetAt };
}

// Preset configs
export const RATE_LIMITS = {
  chat: { maxRequests: 30, windowMs: 60_000 }, // 30 messages/min
  flightSearch: { maxRequests: 10, windowMs: 60_000 }, // 10 searches/min
  api: { maxRequests: 60, windowMs: 60_000 }, // 60 requests/min general
} as const;
