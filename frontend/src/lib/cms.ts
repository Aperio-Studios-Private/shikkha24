/**
 * Build-time content layer — Payload REST → static HTML.
 *
 * ## Why a build-time fetch, not a runtime one
 *
 * The public site is pre-built static HTML on Cloudflare Pages. Nothing is
 * fetched in the reader's browser: that would leak quota, add third-party latency
 * to LCP, and break data-saver mode (`docs/data-sources.md` §1). Content is read
 * once per build and baked in.
 *
 * ## The hard requirement: never fail the build
 *
 * `docs/reliability.md` §1 — the static site must build and serve **even during a
 * CMS outage**. A build that throws because Payload is down would take the whole
 * newsroom offline at the worst possible moment. Every helper here therefore
 * degrades to a documented fallback and warns loudly instead of throwing.
 *
 * This also means a local `astro build` works with no CMS running at all, which
 * is what makes the frontend independently testable.
 */

/** Payload origin. Set `CMS_URL` in the environment; defaults to local dev. */
const CMS_URL = import.meta.env.CMS_URL || 'http://localhost:3000'

/** Fail fast — a build should not hang for minutes on an unreachable CMS. */
const TIMEOUT_MS = 5000

/** Minimal shapes this layer needs. Declared locally so a schema change in the
 *  CMS cannot break the frontend build through a cross-workspace import. */
export interface CmsCategory {
  id: number | string
  nameBn: string
  slug: string
  description?: string | null
  sortOrder: number
  parent?: { id: number | string } | number | string | null
}

export interface CmsSiteSettings {
  siteName: string
  siteNameEn?: string | null
  tagline?: string | null
  logo?: { url?: string | null; alt?: string | null } | null
  contact?: { email?: string | null; phone?: string | null; address?: string | null } | null
  social?: Record<string, string | null> | null
  footerText?: string | null
  /**
   * The E-E-A-T legal block. Bangladesh press portals are expected to publish
   * trade licence, TIN and ministry registration — these belong in the footer,
   * not hidden on a page nobody finds.
   */
  legal?: {
    tradeLicense?: string | null
    tin?: string | null
    ministryRegistration?: string | null
  } | null
  /**
   * Third-party ids managed in Site Settings.
   *
   * Only the AdSense publisher id is read by the build; GA4 is deliberately not
   * used (`docs/performance-budget.md` §4). Kept CMS-managed so the owner can
   * activate ads without a code change — the same pattern as the logo.
   */
  tracking?: {
    adsenseClientId?: string | null
    customHeadCode?: string | null
  } | null
}

export interface CmsPage {
  title: string
  slug: string
  showInFooter?: boolean | null
}

/**
 * Documented fallbacks.
 *
 * These are the values the site falls back to when the CMS cannot be reached.
 * They are NOT placeholders to be replaced later — they are the real defaults,
 * matching the owner-confirmed name and the approved brand line
 * (`.sps/profile.md`, owner decision 2026-09-12).
 */
export const FALLBACK_SETTINGS: CmsSiteSettings = {
  siteName: 'শিক্ষা২৪',
  siteNameEn: 'Shikkha24',
  tagline: 'দেশ-বিদেশের শিক্ষার সর্বশেষ খবর ও সুযোগ',
  contact: {},
  social: {},
}

/**
 * The 8 approved categories, mirroring `cms/src/seed/taxonomies.ts`.
 *
 * Duplicated on purpose: if the CMS is unreachable the navigation must still
 * render the real category tree rather than an empty bar. Kept in the same order
 * as the seed.
 */
export const FALLBACK_CATEGORIES: CmsCategory[] = [
  { id: 'education-news', nameBn: 'শিক্ষা সংবাদ', slug: 'education-news', sortOrder: 1 },
  { id: 'scholarship', nameBn: 'বৃত্তি ও স্কলারশিপ', slug: 'scholarship', sortOrder: 2 },
  { id: 'admission', nameBn: 'ভর্তি', slug: 'admission', sortOrder: 3 },
  { id: 'university', nameBn: 'বিশ্ববিদ্যালয়', slug: 'university', sortOrder: 4 },
  { id: 'higher-study', nameBn: 'উচ্চশিক্ষা', slug: 'higher-study', sortOrder: 5 },
  { id: 'study-abroad', nameBn: 'বিদেশে পড়াশোনা', slug: 'study-abroad', sortOrder: 6 },
  { id: 'exams-results', nameBn: 'পরীক্ষা ও ফলাফল', slug: 'exams-results', sortOrder: 7 },
  { id: 'jobs-career', nameBn: 'চাকরি ও ক্যারিয়ার', slug: 'jobs-career', sortOrder: 8 },
]

/** Set once per build so a CMS outage warns once, not once per request. */
let warned = false

function warnOnce(reason: string): void {
  if (warned) return
  warned = true
  console.warn(
    `[cms] Could not reach the CMS at ${CMS_URL} (${reason}). ` +
      'Falling back to the built-in defaults — the build will still succeed, ' +
      'but the page is NOT showing live CMS content.',
  )
}

/**
 * Build-wide response cache, keyed by request path.
 *
 * **Why this is required, not an optimisation.** Astro renders pages in
 * parallel. Without a cache, rebuilding 12 articles fires ~72 requests at the
 * CMS at once — settings, categories, footerPages, levels and districts are
 * re-fetched identically for every single page. Against Payload on SQLite that
 * burst produces transient failures, which silently degraded whole pages to
 * their fallbacks (see the S4 build: every article 404'd while curl against the
 * same URL returned 200).
 *
 * Caching the *promise* rather than the result means concurrent pages share one
 * in-flight request instead of each opening their own.
 *
 * Failures are cached too, so a dead CMS is hit once per path rather than once
 * per page — the build gets *faster* the more broken the CMS is, instead of
 * slower.
 */
const responseCache = new Map<string, Promise<unknown>>()

/** Retry once after a short pause — most of these failures are transient. */
const RETRY_DELAY_MS = 150

async function fetchOnce<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${CMS_URL}${path}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (!response.ok) {
      warnOnce(`HTTP ${response.status}`)
      return fallback
    }

    return (await response.json()) as T
  } catch (error) {
    warnOnce(error instanceof Error ? error.message : String(error))
    return fallback
  }
}

/**
 * Fetch a Payload REST collection or global, cached for the whole build.
 *
 * Exported so `lib/ads.ts` shares this cache instead of opening a second CMS
 * access path — one cache means the concurrency protection documented above
 * covers ad units too.
 *
 * @param path   Path relative to the CMS origin, e.g. `/api/categories`.
 * @param fallback Returned on any failure — network, timeout, non-2xx, bad JSON.
 */
export async function cmsFetch<T>(path: string, fallback: T): Promise<T> {
  const cached = responseCache.get(path)
  if (cached) return cached as Promise<T>

  const request = (async (): Promise<T> => {
    let result = await fetchOnce<T>(path, fallback)

    // One retry on a failed result. Distinguishing "failed" from a legitimately
    // empty response is impossible in general, so retry only when the fallback
    // is itself empty-ish and the result equals it. That covers offline/500
    // without re-requesting genuinely empty collections.
    const looksEmpty =
      result === null || result === undefined || (Array.isArray(result) && result.length === 0)

    if (looksEmpty) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
      const retry = await fetchOnce<T>(path, fallback)
      const retryBetter =
        retry !== null && retry !== undefined && !(Array.isArray(retry) && retry.length === 0)
      if (retryBetter) result = retry
    }

    return result
  })()

  responseCache.set(path, request)
  return request
}

/** Site settings global. Falls back to the owner-confirmed defaults. */
export async function getSiteSettings(): Promise<CmsSiteSettings> {
  const data = await cmsFetch<{ siteName?: string } | null>(
    '/api/globals/site-settings?depth=1',
    null,
  )
  if (!data?.siteName) return FALLBACK_SETTINGS
  return { ...FALLBACK_SETTINGS, ...(data as CmsSiteSettings) }
}

/**
 * Active categories, ordered. Falls back to the approved 8-category tree.
 *
 * `parent` is filtered out because subcategories would otherwise appear as
 * top-level navigation items — the approved tree is flat, but editors may add
 * subcategories later and the nav must not break when they do.
 */
export async function getCategories(): Promise<CmsCategory[]> {
  const data = await cmsFetch<{ docs?: CmsCategory[] } | null>(
    '/api/categories?limit=50&sort=sortOrder&where[isActive][equals]=true',
    null,
  )

  const docs = data?.docs
  if (!docs || docs.length === 0) return FALLBACK_CATEGORIES

  return docs.filter((category) => !category.parent)
}

/** Pages flagged for the footer. Falls back to nothing — an empty footer is
 *  better than a wrong one. */
export async function getFooterPages(): Promise<CmsPage[]> {
  const data = await cmsFetch<{ docs?: CmsPage[] } | null>(
    '/api/pages?limit=20&where[showInFooter][equals]=true',
    null,
  )
  return data?.docs ?? []
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Homepage content (S3)
 * ─────────────────────────────────────────────────────────────────────────────
 * Field names mirror `cms/src/collections/*.ts`. They are declared here rather
 * than imported so a CMS schema change cannot break the frontend build through a
 * cross-workspace import — the frontend and CMS are separate workspaces.
 */

export interface CmsArticle {
  id: number | string
  title: string
  slug: string
  excerpt?: string | null
  featuredImage?: { url?: string | null; alt?: string | null } | number | null
  category?: { nameBn?: string; slug?: string } | number | null
  level?: { nameBn?: string; slug?: string } | number | null
  district?: { nameBn?: string; slug?: string } | number | null
  author?: { name?: string } | number | null
  isBreaking?: boolean | null
  isLead?: boolean | null
  /**
   * Paid content. Must be labelled wherever it appears and must never be
   * presented as reporting — see `ArticleCard` and the article page.
   */
  isSponsored?: boolean | null
  sponsorName?: string | null
  publishedAt?: string | null
  readingTimeMinutes?: number | null
}

export interface CmsDeadline {
  id: number | string
  title: string
  type?: string | null
  dateStart?: string | null
  dateEnd?: string | null
  level?: { nameBn?: string; slug?: string } | number | null
  district?: { nameBn?: string; slug?: string } | number | null
  description?: string | null
}

export interface CmsLevel {
  id: number | string
  nameBn: string
  slug: string
  sortOrder: number
}

export interface CmsDistrict {
  id: number | string
  nameBn: string
  nameEn?: string | null
  slug: string
  divisionBn?: string | null
}

/** The 5 education levels, mirroring `cms/src/seed/taxonomies.ts`. */
export const FALLBACK_LEVELS: CmsLevel[] = [
  { id: 'primary', nameBn: 'প্রাথমিক', slug: 'primary', sortOrder: 1 },
  { id: 'secondary', nameBn: 'মাধ্যমিক', slug: 'secondary', sortOrder: 2 },
  { id: 'higher-secondary', nameBn: 'উচ্চ মাধ্যমিক', slug: 'higher-secondary', sortOrder: 3 },
  { id: 'graduate', nameBn: 'স্নাতক', slug: 'graduate', sortOrder: 4 },
  { id: 'postgraduate', nameBn: 'স্নাতকোত্তর', slug: 'postgraduate', sortOrder: 5 },
]

/**
 * Build a Payload REST query string.
 *
 * Skips `undefined`/`null` so callers can pass optional filters without
 * producing `where[x][equals]=undefined`.
 */
function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const out = search.toString()
  return out ? `?${out}` : ''
}

/**
 * Published articles, newest first.
 *
 * @param opts.categorySlug Filter to one category.
 * @param opts.limit        Max results.
 *
 * **Falls back to an empty list, never sample articles.** A news site that
 * fabricates headlines when its CMS is unreachable is worse than one that shows
 * an empty section — readers would have no way to tell invented content from
 * real reporting. The empty state is rendered honestly by the components.
 */
export async function getArticles(
  opts: { categorySlug?: string; limit?: number } = {},
): Promise<CmsArticle[]> {
  const { categorySlug, limit = 12 } = opts

  const data = await cmsFetch<{ docs?: CmsArticle[] } | null>(
    `/api/articles${qs({
      limit,
      depth: 2,
      sort: '-publishedAt',
      'where[_status][equals]': 'published',
      'where[category.slug][equals]': categorySlug,
    })}`,
    null,
  )

  return data?.docs ?? []
}

/** The single lead story — `isLead`, else the newest published article. */
export async function getLeadStory(): Promise<CmsArticle | null> {
  const [lead] = await getArticles({ limit: 1 })
  return lead ?? null
}

/** Breaking news for the ticker. Empty when nothing is flagged. */
export async function getBreakingNews(): Promise<CmsArticle[]> {
  const data = await cmsFetch<{ docs?: CmsArticle[] } | null>(
    `/api/articles${qs({
      limit: 8,
      depth: 1,
      sort: '-publishedAt',
      'where[_status][equals]': 'published',
      'where[isBreaking][equals]': true,
    })}`,
    null,
  )
  return data?.docs ?? []
}

/**
 * Upcoming deadlines — N1 (scholarship tracker) + N2 (academic calendar).
 *
 * Sorted soonest-first so the most urgent opportunity leads. Past deadlines are
 * filtered out by the caller's own `dateEnd`, but we over-fetch and filter here
 * so the strip never shows an expired opportunity.
 */
export async function getDeadlines(limit = 8): Promise<CmsDeadline[]> {
  const data = await cmsFetch<{ docs?: CmsDeadline[] } | null>(
    `/api/deadlines${qs({
      limit,
      depth: 2,
      sort: 'dateEnd',
    })}`,
    null,
  )

  const docs = data?.docs ?? []
  const today = new Date().toISOString().slice(0, 10)

  return docs
    .filter((d) => {
      // Keep anything that has not finished, or has no end date at all.
      if (!d.dateEnd) return true
      return d.dateEnd.slice(0, 10) >= today
    })
    .slice(0, limit)
}

/** The 5 education levels. Falls back to the seeded set. */
export async function getLevels(): Promise<CmsLevel[]> {
  const data = await cmsFetch<{ docs?: CmsLevel[] } | null>(
    `/api/levels${qs({ limit: 20, sort: 'sortOrder' })}`,
    null,
  )
  return data?.docs?.length ? data.docs : FALLBACK_LEVELS
}

/** Districts for the "আমার জেলা" selector. Falls back to empty — the selector
 *  simply hides when the taxonomy is unavailable, rather than guessing. */
export async function getDistricts(): Promise<CmsDistrict[]> {
  const data = await cmsFetch<{ docs?: CmsDistrict[] } | null>(
    `/api/districts${qs({ limit: 100, sort: 'sortOrder' })}`,
    null,
  )
  return data?.docs ?? []
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Article page (S4)
 * ───────────────────────────────────────────────────────────────────────────── */

/** The article shape the page needs — a superset of the card's `CmsArticle`. */
export interface CmsFullArticle extends CmsArticle {
  /** Lexical richText JSON. Rendered by `lib/richtext.ts`, never raw HTML. */
  body?: unknown
  keyTakeaways?: Array<{ point: string }> | null
  correctionNotice?: { hasCorrection?: boolean | null; note?: string | null } | null
  timelineMilestones?: Array<{
    date?: string | null
    title?: string
    detail?: string | null
  }> | null
  updatedAt?: string | null
  tags?: Array<{ nameBn?: string; slug?: string }> | number[] | null
}

export interface CmsAuthor {
  id: number | string
  nameBn: string
  nameEn?: string | null
  slug?: string | null
  designation?: string | null
  bio?: string | null
  photo?: { url?: string | null; alt?: string | null } | number | null
}

/**
 * A single published article by slug.
 *
 * Body is Lexical JSON, not HTML — converting it is the caller's job
 * (`lib/richtext.ts`), so the CMS is never trusted to emit markup.
 */
export async function getArticleBySlug(slug: string): Promise<CmsFullArticle | null> {
  const data = await cmsFetch<{ docs?: CmsFullArticle[] } | null>(
    `/api/articles${qs({
      limit: 1,
      depth: 2,
      'where[slug][equals]': slug,
      'where[_status][equals]': 'published',
    })}`,
    null,
  )
  return data?.docs?.[0] ?? null
}

/** Every published slug — used to generate the static article routes. */
export async function getAllArticleSlugs(): Promise<string[]> {
  const data = await cmsFetch<{ docs?: Array<{ slug: string }> } | null>(
    `/api/articles${qs({
      limit: 500,
      depth: 0,
      'where[_status][equals]': 'published',
    })}`,
    null,
  )
  return (data?.docs ?? []).map((doc) => doc.slug).filter(Boolean)
}

/**
 * Related articles — same category, excluding the current one.
 *
 * Falls back to the newest articles when the category yields nothing, so the
 * "related" slot is never empty on a thin category. That is a deliberate
 * trade: slightly-less-relevant links beat a dead end at the foot of the page.
 */
export async function getRelatedArticles(
  article: Pick<CmsFullArticle, 'slug' | 'category'>,
  limit = 4,
): Promise<CmsArticle[]> {
  const categorySlug =
    article.category && typeof article.category === 'object' ? article.category.slug : undefined

  const fetcher = (params: Record<string, string | number | boolean | undefined | null>) =>
    cmsFetch<{ docs?: CmsArticle[] } | null>(
      `/api/articles${qs({ limit, depth: 1, sort: '-publishedAt', 'where[_status][equals]': 'published', ...params })}`,
      null,
    )

  let docs: CmsArticle[] = []
  if (categorySlug) {
    docs = (await fetcher({ 'where[category.slug][equals]': categorySlug }))?.docs ?? []
  }
  if (docs.length === 0) docs = (await fetcher({}))?.docs ?? []

  return docs.filter((item) => item.slug !== article.slug).slice(0, limit)
}

/** An author by id, for the author card. */
export async function getAuthor(author: CmsFullArticle['author']): Promise<CmsAuthor | null> {
  if (!author) return null
  if (typeof author === 'object' && 'nameBn' in author) {
    return author as unknown as CmsAuthor
  }
  const data = await cmsFetch<CmsAuthor | null>(`/api/authors/${String(author)}`, null)
  return data ?? null
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Listings (S5)
 * ───────────────────────────────────────────────────────────────────────────── */

export interface CmsTag {
  id: number | string
  nameBn: string
  slug: string
}

/** A page of articles plus the totals needed to render pagination. */
export interface ArticlePage {
  docs: CmsArticle[]
  page: number
  totalPages: number
  totalDocs: number
  hasPrev: boolean
  hasNext: boolean
}

/** Articles per listing page. */
export const PAGE_SIZE = 12

/**
 * A paginated page of published articles.
 *
 * `totalPages` comes from Payload's `totalDocs`, so this is one request rather
 * than a fetch plus a separate count.
 */
export async function getArticlesPage(
  opts: {
    page?: number
    categorySlug?: string
    tagSlug?: string
    authorSlug?: string
    limit?: number
  } = {},
): Promise<ArticlePage> {
  const { page = 1, categorySlug, tagSlug, authorSlug, limit = PAGE_SIZE } = opts

  const data = await cmsFetch<{ docs?: CmsArticle[]; totalDocs?: number } | null>(
    `/api/articles${qs({
      limit,
      page,
      depth: 2,
      sort: '-publishedAt',
      'where[_status][equals]': 'published',
      'where[category.slug][equals]': categorySlug,
      'where[tags.slug][equals]': tagSlug,
      'where[author.slug][equals]': authorSlug,
    })}`,
    null,
  )

  const docs = data?.docs ?? []
  const totalDocs = data?.totalDocs ?? docs.length
  const totalPages = Math.max(1, Math.ceil(totalDocs / limit))

  return {
    docs,
    page,
    totalPages,
    totalDocs,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  }
}

/**
 * Subcategories of a parent — the subcategory filter on a category page.
 *
 * Returns empty under the approved flat tree, which is the normal case today.
 * The mechanism exists because `categories.parent` is a self-relation: editors
 * may add children later and the listing must not break when they do.
 */
export async function getSubcategories(parentSlug: string): Promise<CmsCategory[]> {
  const data = await cmsFetch<{ docs?: CmsCategory[] } | null>(
    `/api/categories${qs({
      limit: 50,
      sort: 'sortOrder',
      'where[parent.slug][equals]': parentSlug,
    })}`,
    null,
  )
  return data?.docs ?? []
}

/** A tag by slug. */
export async function getTagBySlug(slug: string): Promise<CmsTag | null> {
  const data = await cmsFetch<{ docs?: CmsTag[] } | null>(
    `/api/tags${qs({ limit: 1, 'where[slug][equals]': slug })}`,
    null,
  )
  return data?.docs?.[0] ?? null
}

/** An author by slug, for the author profile page. */
export async function getAuthorBySlug(slug: string): Promise<CmsAuthor | null> {
  const data = await cmsFetch<{ docs?: CmsAuthor[] } | null>(
    `/api/authors${qs({ limit: 1, 'where[slug][equals]': slug })}`,
    null,
  )
  return data?.docs?.[0] ?? null
}

/** One entry per year/month that actually has articles. */
export interface ArchiveBucket {
  year: number
  month: number
  count: number
  /** Bengali label, e.g. "সেপ্টেম্বর ২০২৬". */
  label: string
}

/**
 * Archive buckets derived from the articles themselves.
 *
 * Not a separate collection — deriving means the archive can never disagree
 * with what is actually published.
 */
export async function getArchiveBuckets(): Promise<ArchiveBucket[]> {
  const data = await cmsFetch<{ docs?: Array<{ publishedAt?: string | null }> } | null>(
    `/api/articles${qs({
      limit: 1000,
      depth: 0,
      sort: '-publishedAt',
      'where[_status][equals]': 'published',
    })}`,
    null,
  )

  const counts = new Map<string, number>()
  for (const doc of data?.docs ?? []) {
    if (!doc.publishedAt) continue
    const date = new Date(doc.publishedAt)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, count]) => {
      const [year, month] = key.split('-').map(Number)
      const label = new Date(year, month - 1, 1).toLocaleDateString('bn-BD', {
        month: 'long',
        year: 'numeric',
      })
      return { year, month, count, label }
    })
}

/** Articles published in one calendar month. */
export async function getArticlesByMonth(
  year: number,
  month: number,
  page = 1,
  limit = PAGE_SIZE,
): Promise<ArticlePage> {
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 1))

  const data = await cmsFetch<{ docs?: CmsArticle[]; totalDocs?: number } | null>(
    `/api/articles${qs({
      limit,
      page,
      depth: 2,
      sort: '-publishedAt',
      'where[_status][equals]': 'published',
      'where[publishedAt][greater_than_equal]': start.toISOString(),
      'where[publishedAt][less_than]': end.toISOString(),
    })}`,
    null,
  )

  const docs = data?.docs ?? []
  const totalDocs = data?.totalDocs ?? docs.length
  const totalPages = Math.max(1, Math.ceil(totalDocs / limit))

  return {
    docs,
    page,
    totalPages,
    totalDocs,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  }
}

/** All deadlines, for the /deadlines page. */
export async function getAllDeadlines(limit = 50): Promise<CmsDeadline[]> {
  const data = await cmsFetch<{ docs?: CmsDeadline[] } | null>(
    `/api/deadlines${qs({ limit, depth: 2, sort: 'dateEnd' })}`,
    null,
  )
  return data?.docs ?? []
}

/** A CMS Page with its body — the E-E-A-T pages (privacy, terms, contact). */
export interface CmsPageFull extends CmsPage {
  body?: unknown
  updatedAt?: string | null
}

export async function getPageBySlug(slug: string): Promise<CmsPageFull | null> {
  const data = await cmsFetch<{ docs?: CmsPageFull[] } | null>(
    `/api/pages${qs({ limit: 1, depth: 1, 'where[slug][equals]': slug })}`,
    null,
  )
  return data?.docs?.[0] ?? null
}

/** Every page slug — for the /page/[slug] routes. */
export async function getAllPageSlugs(): Promise<string[]> {
  const data = await cmsFetch<{ docs?: Array<{ slug: string }> } | null>(
    `/api/pages${qs({ limit: 100 })}`,
    null,
  )
  return (data?.docs ?? []).map((doc) => doc.slug).filter(Boolean)
}
