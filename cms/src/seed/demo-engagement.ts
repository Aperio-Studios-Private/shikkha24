import type { Payload } from 'payload'
import sharp from 'sharp'

/**
 * Demo reader-engagement content for S9 — galleries, comments and a video embed.
 *
 * ## Why this is a separate module
 *
 * `./demo.ts` is already past the 300-line split threshold in agent rule 1, and
 * this is a self-contained concern: the S9 surfaces (`/gallery`,
 * `/gallery/[slug]`, the comment list, the click-to-load video) cannot be
 * reviewed as empty shells, and the gallery in particular needs **real uploaded
 * media** to exercise the srcset and dimension path that `lib/media.ts` builds.
 *
 * ## The images are generated, not shipped
 *
 * Six placeholder images would be six files in the repo that exist only to be
 * deleted. `sharp` renders them from an SVG at seed time instead, so the repo
 * carries the recipe rather than the artefact. They are abstract on purpose —
 * a stock photograph would look like real editorial content, and this content
 * is throwaway.
 *
 * ## The video block is the one non-idempotent-looking step
 *
 * Everything else here bails out once the gallery exists. The video block is
 * reconciled on every run instead, because it has to survive a database seeded
 * before the block existed — see `attachDemoVideo`.
 *
 * Everything here is prefixed `demo-` and is deleted by the same purge path as
 * the rest of the demo seed.
 */

interface SlugAgnosticPayload {
  find(args: Record<string, unknown>): Promise<{ docs: Array<Record<string, unknown>> }>
  create(args: Record<string, unknown>): Promise<Record<string, unknown>>
  update(args: Record<string, unknown>): Promise<Record<string, unknown>>
  delete(args: Record<string, unknown>): Promise<unknown>
}

export interface EngagementReport {
  media: number
  galleries: number
  comments: number
  video: number
  liveStreams: number
}

/** Two-tone gradient pairs, chosen to read as distinct "photographs". */
const PLATES: Array<{ from: string; to: string }> = [
  { from: '#0f766e', to: '#facc15' },
  { from: '#7c2d12', to: '#fbbf24' },
  { from: '#1e3a8a', to: '#38bdf8' },
  { from: '#4c1d95', to: '#f472b6' },
  { from: '#14532d', to: '#a3e635' },
  { from: '#831843', to: '#fb923c' },
]

/** 3:2, matching the gallery grid's reserved box. */
const WIDTH = 1600
const HEIGHT = 1067

/**
 * Render one placeholder plate.
 *
 * Deliberately text-free: the caption belongs to the CMS row, and rendering
 * Bengali glyphs inside librsvg would depend on a font being installed on
 * whichever machine runs the seed.
 */
async function makePlate(index: number, plate: { from: string; to: string }): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${plate.from}"/>
      <stop offset="1" stop-color="${plate.to}"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)"/>
  <circle cx="${260 + index * 90}" cy="${300 + index * 40}" r="190" fill="#ffffff" opacity="0.10"/>
  <rect x="${120 + index * 60}" y="${620 + index * 30}" width="520" height="220" rx="28"
        fill="#000000" opacity="0.10"/>
</svg>`

  return sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer()
}

/** Captions double as alt text, which is what makes the grid reviewable. */
const GALLERY_CAPTIONS: string[] = [
  'রাজধানীর একটি স্কুলে শিক্ষার্থীদের সমাবেশ',
  'বিজ্ঞান মেলায় শিক্ষার্থীর প্রকল্প উপস্থাপনা',
  'গ্রন্থাগারে পড়াশোনারত শিক্ষার্থীরা',
  'শ্রেণিকক্ষে শিক্ষকের পাঠদান',
  'বার্ষিক ক্রীড়া প্রতিযোগিতার দৃশ্য',
  'শিক্ষা মন্ত্রণালয়ের সংবাদ সম্মেলন',
]

/**
 * The demo video block, appended to one article so the click-to-load path is
 * reviewable in a real build.
 *
 * ## The shape is Lexical's, not ours
 *
 * `BlocksFeature` nodes serialise as `{ type: 'block', version: 2, fields }`,
 * with the block's own fields **directly** on `fields` — version 1 wrapped them
 * in an extra `data` object, and the frontend renderer reads the v2 shape. The
 * `id` is a 24-hex BSON ObjectID; it is written out rather than generated so a
 * re-seed produces the same document instead of a new id each time.
 *
 * ## Why the poster matters here
 *
 * It points at one of the plates above, which is the whole point of the block:
 * a self-hosted poster means the article requests nothing from YouTube until the
 * reader taps play. `aqz-KE-bpKQ` is Big Buck Bunny (Creative Commons) — a
 * placeholder that is safe to ship in a demo and trivial to replace.
 */
const VIDEO_BLOCK_FIELDS = {
  blockType: 'videoEmbed',
  blockName: '',
  id: '64b000000000000000000001',
  url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
  title: 'পরীক্ষার ফলাফল অনলাইনে দেখার নিয়ম — ধাপে ধাপে',
  caption: 'ডেমো ভিডিও — লঞ্চের আগে প্রতিস্থাপন করা হবে।',
} as const

/**
 * Attach the video block to the demo article.
 *
 * Deliberately idempotent and independent of the media step: it looks its poster
 * up by filename, so a re-seed after the media already exists still works and
 * still does not add a second copy of the block.
 *
 * A block that is present but has **no poster** is repaired in place rather than
 * skipped — the same reasoning as the campaign sweep repairing a subscriber that
 * is missing its unsubscribe token. That case is not hypothetical: the first
 * version of this function looked for `demo-plate-1.jpg` and the upload pipeline
 * had already converted the plate to WebP, so the block was stored poster-less.
 */
async function attachDemoVideo(db: SlugAgnosticPayload, report: EngagementReport): Promise<void> {
  const target = await db.find({
    collection: 'articles',
    where: { slug: { equals: 'demo-hsc-result-2026' } },
    limit: 1,
    overrideAccess: true,
  })

  const doc = target.docs[0]
  if (!doc) return

  const body = doc.body as
    | { root?: { children?: Array<Record<string, unknown>> } }
    | null
    | undefined
  const children = body?.root?.children
  if (!children) return

  /*
   * Matched on the stem, not the full name. The upload pipeline converts every
   * image to WebP on the way in (`upload.formatOptions`), so the plate created
   * above is stored as `demo-plate-1.webp` even though the seed hands sharp a
   * JPEG. Asking for `.jpg` finds nothing — which is exactly what happened the
   * first time this ran.
   */
  const poster = await db.find({
    collection: 'media',
    where: { filename: { like: 'demo-plate-1' } },
    limit: 1,
    overrideAccess: true,
  })
  const posterId = poster.docs[0]?.id

  if (!posterId) {
    // A poster-less block is a supported state — the trigger renders text-only —
    // so this is not fatal. But it means the media step did not run, and that is
    // worth saying out loud rather than discovering in a build.
    console.warn('[seed] demo video block has no poster — media plate not found')
  }

  const index = children.findIndex(
    (node) => (node.fields as { blockType?: string } | undefined)?.blockType === 'videoEmbed',
  )

  if (index >= 0) {
    const fields = children[index]?.fields as Record<string, unknown> | undefined
    // Present and complete, or present and unrepairable. Either way, done.
    if (!fields || fields.poster || !posterId) return
    children[index] = { ...children[index], fields: { ...fields, poster: posterId } }
  } else {
    children.push({
      type: 'block',
      version: 2,
      format: '',
      indent: 0,
      direction: 'ltr',
      fields: posterId ? { ...VIDEO_BLOCK_FIELDS, poster: posterId } : { ...VIDEO_BLOCK_FIELDS },
    })
  }

  await db.update({
    collection: 'articles',
    id: doc.id,
    data: { body },
    overrideAccess: true,
  })
  report.video = 1
}

/**
 * Marks two demo articles as carrying a video — **one per provider** — so the S17
 * player has something to render and the provider-aware CSP check has something to
 * bite on.
 *
 * ## Why one per provider, and not just one video
 *
 * `verify:apache` reads `data-media-provider` off each page and asserts the served
 * policy frames *that* provider. With only a YouTube fixture that check can never
 * fire, and the Facebook half of `MediaEmbed` would never render anywhere in the
 * build. That is exactly how the S17 defect survived: the article profile's
 * `frame-src` had no Facebook in it, every page returned 200, and a Facebook video
 * would simply have been dead — on the highest-traffic route.
 *
 * Idempotent: it assigns two fixed values per article.
 */
async function attachDemoArticleVideo(db: SlugAgnosticPayload): Promise<void> {
  const FIXTURES: Array<{ slug: string; videoUrl: string; videoProvider: string }> = [
    {
      slug: 'demo-hsc-result-2026',
      videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
      videoProvider: 'youtube',
    },
    {
      slug: 'demo-board-challenge-result',
      videoUrl: 'https://www.facebook.com/watch/?v=1234567890',
      videoProvider: 'facebook',
    },
  ]

  for (const fixture of FIXTURES) {
    const target = await db.find({
      collection: 'articles',
      where: { slug: { equals: fixture.slug } },
      limit: 1,
      overrideAccess: true,
    })
    const doc = target.docs[0]
    if (!doc) continue

    await db.update({
      collection: 'articles',
      id: doc.id,
      data: { videoUrl: fixture.videoUrl, videoProvider: fixture.videoProvider },
      overrideAccess: true,
    })
  }
}

/**
 * Turns one demo article into a photo story, so the S17 layout is reviewable.
 *
 * ⚠️ **This is the fixture behind the `ImageGallery` gate.** With no photo-story
 * article, the layout, the frame renderer and the schema are all unexercised —
 * the build stays green and proves nothing about any of them.
 *
 * ⚠️ **The plates are used precisely because they have real dimensions**
 * (1600×1067). The reserved box comes from the media record, so a fixture whose
 * images carried no dimensions would not exercise the CLS-critical path at all.
 *
 * Idempotent: it assigns a fixed layout and a fixed frame list.
 */
async function attachDemoPhotoStory(db: SlugAgnosticPayload): Promise<void> {
  const target = await db.find({
    collection: 'articles',
    where: { slug: { equals: 'demo-university-ranking' } },
    limit: 1,
    overrideAccess: true,
  })
  const doc = target.docs[0]
  if (!doc) return

  const plates = await db.find({
    collection: 'media',
    where: { filename: { like: 'demo-plate-' } },
    limit: 4,
    sort: 'filename',
    overrideAccess: true,
  })
  const ids = plates.docs.map((plate) => plate.id)
  if (ids.length === 0) return

  const CAPTIONS = [
    'ক্যাম্পাসে ভর্তি মেলা — শিক্ষার্থীদের ভিড়।',
    'অভিভাবকদের জন্য তথ্যকেন্দ্র।',
    'শিক্ষার্থী সংসদের স্বেচ্ছাসেবকরা।',
    'বিশ্ববিদ্যালয়ের মূল ভবন।',
  ]

  await db.update({
    collection: 'articles',
    id: doc.id,
    data: {
      layout: 'photoStory',
      photoStory: ids.map((image, index) => ({
        image,
        caption: CAPTIONS[index] ?? 'ডেমো ছবি।',
        credit: 'ডেমো — শিক্ষা২৪.কম',
        // Alternating, so both presentations are rendered by the fixture rather
        // than only the one an editor happens to pick.
        fullBleed: index % 2 === 0,
      })),
    },
    overrideAccess: true,
  })
}

export async function seedDemoEngagement(payload: Payload): Promise<EngagementReport> {
  const db = payload as unknown as SlugAgnosticPayload
  const report: EngagementReport = {
    media: 0,
    galleries: 0,
    comments: 0,
    video: 0,
    liveStreams: 0,
  }

  /* ── Media ────────────────────────────────────────────────────────────── */
  const existingGallery = await db.find({
    collection: 'photo-galleries',
    where: { slug: { equals: 'demo-campus-life' } },
    limit: 1,
    overrideAccess: true,
  })

  if (existingGallery.docs.length > 0) {
    // Already seeded. Media and comments are left alone too — re-running this
    // must not multiply the comment list on every invocation. The video block
    // is reconciled anyway, because it is idempotent on its own.
    await attachDemoVideo(db, report)
    // ⚠️ Also reconciled here, not only on the fresh path. The gallery was
    // seeded long before S15 existed, so on any database that predates this
    // section the early return is the ONLY path taken — and skipping the call
    // here would leave `/live-tv` empty and the third CSP profile untested.
    await seedLiveStreams(db, report)
    // S17, and for the same reason: this database predates the field, so the
    // early return is the only path it will ever take.
    await attachDemoArticleVideo(db)
    await attachDemoPhotoStory(db)
    return report
  }

  const mediaIds: Array<number | string> = []
  for (const [index, plate] of PLATES.entries()) {
    const buffer = await makePlate(index, plate)
    const doc = await payload.create({
      collection: 'media',
      data: { alt: GALLERY_CAPTIONS[index] ?? 'ডেমো ছবি' },
      file: {
        data: buffer,
        mimetype: 'image/jpeg',
        name: `demo-plate-${index + 1}.jpg`,
        size: buffer.length,
      },
      overrideAccess: true,
    })
    mediaIds.push(doc.id)
    report.media += 1
  }

  /* ── Gallery ──────────────────────────────────────────────────────────── */
  await db.create({
    collection: 'photo-galleries',
    data: {
      title: 'ডেমো ক্যাম্পাস জীবন',
      slug: 'demo-campus-life',
      description:
        'হোমপেজ ও গ্যালারি পাতার নকশা পর্যালোচনার জন্য তৈরি ডেমো ছবির গ্যালারি। লঞ্চের আগে মুছে ফেলা হবে।',
      images: mediaIds.map((id, index) => ({
        image: id,
        caption: GALLERY_CAPTIONS[index] ?? '',
      })),
    },
    overrideAccess: true,
  })
  report.galleries = 1

  /* ── Comments ─────────────────────────────────────────────────────────── */
  // Attached to a demo article so the moderation states are visible: one
  // approved (renders) and one pending (does not), which is the only way to see
  // that the access rule actually filters.
  const article = await db.find({
    collection: 'articles',
    where: { slug: { equals: 'demo-hsc-result-2026' } },
    limit: 1,
    overrideAccess: true,
  })

  const articleId = article.docs[0]?.id
  if (articleId) {
    const COMMENTS: Array<{ userName: string; body: string; isApproved: boolean }> = [
      {
        userName: 'রাফসান আহমেদ',
        body: 'ফলাফল প্রকাশের সময় নিয়ে আরও নির্দিষ্ট তথ্য থাকলে ভালো হতো। তবু সময়মতো আপডেট পেয়েছি।',
        isApproved: true,
      },
      {
        userName: 'নুসরাত জাহান',
        body: 'এসএমএসে ফল জানার নিয়মটা খুব কাজে লাগল। ধন্যবাদ।',
        isApproved: true,
      },
      {
        userName: 'অনুমোদনের অপেক্ষায় মন্তব্য',
        body: 'এই মন্তব্যটি অনুমোদিত নয় — সাইটে দেখা যাওয়া উচিত নয়।',
        isApproved: false,
      },
    ]

    for (const comment of COMMENTS) {
      await db.create({
        collection: 'comments',
        data: {
          article: articleId,
          userName: comment.userName,
          body: comment.body,
          isApproved: comment.isApproved,
        },
        overrideAccess: true,
      })
      report.comments += 1
    }
  }

  // Last, because it needs a poster from the media created above.
  await attachDemoVideo(db, report)
  await seedLiveStreams(db, report)
  await attachDemoArticleVideo(db)
  await attachDemoPhotoStory(db)

  return report
}

/**
 * One live stream, so `/live-tv` is reviewable — and so the S15 gate is testable.
 *
 * ⚠️ **This row is not decoration.** `verify:apache` decides which CSP profile a
 * page *should* have from `data-media-embed` in its markup. With no stream
 * configured the page self-hides, no player renders, and the third profile's
 * expectation is never exercised — the gate would pass while proving nothing.
 * This fixture is what keeps it non-vacuous.
 *
 * The video id is a long-lived public stream so the fixture does not rot when a
 * real broadcast ends; the point of the row is the route, not the content.
 *
 * Idempotent: bails out once a stream with this title exists, so re-running the
 * seed does not pile up duplicates. Removed by `seed:demo:purge`, which matches
 * it on the same `ডেমো:` title prefix the education demo rows use.
 */
async function seedLiveStreams(db: SlugAgnosticPayload, report: EngagementReport): Promise<void> {
  const TITLE = 'ডেমো: বাজেট ২০২৬ সরাসরি সম্প্রচার'

  const existing = await db.find({
    collection: 'live-streams',
    where: { title: { equals: TITLE } },
    limit: 1,
  })
  if (existing.docs.length > 0) return

  // The poster is optional: the player renders a text-only trigger without one,
  // so a missing demo plate must not stop the row from being created.
  const poster = (
    await db.find({
      collection: 'media',
      where: { filename: { like: 'demo-plate-' } },
      limit: 1,
    })
  ).docs[0]

  await db.create({
    collection: 'live-streams',
    data: {
      title: TITLE,
      provider: 'youtube',
      videoId: 'aqz-KE-bpKQ',
      isLive: true,
      description: 'শিক্ষা বাজেট ২০২৬-এর সরাসরি কভারেজ — ডেমো সম্প্রচার।',
      ...(poster ? { poster: poster.id } : {}),
    },
    overrideAccess: true,
  })
  report.liveStreams += 1
}
