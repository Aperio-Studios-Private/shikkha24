/**
 * Reader-engagement content layer — comments, galleries, bookmarks.
 *
 * Split out of `lib/cms.ts` (which is already 740 lines) because these are the
 * S9 reader-facing surfaces, and because they share a shape the editorial
 * helpers do not: each one **degrades to nothing** rather than to a fallback.
 *
 * The distinction matters. An editorial helper that cannot reach the CMS returns
 * a documented fallback so the page still renders — an empty category list is
 * still a page. An engagement surface that cannot reach the CMS must render
 * **nothing at all**: a comment form that cannot submit, or a gallery with no
 * images, is worse than its absence (`docs/reliability.md` §4).
 *
 * Every fetch goes through `cmsFetch`, which caches per path for the whole build
 * and never throws — so a CMS outage produces thin pages, never a failed build.
 */
import { cmsFetch } from './cms'
import { type CmsMedia, mediaUrl } from './media'

/** One approved reader comment, as the site renders it. */
export interface CmsComment {
  id: number | string
  userName: string
  userAvatar?: string | null
  body: string
  createdAt: string
  socialProvider?: string | null
}

/** A gallery image plus its caption. */
export interface CmsGalleryImage {
  image?: CmsMedia | number | null
  caption?: string | null
}

export interface CmsGallery {
  id: number | string
  title: string
  slug: string
  description?: string | null
  images?: CmsGalleryImage[] | null
  updatedAt?: string | null
}

/**
 * Approved comments for one article, oldest first.
 *
 * The `where` clause is belt-and-braces: `Comments.access.read` already filters
 * unapproved rows for anonymous callers, but the build-time fetch runs with no
 * session, so filtering here too means a future change to that access rule
 * cannot accidentally publish a pending comment.
 */
export async function getApprovedComments(articleId: number | string): Promise<CmsComment[]> {
  const query = new URLSearchParams({
    'where[article][equals]': String(articleId),
    'where[isApproved][equals]': 'true',
    limit: '100',
    sort: 'createdAt',
    depth: '0',
  })

  const data = await cmsFetch<{ docs: CmsComment[] }>(`/api/comments?${query}`, { docs: [] })
  return Array.isArray(data.docs) ? data.docs : []
}

/** How many approved comments an article has — used for the listing count. */
export async function countApprovedComments(articleId: number | string): Promise<number> {
  const query = new URLSearchParams({
    'where[article][equals]': String(articleId),
    'where[isApproved][equals]': 'true',
    limit: '0',
  })
  const data = await cmsFetch<{ totalDocs?: number }>(`/api/comments?${query}`, {})
  return typeof data.totalDocs === 'number' ? data.totalDocs : 0
}

/**
 * Every gallery, newest first.
 *
 * Returns `[]` on a CMS outage — and the gallery index treats `[]` as "render
 * nothing" rather than "render an empty gallery", because a `/gallery` page with
 * no images is a dead end.
 */
export async function getGalleries(limit = 50): Promise<CmsGallery[]> {
  const query = new URLSearchParams({
    limit: String(limit),
    sort: '-updatedAt',
    depth: '1',
  })
  const data = await cmsFetch<{ docs: CmsGallery[] }>(`/api/photo-galleries?${query}`, { docs: [] })
  return Array.isArray(data.docs) ? data.docs : []
}

/** One gallery by slug, or `null`. */
export async function getGalleryBySlug(slug: string): Promise<CmsGallery | null> {
  const query = new URLSearchParams({
    'where[slug][equals]': slug,
    limit: '1',
    depth: '1',
  })
  const data = await cmsFetch<{ docs: CmsGallery[] }>(`/api/photo-galleries?${query}`, { docs: [] })
  return data.docs?.[0] ?? null
}

/** Slugs for `getStaticPaths`. */
export async function getAllGallerySlugs(): Promise<string[]> {
  const galleries = await getGalleries(200)
  return galleries.map((gallery) => gallery.slug).filter(Boolean)
}

/**
 * A gallery's images with a resolved URL and caption, skipping any that cannot
 * be rendered.
 *
 * Filtering here rather than in the template keeps the template free of
 * null-checks on every field, and means a half-uploaded gallery degrades to the
 * images that do work instead of a broken grid.
 */
export function resolveGalleryImages(
  gallery: CmsGallery,
): Array<{ url: string; caption?: string; media: CmsMedia }> {
  const images = Array.isArray(gallery.images) ? gallery.images : []
  const resolved: Array<{ url: string; caption?: string; media: CmsMedia }> = []

  for (const entry of images) {
    const media = entry?.image
    if (!media || typeof media !== 'object') continue
    const url = mediaUrl(media.url)
    if (!url) continue
    resolved.push({
      url,
      caption: entry.caption ?? media.caption ?? undefined,
      media,
    })
  }

  return resolved
}

/* ── Newsletter availability ───────────────────────────────────── */

/**
 * Whether the newsletter can actually accept a signup.
 *
 * ## Why the frontend has to ask
 *
 * `NewsletterSignup` used to render whenever a CMS origin was configured. But
 * the subscribe endpoint refuses with **503** when no mail transport is set —
 * deliberately, because accepting an address that can never be mailed is a lie
 * (see `cms/src/endpoints/newsletter.ts`). The form therefore rendered a
 * control that could not work, which is exactly what the S8 self-hiding rule
 * exists to prevent: "degrade by absence, not by a broken control"
 * (`docs/reliability.md` §4).
 *
 * The CMS exposes the truth at `/api/newsletter/status`. Reading it at build
 * time lets the footer hide the form instead of showing a box that always
 * errors.
 *
 * ## Fail closed
 *
 * Returns `false` on any failure — CMS unreachable, non-2xx, malformed body.
 * An unverifiable control is treated as unavailable, so a CMS outage at build
 * time removes the form rather than shipping one that will 503 for every
 * reader. This matches the other engagement helpers, which degrade to nothing.
 */
export async function getNewsletterStatus(): Promise<{ enabled: boolean }> {
  const data = await cmsFetch<{ enabled?: boolean } | null>('/api/newsletter/status', null)
  return { enabled: data?.enabled === true }
}
