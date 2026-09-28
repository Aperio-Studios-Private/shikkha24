/**
 * Field validation for the `LiveStreams` collection (S15).
 *
 * ## Why the host is checked here, and not just the shape
 *
 * `socialUrlValidator` (`lib/social-url.ts`) deliberately does **not** restrict a
 * field to the platform's domain — it only rejects a bare platform homepage,
 * because its output is an `href` and the runtime guard there is a scheme check.
 *
 * A live stream is different: its value becomes an **iframe `src`**. Framing an
 * arbitrary origin is a much stronger capability than linking to one, so the host
 * is part of the contract. A field holding `https://attacker.example/embed` would
 * otherwise be a stored third-party frame on a page the CSP deliberately relaxes
 * for video.
 *
 * Both validators are **guard-rails, not the security control** — the frontend
 * re-validates the same patterns at build time and assembles the frame URL from a
 * fixed template, so nothing an editor stores is ever used as a URL directly.
 *
 * Messages are Bengali and specific, for the same reason as `social-url.ts`: the
 * person filling the field in is an editor, not a developer.
 */

/** YouTube ids are 11 characters of the base64url alphabet. Nothing else is valid. */
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/

/**
 * Hosts a Facebook video can legitimately live on.
 *
 * `fb.watch` is Meta's own short-link domain, and an editor pasting a live link
 * from the mobile app gets one of these rather than a `facebook.com` path.
 */
const FACEBOOK_HOSTS = new Set([
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'web.facebook.com',
  'fb.watch',
  'www.fb.watch',
])

/**
 * Validate a YouTube video id (or a URL an editor pasted instead of one).
 *
 * Only the bare 11-character id is accepted. Accepting a full URL here would mean
 * the frontend had to parse it too, and two parsers for one field is how a value
 * ends up framed from a host nobody validated.
 */
export function youtubeVideoIdValidator(value: unknown): true | string {
  if (value === null || value === undefined) return true
  const raw = String(value).trim()
  if (!raw) return true

  if (!YOUTUBE_ID.test(raw)) {
    return 'ইউটিউব ভিডিও আইডি ১১ অক্ষরের হয় (যেমন: aqz-KE-bpKQ)। সম্পূর্ণ লিংক নয় — শুধু আইডি অংশটি দিন।'
  }
  return true
}

/**
 * Validate the Facebook video/page URL that the embed plugin will frame.
 *
 * `https` only, and the host must be one of Meta's own — see the header for why
 * this is stricter than `socialUrlValidator('facebook')`.
 */
export function facebookVideoUrlValidator(value: unknown): true | string {
  if (value === null || value === undefined) return true
  const raw = String(value).trim()
  if (!raw) return true

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return 'সম্পূর্ণ ঠিকানা দিন, https:// দিয়ে শুরু করে। যেমন: https://www.facebook.com/yourpage/videos/1234567890'
  }

  if (url.protocol !== 'https:') {
    return 'শুধু https:// ঠিকানা ব্যবহার করুন (http:// নয়)।'
  }

  if (!FACEBOOK_HOSTS.has(url.hostname.toLowerCase())) {
    return 'শুধু ফেসবুকের নিজের ঠিকানা ব্যবহার করা যায় (facebook.com বা fb.watch)। অন্য কোনো সাইট এখানে ফ্রেম করা যাবে না।'
  }

  // A bare homepage identifies no video — the same mistake `social-url.ts` was
  // written for. `/watch?v=…` and `/<page>/videos/<id>` both keep a real path.
  if (url.pathname.replace(/\/+$/, '') === '' && !url.searchParams.has('v')) {
    return 'এটি ফেসবুকের মূল পাতা, কোনো ভিডিও নয়। নির্দিষ্ট ভিডিও বা লাইভ লিংক দিন।'
  }

  return true
}
