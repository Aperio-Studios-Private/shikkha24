import type { Endpoint, PayloadRequest } from 'payload'
import { json } from '../lib/http'
import {
  articleUrlFor,
  composeIdCard,
  composePhotocard,
  type IdCardAuthor,
  isFontAvailable,
  isSharpAvailable,
  type PhotocardArticle,
} from '../lib/id-card'

/**
 * The brand identity printed on a card, read from `site-settings`.
 *
 * ## Why the logo is resolved here rather than in the renderer
 *
 * The owner's requirement is that renaming the site or replacing the logo in the
 * CMS changes the card with **no code change**. `site-settings` stores both, but
 * the logo is an upload *relation*: reading it needs `depth: 1` (or the field comes
 * back as a bare id) and its `url` is Payload-relative (`/api/media/file/x.svg`),
 * so it needs the media base prepended before sharp can fetch it.
 *
 * Both handlers used to call `findGlobal` separately with `depth: 0`, which is how
 * a card would have silently lost its logo. Resolving once, here, keeps them in
 * step.
 *
 * ⚠️ `overrideAccess: true` — `site-settings` is a public-read global and this is
 * an anonymously reachable route, so the brand fields are safe to read. Nothing
 * from `contact`, `social` or the analytics keys is touched.
 *
 * @param req the Payload request, for the local API.
 * @returns the site name (never empty) and the logo's absolute URL, or `null`.
 */
async function brandFor(
  req: PayloadRequest,
): Promise<{ siteName: string; logoUrl: string | null }> {
  const settings = await req.payload.findGlobal({
    slug: 'site-settings',
    // Depth 1 populates the `logo` upload relation; depth 0 returns only its id.
    depth: 1,
    overrideAccess: true,
  })
  const siteName = (settings.siteName as string | undefined) || 'শিক্ষা২৪.কম'

  const logo = settings.logo
  const rawUrl =
    typeof logo === 'object' && logo !== null ? (logo.url as string | undefined) : undefined
  if (!rawUrl) return { siteName, logoUrl: null }

  // `logo.url` is `/api/media/file/<name>`; an absolute URL is passed through in
  // case a future upload adapter stores one. Matches `frontend/…/Logo.astro` so the
  // card and the storefront cannot disagree about where the logo lives.
  const mediaBase = process.env.PUBLIC_MEDIA_BASE_URL || process.env.PUBLIC_CMS_ORIGIN || ''
  return { siteName, logoUrl: /^https?:\/\//.test(rawUrl) ? rawUrl : `${mediaBase}${rawUrl}` }
}

/**
 * On-demand card images — S14.
 *
 * `GET /api/idcard/:reporterId.png`     — the reporter ID card (public read)
 * `GET /api/photocard/:articleId.png`   — the article photocard (public read)
 *
 * ## Why these are endpoints and not build-time output
 *
 * A card changes whenever a reporter's photo, beat or validity changes. Building
 * every card at Astro build time would force a full rebuild on every such edit,
 * and the GitHub Actions quota is a recorded constraint. An on-demand endpoint
 * renders once per request and caches hard in the browser and at Apache.
 *
 * ## Why public read
 *
 * A card is meant to be **scanned by anyone** — that is the point of a QR. The
 * data on the card is exactly what `/reporters/[slug]` and `/verify/[reporterId]`
 * already publish: name, designation, ID, press card number, validity and beat.
 * The author's email, verification note and who vouched for them are never drawn.
 *
 * ## Determinism
 *
 * Both endpoints are pure functions of the record: the same record at the same
 * `updatedAt` produces a byte-identical PNG. That is what the harness asserts
 * (`cms/src/verify/id-card.ts`), and it is why the response is versioned with
 * `?v=<epoch ms>` — the cache key changes exactly when the record does.
 */

/** Browser + CDN cache. Cards are immutable per `updatedAt`. */
const CACHE_SECONDS = 86_400

/** A PNG response with the cache headers a versioned card needs. */
function png(body: Buffer, versionMs?: number): Response {
  // TS 7's DOM lib accepts only a *fresh* `Uint8Array<ArrayBuffer>` as a
  // BlobPart, not a Buffer's view over `ArrayBufferLike`, so this copies ~100 KB.
  // Fine — the render is cached on both sides of it.
  const blob = new Blob([new Uint8Array(body)], { type: 'image/png' })
  const headers: Record<string, string> = {
    'Content-Type': 'image/png',
    'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
  }
  if (versionMs) headers.ETag = `"${versionMs}"`
  return new Response(blob, { headers })
}

/**
 * The reporter ID card.
 *
 * `:reporterId` is the stable `SHK-R-YYYY-NNNN` identifier, not the row id — a
 * card prints the ID, so the URL must be the thing a reader scans. An unknown or
 * malformed ID answers **404 with a Bengali message**, not a blank image.
 */
const idCardEndpoint: Endpoint = {
  path: '/idcard/:reporterId.png',
  method: 'get',
  handler: async (req: PayloadRequest): Promise<Response> => {
    const reporterId = String(req.routeParams?.reporterId ?? '').trim()
    if (!/^SHK-R-\d{4}-\d{4,}$/i.test(reporterId)) {
      return json({ error: 'পরিচয়পত্র পাওয়া যায়নি।' }, 404)
    }

    const found = await req.payload.find({
      collection: 'authors',
      where: { reporterId: { equals: reporterId } },
      limit: 1,
      depth: 2,
      overrideAccess: true,
    })
    const author = found.docs[0]
    if (!author) return json({ error: 'পরিচয়পত্র পাওয়া যায়নি।' }, 404)

    // ⚠️ Checked BEFORE the render, and it fails in milliseconds rather than
    // seconds. Without it this handler walked into sharp and returned its 503
    // after ~3.8s of libvips fork-retry — see `isSharpAvailable`. Reporter IDs
    // are enumerable, so that delay was a thread-exhaustion vector behind a
    // public route.
    if (!(await isSharpAvailable())) {
      return json({ error: 'কার্ড তৈরির সুবিধা এই সার্ভারে চালু নেই।' }, 503)
    }
    if (!(await isFontAvailable())) {
      return json({ error: 'কার্ড তৈরির ফন্ট পাওয়া যায়নি।' }, 503)
    }

    const { siteName } = await brandFor(req)

    const photoFilename =
      typeof author.photo === 'object' && author.photo !== null
        ? (author.photo.filename as string | undefined)
        : undefined

    const card: IdCardAuthor = {
      nameBn: String(author.nameBn ?? ''),
      designation: (author.designation as string | null) ?? null,
      reporterId: (author.reporterId as string | null) ?? null,
      pressCardNo: (author.pressCardNo as string | null) ?? null,
      /*
       * ⚠️ `bloodGroup` is deliberately NOT passed — it was, until 2026-10-16 (T-20),
       * and `lib/id-card.ts` drew it as a 'রক্তের গ্রুপ' row.
       *
       * `Authors.bloodGroup` is `read: editorialField`, and its own comment calls it
       * "medical data with no public consumer". This endpoint fetches the author with
       * `overrideAccess: true`, which bypasses exactly that field rule, and the route
       * is anonymously reachable — the project's own harness at
       * `verify/endpoints.ts:377` fetches it with no cookies and asserts 200. The
       * URL key is the sequential `SHK-R-YYYY-NNNN`, so the whole set was walkable.
       *
       * The docstring above lists what a card publishes — name, designation, ID,
       * press card number, validity, beat — and never included blood group, so the
       * code was contradicting its own stated intent rather than extending it.
       * Print it on a physical card if the newsroom wants that; do not serve it from
       * a public HTTP route. The renderer already skips a null row.
       */
      bloodGroup: null,
      validUntil: (author.validUntil as string | null) ?? null,
      beat: (author.beat as string[] | null) ?? null,
      photoFilename: photoFilename ?? null,
      siteName,
    }

    const png_ = await composeIdCard(card)
    const updated = new Date(author.updatedAt as string).getTime()
    return png(png_, Number.isFinite(updated) ? updated : undefined)
  },
}

/**
 * The article photocard.
 *
 * `:articleId` is the Payload row id (the shortlink `/a/:id` already uses it).
 * Only published articles produce a card — a draft has no canonical URL yet.
 */
const photocardEndpoint: Endpoint = {
  path: '/photocard/:articleId.png',
  method: 'get',
  handler: async (req: PayloadRequest): Promise<Response> => {
    const id = String(req.routeParams?.articleId ?? '').trim()
    if (!/^\d+$/.test(id)) return json({ error: 'কার্ড পাওয়া যায়নি।' }, 404)

    const article = await req.payload.findByID({
      collection: 'articles',
      id,
      depth: 2,
      overrideAccess: true,
    })
    // `?.` covers the not-found case too: `undefined !== 'published'` is true,
    // so a missing article answers 404 here without a second null check.
    if (article?._status !== 'published') {
      return json({ error: 'কার্ড পাওয়া যায়নি।' }, 404)
    }

    // ⚠️ Checked BEFORE the render, and it fails in milliseconds rather than
    // seconds. Without it this handler walked into sharp and returned its 503
    // after ~3.8s of libvips fork-retry — see `isSharpAvailable`. Reporter IDs
    // are enumerable, so that delay was a thread-exhaustion vector behind a
    // public route.
    if (!(await isSharpAvailable())) {
      return json({ error: 'কার্ড তৈরির সুবিধা এই সার্ভারে চালু নেই।' }, 503)
    }
    if (!(await isFontAvailable())) {
      return json({ error: 'কার্ড তৈরির ফন্ট পাওয়া যায়নি।' }, 503)
    }

    const { siteName, logoUrl } = await brandFor(req)

    const category =
      typeof article.category === 'object' && article.category !== null
        ? (article.category.nameBn as string | undefined)
        : undefined
    const photoFilename =
      typeof article.featuredImage === 'object' && article.featuredImage !== null
        ? (article.featuredImage.filename as string | undefined)
        : undefined

    const slugPart = String(article.slug ?? '')
    const categorySlug =
      typeof article.category === 'object' && article.category !== null
        ? (article.category.slug as string | undefined)
        : undefined
    /**
     * The article's canonical URL, printed as the QR target on the photocard.
     *
     * Reads `PUBLIC_SITE_URL` via `siteOrigin()` — the same helper the OAuth
     * and CORS code uses. This was hardcoded to `https://shikkha24.com`, which
     * meant a staging or preview deployment printed a QR pointing at production,
     * and a domain change silently invalidated every card.
     */
    const canonical = articleUrlFor(categorySlug, article.id, slugPart)

    const card: PhotocardArticle = {
      title: String(article.title ?? ''),
      categoryName: category ?? null,
      publishedAt: (article.publishedAt as string | null) ?? null,
      photoFilename: photoFilename ?? null,
      canonicalUrl: canonical,
      siteName,
      logoUrl,
    }

    const png_ = await composePhotocard(card)
    const updated = new Date(article.updatedAt as string).getTime()
    return png(png_, Number.isFinite(updated) ? updated : undefined)
  },
}

export const cardEndpoints: Endpoint[] = [idCardEndpoint, photocardEndpoint]
