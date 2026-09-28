/**
 * Server-side card composition for S14 — the reporter ID card and the article
 * photocard.
 *
 * ## Where this runs, and why not in the browser
 *
 * Generation is **server-side at the CMS** (`docs/feature-batch-2.md` §3.2).
 * Build-time generation would force a full rebuild on every reporter or article
 * edit, and the CI-minutes quota is a recorded constraint; client-side canvas
 * cannot be pixel-perfect across devices and — more importantly — a reader could
 * forge a card. An on-demand CMS endpoint costs one sharp render per request and
 * caches hard.
 *
 * ## Bengali text — the part that could have silently failed
 *
 * libvips renders text through **pango + harfbuzz**, which shapes Bengali
 * correctly *only if the font is actually loaded*. Two dead ends were ruled out
 * by measurement before this file was written:
 *
 * 1. **SVG `<text>` with an embedded `@font-face` data URI does not work** —
 *    librsvg ignored the embedded font and fell back, producing byte-identical
 *    ink to a render with no Bengali font at all. (This is the same class of
 *    failure that made the original SVG OG image show tofu boxes.)
 * 2. **libvips's `text` input with an explicit `fontfile` does work** — the
 *    vendored WOFF2 is loaded directly, bypassing fontconfig entirely. Proven
 *    numerically rather than visually: ink differs from the default-font render,
 *    and a conjunct cluster (`ক্ষতি`, 180 px span) renders ~40% narrower than the
 *    same characters forced apart (`ক স তি`, 294 px), which is what correct
 *    যুক্তাক্ষর shaping produces.
 *
 * Colour comes from pango markup (`<span foreground="#…">`), which is why every
 * string drawn onto a card passes through `escapeMarkup` first.
 */
import { existsSync } from 'node:fs'
import path from 'node:path'
import QRCode from 'qrcode'
import sharp from 'sharp'
import { formatBnBd } from './dhaka-date'

/** The font file, relative to the CMS process working directory. */
const FONT_FILE = 'solaimanlipi-400.woff2'

/**
 * Where the font lives.
 *
 * **Production (standalone bundle):** `<cwd>/fonts/` — the CI assembly step
 * copies it there (`.github/workflows/ci.yml`, alongside `.next/static`, which
 * Next does not copy either).
 *
 * **Development:** the repo's vendored copy at `<cwd>/../assets/fonts/vendor/`,
 * because `next dev` runs from `cms/` and the single source of truth stays
 * `scripts/fetch-fonts.mjs` — no second copy of a binary in the repo.
 *
 * Both are relative to `process.cwd()`, which is exactly how `DATABASE_URI`
 * (`file:./data/payload.db`) and the media `staticDir` already resolve, so this
 * adds no new path-resolution assumption.
 */
function fontPath(): string {
  return (
    [
      path.resolve(process.cwd(), 'fonts', FONT_FILE),
      path.resolve(process.cwd(), '..', 'assets', 'fonts', 'vendor', FONT_FILE),
    ].find((candidate) => existsSync(candidate)) ?? ''
  )
}

/** Brand tokens — the same values as the frontend design system. */
const BRAND_RED = '#DA1C25'
const CHARCOAL = '#1F1F1F'
const WHITE = '#FFFFFF'

/**
 * Bengali labels for the `beat` select values.
 *
 * `Authors.beat` stores the **English option value** (`school`, `university`…),
 * and a Bengali-only UI must never show those to a reader. The same map exists
 * on the frontend (`/reporters/[slug].astro`) and in the collection's option
 * labels — the three are kept in step by hand, and grepping for `'madrasa'`
 * finds all of them.
 */
const BEAT_LABELS_BN: Record<string, string> = {
  school: 'স্কুল',
  college: 'কলেজ',
  university: 'বিশ্ববিদ্যালয়',
  madrasa: 'মাদ্রাসা',
  exam: 'পরীক্ষা',
  scholarship: 'বৃত্তি',
  admission: 'ভর্তি',
  job: 'চাকরি',
}

/** Beat values → the Bengali labels a card prints. */
export function beatLabelsBn(beats?: string[] | null): string[] {
  return (beats ?? []).map((beat) => BEAT_LABELS_BN[beat] ?? beat)
}

/** Escape pango markup metacharacters. Every drawn string is reader- or
 * editor-supplied, and an unescaped `&` or `<` would corrupt the whole layout. */
function escapeMarkup(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

/** Coloured, wrapped text rendered to a transparent PNG ready for compositing. */
async function textLayer(
  value: string,
  opts: { size: number; color: string; width: number; weight?: number },
): Promise<Buffer> {
  const family = opts.weight === 700 ? 'solaimanlipi-700.woff2' : 'solaimanlipi-400.woff2'
  const file = path.resolve(path.dirname(fontPath()), family)
  const markup = `<span foreground="${opts.color}">${escapeMarkup(value)}</span>`
  return sharp({
    text: {
      text: markup,
      fontfile: existsSync(file) ? file : fontPath(),
      font: `SolaimanLipi ${opts.size}`,
      width: opts.width,
      height: opts.size * 3,
      rgba: true,
      wrap: 'word',
    },
  })
    .png()
    .toBuffer()
}

/** A solid rectangle, for header bands and chips. */
async function rectLayer(width: number, height: number, color: string): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 4, background: color },
  })
    .png()
    .toBuffer()
}

/**
 * A QR code pointing at `target`, rendered as a PNG with a whitequiet zone.
 *
 * The QR is the whole point of the card: a reader scans it and lands on
 * `/verify/<reporterId>`, which states the credential's status honestly. If the
 * target is empty the code still renders (encoding the site root) rather than
 * throwing — a card with no QR is worse than one pointing at the homepage.
 */
export async function qrLayer(target: string, size: number): Promise<Buffer> {
  const payload = target || 'https://shikkha24.com'
  return QRCode.toBuffer(payload, {
    type: 'png',
    margin: 2,
    width: size,
    color: { dark: CHARCOAL, light: WHITE },
  })
}

/**
 * Resolve a media document to its on-disk file.
 *
 * Payload stores `filename` relative to the collection's `staticDir`
 * (`./data/media` by default), and the stored "original" is already WebP. The
 * card needs the source file for a clean crop, not a browser-optimised variant.
 */
export function mediaFilePath(filename?: string | null): string | null {
  if (!filename) return null
  const staticDir = process.env.MEDIA_UPLOAD_DIR || './data/media'
  const resolved = path.resolve(process.cwd(), staticDir, filename)
  return existsSync(resolved) ? resolved : null
}

/** The subset of an author record the ID card draws from. */
export interface IdCardAuthor {
  nameBn: string
  designation?: string | null
  reporterId?: string | null
  pressCardNo?: string | null
  bloodGroup?: string | null
  validUntil?: string | null
  beat?: string[] | null
  photoFilename?: string | null
  siteName: string
}

/** The subset of an article record the photocard draws from. */
export interface PhotocardArticle {
  title: string
  categoryName?: string | null
  publishedAt?: string | null
  photoFilename?: string | null
  canonicalUrl: string
  siteName: string
}

/**
 * Compose the reporter ID card — portrait, 1000×1600.
 *
 * Layout: brand header · photo · name · designation · reporter ID · press card
 * number · validity · beat · QR → `https://<site>/verify/<reporterId>`.
 *
 * Every field is optional except the name; a missing field simply does not draw,
 * so a reporter who has not yet been given a press card number still gets a
 * valid card rather than an error.
 */
export async function composeIdCard(author: IdCardAuthor): Promise<Buffer> {
  const W = 1000
  const H = 1600

  if (!fontPath()) {
    throw new Error(
      'Bengali font not found — run scripts/fetch-fonts.mjs or copy the font into cms/fonts/.',
    )
  }

  const layers: Array<{ input: Buffer; left: number; top: number }> = []

  // Header band with the brand mark.
  layers.push({ input: await rectLayer(W, 150, BRAND_RED), left: 0, top: 0 })
  layers.push({
    input: await textLayer(author.siteName, {
      size: 56,
      color: WHITE,
      width: W - 120,
      weight: 700,
    }),
    left: 60,
    top: 42,
  })
  layers.push({ input: await rectLayer(W, 14, CHARCOAL), left: 0, top: 150 })

  // Photo: a square, cover-cropped, framed as a circle on a white card.
  const PHOTO = 320
  const photoX = (W - PHOTO) / 2
  const photoY = 210
  if (author.photoFilename) {
    const file = mediaFilePath(author.photoFilename)
    if (file) {
      const photo = await sharp(file).resize(PHOTO, PHOTO, { fit: 'cover' }).toBuffer()
      const circle = await sharp(
        Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${PHOTO}" height="${PHOTO}">
           <clipPath id="c"><circle cx="${PHOTO / 2}" cy="${PHOTO / 2}" r="${PHOTO / 2}"/></clipPath>
           <image href="data:image/webp;base64,${photo.toString('base64')}" width="${PHOTO}" height="${PHOTO}" clip-path="url(#c)"/>
         </svg>`),
      )
        .png()
        .toBuffer()
      layers.push({ input: circle, left: photoX, top: photoY })
    }
  } else {
    layers.push({
      input: await rectLayer(PHOTO, PHOTO, '#E5E5E5'),
      left: photoX,
      top: photoY,
    })
  }
  // Photo frame ring.
  layers.push({
    input: await sharp(
      Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${PHOTO + 16}" height="${PHOTO + 16}">
         <circle cx="${(PHOTO + 16) / 2}" cy="${(PHOTO + 16) / 2}" r="${(PHOTO + 12) / 2}" fill="none" stroke="${BRAND_RED}" stroke-width="6"/>
       </svg>`),
    )
      .png()
      .toBuffer(),
    left: photoX - 8,
    top: photoY - 8,
  })

  // Identity block.
  let y = photoY + PHOTO + 50
  layers.push({
    input: await textLayer(author.nameBn, {
      size: 64,
      color: CHARCOAL,
      width: W - 120,
      weight: 700,
    }),
    left: 60,
    top: y,
  })
  y += 90

  if (author.designation) {
    layers.push({
      input: await textLayer(author.designation, { size: 40, color: '#555555', width: W - 120 }),
      left: 60,
      top: y,
    })
    y += 62
  }

  // Credential rows: a label, then the value.
  const rows: Array<[string, string | null | undefined]> = [
    ['প্রতিবেদক আইডি', author.reporterId],
    ['প্রেস কার্ড নম্বর', author.pressCardNo],
    ['রক্তের গ্রুপ', author.bloodGroup],
    [
      'মেয়াদ শেষ',
      author.validUntil
        ? formatBnBd(author.validUntil, { day: 'numeric', month: 'long', year: 'numeric' })
        : null,
    ],
    ['বিট', author.beat && author.beat.length > 0 ? beatLabelsBn(author.beat).join(', ') : null],
  ]
  y += 20
  for (const [label, value] of rows) {
    if (!value) continue
    layers.push({
      input: await textLayer(label, { size: 30, color: '#777777', width: 340 }),
      left: 60,
      top: y,
    })
    layers.push({
      input: await textLayer(value, { size: 34, color: CHARCOAL, width: W - 420 }),
      left: 420,
      top: y - 4,
    })
    y += 58
  }

  // QR + verification pointer.
  const QR = 260
  const qrY = H - QR - 150
  layers.push({
    input: await qrLayer(author.reporterId ? verifyUrlFor(author.reporterId) : '', QR),
    left: (W - QR) / 2,
    top: qrY,
  })
  layers.push({
    input: await textLayer('QR স্ক্যান করে যাচাই করুন', { size: 30, color: '#555555', width: W - 120 }),
    left: 60,
    top: qrY + QR + 24,
  })

  return sharp({ create: { width: W, height: H, channels: 4, background: WHITE } })
    .composite(layers)
    .png()
    .toBuffer()
}

/**
 * Compose the article photocard — square, 1200×1200, built for Facebook.
 *
 * Facebook's sharer scrapes the page's OG image, and a dedicated card gives a
 * story a branded, legible square preview instead of an uncropped photo. The
 * owner decided this is a **share button, not a Graph API post**
 * (`docs/feature-batch-2.md` §3.5) — no page token, no app review.
 */
export async function composePhotocard(article: PhotocardArticle): Promise<Buffer> {
  const W = 1200
  const H = 1200

  if (!fontPath()) {
    throw new Error(
      'Bengali font not found — run scripts/fetch-fonts.mjs or copy the font into cms/fonts/.',
    )
  }

  const layers: Array<{ input: Buffer; left: number; top: number }> = []

  // Background: the featured image, cover-cropped and darkened so white text
  // reads on any photo. Falls back to brand charcoal when there is no image.
  if (article.photoFilename) {
    const file = mediaFilePath(article.photoFilename)
    if (file) {
      const bg = await sharp(file)
        .resize(W, H, { fit: 'cover' })
        .modulate({ brightness: 0.45 })
        .toBuffer()
      layers.push({ input: bg, left: 0, top: 0 })
    } else {
      layers.push({ input: await rectLayer(W, H, CHARCOAL), left: 0, top: 0 })
    }
  } else {
    layers.push({ input: await rectLayer(W, H, CHARCOAL), left: 0, top: 0 })
  }

  // Category chip.
  if (article.categoryName) {
    const chipText = await textLayer(article.categoryName, {
      size: 30,
      color: WHITE,
      width: 700,
      weight: 700,
    })
    const chipW = 700
    layers.push({ input: await rectLayer(chipW, 56, BRAND_RED), left: 60, top: 60 })
    layers.push({ input: chipText, left: 78, top: 70 })
  }

  // Headline — the largest element, wrapped and clamped.
  layers.push({
    input: await textLayer(article.title, { size: 62, color: WHITE, width: W - 120, weight: 700 }),
    left: 60,
    top: 150,
  })

  // Footer: wordmark left, date right.
  layers.push({
    input: await textLayer(article.siteName, { size: 40, color: WHITE, width: 600, weight: 700 }),
    left: 60,
    top: H - 90,
  })
  if (article.publishedAt) {
    const date = formatBnBd(article.publishedAt, { day: 'numeric', month: 'long', year: 'numeric' })
    layers.push({
      input: await textLayer(date, { size: 32, color: '#CCCCCC', width: 500 }),
      left: W - 560,
      top: H - 82,
    })
  }

  // QR → the article's canonical URL.
  const QR = 170
  layers.push({
    input: await qrLayer(article.canonicalUrl, QR),
    left: W - QR - 60,
    top: H - QR - 130,
  })

  return sharp({ create: { width: W, height: H, channels: 4, background: CHARCOAL } })
    .composite(layers)
    .png()
    .toBuffer()
}

/** `true` when the font is loadable — lets the endpoint answer 503 cleanly. */
export function isFontAvailable(): boolean {
  return fontPath() !== ''
}

/**
 * The URL a reporter's QR encodes — the single place this is constructed.
 *
 * The card prints this as a QR and `/verify/[reporterId]` renders it; if the two
 * ever disagreed the card would scan to a 404 and a real credential would look
 * forged. Both sides build from `PUBLIC_SITE_URL` so they cannot drift.
 */
export function verifyUrlFor(reporterId: string): string {
  const base = (process.env.PUBLIC_SITE_URL || 'https://shikkha24.com').replace(/\/$/, '')
  return `${base}/verify/${reporterId}`
}
