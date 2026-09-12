/**
 * Build-time layer for the interactive features — live blogs, polls, quizzes.
 *
 * ## Why this is separate from `lib/cms.ts`
 *
 * `lib/cms.ts` is the editorial read path: articles, categories, settings.
 * This file is the **interactive** read path, and it has a second job — it also
 * exposes the origin the browser-side islands must call. Keeping the two apart
 * means an island never imports the whole content layer just to learn one URL.
 *
 * ## The same contract as `lib/cms.ts`
 *
 * Build-time fetch, never fail the build, degrade to empty. A CMS outage must
 * produce a site with no live blogs rather than no site
 * (`docs/reliability.md` §1).
 *
 * ## The islands are opt-in
 *
 * `getPublicCmsOrigin()` returns `null` when no public CMS origin is configured.
 * When it is `null`, the refresh button and the vote control are **not rendered
 * at all** — a control that cannot work is worse than an absent one, because the
 * reader blames themselves for the failure. The static content always renders.
 */
import { cmsFetch } from './cms'

/** A single timestamped live-blog update. */
export interface CmsLiveBlogEntry {
  id?: string | null
  timestamp: string
  /** Lexical JSON — converted with `lexicalToHtml`, never trusted as markup. */
  content: unknown
  isKeyEvent?: boolean | null
}

export interface CmsLiveBlog {
  id: number | string
  title: string
  slug: string
  isActive?: boolean | null
  entries?: CmsLiveBlogEntry[] | null
  updatedAt?: string | null
}

export interface CmsPollOption {
  id?: string | null
  label: string
  voteCount?: number | null
}

export interface CmsPoll {
  id: number | string
  questionBn: string
  options?: CmsPollOption[] | null
  isActive?: boolean | null
  expiresAt?: string | null
}

export interface CmsQuizQuestion {
  id?: string | null
  question: string
  options?: Array<{ id?: string | null; label: string }> | null
  correctAnswer: string
  explanation?: string | null
}

export interface CmsQuiz {
  id: number | string
  title: string
  date: string
  questions?: CmsQuizQuestion[] | null
  isActive?: boolean | null
}

/**
 * The CMS origin a browser is allowed to call, or `null` when unconfigured.
 *
 * `PUBLIC_CMS_ORIGIN` is what production sets. The localhost fallback exists so
 * development works without a second variable — and it is deliberately limited
 * to localhost, so a misconfigured production build can never silently point
 * readers at an internal or non-public host.
 */
export function getPublicCmsOrigin(): string | null {
  const configured = import.meta.env.PUBLIC_CMS_ORIGIN?.trim()
  if (configured) return configured.replace(/\/$/, '')

  const buildTime = (import.meta.env.CMS_URL || '').trim().replace(/\/$/, '')
  if (buildTime && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(buildTime)) return buildTime

  return null
}

/**
 * Live blogs, newest edit first.
 *
 * Only `isActive` blogs are returned — a closed live blog is still readable at
 * its own URL (the page renders regardless), but it must not be promoted.
 */
export async function getLiveBlogs(): Promise<CmsLiveBlog[]> {
  const data = await cmsFetch<{ docs?: CmsLiveBlog[] } | null>(
    '/api/live-blogs?limit=20&depth=0&sort=-updatedAt&where[isActive][equals]=true',
    null,
  )
  return data?.docs ?? []
}

/**
 * Every live-blog slug, **including closed ones**.
 *
 * A closed live blog keeps its URL: it is the record of what happened that day,
 * it is linked to from social posts, and 404-ing it would throw away the traffic
 * and the archive at once. Closing a blog stops promotion and stops new votes —
 * it does not delete the page.
 */
export async function getAllLiveBlogSlugs(): Promise<string[]> {
  const data = await cmsFetch<{ docs?: Array<{ slug?: string | null }> } | null>(
    '/api/live-blogs?limit=100&depth=0',
    null,
  )
  return (data?.docs ?? []).map((doc) => doc.slug).filter((slug): slug is string => Boolean(slug))
}

/** One live blog by slug, with entries ordered newest first. */
export async function getLiveBlogBySlug(slug: string): Promise<CmsLiveBlog | null> {
  const data = await cmsFetch<{ docs?: CmsLiveBlog[] } | null>(
    `/api/live-blogs?limit=1&depth=0&where[slug][equals]=${encodeURIComponent(slug)}`,
    null,
  )

  const blog = data?.docs?.[0]
  if (!blog) return null

  return { ...blog, entries: sortEntries(blog.entries ?? []) }
}

/**
 * Newest entry first.
 *
 * The CMS array is manually ordered and an editor adding an entry during a
 * result-day rush will not always put it at the top. Sorting here means the
 * timeline is correct regardless of how it was entered.
 */
export function sortEntries(entries: CmsLiveBlogEntry[]): CmsLiveBlogEntry[] {
  return [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
}

/**
 * The poll to show, or `null`.
 *
 * Returns the most recently updated active poll whose window has not closed.
 * The expiry is applied here as well as in the vote endpoint: the endpoint
 * protects the result, this protects the reader from being shown a poll they
 * cannot vote in.
 */
export async function getActivePoll(): Promise<CmsPoll | null> {
  const data = await cmsFetch<{ docs?: CmsPoll[] } | null>(
    '/api/polls?limit=5&depth=0&sort=-updatedAt&where[isActive][equals]=true',
    null,
  )

  const now = Date.now()
  const poll = (data?.docs ?? []).find((candidate) => {
    if (!candidate.expiresAt) return true
    const expires = new Date(candidate.expiresAt).getTime()
    return Number.isNaN(expires) || expires > now
  })

  return poll ?? null
}

/** Quizzes, newest first. */
export async function getQuizzes(): Promise<CmsQuiz[]> {
  const data = await cmsFetch<{ docs?: CmsQuiz[] } | null>(
    '/api/quizzes?limit=30&depth=0&sort=-date&where[isActive][equals]=true',
    null,
  )
  return data?.docs ?? []
}

/** One quiz by slug (the quiz slug is its id — quizzes have no slug field). */
export async function getQuizById(id: string | number): Promise<CmsQuiz | null> {
  const data = await cmsFetch<{ docs?: CmsQuiz[] } | null>(
    `/api/quizzes?limit=1&depth=0&where[id][equals]=${encodeURIComponent(String(id))}`,
    null,
  )
  return data?.docs?.[0] ?? null
}
