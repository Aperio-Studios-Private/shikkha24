/**
 * T-18 P4 Option A — one-off data repair on Neon before the first storefront
 * build that reads it. Throwaway probe (T-77 pattern): deleted after the run.
 *
 * The Postgres migration renumbered every row (SQLite rowids → Postgres
 * serials). Relationship FIELDS were remapped via the old→new idMap during
 * import, but URLs written INSIDE lexical rich-text bodies are plain text the
 * import could not see. The weekly-digest article's body links to six
 * articles by their OLD ids (/admission/23/… etc.), which on Neon now resolve
 * to nothing — the storefront link checker correctly fails the deploy.
 *
 * Mapping (old DianaHost id → new Neon id), verified by slug equality:
 *   23→10 admission-policy-2027        24→9  45th-bcs-appointment-notice
 *   25→8  madrasah-scholarship-…2026   26→7  nu-masters-admission-2024-25
 *   27→6  hsc-result-2026-possible-…   28→5  ju-admission-exam-2026-27
 *
 * Also fixes institution 1 (জাতীয় বিশ্ববিদ্যালয়), whose `website` is stored
 * WITHOUT a scheme ("www.nu.ac.bd") — the institutions template writes it
 * straight into href, so the built page carries a same-origin relative link
 * that resolves to nothing. Pre-existing on DianaHost production too (the
 * Apache site just never checked). https:// is prepended; the Bengali slug is
 * left alone — it is the production identity, the storefront already encodes
 * it consistently.
 *
 * Idempotent: re-running finds nothing left to change.
 */

import fs from 'node:fs'
import { Client } from 'pg'

const envText = fs.readFileSync('/Volumes/SSD/CODES/NewsPortal/.env.local', 'utf8')
const neonUrl = envText
  .match(/^DATABASE_URL=(.*)$/m)[1]
  .trim()
  .replace(/"/g, '')

const ID_MAP = {
  23: 10,
  24: 9,
  25: 8,
  26: 7,
  27: 6,
  28: 5,
}

const client = new Client({ connectionString: neonUrl })
await client.connect()

// ── 1. Rewrite old-id article links inside lexical bodies ────────────────────
const { rows } = await client.query(`SELECT id, slug, body FROM articles`)
let changedArticles = 0
for (const row of rows) {
  const original = JSON.stringify(row.body ?? {})
  let updated = original
  for (const [oldId, newId] of Object.entries(ID_MAP)) {
    // The storefront route is /:category/:id/:slug — only the id segment is
    // rewritten; the slug part already matches the target article.
    updated = updated.replaceAll(
      new RegExp(
        `(/(?:admission|university|scholarship|education-news|jobs-career)/)${oldId}(/)`,
        'g',
      ),
      `$1${newId}$2`,
    )
  }
  if (updated !== original) {
    await client.query(`UPDATE articles SET body = $1 WHERE id = $2`, [updated, row.id])
    changedArticles += 1
    console.log(`article ${row.id} (${row.slug}): body links rewritten`)
  }
}
console.log(`articles changed: ${changedArticles}`)

// ── 2. Give institution 1's website a scheme ─────────────────────────────────
const { rows: inst } = await client.query(
  `SELECT id, website FROM institutions WHERE website IS NOT NULL AND website NOT LIKE 'http%'`,
)
for (const row of inst) {
  const fixed = `https://${row.website}`
  await client.query(`UPDATE institutions SET website = $1 WHERE id = $2`, [fixed, row.id])
  console.log(`institution ${row.id}: website → ${fixed}`)
}

await client.end()
console.log('DONE')
