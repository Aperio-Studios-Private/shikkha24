import type { APIRoute } from 'astro'

import { FALLBACK_SETTINGS, getSiteSettings } from '../lib/cms'

/**
 * robots.txt
 *
 * Points crawlers at the sitemaps. Deliberately permissive: a news site wants
 * to be indexed. The only disallows are `/pagefind/` (search index internals —
 * indexing them would be pure noise) and `/search` (infinite query-param
 * combinations that produce no durable content).
 *
 * AI crawlers are allowed. `docs/seo-plan.md` covers the llms.txt side of AI
 * discoverability; blocking the crawlers while publishing an llms.txt would be
 * contradictory.
 */
export const GET: APIRoute = async () => {
  const site = (import.meta.env.PUBLIC_SITE_URL || 'https://shikkha24.com').replace(/\/$/, '')
  const settings = await getSiteSettings().catch(() => FALLBACK_SETTINGS)

  const body = `# ${settings.siteName} — robots.txt

User-agent: *
Allow: /
Disallow: /search
Disallow: /pagefind/

Sitemap: ${site}/sitemap.xml
Sitemap: ${site}/news-sitemap.xml
`

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
