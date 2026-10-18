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

/**
 * Coloured, wrapped text rendered to a transparent PNG ready for compositing.
 *
 * ⚠️ **`maxHeight` is a real budget, not a formality.** This used to hard-code
 * `height: opts.size * 3` — a tall headline was then silently *clipped* to fit
 * instead of wrapping, with no error. On the photocard that cut a 92-character
 * Bengali headline (which needs ~620 px at size 62) down to **127 px**, so the
 * reader saw a truncated headline and the footer text appeared jammed against the
 * bottom edge with no breathing space.
 *
 * Callers that lay text above other content should pass `maxHeight` and read the
 * returned `height`: it is the PNG's real height, so the next element can be
 * placed below it rather than at a guessed fixed offset.
 */
/**
 * Resolve the font file for a weight, falling back to the other weight.
 *
 * ⚠️ **This is the whole reason Bengali renders at all, and it used to be silent
 * when it failed.** The previous line was:
 *
 * ```ts
 * fontfile: existsSync(file) ? file : fontPath(),
 * ```
 *
 * When nothing was found `fontPath()` returns `''`, so this passed
 * **`fontfile: ''`** — and sharp rejects an empty string with
 * *"Expected string for text.fontfile but received of type string"*. Depending on
 * the caller that surfaces as a 500 or as a caught-and-ignored failure. Worse, the
 * `fontPath()` fallback pointed at the **400** file even when the **700** weight
 * was requested, so a bold headline silently rendered in regular.
 *
 * Now the 400 weight is a genuine fallback for a missing 700, and `null` means
 * "no Bengali font anywhere" — which `textLayer` turns into an explicit throw
 * rather than a card full of missing-glyph boxes.
 *
 * 🔍 **Why a missing font produces `09 09 09` / `B8 B0 95 BE B0 BF`, not an
 * error.** With no Bengali face available, Pango/fontconfig falls back to a
 * Latin-only system font, which has no Bengali glyphs. It draws each character as
 * its **glyph index** in a box instead of failing. The reader sees exactly the
 * hexadecimal-looking sequences the owner reported. **A font problem here never
 * announces itself — it renders rubbish and returns HTTP 200.**
 *
 * @param weight the requested weight; anything but 700 resolves to 400.
 * @returns an absolute path, or `null` when no Bengali font exists on disk.
 */
function fontFileFor(weight?: number): string | null {
  const preferred = weight === 700 ? 'solaimanlipi-700.woff2' : 'solaimanlipi-400.woff2'
  const fallback = 'solaimanlipi-400.woff2'
  const dir = path.dirname(fontPath())
  if (!fontPath()) return null
  for (const name of new Set([preferred, fallback])) {
    const candidate = path.resolve(dir, name)
    if (existsSync(candidate)) return candidate
  }
  return null
}

async function textLayer(
  value: string,
  opts: { size: number; color: string; width: number; weight?: number; maxHeight?: number },
): Promise<Buffer> {
  const file = fontFileFor(opts.weight)
  if (!file) {
    // Fail loudly. The alternative is a photocard that renders glyph indices and
    // still returns 200, which is far harder to notice than an error.
    throw new Error(
      `No Bengali font found for the photocard renderer. Looked for ${FONT_FILE} ` +
        `under ${['fonts', path.join('..', 'assets', 'fonts', 'vendor')].join(' and ')}. ` +
        `The deploy must copy the vendored font into place before the card is rendered.`,
    )
  }
  const markup = `<span foreground="${opts.color}">${escapeMarkup(value)}</span>`
  return sharp({
    text: {
      text: markup,
      fontfile: file,
      font: `SolaimanLipi ${opts.size}`,
      width: opts.width,
      // `undefined` lets sharp size the canvas to the wrapped text, which is what
      // the callers that position by measured height want.
      height: opts.maxHeight,
      rgba: true,
      wrap: 'word',
    },
  })
    .png()
    .toBuffer()
}

/**
 * Truncate to at most `maxLines` lines, cutting on a **word boundary** and
 * appending `…`.
 *
 * ## Why not let pango clip
 *
 * `textLayer`'s `maxHeight` makes sharp clip silently: the reader gets a headline
 * chopped mid-word with no ellipsis, which reads as a rendering bug rather than an
 * intentional summary. The owner's rule is explicit — if it does not fit in three
 * lines, show three dots.
 *
 * ## How it measures
 *
 * Each word is added and the layer re-measured, so the cut is decided by the
 * **rendered pixel width of this font at this size**, not an average character
 * count. That matters for Bengali: conjuncts and কারচিহ্ন make word widths wildly
 * uneven, so any "about N characters" guess would overflow on one headline and
 * waste a line on the next.
 *
 * The binary search keeps it to ~log₂(words) renders (≈6 for a long headline)
 * instead of one render per word, because every render is a libvips round trip on
 * a host where those are expensive.
 *
 * @param value the full headline.
 * @param opts size/colour/width/weight, matching what the caller will draw.
 * @param measure a function returning the rendered height of a candidate string.
 * @returns the largest prefix fitting `maxLines`, ellipsised if anything was cut.
 *
 * ⚠️ **The ellipsis is three full stops, not `…` (U+2026).** The vendored
 * SolaimanLipi subset kept only **2 of 112** general-punctuation glyphs, so `…`
 * and the em-dash `—` are genuinely absent — drawing either produces a
 * missing-glyph box, i.e. exactly the defect that made every card unreadable
 * before. `.` is present, so `...` renders correctly. If the font is ever
 * re-subset with a wider `--unicodes`, this can become a real ellipsis.
 */
export async function fitHeadline(
  value: string,
  opts: { size: number; color: string; width: number; weight?: number; lineHeight: number },
  maxLines: number,
  measure: (candidate: string) => Promise<{ height: number; width: number }>,
): Promise<string> {
  const ELLIPSIS = '...'
  const budget = Math.round(opts.lineHeight * maxLines)
  const whole = await measure(value)
  // The common case: the real headline fits, so nothing is touched.
  if (whole.height <= budget) return value

  const words = value.split(/\s+/).filter(Boolean)
  let lo = 1
  let hi = words.length
  let best = 1
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    const candidate = `${words.slice(0, mid).join(' ')}${ELLIPSIS}`
    const size = await measure(candidate)
    if (size.height <= budget) {
      best = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  // A single word longer than the whole budget is the one case the ellipsis
  // cannot rescue; pango will wrap it mid-word and `maxHeight` clips it, which is
  // the least-bad outcome and is flagged by the caller's own budget check.
  return best >= words.length ? value : `${words.slice(0, best).join(' ')}${ELLIPSIS}`
}

/** The real pixel height of a rendered text layer, for collision-free stacking. */
async function _layerHeight(layer: Buffer): Promise<number> {
  const { info } = await sharp(layer).toBuffer({ resolveWithObject: true })
  return info.height
}

/** The real pixel size of a rendered layer, for centring and collision checks. */
async function layerSize(layer: Buffer): Promise<{ width: number; height: number }> {
  const { info } = await sharp(layer).toBuffer({ resolveWithObject: true })
  return { width: info.width, height: info.height }
}

/**
 * The vertical extent of a layer's **visible ink**, as `{ top, height }`.
 *
 * ## Why layer height is not enough
 *
 * Pango renders text into a full line box — ascent plus descent plus line gap — so
 * a 96px name produces a ~115px layer whose glyphs occupy only ~99px. Compositing
 * by layer height therefore leaves visibly uneven gaps: measured on the first
 * balanced photocard, the four inter-block gaps came out **139, 125, 130, 136px**
 * even though the layout used one identical value for all of them. The 14px spread
 * was pure line-box padding.
 *
 * Measuring the ink lets each block be placed by what the reader actually sees, so
 * "equal spacing" is equal on the rendered card rather than equal in the code.
 *
 * Layers with no ink (a transparent logo that failed to load) fall back to the
 * full layer box, so a blank input cannot collapse the layout to zero height.
 *
 * @param layer a rendered PNG layer with an alpha channel.
 * @returns the first and last rows containing non-transparent pixels.
 */
async function inkExtent(layer: Buffer): Promise<{ top: number; height: number }> {
  const { data, info } = await sharp(layer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  let first = -1
  let last = -1
  for (let y = 0; y < info.height; y++) {
    let hit = false
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 12) {
        hit = true
        break
      }
    }
    if (hit) {
      if (first < 0) first = y
      last = y
    }
  }
  if (first < 0) return { top: 0, height: info.height }
  return { top: first, height: last - first + 1 }
}

/**
 * The `left` that centres a layer inside the safe area.
 *
 * ## Why this exists
 *
 * Every card element used to be positioned at a **hard-coded** offset — the
 * headline and wordmark at `left: MARGIN`, the date at `W - 520 - MARGIN`, the QR
 * at `W - QR - MARGIN`. Those numbers only work if each layer happens to be
 * *exactly* the width the layout assumed, and sharp sizes a text layer to its
 * real rendered width. A headline one pixel wider than its budget, or a 600px
 * wordmark next to a 520px date on the same line, pushed text under the QR or off
 * the canvas — with no error, because compositing happily draws outside the frame.
 *
 * Measured on the live card before this helper existed: both text blocks sat at
 * a **61px** left gap against a declared 64px margin, and the footer's right gap
 * was **60px** — the text was touching the edges.
 *
 * Centring by **measured** width removes the assumption entirely: an element can
 * never be positioned past its own extent, whatever the font, size or string.
 *
 * ⚠️ **Pango has no usable `align` attribute here** — `<span align="center">` is
 * rejected as invalid markup by sharp, so the offset has to be computed by hand
 * rather than delegated to the text engine.
 *
 * @param layer the rendered layer, measured for its true width.
 * @param canvasWidth the full card width.
 * @param margin clear space to keep on each side.
 * @returns the `left` offset, never less than `margin`.
 */
async function centreLeft(layer: Buffer, canvasWidth: number, margin: number): Promise<number> {
  const { width } = await layerSize(layer)
  const available = canvasWidth - margin * 2
  // `Math.max(margin, …)` keeps the floor even if a layer somehow exceeds the
  // safe area, so an over-wide element cannot be pushed off the left edge.
  return margin + Math.max(0, Math.round((available - width) / 2))
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
 * The site logo, rasterised to a square PNG on a transparent field.
 *
 * ## Why the CMS value is fetched rather than passed in
 *
 * The owner's requirement is that renaming the site or replacing the logo in the
 * CMS updates the card with **no code change**. `site-settings.logo` is an upload
 * relation, so the endpoint resolves it and hands us a URL; this only rasterises
 * whatever it is given.
 *
 * ⚠️ **The stored logo is an SVG** (`icon-maskable.svg`), which sharp reads
 * through librsvg. That works on this host — verified by rasterising the live file
 * to 256×256 with 100% opaque coverage — but it is a different code path from the
 * JPEG/WebP rasters, so a failure here is logged and degrades to name-only rather
 * than throwing. A card without a logo is still a valid card; a card that 500s is
 * not.
 *
 * @param source an absolute URL or local path to the image.
 * @param size the square edge length in pixels.
 * @returns a PNG buffer, or `null` when the image cannot be read.
 */
async function logoLayer(source: string, size: number): Promise<Buffer | null> {
  try {
    const isRemote = /^https?:\/\//.test(source)
    const input = isRemote ? Buffer.from(await (await fetch(source)).arrayBuffer()) : source
    // `fit: 'contain'` keeps a non-square logo undistorted; `density` gives
    // librsvg enough resolution to rasterise an SVG cleanly rather than blurrily.
    return await sharp(input, { density: 300 })
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()
  } catch (error) {
    console.warn(`photocard: logo could not be rendered (${String(error).slice(0, 120)})`)
    return null
  }
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
 *
 * ⚠️ **Path traversal guard.** `path.resolve()` collapses `..` segments, so a
 * filename of `../../../etc/passwd` would escape the media directory. The
 * `startsWith` check below is the second line of defense — Payload's upload
 * pipeline already sanitises filenames, but a defence-in-depth boundary here
 * means a bypass in the upload layer cannot be escalated to arbitrary file read.
 */
export function mediaFilePath(filename?: string | null): string | null {
  if (!filename) return null
  const staticDir = process.env.MEDIA_UPLOAD_DIR || './data/media'
  const base = path.resolve(process.cwd(), staticDir)
  const resolved = path.resolve(base, filename)
  // The resolved path must be inside the media directory.
  if (!resolved.startsWith(base + path.sep)) return null
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
  /**
   * The site logo, as an absolute URL or local path, resolved from
   * `site-settings.logo` by the caller.
   *
   * Kept as a plain string rather than the Payload media object so this layout
   * stays free of CMS types and is testable without a running Payload. When
   * absent the lockup renders the name alone — a card without a logo is still a
   * valid card.
   */
  logoUrl?: string | null
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
      // Sits in the 150 px brand header at top 42 — cap it so a long site name
      // cannot spill past the band and onto the photo below.
      maxHeight: 150 - 42 - 16,
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
      // The ID card lays text out at fixed offsets, so keep the old 3-line box
      // exactly (`size * 3`) rather than letting this float to content height.
      maxHeight: 64 * 3,
    }),
    left: 60,
    top: y,
  })
  y += 90

  if (author.designation) {
    layers.push({
      input: await textLayer(author.designation, {
        size: 40,
        color: '#555555',
        width: W - 120,
        maxHeight: 40 * 3,
      }),
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
      input: await textLayer(label, { size: 30, color: '#777777', width: 340, maxHeight: 30 * 3 }),
      left: 60,
      top: y,
    })
    layers.push({
      input: await textLayer(value, {
        size: 34,
        color: CHARCOAL,
        width: W - 420,
        maxHeight: 34 * 3,
      }),
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
    input: await textLayer('QR স্ক্যান করে যাচাই করুন', {
      size: 30,
      color: '#555555',
      width: W - 120,
      maxHeight: 30 * 3,
    }),
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

  // ── Layout constants ───────────────────────────────────────────────────────
  //
  // Every edge keeps `MARGIN` of clear space. The old layout hard-coded the
  // headline at `top: 150` and the footer at `H - 90`, so a headline taller than
  // the gap between them simply ran underneath the footer and off the canvas —
  // visible as text touching the bottom edge with no breathing room.
  const MARGIN = 64

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

  // ── Typography scale ───────────────────────────────────────────────────────
  //
  // Owner-specified hierarchy, largest to smallest. The previous card had a 62px
  // headline with 32–40px everything else, so the *title* dominated and the
  // publication name — the thing that should identify the brand — was one of the
  // smallest elements. The name now leads.
  //
  // | rank | element  | size |
  // |------|----------|------|
  // | 1    | name     | 96   |
  // | 2    | title    | 40   |
  // | 3    | category | 30   |
  // | 4    | date     | 26   |
  //
  // The name was raised from 64 to **96** at the owner's request, to make the
  // brand carry real weight at the top of the hierarchy. Verified it still fits:
  // at 96px the name renders 449px wide, and the name+logo lockup totals 581px
  // against 1072px of usable width, so there is no risk of wrapping.
  //
  // Bengali needs more leading than Latin: conjuncts stack below the baseline and
  // কারচিহ্ন rises above it, so a 1.2 line box clips both. 1.55 is the house
  // minimum from `.sps/plan.md` (Bengali typography ≥17px / line-height ≥1.65 in
  // body copy); here a slightly tighter 1.5 is used because the card is a poster,
  // not running text, and three title lines are the hard budget.
  const SIZE_NAME = 96
  const SIZE_TITLE = 40
  const SIZE_CATEGORY = 30
  const SIZE_DATE = 26
  const TITLE_LINE = Math.round(SIZE_TITLE * 1.5)

  const TITLE_MAX_LINES = 3
  /**
   * The **minimum** air between stacked blocks.
   *
   * The owner's first look at the redesign was that everything was "very tight on
   * top" with the elements bunched against the upper edge. Measured: content came
   * to 596px in a 1200px canvas — **50% of the card was empty**, all 526px of it at
   * the bottom, while the top got only 78px. A fixed 34px gap cannot fix that; the
   * gaps have to *absorb* the leftover height.
   *
   * So this is a floor, not the final value. See the distribution step below, which
   * grows every gap until the stack fills the card and the slack is even at both
   * ends.
   */
  const MIN_BLOCK_GAP = 34
  /** The floor for the outer top/bottom padding, matching the side `MARGIN`. */
  const MIN_V_PAD = 64

  // ── Background: the cover photo, heavily blacked out ───────────────────────
  //
  // Owner's requirement, verbatim: *"the photo will become less transparency
  // almost 10-20 visible, i.e. use black solid overlay 80%"*. So the photo is a
  // faint texture behind near-solid black, which is what makes white text read on
  // ANY cover — a bright sky or a white shirt behind the text would otherwise
  // destroy contrast on exactly the photos that need it most.
  //
  // `modulate({brightness: 0.18})` is the 80% black overlay expressed as a
  // brightness reduction, applied to the image rather than composited on top so
  // there is only one blend and no alpha rounding to reason about.
  if (article.photoFilename) {
    const file = mediaFilePath(article.photoFilename)
    if (file) {
      const bg = await sharp(file)
        .resize(W, H, { fit: 'cover' })
        .modulate({ brightness: 0.18 })
        .toBuffer()
      layers.push({ input: bg, left: 0, top: 0 })
    } else {
      layers.push({ input: await rectLayer(W, H, CHARCOAL), left: 0, top: 0 })
    }
  } else {
    layers.push({ input: await rectLayer(W, H, CHARCOAL), left: 0, top: 0 })
  }

  /*
   * ── Pass 1: render every block and measure it ──────────────────────────────
   *
   *   category chip
   *   article title (max 3 lines, else "...")
   *   QR code
   *   [logo] শিক্ষা২৪.কম
   *   date
   *
   * The blocks are built and measured FIRST, and positioned in a second pass. That
   * separation is what makes balanced spacing possible: until every height is
   * known, there is no way to know how much slack exists to distribute. The
   * previous version positioned each block as it built it, so the cursor reached
   * the bottom long before the canvas did and the remainder pooled at the bottom.
   */
  interface Block {
    layers: Array<{ input: Buffer; left: number; top: number }>
    /**
     * The block's **visible** height, which is what gap spacing is measured
     * against. Deliberately not the tallest layer's box: a text layer carries
     * line-box padding that the reader cannot see, and using it would make equal
     * gaps look unequal. See `inkExtent`.
     */
    inkHeight: number
  }
  const blocks: Block[] = []
  /** Blocks are positioned relative to their own top; `top: 0` is filled in later. */
  const rel = (input: Buffer, left: number, top: number) => ({ input, left, top })

  // ── 1. Category chip ───────────────────────────────────────────────────────
  // Centred, and sized to its own label plus padding so a short category is not a
  // wide empty slab.
  if (article.categoryName) {
    const chipH = Math.round(SIZE_CATEGORY * 1.9)
    const CHIP_PAD_X = 30
    const chipText = await textLayer(article.categoryName, {
      size: SIZE_CATEGORY,
      color: WHITE,
      width: W - MARGIN * 2,
      weight: 700,
    })
    const chipTextSize = await layerSize(chipText)
    const chipW = chipTextSize.width + CHIP_PAD_X * 2
    const chipLeft = MARGIN + Math.max(0, Math.round((W - MARGIN * 2 - chipW) / 2))
    blocks.push({
      layers: [
        rel(await rectLayer(chipW, chipH, BRAND_RED), chipLeft, 0),
        rel(chipText, chipLeft + CHIP_PAD_X, Math.round((chipH - chipTextSize.height) / 2)),
      ],
      // The chip is a solid rect, so its box *is* its ink.
      inkHeight: chipH,
    })
  }

  // ── 2. Title, capped at three lines ────────────────────────────────────────
  //
  // Measured first: `fitHeadline` re-renders candidates until the longest prefix
  // that fits three lines is found, so an over-long headline ends in "..." rather
  // than being silently clipped mid-word by `maxHeight`.
  const titleWidth = W - MARGIN * 2
  const measureTitle = async (candidate: string) =>
    layerSize(
      await textLayer(candidate, {
        size: SIZE_TITLE,
        color: WHITE,
        width: titleWidth,
        weight: 700,
      }),
    )
  const titleText = await fitHeadline(
    article.title,
    { size: SIZE_TITLE, color: WHITE, width: titleWidth, weight: 700, lineHeight: TITLE_LINE },
    TITLE_MAX_LINES,
    measureTitle,
  )
  const title = await textLayer(titleText, {
    size: SIZE_TITLE,
    color: WHITE,
    width: titleWidth,
    weight: 700,
    maxHeight: TITLE_LINE * TITLE_MAX_LINES,
  })
  const titleSize = await layerSize(title)
  // `-titleInk.top` cancels the line-box padding above the first line, so the gap
  // above the title is measured from the glyphs the reader actually sees.
  const titleInk = await inkExtent(title)
  blocks.push({
    layers: [
      rel(
        title,
        MARGIN + Math.max(0, Math.round((titleWidth - titleSize.width) / 2)),
        -titleInk.top,
      ),
    ],
    inkHeight: titleInk.height,
  })

  // ── 3. QR code, centred ────────────────────────────────────────────────────
  const QR = 200
  const qr = await qrLayer(article.canonicalUrl, QR)
  // The QR is a solid square, so its box *is* its ink.
  blocks.push({ layers: [rel(qr, Math.round((W - QR) / 2), 0)], inkHeight: QR })

  // ── 4. Logo + name lockup, centred as one unit ─────────────────────────────
  //
  // Both come from `site-settings`, so renaming the site or replacing the logo in
  // the CMS changes the card with no code edit — the owner's explicit requirement.
  // The logo sits to the LEFT of the name on the same line, and the pair is
  // centred together rather than each being centred independently, which would
  // leave the name visually off-centre by half the logo width.
  const LOGO = Math.round(SIZE_NAME * 1.15)
  const LOGO_GAP = 22
  const nameLayer = await textLayer(article.siteName, {
    size: SIZE_NAME,
    color: WHITE,
    width: W - MARGIN * 2 - LOGO - LOGO_GAP,
    weight: 700,
  })
  const nameSize = await layerSize(nameLayer)
  const nameInk = await inkExtent(nameLayer)
  const logo = article.logoUrl ? await logoLayer(article.logoUrl, LOGO) : null
  const logoInk = logo ? await inkExtent(logo) : { top: 0, height: 0 }

  const lockupW = nameSize.width + (logo ? LOGO + LOGO_GAP : 0)
  const lockupLeft = MARGIN + Math.max(0, Math.round((W - MARGIN * 2 - lockupW) / 2))

  /*
   * The lockup's ink height is the TALLER of the two *visible* extents, not of
   * their boxes. Both are then positioned so their own ink is vertically centred
   * inside that band — otherwise the name's line-box padding would push the logo
   * off-centre and the pair would read as misaligned.
   */
  const lockupInk = Math.max(nameInk.height, logo ? logoInk.height : 0)
  blocks.push({
    layers: [
      ...(logo
        ? [rel(logo, lockupLeft, Math.round((lockupInk - logoInk.height) / 2) - logoInk.top)]
        : []),
      rel(
        nameLayer,
        lockupLeft + (logo ? LOGO + LOGO_GAP : 0),
        Math.round((lockupInk - nameInk.height) / 2) - nameInk.top,
      ),
    ],
    inkHeight: lockupInk,
  })

  // ── 5. Date ────────────────────────────────────────────────────────────────
  if (article.publishedAt) {
    const date = formatBnBd(article.publishedAt, { day: 'numeric', month: 'long', year: 'numeric' })
    const dateLayer = await textLayer(date, {
      size: SIZE_DATE,
      color: '#BBBBBB',
      width: W - MARGIN * 2,
    })
    // `-ink.top` cancels the line-box padding above the first glyph, so the gap
    // measured on the card is the gap between visible text.
    const dateInk = await inkExtent(dateLayer)
    blocks.push({
      layers: [rel(dateLayer, await centreLeft(dateLayer, W, MARGIN), -dateInk.top)],
      inkHeight: dateInk.height,
    })
  }

  /*
   * ── Pass 2: distribute the free space and centre the stack ─────────────────
   *
   * The owner's requirement is even spacing on all four sides. Horizontally that
   * is `MARGIN`; vertically it is whatever is left over.
   *
   * ⚠️ **A text layer is taller than its ink.** Pango allocates a full line box —
   * ascent plus descent plus line gap — so a 96px name reports a layer height of
   * 115px while the glyphs themselves occupy 99px. Positioning by *layer* height
   * therefore produces gaps that look uneven even though the arithmetic is equal:
   * measured on the first balanced attempt, the four visual gaps came out
   * **139, 125, 130, 136px** — a 14px spread from line-box padding alone.
   *
   * So the stack is computed from the **ink heights**, with each text layer offset
   * inside its own band so its glyphs sit centred. What the reader sees as the gap
   * is then equal by construction, whatever the font's metrics happen to be.
   */
  const contentH = blocks.reduce((sum, b) => sum + b.inkHeight, 0)
  const gaps = Math.max(0, blocks.length - 1)

  /*
   * `H - 2 * MIN_V_PAD` is the space available once the outer padding floor is
   * honoured. Dividing the remainder across the gaps keeps every gap identical,
   * and the `%` remainder is re-added to the padding below rather than being lost
   * to rounding — otherwise the stack drifts up the canvas.
   */
  const perGap = gaps > 0 ? Math.min(Math.floor((H - MIN_V_PAD * 2 - contentH) / gaps), 90) : 0
  const blockGap = MIN_BLOCK_GAP + perGap
  const stackH = contentH + blockGap * gaps
  /*
   * Centred: the leftover after the stack is split evenly top and bottom. This is
   * the number that makes top and bottom padding match, and it is why the first
   * attempt — which floored the division — sat 12px high.
   */
  const vPad = Math.max(MIN_V_PAD, Math.round((H - stackH) / 2))

  let cursor = vPad
  for (const block of blocks) {
    for (const layer of block.layers) {
      layers.push({ ...layer, top: cursor + layer.top })
    }
    cursor += block.inkHeight + blockGap
  }

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
 * Cached result of the sharp probe below. `null` means "not probed yet".
 *
 * Module scope so the probe runs at most once per process. A card endpoint that
 * re-probed per request would recreate the very cost it exists to avoid.
 */
let sharpUsable: boolean | null = null

/**
 * Can libvips actually run in this process?
 *
 * ## Why this exists
 *
 * `isFontAvailable()` only checks that the font **file** exists, which it does in
 * production. So both card endpoints walked straight into `composeIdCard()` and
 * into sharp. On DianaHost sharp cannot load at all — libvips needs a worker per
 * core and the account cannot create a thread or fork, which is the same ceiling
 * documented in `.sps/tasks.md` → T-07. Measured on the live host before this
 * check existed:
 *
 *     GET /api/idcard/SHK-R-2026-0001.png     → HTTP 503 after 3.83s
 *     GET /api/photocard/27.png               → HTTP 503 after 3.68s
 *
 * Two seconds of nothing is not the whole problem. Reporter IDs are enumerable
 * (`SHK-R-YYYY-NNNN`) and the delay is spent inside libvips' own fork-retry path,
 * so **every request burns several seconds of a thread budget the host has already
 * been shown to run out of.** That is a CPU-exhaustion vector reachable by anyone
 * who can guess an ID, and the only thing standing behind it was a 503.
 *
 * The probe is one 1×1 render, cached forever after. A host that can render at all
 * answers in single-digit milliseconds; a host that cannot answers in seconds, once.
 *
 * @returns whether sharp produced a pixel buffer.
 */
export async function isSharpAvailable(): Promise<boolean> {
  if (sharpUsable !== null) return sharpUsable
  try {
    await sharp({
      create: { width: 1, height: 1, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toBuffer()
    sharpUsable = true
  } catch {
    sharpUsable = false
  }
  return sharpUsable
}

/**
 * The URL a reporter's QR encodes — the single place this is constructed.
 *
 * The card prints this as a QR and `/verify/[reporterId]` renders it; if the two
 * ever disagreed the card would scan to a 404 and a real credential would look
 * forged. Both sides build from `PUBLIC_SITE_URL` so they cannot drift.
 */
export function verifyUrlFor(reporterId: string): string {
  return `${siteOrigin()}/verify/${reporterId}`
}

/**
 * The site's public origin, from `PUBLIC_SITE_URL`, without a trailing slash.
 *
 * ## Why this is shared
 *
 * Three places need the public origin — the OAuth redirect builder, the CORS
 * allow-list, and the QR URLs printed on ID cards and photocards. Each had its
 * own inline `process.env.PUBLIC_SITE_URL || 'https://shikkha24.com'`, and the
 * photocard's copy was once **hardcoded to the domain**, so a card generated on
 * a staging host pointed at production. One helper means one place to change
 * when the domain changes, and one place to fall back.
 *
 * The fallback keeps the production domain rather than localhost: a missing
 * variable should fail toward the real site (cards that scan), never toward a
 * dead `localhost` URL baked into a permanent PNG.
 */
export function siteOrigin(): string {
  return (process.env.PUBLIC_SITE_URL || 'https://shikkha24.com').replace(/\/$/, '')
}

/**
 * An article's canonical public URL, as printed on the photocard's QR.
 *
 * Mirrors the frontend route shape in `frontend/src/pages/[category]/[id]/[slug].astro`:
 * `/<category>/<id>/<slug>`, falling back to `/a/<id>` when the article has no
 * category. A missing slug likewise shortens to `/a/<id>` rather than emitting a
 * trailing-slash URL.
 *
 * @param categorySlug - the article's category slug, or `undefined` if uncategorised
 * @param id - the article's numeric id
 * @param slug - the article's slug, or an empty string if unset
 */
export function articleUrlFor(
  categorySlug: string | undefined,
  id: number | string,
  slug: string,
): string {
  if (categorySlug && slug) return `${siteOrigin()}/${categorySlug}/${id}/${slug}`
  return `${siteOrigin()}/a/${id}`
}
