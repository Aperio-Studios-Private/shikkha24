/**
 * Restore the six `demo-plate-7…12.webp` visuals to the CMS media library.
 *
 * ## Why this exists
 *
 * Those six files were uploaded on 2026-10-04 and their bytes were later lost from
 * the server's disk — `/api/media/file/demo-plate-N.webp` returns **500** for every
 * one of them, while the database records are intact. I first recorded that as
 * harmless ("nothing references them"), which was wrong: the owner identified them
 * as real editorial visuals — a ministry press conference, an annual sports day, a
 * teacher in a classroom, students in a library, a science-fair project, and so on.
 * The captions came from the owner.
 *
 * The bytes were never actually lost *here*: `cms/data/media/` holds the originals,
 * 1600x1067 WebP, ~11 KB each. So the recovery is a re-upload, not an
 * unrecoverable loss.
 *
 * ## The upload shape
 *
 * ⚠️ **Text fields must travel inside a single `_payload` JSON part — not as
 * separate multipart fields.** An earlier note in this repo blamed the host proxy
 * for "dropping" them. That was a misdiagnosis: Payload simply does not read
 * `alt`/`credit` as their own parts. With `form.append('alt', …)` the file uploads
 * and only the text is lost, which returns `400 Alt text is required` and looks
 * exactly like a proxy stripping fields. Sending `_payload` returns 201.
 *
 * ## Idempotency
 *
 * The library is searched by filename first. If a record exists **and its file
 * serves**, it is only re-tagged. If the record exists but the file is missing
 * (HTTP 500 — the actual situation here), the record is **replaced**: deleted, then
 * re-uploaded so Payload writes the bytes to disk again.
 *
 * ⚠️ **A PATCH is not enough, and this was verified rather than assumed.** Patching
 * an existing record updates the database row — after the first run the rows
 * correctly claimed `13482 B` etc. — but Payload never re-writes the file, so
 * `/api/media/file/...` kept returning **500**. Only a fresh upload creates the
 * bytes. Checking the *record* would have looked like success; only fetching the
 * *file* exposed it.
 *
 * Run: `node scripts/restore-demo-plates.mjs [--dry-run]`
 */

import { existsSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const CMS = process.env.CMS_URL || 'https://cms.shikkha24.com'
const DRY = process.argv.includes('--dry-run')

/**
 * Reads a `KEY=value` env file without pulling in a dotenv dependency.
 *
 * @param path absolute path to the env file.
 * @returns a map of the keys found; an empty object when the file is absent.
 */
function readEnv(path) {
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

const env = { ...readEnv(join(ROOT, 'cms/.env.local')), ...process.env }

/**
 * The six plates, with the captions the owner supplied verbatim.
 *
 * `alt` is the owner's Bengali line. `credit` follows the project's mandatory
 * house rule for AI imagery (`চিত্র: AI`), the same string already carried by the
 * six article covers.
 */
const PLATES = [
  { file: 'demo-plate-7.webp', alt: 'শিক্ষা মন্ত্রণালয়ের সংবাদ সম্মেলন' },
  { file: 'demo-plate-8.webp', alt: 'বিজ্ঞান মেলায় শিক্ষার্থীর প্রকল্প উপস্থাপনা' },
  { file: 'demo-plate-9.webp', alt: 'গ্রন্থাগারে পড়াশোনারত শিক্ষার্থীরা' },
  { file: 'demo-plate-10.webp', alt: 'শ্রেণিকক্ষে শিক্ষকের পাঠদান' },
  { file: 'demo-plate-11.webp', alt: 'বার্ষিক ক্রীড়া প্রতিযোগিতার দৃশ্য' },
  { file: 'demo-plate-12.webp', alt: 'শিক্ষা মন্ত্রণালয়ের সংবাদ সম্মেলন' },
]

async function login() {
  const res = await fetch(`${CMS}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: env.CMS_ADMIN_EMAIL, password: env.CMS_ADMIN_PASSWORD }),
  })
  if (!res.ok) throw new Error(`login failed: HTTP ${res.status}`)
  const { token } = await res.json()
  if (!token) throw new Error('login returned no token')
  return token
}

async function findByName(token, filename) {
  const q = new URLSearchParams({ 'where[filename][equals]': filename, limit: '1' })
  const res = await fetch(`${CMS}/api/media?${q}`, { headers: { Authorization: `JWT ${token}` } })
  if (!res.ok) throw new Error(`lookup failed for ${filename}: HTTP ${res.status}`)
  return (await res.json()).docs?.[0]
}

async function upload(token, plate) {
  const path = join(ROOT, 'cms/data/media', plate.file)
  const bytes = await readFile(path)

  const form = new FormData()
  form.append('file', new Blob([bytes], { type: 'image/webp' }), plate.file)
  // ⚠️ One JSON part. See the header — separate `alt`/`credit` parts silently lose
  // the text and return 400.
  form.append('_payload', JSON.stringify({ alt: plate.alt, credit: 'চিত্র: AI' }))

  const res = await fetch(`${CMS}/api/media`, {
    method: 'POST',
    headers: { Authorization: `JWT ${token}` },
    body: form,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      `upload failed for ${plate.file}: HTTP ${res.status} ${JSON.stringify(body).slice(0, 160)}`,
    )
  }
  return body.doc
}

/**
 * Does the file behind a media record actually serve?
 *
 * This is the only honest test. A record can exist, carry the right filename,
 * filesize and dimensions, and still describe bytes that are not on disk — which is
 * precisely the state these six were in.
 *
 * @param doc a media record, used for its `url`.
 * @returns true when the file endpoint returns 200.
 */
async function fileServes(doc) {
  const url = doc?.url ? `${CMS}${doc.url}` : `${CMS}/api/media/file/${doc?.filename}`
  const res = await fetch(url, { method: 'HEAD' })
  return res.ok
}

async function patch(token, id, plate) {
  const res = await fetch(`${CMS}/api/media/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ alt: plate.alt, credit: 'চিত্র: AI' }),
  })
  if (!res.ok) throw new Error(`patch failed for id ${id}: HTTP ${res.status}`)
  return (await res.json()).doc
}

/**
 * Replace a record whose file is gone: delete it, then upload it afresh.
 *
 * Deleting first matters — Payload keys stored files by filename, so uploading a
 * file that a record already points at can be treated as a duplicate. Removing the
 * record first guarantees the write happens.
 *
 * @returns the newly created media record.
 */
async function replace(token, id, plate) {
  const res = await fetch(`${CMS}/api/media/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `JWT ${token}` },
  })
  if (!res.ok) throw new Error(`delete failed for id ${id}: HTTP ${res.status}`)
  return upload(token, plate)
}

const token = DRY ? null : await login()
console.log(`${DRY ? '[dry-run] ' : ''}CMS ${CMS}\n`)

let created = 0
let replaced = 0
let retagged = 0
for (const plate of PLATES) {
  const path = join(ROOT, 'cms/data/media', plate.file)
  if (!existsSync(path)) {
    console.log(`  MISSING SOURCE  ${plate.file}`)
    continue
  }
  if (DRY) {
    const existing = await findByName(token, plate.file)
    console.log(`  ${existing ? 'exists' : 'new   '}  ${plate.file}  alt=${plate.alt}`)
    continue
  }
  const existing = await findByName(token, plate.file)
  if (existing && (await fileServes(existing))) {
    await patch(token, existing.id, plate)
    console.log(`  retagged  id=${existing.id}  ${plate.file}`)
    retagged++
  } else if (existing) {
    const doc = await replace(token, existing.id, plate)
    console.log(`  replaced  was id=${existing.id} → id=${doc.id}  ${plate.file}  (file was 500)`)
    replaced++
  } else {
    const doc = await upload(token, plate)
    console.log(`  uploaded  id=${doc.id}  ${plate.file}`)
    created++
  }
}

if (DRY) {
  console.log(`\n[dry-run] ${PLATES.length} plate(s) inspected. Nothing sent.`)
} else {
  console.log(`\n${created} uploaded, ${replaced} replaced, ${retagged} retagged.`)
}
