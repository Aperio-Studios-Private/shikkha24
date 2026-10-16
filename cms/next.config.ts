import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

/**
 * Security headers applied to EVERY response, API and HTML alike.
 *
 * The static frontend carries the same set via `.htaccess` (verified by
 * `pnpm verify:apache`). The CMS did not, which left the API surface
 * unprotected against MIME-sniffing, click-jacking and downgrade attacks.
 *
 * Kept separate from any CSP on purpose — see `CSP_ADMIN` for why.
 */
const SECURITY_HEADERS = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'geolocation=(), camera=(), microphone=(), payment=()' },
]

/**
 * Deny-everything CSP for API responses.
 *
 * Valid only where the response is JSON: there is no HTML to render, so a
 * strict policy costs nothing, and it stops an attacker who manages to get a
 * JSON response rendered as a document. Applied to `/api/*` — NOT to every
 * route, which is what broke the admin (see `CSP_ADMIN`).
 */
const CSP_API =
  "default-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests"

/**
 * CSP for the admin panel, which is a React SPA that must load its own
 * JavaScript, CSS, fonts and images.
 *
 * Before this existed the admin inherited `default-src 'none'` from a
 * `/:path*` catch-all and rendered completely blank in production: every
 * stylesheet, script, favicon and inline style was refused. `default-src` is
 * the fallback for any directive not named explicitly, so with only
 * `frame-ancestors`/`base-uri`/`form-action` present there was no
 * `script-src`, no `style-src` and no `img-src` at all.
 *
 * `'unsafe-inline'` in `script-src` is required, not a shortcut: Next inlines
 * the RSC payload and its bootstrap scripts into the HTML it streams. It is
 * the same trade-off the frontend's article CSP already makes
 * (`frontend/public/.htaccess`), so the posture is consistent across both.
 *
 * `frame-ancestors`, `object-src` and `base-uri` stay locked down — the admin
 * is credential-handling code and gets no relaxation on those.
 */
const CSP_ADMIN =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; media-src 'self' blob:; frame-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests"

const nextConfig: NextConfig = {
  /**
   * `standalone` traces only the modules actually imported at runtime, so the
   * shipped bundle is ≈300–600 MB instead of a full `node_modules` (0.7–1.2 GB).
   * This is what makes the 2 GB DianaHost plan viable — see
   * `docs/hosting-and-deployment.md` §1 and the S0 "measure standalone size" gate.
   */
  output: 'standalone',

  /**
   * Suppress the `X-Powered-By: Next.js, Payload` response header.
   *
   * Next.js sends it by default. It is a free gift to an attacker: it names the
   * exact framework and CMS, so scanning effort starts from known advisories for
   * those two products instead of probing blind. Verified live before the change —
   * `curl -I https://cms.shikkha24.com/` returned `x-powered-by: Next.js, Payload`.
   *
   * Nothing depends on it; it is pure version advertising, so removing it costs
   * nothing and closes a reconnaissance step.
   */
  poweredByHeader: false,

  /**
   * Security headers on every response, including API routes.
   *
   * The CSP is deliberately NOT on the catch-all. Two `Content-Security-Policy`
   * headers are enforced as an *intersection* by the browser, so a catch-all
   * CSP plus a narrower one would mean the narrower policy has to permit
   * everything the other permits — there is no "override". Splitting by route
   * keeps exactly one CSP per response and removes any dependence on the order
   * these entries are applied in.
   *
   * Routes that are neither `/api/*` nor `/admin/*` (the Next 404 page and
   * static assets) intentionally get no CSP. They are not attacker-controlled
   * documents, and the admin is the only HTML this server renders.
   */
  async headers() {
    return [
      { source: '/:path*', headers: SECURITY_HEADERS },
      { source: '/api/:path*', headers: [{ key: 'Content-Security-Policy', value: CSP_API }] },
      { source: '/admin/:path*', headers: [{ key: 'Content-Security-Policy', value: CSP_ADMIN }] },
    ]
  },

  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    /**
     * Monorepo fix. Next detects the workspace root by finding the nearest
     * package-manager lockfile — here `pnpm-lock.yaml` at the repository root —
     * and pnpm hoists `next` there rather than into `cms/node_modules`.
     *
     * Payload's blank template pins this to the cms directory, which is correct
     * for a standalone app and breaks a pnpm monorepo with:
     *   "Could not find the Next.js package (next/package.json)"
     * Point it at the repository root instead.
     */
    root: path.resolve(dirname, '..'),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
