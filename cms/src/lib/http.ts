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
 * The client IP from raw headers.
 *
 * ## ⚠️ Why the LAST entry, not the first (F-13)
 *
 * `x-forwarded-for` is a **client-supplied, appendable** header. A proxy
 * *appends* the address it saw; it does not validate what was already there. So
 * a client can send `X-Forwarded-For: 9.9.9.9` and the header arrives as:
 *
 *     X-Forwarded-For: 9.9.9.9, <address the proxy actually saw>
 *
 * Taking entry `[0]` therefore returns whatever the caller chose. Rotating that
 * header per request defeated **every** rate limiter in this codebase — comments,
 * newsletter signup, poll votes, bookmarks, account deletion — and also the poll
 * `voterHash` and reaction `fingerprint`, both of which key on IP + user agent,
 * so it defeated duplicate-vote detection too. One header, and the abuse
 * controls on every public write endpoint were opt-in.
 *
 * The **rightmost** entry is the one the trusted hop wrote, so that is the one
 * read. This is correct whether the proxy appends *or* overwrites the header:
 *
 * | Proxy behaviour      | Header received                   | Rightmost  |
 * |----------------------|-----------------------------------|------------|
 * | appends (standard)   | `9.9.9.9, 203.0.113.5`            | `203.0.113.5` ✓ |
 * | overwrites           | `203.0.113.5`                      | `203.0.113.5` ✓ |
 *
 * Leftmost is correct only in the second row, and only by luck.
 *
 * ## ⚠️ This is correct only while there is exactly ONE trusted hop
 *
 * The deployment is Client → Apache/Passenger → Node (`docs/cms-deployment.md`
 * §1), so the last entry is Passenger's and the reasoning above holds. Behind a
 * second proxy (a CDN or load balancer in front of Passenger) the last entry
 * would be *that* proxy's client-visible address, and a client could forge one
 * entry to its left. If a proxy is ever added in front, re-derive this: the
 * correct entry is the last one written by a hop we trust, counted from the
 * right.
 *
 * `x-real-ip` is the fallback for hosts that do not use `x-forwarded-for`. It is
 * equally client-supplied, so it carries the same caveat — it is a fallback, not
 * a stronger source. There is no Cloudflare-specific header (Cloudflare removed
 * 2026-09-14).
 *
 * ⚠️ Takes `Headers` rather than a `PayloadRequest` so **Next middleware can use
 * the same implementation** — it has a request but not a Payload request, and a
 * second copy of this rule would be a second thing to get wrong.
 */
export function ipFromHeaders(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    // Last non-empty entry wins. Filter first so a trailing comma
    // (`a, b,`) cannot yield an empty string and fall through to 'unknown'.
    const hops = forwarded
      .split(',')
      .map((hop) => hop.trim())
      .filter(Boolean)
    if (hops.length > 0) return hops[hops.length - 1] as string
  }
  return headers.get('x-real-ip') ?? 'unknown'
}

/** The client IP for a Payload request. */
export function clientIp(req: PayloadRequest): string {
  return ipFromHeaders(req.headers)
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
