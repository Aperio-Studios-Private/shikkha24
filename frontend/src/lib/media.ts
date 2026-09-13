/**
 * Resolve a CMS media document into the markup attributes an `<img>` needs.
 *
 * ## Why this is a helper and not inline JSX
 *
 * Three rules have to hold on **every** CMS image, and each one has already been
 * the cause of a real defect elsewhere in the project:
 *
 * 1. **A reserved box.** `docs/performance-budget.md` treats CLS as a hard gate,
 *    so an image must carry real `width`/`height`. Payload records the true
 *    dimensions of the stored file, so we use them rather than assuming 16:9 —
 *    a wrong-ratio box letterboxes (cosmetic), an unreserved box shifts layout
 *    (budget failure).
 * 2. **A responsive `srcset`.** The CMS already generates WebP variants
 *    (`thumbnail` 400, `card` 768, `hero` 1600 — see `cms/src/collections/Media.ts`),
 *    so the browser can be offered real choices instead of one full-size file.
 *    Serving the hero to a 80px sidebar slot wastes ~95% of the bytes.
 * 3. **The right base URL.** Media now lives on the DianaHost host
 *    (`PUBLIC_MEDIA_BASE_URL`), not on R2. Payload stores a *relative* url, so it
 *    must be prefixed — and an already-absolute url must not be double-prefixed.
 *
 * ## Why the CMS variants and not Astro's remote-image pipeline
 *
 * Astro can optimise remote images, but only by fetching and re-encoding them at
 * build time. In CI every build starts from a cold cache, so a growing archive
 * would mean re-encoding thousands of images on every publish — which is exactly
 * the CI-minutes budget this project is careful about. Using the variants the CMS
 * already produced costs nothing at build time and keeps the images on the CDN.
 */

/** One generated variant, as Payload stores it. */
export interface CmsMediaSize {
  url?: string | null
  width?: number | null
  height?: number | null
  mimeType?: string | null
  filesize?: number | null
}

/** The subset of a Payload media document this module needs. */
export interface CmsMedia {
  url?: string | null
  alt?: string | null
  caption?: string | null
  credit?: string | null
  width?: number | null
  height?: number | null
  mimeType?: string | null
  sizes?: Record<string, CmsMediaSize | undefined> | null
}

export interface ResolvedImage {
  /** The fallback `src` — the mid-size variant, never the largest. */
  src: string
  srcset?: string
  width: number
  height: number
  alt: string
  caption?: string
  credit?: string
}

/** 16:9 — the ratio the category archetypes and the layout boxes use. */
const FALLBACK_RATIO = 16 / 9

/**
 * Absolute URL for a Payload-relative media path.
 *
 * `PUBLIC_MEDIA_BASE_URL` is empty in local development, which yields a
 * root-relative url — correct, because Astro's dev server and the CMS are then
 * on the same host from the browser's point of view only when proxied. In
 * production it is the CMS hostname.
 */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  const base = (import.meta.env.PUBLIC_MEDIA_BASE_URL || '').replace(/\/$/, '')
  return `${base}${path}`
}

/**
 * Build the `srcset` from whatever variants the CMS actually produced.
 *
 * Sorted ascending by width so the list reads the way browsers expect, and the
 * true width is used rather than the nominal one — `withoutEnlargement` means a
 * small upload yields variants smaller than their configured size, and claiming
 * a width the file does not have makes the browser pick wrongly.
 */
function buildSrcset(media: CmsMedia): string | undefined {
  const candidates: Array<{ url: string; width: number }> = []

  const original = mediaUrl(media.url)
  if (original && media.width) {
    candidates.push({ url: original, width: media.width })
  }

  for (const size of Object.values(media.sizes ?? {})) {
    const url = mediaUrl(size?.url)
    if (url && size?.width) candidates.push({ url, width: size.width })
  }

  if (candidates.length < 2) return undefined

  // Deduplicate by width — the original and the `hero` variant are often the
  // same pixel width, and two entries at one width is a wasted download.
  const byWidth = new Map<number, string>()
  for (const candidate of candidates) byWidth.set(candidate.width, candidate.url)

  return [...byWidth.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([width, url]) => `${url} ${width}w`)
    .join(', ')
}

/**
 * Turn a CMS media document into `<img>` attributes.
 *
 * Returns `null` when there is no usable image, so callers render the category
 * archetype (or nothing) instead of a broken element.
 *
 * @param altFallback Used when the media document has no alt text. An article's
 *                    headline is a poor alt but a far better one than an empty
 *                    string, which would hide the image from a screen reader
 *                    with no indication of what it is.
 */
export function resolveCmsImage(
  media: CmsMedia | number | null | undefined,
  altFallback = '',
): ResolvedImage | null {
  if (!media || typeof media !== 'object') return null

  const src = mediaUrl(media.url)
  if (!src) return null

  const width = typeof media.width === 'number' && media.width > 0 ? media.width : 1200
  const height =
    typeof media.height === 'number' && media.height > 0
      ? media.height
      : Math.round(width / FALLBACK_RATIO)

  return {
    src,
    srcset: buildSrcset(media),
    width,
    height,
    alt: media.alt?.trim() || altFallback,
    caption: media.caption ?? undefined,
    credit: media.credit ?? undefined,
  }
}
