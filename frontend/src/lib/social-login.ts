import { getPublicCmsOrigin } from './interactive'

/**
 * Social login — the frontend's view of which providers can actually work.
 *
 * ## Why the provider list is fetched rather than configured here
 *
 * The CMS owns the OAuth credentials, so it is the only thing that knows which
 * providers are usable. Asking it at **build time** means the frontend never
 * carries a second copy of that answer, which could drift — and drifting in the
 * unsafe direction (showing a button the CMS cannot honour) is exactly the
 * failure this project keeps designing out.
 *
 * ## Failure means no buttons
 *
 * If the CMS is unreachable, or returns nothing, or has no credentials, this
 * returns an empty list and the login control is **not rendered at all**. A
 * sign-in button that leads to a `503` reads to the reader as their own mistake.
 * The browser-local bookmark list works with no account, so nothing is lost.
 */

/** The providers the CMS can be configured for. */
export type SocialProvider = 'google' | 'facebook'

/** A provider, with the Bengali label its button carries. */
export interface SocialProviderInfo {
  id: SocialProvider
  label: string
}

/**
 * Button labels.
 *
 * Bengali-only UI (agent rule 10). "দিয়ে চালিয়ে যান" — "continue with" — is the
 * phrasing readers will have seen on other Bengali sites.
 */
const PROVIDER_LABELS: Record<SocialProvider, string> = {
  google: 'গুগল দিয়ে চালিয়ে যান',
  facebook: 'ফেসবুক দিয়ে চালিয়ে যান',
}

/** Guards against a slow CMS holding up a build for no benefit. */
const FETCH_TIMEOUT_MS = 4000

function isProvider(value: unknown): value is SocialProvider {
  return value === 'google' || value === 'facebook'
}

/**
 * Ask the CMS which providers it can complete a login for.
 *
 * @returns Providers in a stable order, or `[]` when none are usable — never
 *          throws, because a build must not fail over an optional login button.
 */
export async function getConfiguredProviders(): Promise<SocialProviderInfo[]> {
  const origin = getPublicCmsOrigin()
  if (!origin) return []

  try {
    const response = await fetch(`${origin}/api/oauth/providers`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!response.ok) return []

    const body = (await response.json()) as { providers?: unknown }
    if (!Array.isArray(body.providers)) return []

    return body.providers.filter(isProvider).map((id) => ({ id, label: PROVIDER_LABELS[id] }))
  } catch {
    return []
  }
}

/**
 * The URL that begins a login.
 *
 * Points at the CMS, not at the site, because the flow has to set an httpOnly
 * state cookie and then redirect out to the provider. `next` is a site-relative
 * path; the CMS validates it again before using it, so a tampered value here
 * cannot become an open redirect.
 *
 * @param cmsOrigin From `getPublicCmsOrigin()` — `null` means no login at all.
 * @param next      Where to land after a successful login.
 */
export function loginStartUrl(cmsOrigin: string, provider: SocialProvider, next = '/'): string {
  const params = new URLSearchParams({ next })
  return `${cmsOrigin}/api/oauth/${provider}/start?${params}`
}
