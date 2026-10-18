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
import { cmsFetch, fetchAllPages } from './cms'
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

/* ── Institutions (N4, extended by S18) ────────────────────────── */

/** The `contact` group — S18 moved `address` in here. */
export interface CmsInstitutionContact {
  address?: string | null
  phone?: string | null
  email?: string | null
  mapUrl?: string | null
}

export interface CmsInstitutionFaculty {
  name?: string
  departments?: Array<{ name?: string }> | null
}

/** A fee row. `verifiedAt` is required by the CMS — never render `amount` without it. */
export interface CmsInstitutionFee {
  programme?: string
  amount?: string
  period?: string | null
  academicYear?: string
  note?: string | null
  sourceUrl?: string | null
  verifiedAt?: string | null
}

export interface CmsInstitution {
  id: number | string
  nameBn: string
  nameEn?: string | null
  acronym?: string | null
  slug: string
  /** Ownership axis — `public` | `private` | `nu-college` | `madrasa`. */
  type?: string | null
  /** Subject axis — separate from `type`; an institution can be both. */
  discipline?: string | null
  levelOffered?: Array<{ nameBn?: string; slug?: string } | number> | null
  district?: { nameBn?: string; slug?: string } | number | null
  established?: number | null
  website?: string | null
  logo?: CmsMedia | number | null
  /**
   * ⚠️ **S18 moved `address` into this group.** A page still reading
   * `institution.address` renders nothing rather than erroring, because `.astro`
   * frontmatter is not typechecked.
   */
  contact?: CmsInstitutionContact | null
  description?: unknown
  faculties?: CmsInstitutionFaculty[] | null
  admissionInfo?: Array<{ label?: string; value?: string }> | null
  admissionUrl?: string | null
  tuitionFees?: CmsInstitutionFee[] | null
  importantLinks?: Array<{ label?: string; url?: string }> | null
  isVerified?: boolean | null
  lastVerifiedAt?: string | null
  dataSource?: string | null
  wikidataId?: string | null
}

/**
 * All institutions, name-sorted.
 *
 * ⚠️ The default is a **cap, not a page size** — the index renders what it is
 * given, and S19's import put 724 rows behind it. It is deliberately above the
 * current count so nothing is silently hidden; S20 replaces this with real
 * filtering over the two axes, at which point the number stops being a guess.
 */
export async function getInstitutions(limit = 1000): Promise<CmsInstitution[]> {
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

/**
 * Every institution slug — for `/institutions/[slug]` routes.
 *
 * ⚠️ **Paginated, and that is the whole point.** A single `limit: 200` request
 * silently produced 200 pages for 724 institutions, with a green build and no
 * warning — the same shape as the `getAllArticleSlugs()` 500-cap defect. A
 * static build only emits the paths `getStaticPaths` returns, so a capped list
 * is a directory that is two-thirds missing rather than an error.
 */
export async function getAllInstitutionSlugs(): Promise<string[]> {
  const limit = 500
  let page = 1
  let totalPages = 1
  const all: string[] = []

  do {
    const data = await cmsFetch<{
      docs?: Array<{ slug: string }>
      totalPages?: number
    } | null>(
      `/api/institutions?${new URLSearchParams({ limit: String(limit), page: String(page) })}`,
      null,
    )
    for (const doc of data?.docs ?? []) {
      if (doc.slug) all.push(doc.slug)
    }
    totalPages = data?.totalPages ?? 1
    page++
  } while (page <= totalPages)

  return all
}

/** A published article linked to an institution. */
export interface CmsInstitutionArticle {
  id: number | string
  title: string
  slug: string
  excerpt?: string | null
  publishedAt?: string | null
  category?: { nameBn?: string; slug?: string } | number | null
}

/**
 * Published articles linked to one institution, newest first.
 *
 * ⚠️ The link is `Articles.university` — the profile queries it rather than the
 * institution holding a list. So publishing a story is the whole job: there is no
 * second editing step, and the two cannot disagree about what belongs here.
 */
export async function getInstitutionArticles(
  institutionId: number | string,
  limit = 30,
): Promise<CmsInstitutionArticle[]> {
  const q = new URLSearchParams({
    'where[university][equals]': String(institutionId),
    'where[_status][equals]': 'published',
    limit: String(limit),
    depth: '1',
    sort: '-publishedAt',
  })
  const data = await cmsFetch<{ docs?: CmsInstitutionArticle[] } | null>(`/api/articles?${q}`, null)
  return data?.docs ?? []
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

/**
 * Every guide slug — for `/study-abroad/[slug]` routes.
 *
 * ⚠️ **Paginated. This feeds `getStaticPaths`, so a cap here is not a truncated
 * list — it is missing routes.** At `limit: 50` the 51st guide simply never got
 * a page, while the guide stayed listed on `/study-abroad` and in the sitemap:
 * a live link to a 404, with a green build and no warning. Same failure shape as
 * the `getAllArticleSlugs()` 500-cap and the 200-cap institution list.
 *
 * `fetchAllPages` is the shared walker (200 per request, page until
 * `totalPages`), so this costs one request today and stops at the real end of
 * the collection rather than at a guess.
 */
export async function getAllStudyAbroadSlugs(): Promise<string[]> {
  const docs = await fetchAllPages<{ slug?: string }>('/api/study-abroad-guides', {
    depth: 0,
    sort: '-isFeatured',
  })
  return docs.map((doc) => doc.slug).filter((slug): slug is string => Boolean(slug))
}
