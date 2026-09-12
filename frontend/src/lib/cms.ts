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
 * Fetch a Payload REST collection or global.
 *
 * @param path   Path relative to the CMS origin, e.g. `/api/categories`.
 * @param fallback Returned on any failure — network, timeout, non-2xx, bad JSON.
 */
async function cmsFetch<T>(path: string, fallback: T): Promise<T> {
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
