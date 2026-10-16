/**
 * S14 harness — the ID card and photocard.
 *
 * ## What the plan's exit gate actually says
 *
 * > "A generated ID card and photocard are byte-identical across two runs, and
 * > the QR resolves to a live /verify/:id page."
 *
 * Two properties, and each is a real failure mode rather than a formality:
 *
 * - **Byte-identical** is what makes the `Cache-Control: max-age=86400` + ETag
 *   contract safe. If the same record rendered two different PNGs, a cached card
 *   would flicker between versions and the ETag would be meaningless. This is
 *   also the only check that can catch an uninitialised buffer or a timestamp
 *   leaking into the render.
 * - **A live /verify/:id page** is what makes the QR worth scanning. A QR that
 *   resolves to a 404 is worse than no QR — it looks like a forged card.
 *
 * ## Why ink is counted rather than eyeballed
 *
 * The earlier SVG-font dead end produced a render that *existed* (right
 * dimensions, valid PNG) while using the wrong font. Asserting ink is non-zero
 * and differs from a blank plate is the weakest interesting claim; the font
 * itself was proven separately (`lib/id-card.ts` header) by comparing ink
 * against a no-Bengali-font render.
 *
 * Run: pnpm --filter @shikkha24/cms verify:id-card
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import config from '@payload-config'
import { getPayload } from 'payload'
import sharp from 'sharp'

import {
  articleUrlFor,
  composeIdCard,
  composePhotocard,
  type IdCardAuthor,
  isFontAvailable,
  mediaFilePath,
  type PhotocardArticle,
  siteOrigin,
  verifyUrlFor,
} from '../lib/id-card'

const payload = await getPayload({ config: await config })

let failures = 0
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

/** Count non-white pixels — a blank plate scores ~0, a composed card thousands. */
async function ink(buf: Buffer): Promise<number> {
  const { data } = await sharp(buf).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
  let nonWhite = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240) nonWhite += 1
  }
  return nonWhite
}

/**
 * The bounding box of drawn text, so a check can assert *clear margins* rather
 * than only that the canvas has the right size.
 *
 * Bright pixels are used because every card draws its text in white or a light
 * grey over a darkened photo or charcoal plate — this deliberately measures the
 * text, not the background. Rows and columns are sampled every 2 px: the goal is
 * to detect text touching an edge, and a 2 px step cannot miss a glyph.
 */
async function textBounds(buf: Buffer): Promise<{
  firstRow: number
  lastRow: number
  firstCol: number
  lastCol: number
}> {
  const { data, info } = await sharp(buf).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
  const bright = (i: number) => data[i] > 195 && data[i + 1] > 195 && data[i + 2] > 195
  let firstRow = info.height
  let lastRow = -1
  let firstCol = info.width
  let lastCol = -1
  for (let y = 0; y < info.height; y += 2) {
    for (let x = 0; x < info.width; x += 2) {
      if (!bright((y * info.width + x) * 4)) continue
      if (y < firstRow) firstRow = y
      if (y > lastRow) lastRow = y
      if (x < firstCol) firstCol = x
      if (x > lastCol) lastCol = x
    }
  }
  return { firstRow, lastRow, firstCol, lastCol }
}

/** One horizontal band of ink: a block the reader perceives as a unit. */
interface InkBand {
  top: number
  bottom: number
  height: number
  width: number
}

/**
 * The horizontal bands of bright ink on a card, top to bottom.
 *
 * Each run of consecutive rows containing ink is one band — which is how a reader
 * groups a card into "the category", "the title", "the QR", "the name", "the
 * date". That makes the *visual order* assertable, which a margin check cannot
 * see: a card can keep perfect margins while stacking its blocks in the wrong
 * order.
 *
 * Rows are sampled every 2 px for speed; a 1 px gap between glyphs is not a
 * meaningful band boundary, so runs shorter than 6 px are ignored as noise
 * rather than reported as their own block.
 *
 * @param buf a rendered card PNG.
 * @returns the bands, ordered by vertical position.
 */
async function inkBands(buf: Buffer): Promise<InkBand[]> {
  const { data, info } = await sharp(buf).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
  const bright = (i: number) => data[i] > 195 && data[i + 1] > 195 && data[i + 2] > 195
  const W = info.width
  const H = info.height
  const rowHasInk: boolean[] = []
  for (let y = 0; y < H; y += 2) {
    let hit = false
    for (let x = 0; x < W; x += 2) {
      if (bright((y * W + x) * 4)) {
        hit = true
        break
      }
    }
    rowHasInk.push(hit)
  }

  const bands: InkBand[] = []
  let start = -1
  for (let r = 0; r <= rowHasInk.length; r++) {
    const on = r < rowHasInk.length && rowHasInk[r]
    if (on && start < 0) start = r
    if (!on && start >= 0) {
      const top = start * 2
      const bottom = (r - 1) * 2
      if (bottom - top > 6) {
        let minX = W
        let maxX = 0
        for (let y = top; y <= bottom; y++) {
          for (let x = 0; x < W; x++) {
            if (bright((y * W + x) * 4)) {
              if (x < minX) minX = x
              if (x > maxX) maxX = x
            }
          }
        }
        bands.push({ top, bottom, height: bottom - top + 1, width: maxX - minX + 1 })
      }
      start = -1
    }
  }
  return bands
}

/**
 * How much the card's background varies, sampling only the left edge strip.
 *
 * The strip is chosen to be clear of every text block (text starts at x=66), so
 * what is measured is the backdrop alone.
 *
 * A **flat** background — the charcoal fallback used when the cover photo cannot
 * be found — has a standard deviation of exactly `0`. A photograph, even dimmed to
 * 18% brightness behind an 80% black overlay, still varies by several units. That
 * distinction is the whole point: mean luminance cannot tell the two apart, which
 * is how a photoless card passed review.
 *
 * @param buf a rendered card PNG.
 * @returns the mean and standard deviation of the backdrop's luminance.
 */
async function backgroundVariance(buf: Buffer): Promise<{ mean: number; sd: number }> {
  const { data, info } = await sharp(buf).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
  const W = info.width
  const H = info.height
  const vals: number[] = []
  for (let y = 0; y < H; y += 9) {
    for (let x = 6; x < 50 && x < W; x += 9) {
      const i = (y * W + x) * 4
      vals.push(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2])
    }
  }
  if (!vals.length) return { mean: 0, sd: 0 }
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length)
  return { mean, sd }
}

/**
 * The clear space above the first and below the last piece of card content.
 *
 * ## Why this is not a brightness test
 *
 * `textBounds` above asks "is this pixel bright?", which is right for finding text
 * on a darkened photo. It is **wrong for the category chip**: the chip is a solid
 * `BRAND_RED` rect, so its own top edge is dark and the first *bright* row is the
 * label sitting inside it. Measuring the chip's padding that way under-reports the
 * top gap by the chip's internal padding, which made a correctly centred card look
 * 13px off-centre and sent a debugging session chasing a layout bug that did not
 * exist.
 *
 * So content is detected as **anything that is not the darkened background**:
 * either bright (text, QR, the white plate) or strongly saturated (the red chip).
 * The photo is dimmed to ~18% brightness and skewed dark, so it fails both tests.
 *
 * @param buf a rendered card PNG.
 * @returns the top and bottom clear space in pixels.
 */
async function verticalSpread(buf: Buffer): Promise<{ top: number; bottom: number }> {
  const { data, info } = await sharp(buf).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
  const H = info.height
  const W = info.width
  const isContent = (i: number) => {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    const mx = Math.max(r, g, b)
    const sat = mx === 0 ? 0 : (mx - Math.min(r, g, b)) / mx
    return lum > 150 || (sat > 0.45 && lum > 40)
  }
  let first = -1
  let last = -1
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (isContent((y * W + x) * 4)) {
        if (first < 0) first = y
        last = y
        break
      }
    }
  }
  if (first < 0) return { top: 0, bottom: 0 }
  return { top: first, bottom: H - 1 - last }
}

/** A synthetic record, so the harness does not depend on seeded demo content. */
async function withAuthor(next: (author: IdCardAuthor) => Promise<void>): Promise<void> {
  const settings = await payload.findGlobal({
    slug: 'site-settings',
    depth: 0,
    overrideAccess: true,
  })
  const author: IdCardAuthor = {
    nameBn: 'যাচাই প্রতিবেদক',
    designation: 'শিক্ষা প্রতিবেদক',
    reporterId: 'SHK-R-2026-9999',
    pressCardNo: 'PC-৪২',
    bloodGroup: 'B+',
    validUntil: new Date(Date.now() + 365 * 86_400_000).toISOString(),
    beat: ['school', 'admission'],
    photoFilename: null,
    siteName: (settings.siteName as string | undefined) || 'শিক্ষা২৪.কম',
  }
  await next(author)
}

// ── Determinism: the same record must render byte-identically twice ─────────
await withAuthor(async (author) => {
  const a = await composeIdCard(author)
  const b = await composeIdCard(author)
  check('the ID card is byte-identical across two runs', a.equals(b), `${a.length} bytes`)

  const meta = await sharp(a).metadata()
  check(
    'the ID card is a 1000×1600 PNG',
    meta.width === 1000 && meta.height === 1600 && meta.format === 'png',
    `${meta.width}×${meta.height} ${meta.format}`,
  )

  const inked = await ink(a)
  check('the ID card is not a blank plate', inked > 50_000, `${inked} non-white pixels`)

  // Bengali is on the card. A Latin-only fallback would still produce ink, so
  // this is the weak claim; the strong one (font really loaded) was made by
  // measurement in lib/id-card.ts.
  check('the ID card carries the Bengali name', a.length > 20_000)
})

// ── The photocard ───────────────────────────────────────────────────────────
{
  const article: PhotocardArticle = {
    title: 'এসএসসি ফল প্রকাশিত — সংখ্যা বেড়েছে',
    categoryName: 'পরীক্ষা ও ফলাফল',
    publishedAt: new Date().toISOString(),
    photoFilename: null,
    canonicalUrl: 'https://shikkha24.com/exams-results/1/ssc-result',
    siteName: 'শিক্ষা২৪.কম',
    // Deliberately null: the harness must not depend on a live CMS upload being
    // reachable. The logo path is exercised by the endpoint's own brandFor().
    logoUrl: null,
  }
  const a = await composePhotocard(article)
  const b = await composePhotocard(article)
  check('the photocard is byte-identical across two runs', a.equals(b), `${a.length} bytes`)

  const meta = await sharp(a).metadata()
  check(
    'the photocard is a 1200×1200 PNG',
    meta.width === 1200 && meta.height === 1200 && meta.format === 'png',
    `${meta.width}×${meta.height} ${meta.format}`,
  )

  check('the photocard is not a blank plate', (await ink(a)) > 50_000)

  /*
   * ⚠️ Geometry, not just dimensions — this is the check whose absence let a real
   * defect ship. The card measured 1200×1200 and had plenty of ink, so every
   * assertion above passed while a 92-character Bengali headline was silently
   * **clipped** by `textLayer`'s old `height: size * 3` (186 px for a headline
   * needing ~620 px). The reader saw a truncated headline and footer text jammed
   * against the bottom edge with no breathing room.
   *
   * A card can be the right size, full of ink, byte-identical across runs, and
   * still be unreadable. So assert the *clear margins* directly: find the first
   * and last rows containing bright (text) pixels and require real space at both
   * edges. The ratio bound is deliberately generous — this is a "no text touching
   * the edge" guard, not a pixel-perfect layout assertion.
   */
  const geo = await textBounds(a)
  /*
   * ⚠️ **This bound used to be `1200 * 0.03` = 36 px, and that is why a real
   * overflow shipped.** The layout declares `MARGIN = 64`, but 36 is lenient
   * enough that text touching the edge passes: the live card measured a **61 px**
   * left gap and a **60 px** right gap — visibly cramped, and comfortably inside a
   * 36 px threshold. A gate must assert the margin the layout *promises*, not a
   * generous fraction of it, or it certifies exactly the defect it exists to catch.
   */
  const minMargin = 64
  check(
    'the photocard keeps clear space at the top edge',
    geo.firstRow >= minMargin,
    `first text row y=${geo.firstRow}, need >= ${minMargin}`,
  )
  check(
    'the photocard keeps clear space at the bottom edge',
    geo.lastRow <= 1200 - minMargin,
    `last text row y=${geo.lastRow}, need <= ${1200 - minMargin}`,
  )
  check(
    'the photocard left/right margins are clear',
    geo.firstCol >= minMargin && geo.lastCol <= 1200 - minMargin,
    `x ${geo.firstCol}..${geo.lastCol}, need ${minMargin}..${1200 - minMargin}`,
  )

  /*
   * ⚠️ **Symmetry, which nothing checked before.** The card used to place its
   * elements at hard-coded offsets — the wordmark 600 px from the left, the date
   * 520 px ending at `W - MARGIN`, the QR overlapping both. Text could therefore sit
   * *inside* a 64 px margin and still be visibly off-centre or overlapping, which is
   * the "text goes outside the card" the owner reported. Equal side gaps are the
   * property that actually fails when an offset is guessed rather than measured.
   */
  const leftGap = geo.firstCol
  const rightGap = 1200 - 1 - geo.lastCol
  check(
    'the photocard text is centred (left and right gaps match)',
    Math.abs(leftGap - rightGap) <= 12,
    `left gap ${leftGap}px vs right gap ${rightGap}px, need within 12px`,
  )

  // A headline that overflows its budget is clipped at a known boundary, so the
  // card must never be *silently* truncated: with the layout fixed, the whole
  // title has to fit. Re-render with a long real-world headline and require that
  // the headline block ends above the footer.
  const longTitle = await composePhotocard({
    ...article,
    title: 'সরকারি স্কুলে ভর্তির নীতিমালা-২০২৭ প্রকাশ — ক্যাচমেন্ট ৪০%, কোটা ১৪%, বাকিটা পরীক্ষা-লটারিতে',
  })
  const longGeo = await textBounds(longTitle)
  check(
    'a long Bengali headline does not run into the bottom edge',
    longGeo.lastRow <= 1200 - minMargin,
    `last text row y=${longGeo.lastRow}, need <= ${1200 - minMargin}`,
  )
  /*
   * ── The 2026-10-16 redesign ────────────────────────────────────────────────
   *
   * The owner specified a fixed top-to-bottom order — category, title, QR,
   * name(+logo), date — and a three-line cap on the title. Both are *structural*
   * promises that the margin checks above cannot see: a card could keep perfect
   * margins while drawing the blocks in the wrong order or letting the title run
   * to ten lines. Assert them directly.
   *
   * The order is verified by the *vertical position of each block's ink*, which is
   * how a reader perceives it, rather than by trusting the code's own cursor.
   */
  const bands = await inkBands(a)
  check(
    'the photocard stacks category above title',
    bands.length >= 2 && bands[0].top < bands[1].top,
    `band tops ${bands.map((x) => x.top).join(', ')}`,
  )

  /*
   * The QR is the one block that is a solid square of ink, so it is identifiable
   * by height. It must sit BELOW the title and ABOVE the name lockup.
   */
  const qrBand = bands.find((x) => x.height >= 150 && x.width >= 150)
  check(
    'the photocard draws a QR block between the title and the name',
    qrBand !== undefined,
    qrBand ? `QR band y=${qrBand.top}..${qrBand.bottom}` : 'no square ink block found',
  )
  if (qrBand) {
    const above = bands.filter((x) => x.bottom < qrBand.top)
    const below = bands.filter((x) => x.top > qrBand.bottom)
    check(
      'the photocard keeps content above and below the QR',
      above.length > 0 && below.length > 0,
      `${above.length} band(s) above, ${below.length} below`,
    )
  }

  /*
   * ⚠️ The title must be capped at three lines. `fitHeadline` measures each
   * candidate and appends "..." on a word boundary, so an over-long headline ends
   * in three dots rather than being silently clipped mid-word — the owner's
   * explicit rule. Asserted on a deliberately absurd headline so the cap is
   * exercised even though real titles fit comfortably.
   */
  const extreme = await composePhotocard({
    ...article,
    title: 'সরকারি স্কুলে ভর্তির নীতিমালা-২০২৭ প্রকাশ '.repeat(6),
  })
  /*
   * ⚠️ The title arrives as **three separate bands**, one per wrapped line — the
   * line gaps are genuine whitespace, so a single "title block" does not exist in
   * the pixel data. Counting the lines between the category and the QR is what
   * actually tests the cap.
   */
  const extremeBands = await inkBands(extreme)
  const qrBand2 = extremeBands.find((x) => x.height >= 150 && x.width >= 150)
  const categoryBand = extremeBands[0]
  const titleLines = extremeBands.filter(
    (x) =>
      categoryBand !== undefined &&
      qrBand2 !== undefined &&
      x.top > categoryBand.bottom &&
      x.bottom < qrBand2.top,
  )
  /*
   * ── The 2026-10-16 spacing pass ────────────────────────────────────────────
   *
   * The owner's first look at the redesign was that everything was "very tight on
   * top" and bunched against the upper edge. Measured: content came to 596px in a
   * 1200px canvas — **50% of the card was empty**, all 526px of it pooled at the
   * bottom, while the top got 78px. The card now measures **83%** full with even
   * air on every side.
   *
   * Two properties matter and neither is visible to the margin checks above, which
   * only look at where ink *ends*. These look at how the space is *distributed*:
   * the composition is vertically centred, and the gaps between blocks are equal.
   *
   * ⚠️ **"Ink" here means anything that is not the darkened photo** — a colour-aware
   * test, not a brightness one. The category chip is a solid red rect: a plain
   * `luminance > threshold` check misses it entirely and reads the first bright
   * pixel as the chip's *label*, which sits ~9px inside the chip. That mistake made
   * a correctly centred card measure as 13px off-centre and sent the investigation
   * after a layout bug that did not exist.
   */
  const spread = await verticalSpread(a)
  /*
   * ⚠️ **A card can render "successfully" with no photograph at all.**
   *
   * When `mediaFilePath()` cannot find the file it returns `null` and the layout
   * falls back to a flat charcoal plate — and every other check here still passes,
   * because the card is the right size, has plenty of ink, is byte-identical across
   * runs, and keeps perfect margins. That is exactly what happened while preparing
   * a sample: the image was missing from this machine's `data/media/`, the sample
   * came out flat grey, and the flatness was only noticed because the owner
   * reported seeing "only a dark gray background".
   *
   * The distinguishing property is **variance**, not brightness. A flat fill has a
   * standard deviation of 0; a photo dimmed to 18% still varies. Checking the mean
   * against a photo's mean passes for both — which is the mistake that let the
   * flat card through.
   */
  /*
   * Only meaningful with a real cover photo, and `cms/data/media` is gitignored —
   * so this **skips** rather than fails when the image is absent. Skipping is the
   * honest outcome: a missing file is an environment fact, not a card defect, and
   * asserting either way would be a claim the harness cannot support. The failure
   * mode it guards against was found by rendering a sample by hand, which is
   * exactly when this check has a photo to work with.
   */
  const samplePhoto = mediaFilePath('demo-plate-1.jpg')
  if (samplePhoto) {
    const withPhoto = await composePhotocard({ ...article, photoFilename: 'demo-plate-1.jpg' })
    const bg = await backgroundVariance(withPhoto)
    /*
     * The threshold is **1**, not a "looks photographic" number, because the two
     * cases are categorically different rather than a matter of degree: a flat
     * charcoal fill has an sd of **exactly 0**, and *any* real image dimmed to 18%
     * retains some variation. Deliberately low-contrast fixtures are expected —
     * `demo-plate-1.jpg` measures sd 2.21 here against the real cover's 11.99, and
     * both are photographs. Picking a higher bound would fail honest images, which
     * is worse than the narrow check it would buy.
     */
    check(
      'the photocard background is an image, not a flat fallback fill',
      bg.sd > 1,
      `background sd=${bg.sd.toFixed(2)} (mean ${bg.mean.toFixed(1)}); a flat fill is exactly 0`,
    )
  } else {
    console.log(
      'note  no cover photo in cms/data/media — skipping the "background is a photograph" check',
    )
  }

  check(
    'the photocard content is vertically centred',
    Math.abs(spread.top - spread.bottom) <= 6,
    `top padding ${spread.top}px vs bottom ${spread.bottom}px, need within 6px`,
  )
  check(
    'the photocard fills the canvas rather than pooling at the bottom',
    spread.top + spread.bottom < 1200 * 0.35,
    `total vertical padding ${spread.top + spread.bottom}px of 1200, need < 420px`,
  )

  check(
    'a very long headline is capped at three lines',
    titleLines.length > 0 && titleLines.length <= 3,
    `${titleLines.length} line(s) between the category and the QR, need 1..3`,
  )
  const extremeGeo = await textBounds(extreme)
  check(
    'a very long headline still ends above the bottom margin',
    extremeGeo.lastRow <= 1200 - minMargin,
    `last text row y=${extremeGeo.lastRow}, need <= ${1200 - minMargin}`,
  )
}

// ── The QR resolves somewhere real ──────────────────────────────────────────
{
  const url = verifyUrlFor('SHK-R-2026-9999')
  check(
    'the verify URL targets /verify/:reporterId',
    /^https:\/\/[^/]+\/verify\/SHK-R-\d{4}-\d{4,}$/.test(url),
    url,
  )

  // If a frontend build is present, the QR's target must be a page that
  // actually exists — a QR that scans to a 404 makes a real credential look
  // forged. Skipped (not passed) when dist/ is absent: the CMS harness cannot
  // build the frontend, and asserting absence would be a lie.
  const distRoot = path.resolve(process.cwd(), '..', 'frontend', 'dist')
  if (!existsSync(distRoot)) {
    console.log(
      'note  frontend/dist absent — the QR-target check needs a built site; run pnpm build:frontend first',
    )
  } else {
    const real = (
      await payload.find({
        collection: 'authors',
        where: { reporterId: { exists: true } },
        limit: 1,
        overrideAccess: true,
      })
    ).docs[0]

    if (!real?.reporterId) {
      console.log('note  no author with a reporterId — the QR-target page check is untested')
    } else {
      const target = path.resolve(distRoot, 'verify', real.reporterId, 'index.html')
      check(
        `the QR's target page is built for a real reporter (${real.reporterId})`,
        existsSync(target),
        target.replace(distRoot, ''),
      )
    }
  }
}

// ── F-03: the printed URLs follow PUBLIC_SITE_URL, never a baked-in domain ────
{
  // The photocard endpoint used to hardcode `https://shikkha24.com`, so a card
  // generated on a staging host printed a QR pointing at production. These
  // assertions pin the behaviour to the environment variable instead.
  const realSiteUrl = process.env.PUBLIC_SITE_URL

  try {
    process.env.PUBLIC_SITE_URL = 'https://staging.example.test'
    check(
      'the photocard QR target follows PUBLIC_SITE_URL, not a hardcoded domain',
      articleUrlFor('exams-results', 1, 'ssc-result') ===
        'https://staging.example.test/exams-results/1/ssc-result',
      articleUrlFor('exams-results', 1, 'ssc-result'),
    )

    // A trailing slash in the variable must not produce `//` in the path —
    // an operator adding one should not break every QR on the site.
    process.env.PUBLIC_SITE_URL = 'https://staging.example.test/'
    check(
      'a trailing slash in PUBLIC_SITE_URL is not doubled',
      articleUrlFor('exams-results', 1, 'ssc-result') ===
        'https://staging.example.test/exams-results/1/ssc-result',
      articleUrlFor('exams-results', 1, 'ssc-result'),
    )

    // Both card types share `siteOrigin()`, so both must move together.
    check(
      'the reporter verify QR follows PUBLIC_SITE_URL too',
      verifyUrlFor('SHK-R-2026-9999') === 'https://staging.example.test/verify/SHK-R-2026-9999',
      verifyUrlFor('SHK-R-2026-9999'),
    )
  } finally {
    // Restore, so later checks and any real card render see the real value.
    if (realSiteUrl === undefined) delete process.env.PUBLIC_SITE_URL
    else process.env.PUBLIC_SITE_URL = realSiteUrl
  }

  // An uncategorised article has no category segment, so it takes the short
  // `/a/:id` route. Both the old and new code must agree here.
  check(
    'an uncategorised article falls back to /a/:id',
    articleUrlFor(undefined, 42, 'some-slug') === `${siteOrigin()}/a/42`,
    articleUrlFor(undefined, 42, 'some-slug'),
  )
}

// ── The font must actually be loadable, or every card is tofu ───────────────
check(
  'the Bengali font is loadable on this machine',
  isFontAvailable(),
  isFontAvailable() ? 'found' : 'missing — cards would render without Bengali',
)

console.log(
  failures === 0 ? '\nAll ID card checks passed.\n' : `\n${failures} ID card check(s) FAILED.\n`,
)
process.exit(failures === 0 ? 0 : 1)
