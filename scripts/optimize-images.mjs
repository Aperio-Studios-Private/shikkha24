#!/usr/bin/env node
/**
 * optimize-images.mjs — pre-encode images before they are uploaded to the CMS.
 *
 * ## Why this exists
 *
 * The CMS **cannot generate image variants at all**. DianaHost's account cannot
 * create a thread or fork a process, so `sharp` fails to load there and every
 * upload that would resize ends in `503` (T-07; the reasoning is recorded at
 * `cms/src/payload.config.ts:506`). `Media.ts` therefore configures no
 * `imageSizes` and no `formatOptions`, which means `media.sizes` comes back `[]`
 * on every document.
 *
 * `frontend/src/lib/media.ts` then does exactly the right thing with what it has —
 * but with zero variants its `buildSrcset` returns `undefined`, so the browser is
 * handed **one full-size JPEG** no matter how small the slot is. Measured on the
 * 2026-10-16 batch: six covers, **971 KB**, every one a 1376 px source rendered
 * into a **412 px** mobile viewport. Lighthouse reported the same thing from the
 * outside — `modern-image-formats` **0** (360 KiB saveable) and
 * `uses-responsive-images` **0** (525 KiB saveable).
 *
 * That also breaks this project's own rule (`docs/image-optimization.md` §1:
 * *"AVIF first, WebP second"*, *"No JPEG ships"*, *"[n]ever ship a source wider
 * than the largest declared width"*).
 *
 * So the variants have to exist **before** the bytes reach the host. This script
 * produces them here, where sharp works, and names them the way the CMS and the
 * `srcset` builder expect.
 *
 * ## Why sharp and not cwebp/avifenc
 *
 * Those two give the same result and were used to derive the numbers below, but
 * they are Homebrew binaries — absent in CI and not a declared dependency, so a
 * script built on them would work on one machine and fail everywhere else. `sharp`
 * is already a dependency of both workspaces (Astro uses it), needs no new
 * licence review, and is portable.
 *
 * ⚠️ `sharp.format.avif` reads **false** in this build while AVIF encoding
 * nevertheless succeeds. Do not gate on that flag — it is a capability probe, not
 * an availability check. Ask for the encode and handle the failure.
 *
 * ## Quality settings
 *
 * Taken from `docs/image-optimization.md` (AVIF 50–70, WebP 75–90). Chosen by
 * measuring PSNR against the original on our own cover, rather than by taste:
 *
 *   | output        | size    | PSNR     |
 *   |---------------|---------|----------|
 *   | JPEG 1376 px  | 217.6KB | —        |
 *   | WebP q82 412  | 20.2KB  | 30.51 dB |
 *   | AVIF q50 412  | 14.5KB  | 33.18 dB |
 *
 * AVIF q50 wins on both axes — 28% smaller *and* +2.7 dB — which is what makes it
 * the primary format rather than a nice-to-have. Above ~30 dB is near-lossless for
 * photographic material, and later versions of this repo's own covers are
 * illustrations, where the margin is wider still.
 *
 * Usage:
 *   node scripts/optimize-images.mjs <input-dir> <output-dir>
 *   node scripts/optimize-images.mjs <input-dir> <output-dir> --widths 412,800
 */

import { mkdir, readdir, stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { basename, extname, join, resolve } from 'node:path'

// sharp lives in the workspace node_modules, not at the repo root, so resolve it
// from `frontend/` rather than relying on the caller's cwd.
const require = createRequire(join(import.meta.dirname, '../frontend/package.json'))
const sharp = require('sharp')

/**
 * The widths `frontend/src/lib/media.ts` and the card CSS actually render at.
 *
 * 412 px is the mobile viewport the performance budget is measured at; 800 px
 * covers the small-tablet and desktop card slots. A third, larger variant is
 * deliberately absent: no template renders a cover wider than 800 px, and
 * `docs/image-optimization.md` warns specifically against shipping a source wider
 * than anything that displays it.
 */
const DEFAULT_WIDTHS = [412, 800]

/** From `docs/image-optimization.md`. AVIF first, WebP as the fallback. */
const AVIF_QUALITY = 50
const WEBP_QUALITY = 82

/** Input extensions worth processing. SVG and GIF are already optimal or animated. */
const SOURCE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tiff'])

/** Human-readable byte size, for the report. */
function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

/** Label for the smallest variant — the one a phone on 4G actually fetches. */
function smallestLabel(entry) {
  return entry ? `${entry.file} ${kb(entry.bytes)}` : 'n/a'
}

/**
 * Parse `--widths 412,800` into a validated, ascending list.
 *
 * @param {string[]} argv
 * @returns {number[]}
 */
function parseWidths(argv) {
  const flag = argv.indexOf('--widths')
  if (flag === -1) return DEFAULT_WIDTHS

  const parsed = (argv[flag + 1] ?? '')
    .split(',')
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isFinite(value) && value > 0)

  if (parsed.length === 0) {
    throw new Error('--widths needs at least one positive number, e.g. --widths 412,800')
  }
  return [...new Set(parsed)].sort((a, b) => a - b)
}

/**
 * Encode one source into AVIF + WebP at every requested width.
 *
 * AVIF and WebP are attempted independently: if this sharp build genuinely cannot
 * encode AVIF, the WebP output is still worth having, and the caller is told which
 * one failed rather than losing the whole run.
 *
 * @param {string} sourcePath
 * @param {string} outputDir
 * @param {number[]} widths
 * @returns {Promise<{written: Array<{file: string, bytes: number}>, failed: string[]}>}
 */
async function optimize(sourcePath, outputDir, widths) {
  const stem = basename(sourcePath, extname(sourcePath))
  const written = []
  const failed = []

  for (const width of widths) {
    // `withoutEnlargement` matters: a source narrower than a requested width must
    // not be upscaled into a heavy file that claims a size it never had.
    const base = sharp(sourcePath).rotate().resize({ width, withoutEnlargement: true })
    const meta = await base.metadata().catch(() => null)
    if (!meta?.width) {
      failed.push(`${stem}@${width} (unreadable)`)
      continue
    }

    for (const [format, quality] of [
      ['avif', AVIF_QUALITY],
      ['webp', WEBP_QUALITY],
    ]) {
      const file = join(outputDir, `${stem}-${width}.${format}`)
      try {
        // Re-create the pipeline per format: a sharp instance is consumed by
        // `toFile`, so reusing one across encoders yields an empty stream.
        const info = await sharp(sourcePath)
          .rotate()
          .resize({ width, withoutEnlargement: true })
          .toFormat(format, { quality })
          .toFile(file)
        written.push({ file: basename(file), bytes: info.size })
      } catch (error) {
        failed.push(`${stem}@${width}.${format}: ${error.message}`)
      }
    }
  }

  return { written, failed }
}

// ── main ───────────────────────────────────────────────────────────────────
const [inputArg, outputArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
if (!inputArg || !outputArg) {
  console.error(
    'Usage: node scripts/optimize-images.mjs <input-dir> <output-dir> [--widths 412,800]',
  )
  process.exit(1)
}

const inputDir = resolve(inputArg)
const outputDir = resolve(outputArg)
const widths = parseWidths(process.argv)

const inputStat = await stat(inputDir).catch(() => null)
if (!inputStat?.isDirectory()) {
  console.error(`Not a directory: ${inputDir}`)
  process.exit(1)
}
await mkdir(outputDir, { recursive: true })

const entries = await readdir(inputDir)
const sources = entries.filter((name) => SOURCE_EXTENSIONS.has(extname(name).toLowerCase())).sort()

if (sources.length === 0) {
  console.log(`No processable images in ${inputDir}`)
  process.exit(0)
}

console.log(`Optimizing ${sources.length} image(s) at widths ${widths.join(', ')} px`)
console.log(`  AVIF q${AVIF_QUALITY} (primary) + WebP q${WEBP_QUALITY} (fallback)\n`)

let totalOut = 0
const allFailed = []

for (const name of sources) {
  const sourcePath = join(inputDir, name)
  const sourceBytes = (await stat(sourcePath)).size
  const { written, failed } = await optimize(sourcePath, outputDir, widths)

  // The smallest output is what a phone on the 4G profile actually fetches, so it
  // is the honest comparison to show against the original.
  const smallest = written.reduce(
    (min, entry) => (min === null || entry.bytes < min.bytes ? entry : min),
    null,
  )
  const outBytes = written.reduce((sum, entry) => sum + entry.bytes, 0)
  totalOut += outBytes
  allFailed.push(...failed)

  const saving = smallest ? Math.round((1 - smallest.bytes / sourceBytes) * 100) : 0
  console.log(`${name}`)
  console.log(
    `  ${kb(sourceBytes)} → ${written.length} variant(s), smallest ${smallestLabel(smallest)} (${saving}% smaller than source)`,
  )
  for (const entry of written) console.log(`    ${entry.file.padEnd(52)} ${kb(entry.bytes)}`)
}

console.log(`\nWrote ${totalOut} bytes across all variants`)
if (allFailed.length > 0) {
  console.error(`\n${allFailed.length} encode(s) failed:`)
  for (const failure of allFailed) console.error(`  ${failure}`)
  process.exit(1)
}
console.log(`Done. Upload from: ${outputDir}`)
