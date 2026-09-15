import type { APIRoute } from 'astro'
import { FALLBACK_SETTINGS, getSiteSettings } from '../lib/cms'
import { mediaUrl } from '../lib/media'

/**
 * Web app manifest — generated at build time, not a static file.
 *
 * ## Why this is a route and not `public/site.webmanifest`
 *
 * The static file hardcoded the site name (`"name": "শিক্ষা২৪ — Shikkha24"`),
 * which breaks the project's branding contract: a rename in Site Settings must
 * propagate everywhere in one rebuild, and the only permitted hardcoded
 * occurrences are the documented fallbacks. `public/` files are copied verbatim
 * and cannot read the CMS, so the manifest had to become a route to obey it.
 *
 * ## Why the icons are still the bundled ones
 *
 * The tab icon in `Layout.astro` follows the CMS favicon. The **install** icons
 * here deliberately do not, and that is a correctness decision rather than an
 * oversight:
 *
 *   - Media is served from the CMS host, a **different origin**. A manifest
 *     pointing at `cms.shikkha24.com` would need that host to send
 *     `Access-Control-Allow-Origin` for the icon, and Payload's media endpoint
 *     does not. A cross-origin icon that fails CORS does not merely look wrong —
 *     it can break the install prompt.
 *   - The bundled icons are square, maskable and multi-size, which is what an
 *     install icon must be. An uploaded tab icon is not guaranteed to be any of
 *     those.
 *
 * So the manifest keeps icons that always resolve, and the tab icon is the one
 * that follows the CMS. If media ever moves to the site's own origin, this can
 * safely switch to the uploaded asset.
 */
export const GET: APIRoute = async () => {
  const settings = await getSiteSettings().catch(() => FALLBACK_SETTINGS)

  const name = settings.siteNameEn
    ? `${settings.siteName} — ${settings.siteNameEn}`
    : settings.siteName

  /**
   * The managed favicon, versioned by the media record's `updatedAt`.
   *
   * The version matters here for the same reason it does in `Layout.astro`:
   * without it, replacing the icon under the same filename leaves the browser
   * showing the old one. See that file for the full note.
   */
  const faviconBase = mediaUrl(settings.favicon?.url)
  const faviconStamp = settings.favicon?.updatedAt
    ? Date.parse(settings.favicon.updatedAt)
    : Number.NaN
  const faviconSrc =
    faviconBase && Number.isFinite(faviconStamp)
      ? `${faviconBase}${faviconBase.includes('?') ? '&' : '?'}v=${faviconStamp}`
      : faviconBase

  const manifest = {
    name,
    // Browsers truncate `short_name` aggressively — the plain name is the right
    // value, not the "Name — NameEn" form.
    short_name: settings.siteName,
    description: settings.tagline ?? undefined,
    lang: 'bn-BD',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    // Not CMS-managed: the brand red is a design token, not editorial content.
    background_color: '#ffffff',
    theme_color: '#da1c25',
    categories: ['education', 'news'],
    icons: [
      // The managed icon replaces the bundled SVG when one is set. Left static,
      // this entry kept advertising the old mark to the install prompt after the
      // favicon had been changed — the same "it didn't change" symptom the
      // `<link>` fix addresses, one surface over.
      faviconSrc
        ? {
            src: faviconSrc,
            sizes: 'any',
            type: settings.favicon?.mimeType ?? undefined,
            purpose: 'any',
          }
        : { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  })
}
