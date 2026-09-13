/**
 * Education-feature content layer — scholarships, results, institutions,
 * circulars and study-abroad guides.
 *
 * Split out of `lib/cms.ts` (already at the 740-line budget) because these are
 * the S10 education-specific surfaces. Every fetch degrades to an empty array
 * rather than throwing, so a CMS outage produces thin pages, never a failed
 * build (`docs/reliability.md` §1).
 *
 * All data is **editorially curated** — no external API
 * (`docs/education-feature-inventory.md` §4, `docs/data-sources.md` §2).
 */
import { cmsFetch } from './cms'
import type { CmsMedia } from './media'

/* ── Scholarships (N1) ─────────────────────────────────────────── */

export interface CmsScholarship {
  id: number | string
  title: string
  provider: string
  level?: Array<{ nameBn?: string; slug?: string } | number> | null
  country?: string | null
  fundingType?: string | null
  amount?: string | null
  deadline?: string | null
  eligibility?: string | null
  applyUrl?: string | null
  description?: unknown
  isInternational?: boolean | null
  isActive?: boolean | null
}

/** Active scholarships, soonest deadline first. */
export async function getActiveScholarships(limit = 100): Promise<CmsScholarship[]> {
  const q = new URLSearchParams({
    'where[isActive][equals]': 'true',
    limit: String(limit),
    depth: '2',
    sort: 'deadline',
  })
  const data = await cmsFetch<{ docs?: CmsScholarship[] } | null>(`/api/scholarships?${q}`, null)
  return data?.docs ?? []
}

/* ── Result links (N3) ──────────────────────────────────────────── */

export interface CmsResultLink {
  id: number | string
  title: string
  examName: string
  boardOrInstitution?: string | null
  level?: { nameBn?: string; slug?: string } | number | null
  publicationDate?: string | null
  officialUrl: string
  howToSteps?: unknown
  meritListUrl?: string | null
  isPublished?: boolean | null
}

/** Published result links, newest first. */
export async function getPublishedResults(limit = 50): Promise<CmsResultLink[]> {
  const q = new URLSearchParams({
    'where[isPublished][equals]': 'true',
    limit: String(limit),
    depth: '1',
    sort: '-publicationDate',
  })
  const data = await cmsFetch<{ docs?: CmsResultLink[] } | null>(`/api/result-links?${q}`, null)
  return data?.docs ?? []
}

/* ── Institutions (N4) ─────────────────────────────────────────── */

export interface CmsInstitution {
  id: number | string
  nameBn: string
  nameEn?: string | null
  slug: string
  type?: string | null
  levelOffered?: Array<{ nameBn?: string; slug?: string } | number> | null
  district?: { nameBn?: string; slug?: string } | number | null
  established?: number | null
  website?: string | null
  logo?: CmsMedia | number | null
  address?: string | null
  description?: unknown
  isVerified?: boolean | null
}

/** All institutions, name-sorted. */
export async function getInstitutions(limit = 200): Promise<CmsInstitution[]> {
  const q = new URLSearchParams({ limit: String(limit), depth: '2', sort: 'nameBn' })
  const data = await cmsFetch<{ docs?: CmsInstitution[] } | null>(`/api/institutions?${q}`, null)
  return data?.docs ?? []
}

/** One institution by slug, or null. */
export async function getInstitutionBySlug(slug: string): Promise<CmsInstitution | null> {
  const q = new URLSearchParams({
    'where[slug][equals]': slug,
    limit: '1',
    depth: '2',
  })
  const data = await cmsFetch<{ docs?: CmsInstitution[] } | null>(`/api/institutions?${q}`, null)
  return data?.docs?.[0] ?? null
}

/** Every institution slug — for `/institutions/[slug]` routes. */
export async function getAllInstitutionSlugs(): Promise<string[]> {
  const q = new URLSearchParams({ limit: '200' })
  const data = await cmsFetch<{ docs?: Array<{ slug: string }> } | null>(
    `/api/institutions?${q}`,
    null,
  )
  return (data?.docs ?? []).map((d) => d.slug).filter(Boolean)
}

/* ── Circulars (N8) ────────────────────────────────────────────── */

export interface CmsCircular {
  id: number | string
  title: string
  organisation: string
  type?: string | null
  level?: Array<{ nameBn?: string; slug?: string } | number> | null
  publishedDate?: string | null
  deadline?: string | null
  vacancyCount?: number | null
  circularImage?: CmsMedia | number | null
  applyUrl?: string | null
  description?: unknown
}

/** Active circulars, soonest deadline first (nulls last). */
export async function getActiveCirculars(limit = 100): Promise<CmsCircular[]> {
  const q = new URLSearchParams({ limit: String(limit), depth: '2', sort: 'deadline' })
  const data = await cmsFetch<{ docs?: CmsCircular[] } | null>(`/api/circulars?${q}`, null)
  return data?.docs ?? []
}

/* ── Study-abroad guides (N10) ─────────────────────────────────── */

export interface CmsStudyAbroadGuide {
  id: number | string
  country: string
  slug: string
  visaRequirements?: unknown
  tuitionRange?: string | null
  livingCostRange?: string | null
  intakes?: string | null
  applicationSteps?: unknown
  scholarshipNotes?: unknown
  isFeatured?: boolean | null
}

/** All study-abroad guides, featured first. */
export async function getStudyAbroadGuides(limit = 50): Promise<CmsStudyAbroadGuide[]> {
  const q = new URLSearchParams({ limit: String(limit), depth: '0', sort: '-isFeatured' })
  const data = await cmsFetch<{ docs?: CmsStudyAbroadGuide[] } | null>(
    `/api/study-abroad-guides?${q}`,
    null,
  )
  return data?.docs ?? []
}

/** One guide by slug, or null. */
export async function getStudyAbroadGuideBySlug(slug: string): Promise<CmsStudyAbroadGuide | null> {
  const q = new URLSearchParams({ 'where[slug][equals]': slug, limit: '1', depth: '0' })
  const data = await cmsFetch<{ docs?: CmsStudyAbroadGuide[] } | null>(
    `/api/study-abroad-guides?${q}`,
    null,
  )
  return data?.docs?.[0] ?? null
}

/** Every guide slug — for `/study-abroad/[slug]` routes. */
export async function getAllStudyAbroadSlugs(): Promise<string[]> {
  const q = new URLSearchParams({ limit: '50' })
  const data = await cmsFetch<{ docs?: Array<{ slug: string }> } | null>(
    `/api/study-abroad-guides?${q}`,
    null,
  )
  return (data?.docs ?? []).map((d) => d.slug).filter(Boolean)
}
