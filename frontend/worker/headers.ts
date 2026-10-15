/**
 * Response header assembly for the Workers publisher.
 *
 * One place owns every response header the storefront serves, because only one
 * place can: with `run_worker_first = true`, `_headers`/`_redirects` are never
 * applied, and a `_headers` fallback would reintroduce the comma-join the
 * Worker exists to avoid (docs/hosting-and-deployment.md section 10.3).
 *
 * The port contract with `frontend/public/.htaccess`:
 *
 * | Concern            | Apache (.htaccess)                      | Here                          |
 * |--------------------|------------------------------------------|-------------------------------|
 * | Security headers   | `Header always set` (all responses)      | all responses                 |
 * | CSP profile        | `SetEnvIf` regexes + `env=` sets         | `profileForPath` (same regexes)|
 * | `/​_astro` + `/fonts` | `SetEnvIf` + `Header set` immutable     | same regexes                  |
 * | HTML revalidation  | `<FilesMatch "\.html$">`                 | `content-type` is `text/html` |
 * | (anything else)    | no Cache-Control emitted                 | omitted — Workers' default applies |
 *
 * The `FilesMatch` → content-type translation is deliberate: Apache runs
 * `FilesMatch` against the final on-disk filename after `mod_dir`'s internal
 * redirect, so `/` (served from `/index.html`) got the must-revalidate header
 * too. Content-type reproduces exactly that, including the 404 page.
 */
import { CSP_ARTICLE, CSP_MEDIA, CSP_RELAXED, CSP_STRICT } from './csp.ts'
import { profileForPath } from './dispatch.ts'

/** Content-addressed build output and content-stable fonts never change. */
const IMMUTABLE_PATH = /^\/(?:_astro|fonts)\//

/**
 * Every response gets the security headers, regardless of status — the Apache
 * directives are `Header always set` precisely so an error page cannot ship
 * without them.
 *
 * @param pathname - The request path (dispatch input; no query string).
 * @returns The headers every response carries before cache-control is added.
 */
function securityHeaders(pathname: string): Record<string, string> {
  return {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), camera=(), microphone=(), payment=()',
    'X-Frame-Options': 'DENY',
    // Set exactly once — a second Content-Security-Policy value would
    // comma-join and invalidate the whole policy.
    'Content-Security-Policy': cspFor(pathname),
  }
}

/**
 * The policy for one path — the four `.htaccess` directives, resolved by the
 * same precedence (media beats article beats relaxed; strict is the default).
 */
function cspFor(pathname: string): string {
  switch (profileForPath(pathname)) {
    case 'media':
      return CSP_MEDIA
    case 'article':
      return CSP_ARTICLE
    case 'relaxed':
      return CSP_RELAXED
    default:
      return CSP_STRICT
  }
}

/**
 * The complete response headers for one served asset.
 *
 * @param pathname - The request path as the dispatch sees it (no query string).
 * @param contentType - The asset response's `content-type`, or `null` when the
 *   platform omitted it (a missing content-type is treated as "not HTML").
 */
export function headersForPath(
  pathname: string,
  contentType: string | null,
): Record<string, string> {
  const headers = securityHeaders(pathname)

  const isHtml = (contentType ?? '').split(';')[0].trim() === 'text/html'
  if (IMMUTABLE_PATH.test(pathname)) {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    return headers
  }
  if (isHtml) {
    // A publish must be visible as soon as the rebuild window closes — the
    // same reason `.htaccess` forces HTML to revalidate. This deliberately
    // includes the 404 page: Apache's `Header set` (not `always`) existed so
    // an error response is never cached for a year.
    headers['Cache-Control'] = 'public, max-age=0, must-revalidate'
    return headers
  }

  // Favicon, manifests, sitemap, everything else: emit nothing, matching
  // Apache. The platform default (`max-age=0, must-revalidate` + ETag) is
  // conservative and correct for unversioned paths.
  return headers
}

/**
 * Preview URLs on `*.workers.dev` must never be indexed — they carry the same
 * content as production but on a hostname readers never see. The `.htaccess`
 * never needed this because Apache only ever served the real domain.
 *
 * @param host - The request's `Host` header, verbatim.
 */
export function isPreviewHost(host: string): boolean {
  return host.endsWith('.workers.dev')
}
