/**
 * Canonical-host + stale-URL redirects for the storefront Worker.
 *
 * Two SEO defects this fixes, both evidenced in GSC (2026-10-28):
 *
 * 1. **Non-canonical hosts answered 200.** The zone serves `http://` (Cloudflare
 *    always-https is not enabled on the account) and `www.` serves the same
 *    content as the apex. GSC listed 12 `http://` URLs with impressions —
 *    duplicate-protocol indexing. The canonical host is the apex over https
 *    (every canonical tag and sitemap URL already says `https://shikkha24.com`),
 *    so anything else gets a 301 to the same path there.
 *
 * 2. **Old-ID article URLs 404.** The T-18 clean start renumbered article IDs,
 *    so `/admission/23/admission-policy-2027` (indexed) 404s while the article
 *    lives at `/admission/10/admission-policy-2027`. `src/pages/redirects.json.ts`
 *    ships a build-time slug → canonical-path manifest; on a 404 whose path is
 *    article-shaped, the Worker looks the slug up and 301s to the canonical
 *    path when it exists.
 *
 * Pure functions only — the Worker calls them, `verify-cloudflare.mjs` asserts
 * them, and neither side needs a runtime.
 */

/** The one host readers and crawlers should see. Canonical tags + sitemap agree. */
export const CANONICAL_HOST = 'shikkha24.com'

/**
 * True when the request's scheme+host is not the canonical one and must 301.
 * `workers.dev` previews are excluded — they already carry `X-Robots-Tag:
 * noindex`, and redirecting them would break the deploy's live probe.
 *
 * @param protocol - `https:` or `http:`, from `new URL(request.url).protocol`.
 * @param host - The request's `Host` header / URL host.
 */
export function needsCanonicalHost(protocol: string, host: string): boolean {
  if (host.endsWith('.workers.dev')) return false
  return protocol !== 'https:' || host !== CANONICAL_HOST
}

/**
 * The article-shaped path matcher: `/:category/:id/:slug` — three segments
 * where the middle is numeric. This is the S11 article URL shape; only those
 * can go stale via an ID renumber. Non-matching 404s are real 404s.
 *
 * @param pathname - The request path, no query string.
 */
export function articleSlugFromStalePath(pathname: string): string | null {
  const m = /^\/([^/]+)\/(\d+)\/([^/?#]+)\/?$/.exec(pathname)
  if (!m) return null
  // A malformed percent-sequence throws URIError; this runs in the Worker's
  // fetch handler where a throw becomes a Cloudflare 1101 error page instead
  // of a 404 (pentest 2026-10-29, L4). An undecodable slug cannot match the
  // manifest anyway — treat it as "no slug".
  try {
    return decodeURIComponent(m[3])
  } catch {
    return null
  }
}

/**
 * The redirect target for a stale article path, or `null`.
 *
 * @param pathname - The 404ing request path.
 * @param manifest - The parsed `redirects.json` (slug → canonical path).
 */
export function staleArticleRedirect(
  pathname: string,
  manifest: Record<string, string>,
): string | null {
  const slug = articleSlugFromStalePath(pathname)
  if (!slug) return null
  // A `__proto__`/`constructor` slug would read from Object.prototype instead
  // of the manifest's own keys. Own-property check keeps the manifest the only
  // source (pentest 2026-10-29, L4 hardening).
  if (!Object.hasOwn(manifest, slug)) return null
  const target = manifest[slug]
  // Never redirect to the path that is already being requested.
  if (!target || target === pathname.replace(/\/$/, '')) return null
  return target
}
