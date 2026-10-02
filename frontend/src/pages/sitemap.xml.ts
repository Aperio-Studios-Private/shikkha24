import type { APIRoute } from 'astro'
import {
  FALLBACK_CATEGORIES,
  getAllArticlePaths,
  getAllPageSlugs,
  getArchiveBuckets,
  getAuthors,
  getCategories,
  getTags,
} from '../lib/cms'
import { getAllInstitutionSlugs, getAllStudyAbroadSlugs } from '../lib/education'
import { archiveMonthSegment, articleUrl } from '../lib/url'

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

  const [
    articlePaths,
    pageSlugs,
    categories,
    institutionSlugs,
    studyAbroadSlugs,
    tags,
    authors,
    archiveBuckets,
  ] = await Promise.all([
    getAllArticlePaths().catch(() => []),
    getAllPageSlugs().catch(() => []),
    getCategories().catch(() => FALLBACK_CATEGORIES),
    getAllInstitutionSlugs().catch(() => []),
    getAllStudyAbroadSlugs().catch(() => []),
    getTags().catch(() => []),
    getAuthors().catch(() => []),
    getArchiveBuckets().catch(() => []),
  ])

  /**
   * slug → publish date, so each article carries its own accurate `lastmod`.
   *
   * ⚠️ Built from `articlePaths` rather than a second `getArticles()` call.
   * That call was capped at 500 rows and not paginated, while
   * `getAllArticlePaths` paginates — so past 500 articles the paths stayed
   * complete but the dates stopped, and every older article silently lost
   * its `lastmod`. One paginated source means the two cannot disagree.
   */
  const publishedOn = new Map(
    articlePaths.map((article) => [article.slug, toDate(article.publishedAt)]),
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
    { loc: '/archive', priority: '0.4', changefreq: 'weekly' },
    { loc: '/gpa', priority: '0.3', changefreq: 'yearly' },
    // The university counterpart to `/gpa` — a different scale and a different
    // rule for a failed course, so a separate page rather than a mode.
    { loc: '/cgpa', priority: '0.3', changefreq: 'yearly' },
    // S15. Listed whether or not a stream is configured: the route exists and
    // shows the schedule, and a live-broadcast URL is high-intent on the day it
    // matters. `changefreq: daily` because a stream can start at any hour.
    { loc: '/live-tv', priority: '0.6', changefreq: 'daily' },
    // S17. The video hub. Listed unconditionally: the route exists and shows an
    // honest empty state, and the URL is worth having indexed for the day a
    // video is published.
    { loc: '/video', priority: '0.6', changefreq: 'daily' },
  ]

  /**
   * E-E-A-T pages (about, contact, privacy, terms).
   *
   * These are built into the site rather than authored in the CMS, so they are
   * listed here directly. The `pages` collection is currently empty, so the
   * `/page/:slug` mapping below contributes nothing — but it stays because it is
   * the correct behaviour once an editor adds a CMS page.
   *
   * `/about-us` is deliberately absent: it is a redirect stub, and a redirect in
   * a sitemap is a soft 404 to a crawler.
   */
  const pages: SitemapEntry[] = [
    { loc: '/about', priority: '0.4', changefreq: 'yearly' },
    { loc: '/contact', priority: '0.4', changefreq: 'yearly' },
    { loc: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
    { loc: '/terms-of-use', priority: '0.3', changefreq: 'yearly' },
    ...pageSlugs.map((slug) => ({
      loc: `/page/${slug}`,
      priority: '0.4',
      changefreq: 'yearly',
    })),
  ]

  const urls: SitemapEntry[] = [
    ...staticPaths,
    ...pages,
    ...categories.map((category) => ({
      loc: `/category/${category.slug}`,
      priority: '0.7',
      changefreq: 'hourly',
    })),
    // Tag and author profiles, and one entry per month that actually has
    // articles. Derived from the CMS like everything else here, so the sitemap
    // can never list a tag or month page that was not built.
    ...tags
      .filter((tag) => tag.slug)
      .map((tag) => ({
        loc: `/tag/${tag.slug}`,
        priority: '0.5',
        changefreq: 'daily',
      })),
    ...authors
      .filter((author) => author.slug)
      .map((author) => ({
        loc: `/author/${author.slug}`,
        priority: '0.5',
        changefreq: 'weekly',
      })),
    ...archiveBuckets.map((bucket) => ({
      loc: `/archive/${archiveMonthSegment(bucket.year, bucket.month)}`,
      priority: '0.4',
      changefreq: 'monthly',
    })),
    ...articlePaths.map((p) => ({
      loc: articleUrl({
        id: p.id,
        slug: p.slug,
        category: p.categorySlug ? { slug: p.categorySlug } : null,
      }),
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
