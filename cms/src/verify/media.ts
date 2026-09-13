/**
 * S9 media-pipeline verification — `pnpm --filter @shikkha24/cms verify:media`
 *
 * ## Why this runs through Payload's local API rather than over HTTP
 *
 * The three storage controls this section added all live in the **upload
 * pipeline**, not in a route:
 *
 *   1. the incoming file is converted to WebP *before it is written*, so no JPEG
 *      is ever retained
 *   2. the retained dimensions are capped, so a 6000px photo cannot sit on the disk
 *   3. a per-day byte cap rejects a burst day
 *
 * Nothing about that can be judged by looking at a page, and none of it is
 * reachable without an authenticated upload. Driving `payload.create` directly
 * exercises the real hooks and the real sharp conversion, with no login needed.
 *
 * ## It must run with the dev server STOPPED
 *
 * Both `payload run` and `next dev` push the schema against the same SQLite file.
 * The second one to start fails with `index ... already exists` — a documented
 * trap (`.sps/handoff.md`, S1 finding 5).
 *
 * Everything it creates is deleted at the end, files included.
 */
import { readdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { getPayload } from 'payload'
import sharp from 'sharp'

import config from '../payload.config'

const payload = await getPayload({ config })

let failures = 0
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`

/**
 * A large, photographic-ish JPEG.
 *
 * Flat colours compress to almost nothing, which would make the conversion
 * assertion meaningless — random bytes give a realistic worst case, and the
 * `resizeOptions` cap is what proves the dimension limit works.
 */
async function makeTestJpeg(width = 3000, height = 2000): Promise<Buffer> {
  const noise = Buffer.alloc(width * height * 3)
  for (let i = 0; i < noise.length; i += 1) noise[i] = Math.floor(Math.random() * 256)
  return sharp(noise, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 95 })
    .toBuffer()
}

const createdIds: Array<number | string> = []

/** Upload one file through the real collection pipeline. */
async function upload(name: string, buffer: Buffer) {
  const doc = await payload.create({
    collection: 'media',
    data: { alt: 'পরীক্ষামূলক ছবি' },
    file: { data: buffer, mimetype: 'image/jpeg', name, size: buffer.length },
    overrideAccess: true,
  })
  createdIds.push(doc.id)
  return doc
}

console.log('\n── media pipeline ──────────────────────────────────────────────')

const source = await makeTestJpeg()
console.log(`  source JPEG: ${mb(source.length)} (3000×2000)`)

const uploaded = await upload('s9-verify-large.jpg', source)

check(
  'the stored file is WebP, not the uploaded JPEG',
  uploaded.mimeType === 'image/webp',
  `mimeType=${uploaded.mimeType}`,
)
check(
  'the stored filename carries the .webp extension',
  typeof uploaded.filename === 'string' && uploaded.filename.endsWith('.webp'),
  `filename=${uploaded.filename}`,
)
check(
  'the original bytes were not retained',
  typeof uploaded.filesize === 'number' && uploaded.filesize < source.length * 0.5,
  `${mb(source.length)} → ${mb(uploaded.filesize ?? 0)}`,
)
check(
  'retained dimensions are capped at 2000px wide',
  uploaded.width === 2000,
  `width=${uploaded.width}`,
)

const sizes = (uploaded.sizes ?? {}) as Record<string, { mimeType?: string; filename?: string }>
for (const name of ['thumbnail', 'card', 'hero']) {
  const size = sizes[name]
  check(
    `the ${name} variant exists and is WebP`,
    Boolean(size) && size?.mimeType === 'image/webp',
    `mimeType=${size?.mimeType ?? 'missing'}`,
  )
}

// ── the per-day cap ──────────────────────────────────────────────────────────
console.log('\n── per-day upload cap ──────────────────────────────────────────')

// 1 KB: the first upload already exceeded it, so the next one must be refused.
process.env.MEDIA_DAILY_UPLOAD_CAP_BYTES = '1024'
let refused: string | null = null
try {
  await upload('s9-verify-over-cap.jpg', await makeTestJpeg(600, 400))
} catch (error) {
  refused = error instanceof Error ? error.message : String(error)
}
check(
  'an upload past the daily cap is refused',
  refused !== null,
  refused?.slice(0, 60) ?? 'accepted',
)

check(
  'the refusal message is Bengali and names the limit',
  Boolean(refused?.includes('আপলোডের সীমা')),
  refused ? refused.slice(0, 40) : '',
)

// Restore, and prove the cap was the cause rather than a MIME rejection.
process.env.MEDIA_DAILY_UPLOAD_CAP_BYTES = '0'
const afterReset = await upload('s9-verify-after-reset.jpg', await makeTestJpeg(600, 400))
check('with the cap disabled the same upload succeeds', Boolean(afterReset?.id))

// ── validation still holds ───────────────────────────────────────────────────
console.log('\n── validation ──────────────────────────────────────────────────')

let badType: string | null = null
try {
  await payload.create({
    collection: 'media',
    data: { alt: 'খারাপ ফাইল' },
    file: {
      data: Buffer.from('<script>alert(1)</script>'),
      mimetype: 'text/html',
      name: 'evil.html',
      size: 25,
    },
    overrideAccess: true,
  })
} catch (error) {
  badType = error instanceof Error ? error.message : String(error)
}
check(
  'a non-image upload is rejected on MIME',
  badType !== null,
  badType?.slice(0, 50) ?? 'accepted',
)

// ── cleanup ──────────────────────────────────────────────────────────────────
console.log('\n── cleanup ─────────────────────────────────────────────────────')

for (const id of createdIds) {
  await payload.delete({ collection: 'media', id, overrideAccess: true }).catch(() => null)
}
const remaining = await payload.count({ collection: 'media', overrideAccess: true })
check(
  'every test document was removed',
  remaining.totalDocs === 0,
  `remaining=${remaining.totalDocs}`,
)

// Files are deleted with the document, but a failed run could leave strays.
const dir = path.resolve(process.cwd(), process.env.MEDIA_UPLOAD_DIR || './data/media')
let strays: string[] = []
try {
  strays = readdirSync(dir).filter((name) => name.startsWith('s9-verify-'))
} catch {
  strays = []
}
for (const stray of strays) rmSync(path.join(dir, stray), { force: true })
check('no stray test files were left on disk', strays.length === 0, strays.join(', '))

console.log(`\n${failures === 0 ? '✅ all checks passed' : `❌ ${failures} check(s) failed`}\n`)
process.exit(failures === 0 ? 0 : 1)
