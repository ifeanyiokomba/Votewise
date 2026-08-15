// In-memory token-bucket / sliding-window rate limiter.
// Suitable for single-instance deployments. For multi-instance, swap with Redis.

interface BucketEntry {
  timestamps: number[];
}

const buckets = new Map<string, BucketEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  windowMs: number,
  max: number
): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key) ?? { timestamps: [] };

  // purge expired
  entry.timestamps = entry.timestamps.filter((t) => t > now - windowMs);

  if (entry.timestamps.length >= max) {
    const oldest = entry.timestamps[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      resetAt: oldest + windowMs,
    };
  }

  entry.timestamps.push(now);
  buckets.set(key, entry);

  return {
    allowed: true,
    remaining: max - entry.timestamps.length,
    resetAt: now + windowMs,
  };
}

export function clearRateLimit(key: string): void {
  buckets.delete(key);
}

// Periodic cleanup to avoid memory growth
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of buckets) {
      entry.timestamps = entry.timestamps.filter((t) => t > now - 60 * 60 * 1000);
      if (entry.timestamps.length === 0) buckets.delete(key);
    }
  }, 5 * 60 * 1000).unref?.();
}
