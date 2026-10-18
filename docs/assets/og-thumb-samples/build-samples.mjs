/**
 * Build sample mockups for the white-background article-news thumbnail
 * (T-57): logo + publication name, current single-row layout vs the
 * owner-proposed "two columns, centred" layout, on 16:9 and 1:1 canvases.
 *
 * ## Why shaped Bengali text comes from librsvg, not PIL
 *
 * PIL has no raqm here, so it cannot shape conjuncts; libvips renders SVG
 * <text> through librsvg/Pango, which applies HarfBuzz shaping with the
 * SolaimanLipi font pointed at it via a private FONTCONFIG_FILE. The script
 * asserts shaping numerically (a shaped ক্ষা must be narrower than the
 * hasanta-separated run) so a silently-wrong render cannot ship.
 *
 * Run from anywhere; paths are absolute. Out: this folder's PNGs +
 * samples-contact-sheet.png. Safe to re-run; overwrites its own outputs only.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const ROOT = '/Volumes/SSD/CODES/NewsPortal'
const OUT = path.join(ROOT, 'docs/assets/og-thumb-samples')
// Fonts are referenced in place from the existing font-fix batch (tracked
// already); nothing is copied, so licence files stay in exactly one place.
const FONTS_DIR = path.join(ROOT, 'editorial/font-fix')
const LOGO_SVG = path.join(OUT, 'shikkha24-logo.svg')
const BRAND_RED = '#d21209'
const NAME = 'শিক্ষা২৪.কম'

// Private fontconfig so Pango finds SolaimanLipi without touching user fonts.
fs.mkdirSync(OUT, { recursive: true })
const FONTS_CONF = path.join(OUT, 'fonts.conf')
fs.writeFileSync(
  FONTS_CONF,
  `<?xml version="1.0"?>\n<fontconfig><dir>${FONTS_DIR}</dir><cachedir>${path.join(OUT, '.fc-cache')}</cachedir></fontconfig>\n`,
)
process.env.FONTCONFIG_FILE = FONTS_CONF

const req = createRequire(path.join(ROOT, 'cms', 'package.json'))
const sharp = req('sharp')

/** Render an SVG, flatten onto white, return {w,h,crop} of the ink region. */
async function svgInk(svgBuffer) {
  const img = sharp(svgBuffer)
  const meta = await img.metadata()
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) throw new Error('rendered SVG has no ink (font likely missing)')
  return {
    pageW: info.width, pageH: info.height,
    w: maxX - minX + 1, h: maxY - minY + 1, left: minX, top: minY, meta,
  }
}

/** Typeset the name at `size`px on a transparent page, return ink metrics. */
async function nameInk(size) {
  const png = await sharp(Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size * 12}" height="${size * 3}">` +
    `<text x="${size}" y="${size * 2}" font-family="SolaimanLipi" font-weight="700" font-size="${size}" fill="${BRAND_RED}">${NAME}</text></svg>`,
  )).png().toBuffer()
  const ink = await svgInk(png)
  // tight ink-only crop — composite inputs must never exceed the canvas
  const buf = await sharp(png)
    .extract({ left: ink.left, top: ink.top, width: ink.w, height: ink.h })
    .png().toBuffer()
  return { buf, w: ink.w, h: ink.h }
}

/** The logo mark rasterised at `px` (white rounded card red glyph). */
async function logoMark(px) {
  return sharp(LOGO_SVG).resize(px, px).png().toBuffer()
}

async function main() {
  // ── shaping proof: the conjunct must be far narrower than its glyphs
  // rendered as independent text runs (independent runs can never shape
  // across node boundaries, so their sum is the unshaped ceiling) ─────────
  const measure = async (text) => svgInk(Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="700">` +
    `<text x="40" y="450" font-family="SolaimanLipi, Noto Sans Bengali, sans-serif" font-weight="700" font-size="300" fill="#000">${text}</text></svg>`,
  ))
  const shaped = await measure('ক্ষা')
  const parts = ['ক', '্', 'ষ', 'া']
  const widths = []
  for (const p of parts) widths.push((await measure(p)).w)
  const sum = widths.reduce((a, b) => a + b, 0)
  console.log(`shaping check: conjunct ${shaped.w}px vs independent-glyph sum ${sum}px (${widths.join('+')})`)
  if (shaped.w > 0.75 * sum) throw new Error('shaping looks inactive — conjunct not narrower than its parts')
  console.log('SHAPING OK')

  // ── pick a name size that fits each layout, render crisp at that size ──
  const fit = async (want) => {
    const probe = await nameInk(100)
    const per = probe.w / 100
    return Math.max(20, Math.floor(want / per))
  }

  fs.copyFileSync('/tmp/logo.svg', LOGO_SVG)
  const out = {}

  // S1 — two columns centred on a 1200×630 canvas, content inside the central
  // 630×630 square (the zone a 1:1 crop keeps), so nothing can be cut.
  {
    const W = 1200, H = 630, sq = 630
    const x0 = Math.round((W - sq) / 2)
    const markPx = 150, gap = 44
    const usable = sq - 72 - markPx - gap
    const fontSize = await fit(usable)
    const t = await nameInk(fontSize)
    const mark = await logoMark(markPx)
    const total = markPx + gap + t.w
    const cx = Math.round((W - total) / 2), cy = Math.round(H / 2)
    const mTop = Math.round(cy - markPx / 2)
    const tTop = Math.round(cy - t.h / 2)
    out.s1 = await sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } })
      .composite([
        { input: mark, left: cx, top: mTop },
        { input: t.buf, left: cx + markPx + gap, top: tTop },
      ]).jpeg({ quality: 92 }).toFile(path.join(OUT, 'S1-two-col-1200x630.jpg'))
    console.log('S1', out.s1, `markTop=${mTop} textTop=${tTop} total=${total} font=${fontSize}`)
  }

  // S2 — the same two-column arrangement on a native 1200×1200 (1:1) canvas.
  {
    const W = 1200, H = 1200
    const markPx = 280, gap = 64, usable = 960 - markPx - gap
    const fontSize = await fit(usable)
    const t = await nameInk(fontSize)
    const mark = await logoMark(markPx)
    const total = markPx + gap + t.w
    const cx = Math.round((W - total) / 2), cy = Math.round(H / 2)
    const mTop = Math.round(cy - markPx / 2)
    const tTop = Math.round(cy - t.h / 2)
    out.s2 = await sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } })
      .composite([
        { input: mark, left: cx, top: mTop },
        { input: t.buf, left: cx + markPx + gap, top: tTop },
      ]).jpeg({ quality: 92 }).toFile(path.join(OUT, 'S2-two-col-1200x1200.jpg'))
    console.log('S2', out.s2, `font=${fontSize}`)
  }

  // S3 — alternative: logo stacked above the name (compare against S1/S2).
  {
    const W = 1200, H = 1200
    const markPx = 340
    const fontSize = await fit(880)
    const t = await nameInk(fontSize)
    const mark = await logoMark(markPx)
    const gap = Math.round(H * 0.06)
    const block = markPx + gap + t.h
    const y0 = Math.round((H - block) / 2)
    out.s3 = await sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } })
      .composite([
        { input: mark, left: Math.round((W - markPx) / 2), top: y0 },
        { input: t.buf, left: Math.round((W - t.w) / 2), top: y0 + markPx + gap },
      ]).jpeg({ quality: 92 }).toFile(path.join(OUT, 'S3-stacked-1200x1200.jpg'))
    console.log('S3', out.s3, `font=${fontSize}`)
  }

  // V0 — the CURRENT pattern recreated (one wide row) + its centre 1:1 crop,
  // so the owner sees the exact complaint demonstrated on real geometry.
  {
    const W = 1200, H = 630
    const markPx = 120
    const fontSize = await fit(560)
    const t = await nameInk(fontSize)
    const mark = await logoMark(markPx)
    const total = markPx + 40 + t.w
    const cx = Math.round((W - total) / 2), cy = Math.round(H / 2)
    const base = sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } })
      .composite([
        { input: mark, left: cx, top: Math.round(cy - markPx / 2) },
        { input: t.buf, left: cx + markPx + 40, top: Math.round(cy - t.h / 2) },
      ])
    const baseBuf = await base.png().toBuffer()
    await sharp(baseBuf).jpeg({ quality: 92 }).toFile(path.join(OUT, 'V0-row-recreation-1200x630.jpg'))
    const crop = await sharp(baseBuf).extract({ left: Math.round((W - H) / 2), top: 0, width: H, height: H })
      .jpeg({ quality: 92 }).toFile(path.join(OUT, 'V0-its-1to1-centre-crop-630.jpg'))
    console.log('V0', crop)
  }

  // ── contact sheet 2×2 with Bengali captions ─────────────────────────────
  const cells = [
    ['V0-its-1to1-centre-crop-630.jpg', 'বর্তমান ধাঁচ (১ সারি) → ১:১ ক্রপে কাটা পড়ছে'],
    ['S1-two-col-1200x630.jpg', 'প্রস্তাব ১: দুই-কলাম, কেন্দ্রে (১২০০×৬৩০)'],
    ['S2-two-col-1200x1200.jpg', 'প্রস্তাব ২: একই বিন্যাস, নেটিভ ১:১ (১২০০×১২০০)'],
    ['S3-stacked-1200x1200.jpg', 'বিকল্প: উপরে লোগো, নিচে নাম (১:১)'],
  ]
  const CELL = 560, CAP = 110, PAD = 24
  const sheetW = PAD * 3 + CELL * 2
  const sheetH = PAD * 3 + (CELL + CAP) * 2
  const comps = []
  for (let i = 0; i < cells.length; i++) {
    const [file, label] = cells[i]
    const col = i % 2, row = Math.floor(i / 2)
    const x = PAD + col * (CELL + PAD), y = PAD + row * (CELL + CAP + PAD)
    const thumb = await sharp(path.join(OUT, file)).resize(CELL, CELL, { fit: 'contain', background: '#ffffff' }).png().toBuffer()
    comps.push({ input: thumb, left: x, top: y })
    comps.push({
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL}" height="${CAP}">` +
        `<rect width="100%" height="100%" fill="#ffffff"/>` +
        `<text x="${CELL / 2}" y="${CAP * 0.55}" font-family="SolaimanLipi" font-weight="400" font-size="40" fill="#1a1a1a" text-anchor="middle">${label}</text></svg>`,
      ),
      left: x, top: y + CELL,
    })
  }
  await sharp({ create: { width: sheetW, height: sheetH, channels: 3, background: '#f2f2f2' } })
    .composite(comps).png().toFile(path.join(OUT, 'samples-contact-sheet.png'))
  console.log('contact sheet written', sheetW, 'x', sheetH)
}

await main()
// machine-specific runners are regenerated on demand, never committed
fs.rmSync(FONTS_CONF, { force: true })
fs.rmSync(path.join(OUT, '.fc-cache'), { recursive: true, force: true })
console.log('DONE')
