/**
 * Tiny in-memory sliding-window rate limiter.
 *
 * ## Why not a library
 *
 * Every rate-limiting package worth using needs Redis or another shared store —
 * a card at signup, and a service to keep alive. The CMS is a **single Next.js
 * process** on the host, so an in-process counter is genuinely correct here: one
 * process, one counter, no coordination needed.
 *
 * ## What it is not
 *
 * It resets when the process restarts, and it does not survive horizontal
 * scaling. That is acceptable for what it guards — a reader poll — and it is
 * **not** sufficient for anything that protects money or credentials. If the CMS
 * ever runs more than one instance this must move to a shared store.
 *
 * `docs/security.md` §5 notes there is **no CDN rate limiting** (no CDN),
 * so this is the only line of defence at the application
 * layer.
 */

interface Bucket {
  count: number
  /** Epoch ms at which this window expires and the counter resets. */
  resetAt: number
}

const buckets = new Map<string, Bucket>()

/**
 * How many entries to tolerate before sweeping expired ones.
 *
 * Without a sweep the map grows with every distinct caller and becomes a slow
 * memory leak on a 2 GB host. Sweeping only when it is large keeps the common
 * path free of iteration.
 */
const SWEEP_THRESHOLD = 5_000

function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export interface RateLimitResult {
  /** `false` means the caller is over the limit and the action must be refused. */
  ok: boolean
  /** Seconds until the window resets — for a `Retry-After` header. */
  retryAfterSeconds: number
}

/**
 * Count one attempt against `key`.
 *
 * @param key      Usually `${action}:${ip}`. Include the action so two features
 *                 cannot exhaust each other's allowance.
 * @param limit    Maximum attempts permitted inside the window.
 * @param windowMs Window length in milliseconds.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()

  if (buckets.size > SWEEP_THRESHOLD) sweep(now)

  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfterSeconds: 0 }
  }

  existing.count += 1

  if (existing.count > limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) }
  }

  return { ok: true, retryAfterSeconds: 0 }
}
