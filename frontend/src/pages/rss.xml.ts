import type { APIRoute } from 'astro'
import { FALLBACK_SETTINGS, getArticles, getSiteSettings } from '../lib/cms'
import { articleUrl } from '../lib/url'

/**
 * RSS 2.0 feed.
 *
 * Hand-written rather than using @astrojs/rss: the integration is another
 * dependency, and the format is stable enough that ~50 lines is cheaper to own
 * than to configure.
 *
 * Two details that matter:
 *  - **Titles are CDATA-wrapped.** Bengali is fine as UTF-8, but headlines
 *    contain apostrophes and quotation marks that would otherwise need
 *    escaping, and a broken feed is worse than a plain one.
 *  - **`guid` is permanent.** It is the article URL with `isPermaLink="true"`,
 *    so readers never re-download an item after a rebuild.
 */
const escapeXml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Wrap in CDATA when the text contains anything needing escaping. */
const cdata = (value: string): string => (/[&<>"]/.test(value) ? `<![CDATA[${value}]]>` : value)

export const GET: APIRoute = async () => {
  const site = (import.meta.env.PUBLIC_SITE_URL || 'https://shikkha24.com').replace(/\/$/, '')

  const [settings, articles] = await Promise.all([
    getSiteSettings().catch(() => FALLBACK_SETTINGS),
    getArticles({ limit: 50 }).catch(() => []),
  ])

  const channelTitle = settings.siteName || 'শিক্ষা২৪'
  const channelDescription = settings.tagline || 'দেশ-বিদেশের শিক্ষার সর্বশেষ খবর ও সুযোগ'

  const items = articles
    .map((article) => {
      const link = `${site}${articleUrl(article)}`
      const published = article.publishedAt
        ? new Date(article.publishedAt).toUTCString()
        : new Date().toUTCString()
      const category =
        article.category && typeof article.category === 'object'
          ? article.category.nameBn
          : undefined

      return `    <item>
      <title>${cdata(article.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${published}</pubDate>
      <description>${cdata(article.excerpt ?? '')}</description>${category ? `\n      <category>${cdata(category)}</category>` : ''}
    </item>`
    })
    .join('\n')

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${cdata(channelTitle)}</title>
    <link>${escapeXml(site)}</link>
    <description>${cdata(channelDescription)}</description>
    <language>bn-BD</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(site)}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`

  return new Response(body, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
