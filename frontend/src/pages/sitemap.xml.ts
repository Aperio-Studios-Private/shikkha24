import type { APIRoute } from 'astro'
import {
  FALLBACK_CATEGORIES,
  getAllArticlePaths,
  getAllPageSlugs,
  getArticles,
  getCategories,
} from '../lib/cms'
import { getAllInstitutionSlugs, getAllStudyAbroadSlugs } from '../lib/education'
import { articleUrl } from '../lib/url'

/**
 * sitemap.xml
 *
 * Generated at build time from the CMS, so it can never list an article that is
 * not published — a sitemap that 404s is worse than no sitemap, because it
 * spends the crawl budget on dead URLs.
 *
 * Hand-written rather than using @astrojs/sitemap: adding an integration meant
 * a dependency (and pnpm's symlink step is blocked in this environment), and the
 * whole thing is ~40 lines that we fully control.
 *
 * **`lastmod` is the real publish date, never the build date.** Stamping every
 * URL with "now" on each rebuild is the classic sitemap mistake: the signal
 * becomes noise, Google stops trusting it for the whole file, and the accurate
 * dates on the few pages that did change are lost with it. Where a real date is
 * unknown the element is omitted — an absent `lastmod` is honest, a wrong one
 * is not.
 */
const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

/** `YYYY-MM-DD`, the only date format the sitemap protocol accepts. */
const toDate = (value: string | null | undefined): string | undefined => {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10)
}

interface SitemapEntry {
  loc: string
  priority: string
  changefreq: string
  lastmod?: string
}

export const GET: APIRoute = async () => {
  const site = (import.meta.env.PUBLIC_SITE_URL || 'https://shikkha24.com').replace(/\/$/, '')
  const today = new Date().toISOString().slice(0, 10)

  const [articlePaths, pageSlugs, articles, categories, institutionSlugs, studyAbroadSlugs] = await Promise.all([
    getAllArticlePaths().catch(() => []),
    getAllPageSlugs().catch(() => []),
    // Fetched only for the publish dates; the path list above stays canonical.
    getArticles({ limit: 500 }).catch(() => []),
    getCategories().catch(() => FALLBACK_CATEGORIES),
    getAllInstitutionSlugs().catch(() => []),
    getAllStudyAbroadSlugs().catch(() => []),
  ])

  /** slug → publish date, so each article carries its own accurate `lastmod`. */
  const publishedOn = new Map(
    articles.map((article) => [article.slug, toDate(article.publishedAt)]),
  )

  /**
   * Static routes are always present. `/` and `/latest` genuinely change on
   * every publish, so today's date is accurate for them; `/deadlines` and the
   * education pages change only when an editor updates content, so they carry
   * no date at all — an absent `lastmod` is honest, a wrong one is not.
   */
  const staticPaths: SitemapEntry[] = [
    { loc: '/', priority: '1.0', changefreq: 'hourly', lastmod: today },
    { loc: '/latest', priority: '0.8', changefreq: 'hourly', lastmod: today },
    { loc: '/deadlines', priority: '0.7', changefreq: 'daily' },
    { loc: '/scholarships', priority: '0.7', changefreq: 'daily' },
    { loc: '/results', priority: '0.7', changefreq: 'daily' },
    { loc: '/institutions', priority: '0.6', changefreq: 'weekly' },
    { loc: '/circulars', priority: '0.7', changefreq: 'daily' },
    { loc: '/study-abroad', priority: '0.6', changefreq: 'weekly' },
    { loc: '/exams', priority: '0.7', changefreq: 'daily' },
    { loc: '/gpa', priority: '0.3', changefreq: 'yearly' },
  ]

  /** E-E-A-T pages (privacy, terms, contact). Empty until they exist in the CMS. */
  const pages: SitemapEntry[] = pageSlugs.map((slug) => ({
    loc: `/page/${slug}`,
    priority: '0.4',
    changefreq: 'yearly',
  }))

  const urls: SitemapEntry[] = [
    ...staticPaths,
    ...pages,
    ...categories.map((category) => ({
      loc: `/category/${category.slug}`,
      priority: '0.7',
      changefreq: 'hourly',
    })),
    ...articlePaths.map((p) => ({
      loc: articleUrl({ id: p.id, slug: p.slug, category: p.categorySlug ? { slug: p.categorySlug } : null }),
      priority: '0.6',
      changefreq: 'weekly',
      lastmod: publishedOn.get(p.slug),
    })),
    ...institutionSlugs.map((slug) => ({
      loc: `/institutions/${slug}`,
      priority: '0.5',
      changefreq: 'monthly',
    })),
    ...studyAbroadSlugs.map((slug) => ({
      loc: `/study-abroad/${slug}`,
      priority: '0.5',
      changefreq: 'monthly',
    })),
  ]

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (entry) => `  <url>
    <loc>${escapeXml(site + entry.loc)}</loc>${
      entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : ''
    }
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
