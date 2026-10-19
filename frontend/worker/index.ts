/**
 * The Shikkha24 storefront Worker.
 *
 * The site itself is fully static (`dist/`, built by Astro in CI). This Worker
 * is deployed with `run_worker_first = true`, so every request passes through
 * here before any asset is fetched, which gives it three jobs the platform
 * cannot do itself:
 *
 * 1. **Headers** — CSP profile dispatch, security headers and cache rules.
 *    `.htaccess` cannot ride along on Workers (it would publish as a plain
 *    text asset and is `.assetsignore`d), and `_headers` can neither express
 *    the S11 article rule nor avoid its comma-join behaviour, so this file
 *    owns the whole set. See `headers.ts` for the `.htaccess` port contract.
 * 2. **The `/verify/<id>` rewrite** — an unknown reporter ID must not 404. A
 *    printed press card that answers 404 reads as a forged credential, so any
 *    `/verify/<something>` with no real page is served `/verify/not-found/`
 *    with status 200 — the page itself renders its "যাচাই করা যায়নি" state and
 *    carries `noindex`. This ports the `.htaccess` `RewriteCond !-f !-d` rule;
 *    on Workers the conditions become "the asset fetch returned 404", which is
 *    the same statement (a real card is a built directory; a lookup miss is
 *    not). `verify:apache` counter-proved the Apache form — a known ID must
 *    NOT be rewritten — and the harness here does the same.
 * 3. **Preview-host guard** — `*.workers.dev` responses carry
 *    `X-Robots-Tag: noindex`.
 *
 * Nothing here re-serves or rewrites bodies — the asset's stream passes
 * through untouched, and `ETag`/status survive so revalidation and the
 * platform's caching behave as if the asset were served directly.
 */
import { headersForPath, isPreviewHost } from './headers.ts'
import { recordTelemetry, type TelemetryBinding } from './telemetry.ts'

/** The assets binding from `wrangler.toml` — the only capability needed. */
interface AssetsBinding {
  fetch(request: Request): Promise<Response>
}

/** The bindings this Worker receives; see `wrangler.toml` (`[assets]`). */
interface Env {
  ASSETS: AssetsBinding
  TELEMETRY: TelemetryBinding
}

/**
 * Where the asset for a request really lives.
 *
 * @param pathname - The request path, with no query string.
 * @param status - The status `ASSETS.fetch` returned for that path.
 * @returns The path to serve in its place, if a rewrite applies.
 */
export function resolveRewrite(pathname: string, status: number): string | null {
  if (status !== 404) return null
  // Exactly `/verify/<one-or-more-segment-chars>` with an optional slash. The
  // empty `/verify/` must NOT rewrite — an empty lookup is a broken link, not
  // a scanned card.
  //
  // ⚠️ The target carries NO trailing slash: under `drop-trailing-slash` the
  // slashed form answers a 307 to the un-slashed one, which would bounce every
  // scanned press card off its scanned URL — the S14 contract is "the reader's
  // URL is unchanged; only the body differs". Verified live 2026-10-15.
  return /^\/verify\/[^/?#]+\/?$/.test(pathname) ? '/verify/not-found' : null
}

/** Serve an asset (or the rewrite target) with the Worker-owned headers attached. */
async function serve(assets: AssetsBinding, path: URL, original: Request, dispatchPath: string) {
  const asset = await assets.fetch(new Request(path, original))
  return withHeaders(asset, dispatchPath, new URL(original.url).host)
}

/**
 * Attach the Worker-owned headers to an asset response.
 *
 * A fresh `Response` is constructed because platform responses are immutable;
 * the body *stream* is handed through as-is. A `304` must carry `null` body.
 *
 * @param asset - The response returned by `ASSETS.fetch`.
 * @param pathname - The request path (dispatch input; no query string).
 * @param host - The request's `Host` header.
 */
export function withHeaders(asset: Response, pathname: string, host: string): Response {
  const headers = new Headers(asset.headers)
  const owned = headersForPath(pathname, headers.get('content-type'))
  if (isPreviewHost(host)) owned['X-Robots-Tag'] = 'noindex'
  for (const [name, value] of Object.entries(owned)) headers.set(name, value)
  if (asset.status === 304) {
    return new Response(null, { status: 304, statusText: asset.statusText, headers })
  }
  return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers })
}

/** The module Cloudflare deploys; `main` in `wrangler.toml` points here. */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/telemetry') {
      const accepted = await recordTelemetry(request, env.TELEMETRY)
      const status = accepted ? 204 : 400
      const headers = headersForPath(url.pathname, null)
      headers['Cache-Control'] = 'no-store'
      return new Response(null, { status, headers })
    }

    const asset = await env.ASSETS.fetch(request)
    const rewrite = resolveRewrite(url.pathname, asset.status)
    if (rewrite === null) return withHeaders(asset, url.pathname, url.host)

    // Serves `/verify/not-found/index.html` (a built page) with status 200 —
    // deliberately not a redirect, so the reader's scanned URL is the one
    // that stays in the address bar.
    return serve(env.ASSETS, new URL(rewrite, url.origin), request, url.pathname)
  },
}
