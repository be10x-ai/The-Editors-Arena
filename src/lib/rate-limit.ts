/**
 * Minimal in-memory rate limiter for the public endpoints (registration, OTP
 * request, login). Per-instance only — good enough to stop a single client
 * hammering a form, and it degrades safely.
 *
 * For a hard guarantee across serverless instances, swap `hit()` for an
 * Upstash/Redis INCR with the same signature; nothing else needs to change.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function hit(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  if (buckets.size > MAX_KEYS) {
    for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  return {
    ok: existing.count <= limit,
    remaining,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/** Best-effort client identity from proxy headers. */
export function clientKey(headers: Headers, scope: string): string {
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown";
  return `${scope}:${ip}`;
}

export const LIMITS = {
  register: { limit: 5, window: 600 },
  otpRequest: { limit: 5, window: 900 },
  login: { limit: 10, window: 600 },
  uploadSession: { limit: 20, window: 3600 },
} as const;
