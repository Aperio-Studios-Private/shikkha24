import type { Payload } from 'payload'
import sharp from 'sharp'

/**
 * Demo reader-engagement content for S9 — galleries and comments.
 *
 * ## Why this is a separate module
 *
 * `./demo.ts` is already past the 300-line split threshold in agent rule 1, and
 * this is a self-contained concern: the S9 surfaces (`/gallery`,
 * `/gallery/[slug]`, the comment list) cannot be reviewed as empty shells, and
 * the gallery in particular needs **real uploaded media** to exercise the
 * srcset and dimension path that `lib/media.ts` builds.
 *
 * ## The images are generated, not shipped
 *
 * Six placeholder images would be six files in the repo that exist only to be
 * deleted. `sharp` renders them from an SVG at seed time instead, so the repo
 * carries the recipe rather than the artefact. They are abstract on purpose —
 * a stock photograph would look like real editorial content, and this content
 * is throwaway.
 *
 * Everything here is prefixed `demo-` and is deleted by the same purge path as
 * the rest of the demo seed.
 */

interface SlugAgnosticPayload {
  find(args: Record<string, unknown>): Promise<{ docs: Array<Record<string, unknown>> }>
  create(args: Record<string, unknown>): Promise<Record<string, unknown>>
  delete(args: Record<string, unknown>): Promise<unknown>
}

export interface EngagementReport {
  media: number
  galleries: number
  comments: number
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

export async function seedDemoEngagement(payload: Payload): Promise<EngagementReport> {
  const db = payload as unknown as SlugAgnosticPayload
  const report: EngagementReport = { media: 0, galleries: 0, comments: 0 }

  /* ── Media ────────────────────────────────────────────────────────────── */
  const existingGallery = await db.find({
    collection: 'photo-galleries',
    where: { slug: { equals: 'demo-campus-life' } },
    limit: 1,
    overrideAccess: true,
  })

  if (existingGallery.docs.length > 0) {
    // Already seeded. Media and comments are left alone too — re-running this
    // must not multiply the comment list on every invocation.
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

  return report
}
