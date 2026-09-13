/**
 * Web Push configuration for the browser side.
 *
 * ## Build-time, like every other integration
 *
 * `PUBLIC_VAPID_PUBLIC_KEY` is read at build time and baked into the page. There
 * is no runtime lookup, so an unconfigured deploy renders **no reminder
 * control** rather than a bell that cannot ring — the same rule S8 established
 * for `PUBLIC_CMS_ORIGIN` (`docs/reliability.md` §4).
 *
 * ## The public key is public
 *
 * `VAPID_PUBLIC_KEY` is not a secret; it is the identity half of the key pair
 * and is sent to the browser on purpose. `VAPID_PRIVATE_KEY` lives only in the
 * CMS environment and is never exposed to the frontend — hence the separate
 * `PUBLIC_VAPID_PUBLIC_KEY` variable, which must hold the **same** value.
 */

/** The VAPID public key, or `null` when push is not configured. */
export const PUSH_PUBLIC_KEY: string | null = import.meta.env.PUBLIC_VAPID_PUBLIC_KEY || null

/**
 * Is there enough configuration for a reminder to be deliverable?
 *
 * Only the build-time half can be answered here. Browser support for
 * `PushManager` is checked in the browser, and the control starts hidden and is
 * revealed only once that check passes — so a reader on an unsupported browser
 * never sees it at all.
 */
export function pushConfigured(): boolean {
  return Boolean(PUSH_PUBLIC_KEY)
}

/**
 * Decode a base64url VAPID key into the `Uint8Array` that
 * `pushManager.subscribe` requires.
 *
 * The padding dance is not optional: `atob` rejects a base64url string whose
 * length is not a multiple of 4, and VAPID keys are base64url by spec. Getting
 * this wrong produces a `DOMException` on subscribe that looks like a
 * permissions problem and is not one.
 */
export function decodeBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const withPadding = padded + '='.repeat((4 - (padded.length % 4)) % 4)
  const binary = atob(withPadding)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}
