/**
 * Shared helpers for the public write endpoints.
 *
 * The S9 endpoints (`newsletter`, `citizen`, `comments`) are three narrow
 * operations on public surfaces, and all three need the same four things:
 * read a JSON body without trusting it, find the caller's IP, answer with a
 * status code, and treat a filled honeypot as a silent success. Those lived
 * copy-pasted in each file until there were three of them.
 *
 * ## The honeypot rule, stated once
 *
 * A filled honeypot must return a **normal-looking success without writing**.
 * Returning an error tells the bot which field caught it, and the next attempt
 * fills the field correctly. This is why `isHoneypotFilled` is checked before
 * anything else in every handler.
 */
import type { PayloadRequest } from 'payload'

/** Deliberately loose. The confirmation mail is the real address validation. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Best-effort client IP.
 *
 * On DianaHost, Passenger passes the client IP via `x-forwarded-for`. The first
 * entry is the real client address. `x-real-ip` is a fallback set by some
 * reverse proxies. There is no Cloudflare-specific header (Cloudflare removed
 * 2026-09-14).
 */
export function clientIp(req: PayloadRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return req.headers.get('x-real-ip') ?? 'unknown'
}

/**
 * JSON response with an explicit status.
 *
 * Accepts either a bare status number or a full `ResponseInit`, because several
 * handlers need to attach a `Retry-After` header on the 429 path and a bare
 * number cannot express that.
 */
export function json(body: unknown, init: number | ResponseInit = 200): Response {
  return Response.json(body, typeof init === 'number' ? { status: init } : init)
}

/**
 * A 429 response carrying `Retry-After`.
 *
 * Every rate-limited branch of every endpoint answers identically, so the
 * wording lives here rather than three times over.
 */
export function tooManyRequests(retryAfterSeconds: number): Response {
  return json(
    { error: 'অনেকবার চেষ্টা করা হয়েছে। একটু পরে আবার চেষ্টা করুন।' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  )
}

/**
 * Parse the request body, returning `{}` for anything unparseable.
 *
 * A malformed body is not an error worth a stack trace — the caller gets an
 * empty object, every field check fails, and the reader gets a field-level
 * message rather than a parse error they cannot act on.
 */
export async function readJsonBody(req: PayloadRequest): Promise<Record<string, unknown>> {
  try {
    return ((await req.json?.()) ?? {}) as Record<string, unknown>
  } catch {
    return {}
  }
}

/** `true` when the honeypot field carries anything at all. */
export function isHoneypotFilled(body: Record<string, unknown>): boolean {
  return typeof body.company === 'string' && body.company.trim() !== ''
}

/**
 * Trim a value and enforce a maximum length, or `null` if it is unusable.
 *
 * Used for every reader-supplied string, so no field can be written longer than
 * its column allows and no whitespace-only value reaches the database.
 */
export function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > max) return null
  return trimmed
}
