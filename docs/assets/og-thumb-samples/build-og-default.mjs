/**
 * Rebuild the site-wide share image `frontend/public/og-default.png` (T-59).
 *
 * Owner decision 2026-10-18: the old full-bleed red plate is replaced by the
 * T-57 stacked design (white background, logo above, name below) so the
 * homepage — and every page without its own image — shares the same brand
 * look as the new article thumbnails.
 *
 * Geometry: 1200×630 with all content inside the central 640-wide square-safe
 * zone, because WhatsApp-style square crops must not cut logo or name.
 * Fonts render through librsvg/Pango (shaping-correct); see
 * ./build-samples.mjs for the shaping proof.
 *
 * Run: node docs/assets/og-thumb-samples/build-og-default.mjs
 * Out: frontend/public/og-default.png (PNG, flat colours).
 */
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const ROOT = '/Volumes/SSD/CODES/NewsPortal'
const OUT = path.join(ROOT, 'docs/assets/og-thumb-samples')
const FONTS_DIR = path.join(ROOT, 'editorial/font-fix')
const DEST = path.join(ROOT, 'frontend/public/og-default.png')
const LOGO_SVG = path.join(OUT, 'shikkha24-logo.svg')
const BRAND_RED = '#d21209'
const NAME = 'শিক্ষা২৪.কম'

const FONTS_CONF = path.join(OUT, 'fonts.conf')
fs.writeFileSync(
  FONTS_CONF,
  `<?xml version="1.0"?>\n<fontconfig><dir>${FONTS_DIR}</dir><cachedir>${path.join(OUT, '.fc-cache')}</cachedir></fontconfig>\n`,
)
process.env.FONTCONFIG_FILE = FONTS_CONF

const req = createRequire(path.join(ROOT, 'cms', 'package.json'))
const sharp = req('sharp')

/** Typeset the name at `size`px; return ink metrics + tight-cropped buffer. */
async function nameInk(size) {
  const png = await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size * 12}" height="${size * 3}">` +
        `<text x="${size}" y="${size * 2}" font-family="SolaimanLipi" font-weight="700" font-size="${size}" fill="${BRAND_RED}">${NAME}</text></svg>`,
    ),
  )
    .png()
    .toBuffer()
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let minX = info.width,
    minY = info.height,
    maxX = -1,
    maxY = -1
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
  if (maxX < 0) throw new Error('name rendered empty — font missing?')
  return {
    buf: await sharp(png)
      .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
      .png()
      .toBuffer(),
    w: maxX - minX + 1,
    h: maxY - minY + 1,
  }
}

async function main() {
  const W = 1200,
    H = 630
  // Square-safe zone keeps every share-crop (1:1, 4:5) inside the picture.
  const safeW = 640
  const markPx = 292,
    gap = 52

  // Name width must also fit the same zone at the chosen height.
  const probe = await nameInk(100)
  const fontSize = Math.max(20, Math.floor((safeW - 48) / (probe.w / 100)))
  const t = await nameInk(fontSize)
  const mark = await sharp(LOGO_SVG).resize(markPx, markPx).png().toBuffer()

  const block = markPx + gap + t.h
  const y0 = Math.round((H - block) / 2)
  const tLeft = Math.round((W - t.w) / 2)
  const mLeft = Math.round((W - markPx) / 2)

  await sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } })
    .composite([
      { input: mark, left: mLeft, top: y0 },
      { input: t.buf, left: tLeft, top: y0 + markPx + gap },
    ])
    .png()
    .toFile(DEST)
  console.log(`written ${DEST} (font=${fontSize}, text=${t.w}x${t.h}, block=${block}px)`)
}

await main()
fs.rmSync(FONTS_CONF, { force: true })
fs.rmSync(path.join(OUT, '.fc-cache'), { recursive: true, force: true })
console.log('DONE')
