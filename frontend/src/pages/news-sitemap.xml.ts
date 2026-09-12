import type { APIRoute } from 'astro'
import { FALLBACK_SETTINGS, getArticles, getSiteSettings } from '../lib/cms'

/**
 * Google News sitemap.
 *
 * Two rules make this different from the normal sitemap, and both are hard
 * requirements rather than preferences:
 *
 *  1. **Only the last 48 hours.** Google ignores older entries and, if the file
 *     is routinely stale, stops trusting it. So we filter by publish date at
 *     build time rather than listing everything.
 *  2. **Max 1,000 URLs.** Enforced by slicing — at 15–40 articles a day this is
 *     never near the limit, but a burst day must not produce an invalid file.
 *
 * Publication language is `bn` and `<news:name>` must match the name on the
 * Google Publisher Center account, so it is read from the CMS rather than
 * hardcoded.
 */
const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

export const GET: APIRoute = async () => {
  const site = (import.meta.env.PUBLIC_SITE_URL || 'https://shikkha24.com').replace(/\/$/, '')

  const [settings, articles] = await Promise.all([
    getSiteSettings().catch(() => FALLBACK_SETTINGS),
    // Over-fetch, then filter: the 48h window is applied here, not by the API.
    getArticles({ limit: 200 }).catch(() => []),
  ])

  const cutoff = Date.now() - 48 * 60 * 60 * 1000

  /**
   * Filter and map in one pass. Parsing the date once here (rather than
   * filtering on it and re-parsing inside the template) keeps the non-null
   * check and its use adjacent, so no assertion is needed.
   */
  const recent = articles
    .flatMap((article) => {
      if (!article.publishedAt) return []
      const published = new Date(article.publishedAt)
      if (Number.isNaN(published.getTime()) || published.getTime() < cutoff) return []
      return [{ article, published }]
    })
    .slice(0, 1000)

  const publicationName = settings.siteName || 'শিক্ষা২৪'

  const entries = recent
    .map(({ article, published }) => {
      return `  <url>
    <loc>${escapeXml(`${site}/article/${article.slug}`)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(publicationName)}</news:name>
        <news:language>bn</news:language>
      </news:publication>
      <news:publication_date>${published.toISOString()}</news:publication_date>
      <news:title>${escapeXml(article.title)}</news:title>
    </news:news>
  </url>`
    })
    .join('\n')

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${entries}
</urlset>
`

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
