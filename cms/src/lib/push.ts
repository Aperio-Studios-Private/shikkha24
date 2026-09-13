import webpush from 'web-push'

/**
 * Web Push transport.
 *
 * ## Why a library and not `node:crypto`
 *
 * Web Push is two pieces of genuinely subtle cryptography: a **VAPID** ES256 JWT
 * for authentication, and **aes128gcm** payload encryption (ECDH P-256, HKDF,
 * AES-GCM). Node's crypto has every primitive, and rolling it by hand would be
 * about 150 lines of code that **cannot be tested without a real push service** —
 * which the owner does not have yet. Shipping untestable hand-written crypto is
 * worse than taking a maintained dependency, so this uses `web-push`.
 *
 * ⚠️ `web-push@3.6.7` is **MPL-2.0**, the first non-MIT dependency in this
 * project. MPL-2.0 is file-level copyleft: using the library unmodified imposes
 * nothing on this codebase. Recorded in `.sps/handoff.md` for the owner.
 *
 * ## Self-hiding, like every other S9 integration
 *
 * `isPushConfigured()` is false until all three VAPID values are present. The
 * frontend reads the public key at build time and renders no reminder control
 * without it, so a reader never sees a bell they cannot ring.
 */

/** The shape `web-push` expects for a stored subscription. */
export interface PushTarget {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

/** What a send attempt resulted in. */
export type PushOutcome =
  | { status: 'sent' }
  /** The subscription is dead — 404/410. The caller must delete the row. */
  | { status: 'gone' }
  /** A transient or configuration failure. Keep the row, report the reason. */
  | { status: 'failed'; error: string }

/** Are all three VAPID values present? Without them nothing is offered. */
export function isPushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT,
  )
}

/** The public key, for the browser to pass to `pushManager.subscribe`. */
export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null
}

/**
 * Apply the VAPID details, once.
 *
 * `setVapidDetails` **throws** on a malformed key, and it is a module-global
 * side effect — so it must not run at import time, or a deployment with a typo
 * in the key would fail to boot the whole CMS. It runs on the first send, inside
 * the guard.
 */
let configured = false

function ensureConfigured(): void {
  if (configured) return
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:no-reply@shikkha24.com',
    process.env.VAPID_PUBLIC_KEY ?? '',
    process.env.VAPID_PRIVATE_KEY ?? '',
  )
  configured = true
}

/** Reset the one-time VAPID setup — used by the verification harness. */
export function resetPushConfig(): void {
  configured = false
}

/**
 * Send one notification.
 *
 * Never throws: the three outcomes are all normal in production, and a sweep
 * that aborts on the first dead subscription would never reach the rest of the
 * list. `gone` is the important one — a browser that has revoked permission
 * returns 404/410 forever, so the caller must delete the row or every future
 * sweep wastes a request on it.
 */
export async function sendPush(target: PushTarget, payload: unknown): Promise<PushOutcome> {
  if (!isPushConfigured()) {
    return { status: 'failed', error: 'পুশ নোটিফিকেশন কনফিগার করা হয়নি।' }
  }

  try {
    ensureConfigured()
  } catch (error) {
    // A malformed key is a configuration error, not a per-subscriber one.
    return { status: 'failed', error: error instanceof Error ? error.message : String(error) }
  }

  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.keys.p256dh, auth: target.keys.auth } },
      JSON.stringify(payload),
      // One hour. A reminder that arrives after the deadline is worse than one
      // that never arrives, so an undelivered message must not sit in a queue.
      { TTL: 3600 },
    )
    return { status: 'sent' }
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 404 || statusCode === 410) return { status: 'gone' }
    return { status: 'failed', error: error instanceof Error ? error.message : String(error) }
  }
}
