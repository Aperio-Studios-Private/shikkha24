import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Signed, expiring tokens — one implementation, two uses.
 *
 * Both the reader session cookie (`lib/reader-session.ts`) and the OAuth `state`
 * parameter (`lib/oauth.ts`) need the same thing: a value the browser carries
 * that we can prove *we* issued, that names its own expiry, and that cannot be
 * edited. Writing that twice would mean two places to get the comparison wrong.
 *
 * ## What a token is
 *
 * `base64url(payload).base64url(hmac)` — signed, **not encrypted**. The payload
 * is readable by anyone holding the token, so nothing secret may go in it. The
 * signature is what stops a holder from editing it.
 *
 * Not a JWT on purpose: a JWT library is a dependency this project would have to
 * justify and pin (agent rule 8), and the format here is internal — there is
 * nothing to interoperate with.
 *
 * ## Context binding
 *
 * `context` is mixed into the HMAC input, so a token minted for one feature is
 * rejected by another even though both use the same key. Without it, an OAuth
 * `state` would be a valid reader session and vice versa.
 */

/** Default signing key. Rotation invalidates every outstanding token at once. */
function signingKey(): string {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) {
    // Failing loudly beats signing with a fallback. A predictable key would let
    // anyone mint a session for any reader.
    throw new Error('[signed-token] PAYLOAD_SECRET is not set — cannot sign tokens')
  }
  return secret
}

/** Options every token carries. */
export interface SignedTokenOptions {
  /** Feature binding — see the note on context above. */
  context: string
  /** How long the token stays valid, in seconds. */
  ttlSeconds: number
}

interface TokenEnvelope {
  exp?: unknown
  [key: string]: unknown
}

function digest(context: string, payload: string): string {
  return createHmac('sha256', signingKey()).update(`${context}.${payload}`).digest('base64url')
}

/**
 * Mint a token.
 *
 * @param claims Values to carry. Must not contain secrets — the payload is only
 *               signed, not encrypted. `exp` is overwritten.
 * @param now    Injectable clock, so a harness can mint an expired token.
 */
export function signToken(
  claims: Record<string, unknown>,
  options: SignedTokenOptions,
  now: number = Date.now(),
): string {
  const expiresAt = Math.floor(now / 1000) + options.ttlSeconds
  const payload = Buffer.from(JSON.stringify({ ...claims, exp: expiresAt })).toString('base64url')
  return `${payload}.${digest(options.context, payload)}`
}

/**
 * Verify a token and return its claims, or `null`.
 *
 * Returns `null` — never throws — for a malformed string, a wrong signature, a
 * token from another context, or an expired one. It runs inside an auth strategy
 * on every request, where a throw would turn a bad cookie into a 500.
 *
 * @param now Injectable clock, so expiry can be tested without waiting.
 */
export function verifyToken<T extends TokenEnvelope = TokenEnvelope>(
  token: string | undefined | null,
  options: SignedTokenOptions,
  now: number = Date.now(),
): T | null {
  if (!token) return null

  const separator = token.lastIndexOf('.')
  if (separator <= 0) return null

  const payload = token.slice(0, separator)
  const provided = token.slice(separator + 1)
  if (!payload || !provided) return null

  let expected: string
  try {
    expected = digest(options.context, payload)
  } catch {
    // No secret configured — treat as unauthenticated rather than crashing.
    return null
  }

  // Compare as buffers: `timingSafeEqual` throws on a length mismatch, and a
  // plain `===` would leak the signature one byte at a time.
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as T
    if (typeof decoded.exp !== 'number' || decoded.exp * 1000 <= now) return null
    return decoded
  } catch {
    return null
  }
}

/** Read one cookie out of a raw `Cookie:` header. */
export function readCookie(header: string | null | undefined, name: string): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    if (part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim())
    }
  }
  return null
}
