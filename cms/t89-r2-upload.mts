/**
 * T-18 P3 — upload recovered media files to R2 and update Neon media rows.
 * Uses wrangler (OAuth) for the upload — no S3 creds needed.
 * Throwaway probe (T-77): deleted after the run.
 */
import { Client } from 'pg'
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const RECOVERY = '/Volumes/SSD/CODES/NewsPortal/.sps/media-recovery'
const envText = fs.readFileSync('/Volumes/SSD/CODES/NewsPortal/.env.local', 'utf8')
const neonUrl = envText.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/"/g, '')
const NEW_BASE = 'https://media.shikkha24.com'

const client = new Client({ connectionString: neonUrl })
await client.connect()

// the CMS media rows: match by filename to the recovered files
const rows = await client.query(`SELECT id, filename, url, mime_type FROM media ORDER BY id`)

let uploaded = 0
let skipped = 0
let failed = 0

for (const row of rows.rows) {
  if (row.url.startsWith(NEW_BASE)) {
    skipped++
    continue
  }
  // find the recovered file: exact match → base-name (strip -N suffix) →
  // prefix match (the first 15 chars — suffixes differ between the prod
  // export names and the Neon duplicate-upload names)
  let localFile = path.join(RECOVERY, row.filename)
  if (!fs.existsSync(localFile)) {
    const base = row.filename.replace(/-\d+\./, '.')
    if (fs.existsSync(path.join(RECOVERY, base))) {
      localFile = path.join(RECOVERY, base)
    } else {
      const stem = base.replace(/\.\w+$/, '')
      const prefix = stem.slice(0, 15)
      const candidates = fs
        .readdirSync(RECOVERY)
        .filter((f) => f.startsWith(prefix) && !f.includes('_Z') && !f.includes('_1t'))
        .sort()
      if (candidates.length > 0) {
        localFile = path.join(RECOVERY, candidates[0])
      } else {
        failed++
        console.error(`media ${row.id}: no recovered file for ${row.filename}`)
        continue
      }
    }
  }
  try {
    const abs = path.resolve(localFile)
    execSync(
      `npx wrangler r2 object put "shikkha24-media/${row.filename}" --file "${abs}" --content-type "${row.mime_type}" --remote`,
      { stdio: 'pipe', cwd: '/Volumes/SSD/CODES/NewsPortal/frontend' },
    )
    const newUrl = `${NEW_BASE}/${encodeURIComponent(row.filename)}`
    await client.query(`UPDATE media SET url = $1 WHERE id = $2`, [newUrl, row.id])
    uploaded++
    console.log(`media ${row.id}: uploaded ${row.filename} → ${newUrl}`)
  } catch (e) {
    failed++
    console.error(`media ${row.id}: ${(e as Error).message.slice(0, 120)}`)
  }
}

await client.end()
console.log(`\n=== R2 UPLOAD COMPLETE === uploaded: ${uploaded}, skipped: ${skipped}, failed: ${failed}`)
process.exit(0)
