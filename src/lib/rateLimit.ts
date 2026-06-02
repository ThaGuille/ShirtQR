// A tiny in-memory fixed-window rate limiter. No deps, no infra.
//
// Caveat: serverless instances each keep their own counters and cold starts
// reset them, so this is a *soft* limit — enough to blunt a single phone
// hammering the API, not a hard guarantee. The upgrade path (if a festival ever
// gets big enough to need it) is a durable store like a Supabase table or
// Upstash Redis keyed the same way. Kept deliberately simple for the free tier.

type Window = { count: number; resetAt: number };

const buckets = new Map<string, Window>();

export type RateLimitResult = { ok: boolean; retryAfterSeconds: number };

/**
 * @param key      identity to limit on (e.g. `posts:1.2.3.4`)
 * @param limit    max requests allowed per window
 * @param windowMs window length in milliseconds
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (existing.count < limit) {
    existing.count++;
    return { ok: true, retryAfterSeconds: 0 };
  }

  return {
    ok: false,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

// Best-effort client IP from the proxy headers Vercel sets. Falls back to a
// constant so a missing header doesn't accidentally bypass the limit entirely.
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
