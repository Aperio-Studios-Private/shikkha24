/**
 * Social-link validation for `SiteSettings.social`.
 *
 * ## Why this exists
 *
 * The `social` group was four plain `text` fields with no validation and no
 * hint. That is how the owner filled it in on 2026-09-18:
 *
 *     facebook  → https://www.fb.com/
 *     youtube   → https://www.youtube.com/
 *     instagram → https://www.instagram.com/
 *     twitter   → http://x.com/
 *
 * Every one of those is a **valid absolute URL**, so it passes any generic check
 * and renders happily — but each links to the *platform's own front page*, not to
 * the newsroom's account. The footer showed four working icons that sent readers
 * nowhere, and the JSON-LD published four meaningless `sameAs` entries. Nothing
 * was broken in a way a test could see; the field simply accepted the wrong thing.
 *
 * So the rule is not "is this a URL" — it is **"is this a URL that identifies an
 * account"**, which means: absolute, `https`, and not a bare platform homepage.
 *
 * ## Why the message is Bengali and specific
 *
 * `docs/profile.md` — the admin UI is Bengali. And a validator that says "invalid
 * value" teaches nothing; this one names the mistake and shows the shape of a
 * correct answer, because the person filling it in is an editor, not a developer.
 *
 * ## This is a guard-rail, not a security control
 *
 * The runtime control is `frontend/src/lib/social.ts`, which refuses anything that
 * is not `http`/`https` before it can reach an `href`. Validation here is about
 * *editorial correctness*; that one is about *XSS*. Neither replaces the other.
 */

/** Hosts that are a platform's front page, per platform. */
const PLATFORM_HOMEPAGES: Record<string, string[]> = {
  facebook: ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.com', 'www.fb.com'],
  youtube: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be'],
  instagram: ['instagram.com', 'www.instagram.com'],
  twitter: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'],
}

/** A worked example per platform, so the error message can show a correct shape. */
const EXAMPLES: Record<string, string> = {
  facebook: 'https://www.facebook.com/shikkha24',
  youtube: 'https://www.youtube.com/@shikkha24',
  instagram: 'https://www.instagram.com/shikkha24',
  twitter: 'https://x.com/shikkha24',
}

/**
 * Build a Payload `validate` function for one platform's field.
 *
 * Empty is allowed — the field is optional, and the frontend self-hides when
 * nothing usable is configured.
 */
export function socialUrlValidator(platform: keyof typeof PLATFORM_HOMEPAGES) {
  const examples = EXAMPLES[platform]
  const platformName = platform === 'twitter' ? 'এক্স' : platform

  return (value: unknown): true | string => {
    if (value === null || value === undefined) return true
    const raw = String(value).trim()
    if (!raw) return true

    let url: URL
    try {
      url = new URL(raw)
    } catch {
      // A bare handle like "shikkha24" or "facebook.com/x" lands here. This is the
      // most common way an editor fills the field, so the message shows the shape.
      return `সম্পূর্ণ ঠিকানা দিন, https:// দিয়ে শুরু করে। যেমন: ${examples}`
    }

    if (url.protocol !== 'https:') {
      return `শুধু https:// ঠিকানা ব্যবহার করুন (http:// নয়)। যেমন: ${examples}`
    }

    /*
     * The mistake that actually happened: a bare platform homepage. Compare the
     * host and require a real path — `https://www.facebook.com/` has a pathname of
     * `/`, which strips to empty.
     */
    const host = url.hostname.toLowerCase()
    const path = url.pathname.replace(/\/+$/, '')
    if ((PLATFORM_HOMEPAGES[platform] ?? []).includes(host) && path === '') {
      return `এটি ${platformName}-এর মূল পাতা, আপনার নিজের পাতা নয়। আপনার পেজের সম্পূর্ণ ঠিকানা দিন। যেমন: ${examples}`
    }

    return true
  }
}
