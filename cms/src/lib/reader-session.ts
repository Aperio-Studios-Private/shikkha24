import { signToken, verifyToken } from './signed-token'

/**
 * The reader session cookie a social login leaves behind.
 *
 * ## Why not Payload's own login
 *
 * Readers have no password (see `collections/Readers.ts`). Payload's built-in
 * `login` operation requires one, and its session machinery is built around that
 * operation, so a passwordless reader cannot be signed in through it. A **custom
 * auth strategy** is the supported extension point for exactly this case
 * (`docs/authentication/custom-strategies`), and it needs a token to read.
 *
 * The signing itself lives in `lib/signed-token.ts`, shared with the OAuth
 * `state` parameter. This module only decides what a *reader session* means:
 * which cookie, how long, and how it is set.
 */

/** Cookie name. Prefixed so it cannot collide with Payload's `payload-token`. */
export const READER_SESSION_COOKIE = 'shikkha24_reader'

/** Sessions last 30 days — a news reader should not be logged out weekly. */
export const READER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

/**
 * Domain separator. Also the reason an OAuth `state` cannot be replayed as a
 * session: the two features sign under different contexts.
 */
const CONTEXT = 'reader-session:v1'

/**
 * Mint a session token for a reader.
 *
 * The payload carries a reader id and an expiry and nothing else — it is signed,
 * not encrypted, so nothing secret may go in it.
 *
 * @param now Injectable clock, so a harness can mint an already-expired token.
 */
export function signReaderSession(readerId: number | string, now: number = Date.now()): string {
  return signToken(
    { id: String(readerId) },
    { context: CONTEXT, ttlSeconds: READER_SESSION_MAX_AGE_SECONDS },
    now,
  )
}

/**
 * Verify a session token and return the reader id it names, or `null`.
 *
 * Never throws — it runs inside an auth strategy on every request, where a
 * thrown error would turn a bad cookie into a 500.
 */
export function verifyReaderSession(
  token: string | undefined | null,
  now: number = Date.now(),
): string | null {
  const claims = verifyToken<{ id?: unknown; exp?: unknown }>(
    token,
    { context: CONTEXT, ttlSeconds: READER_SESSION_MAX_AGE_SECONDS },
    now,
  )
  return typeof claims?.id === 'string' && claims.id !== '' ? claims.id : null
}

/**
 * The `Set-Cookie` value for a session.
 *
 * `httpOnly` keeps the token away from scripts (so an XSS in an article cannot
 * steal a reader's session), `sameSite: 'lax'` allows the OAuth redirect back
 * from the provider while blocking cross-site form posts, and `secure` is on
 * whenever the CMS is served over HTTPS.
 */
export function readerSessionSetCookie(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${READER_SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${READER_SESSION_MAX_AGE_SECONDS}${secure}`
}

/** The `Set-Cookie` value that clears a session — used on logout. */
export function readerSessionClearCookie(): string {
  return `${READER_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}
