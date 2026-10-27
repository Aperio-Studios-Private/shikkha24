/**
 * T-18 P3 — copy production media files to R2 via wrangler (OAuth, no S3 creds).
 * Reads the media rows from Neon, downloads each file from its current URL
 * (cms.shikkha24.com), uploads to R2 with wrangler, then updates the Neon URL.
 * Throwaway probe (T-77): deleted after the run.
 */
import { Client } from 'pg'
import fs from 'node:fs'
import path from 'node:path'

const envText = fs.readFileSync('/Volumes/SSD/CODES/NewsPortal/.env.local', 'utf8')
const neonUrl = envText.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/"/g, '')
const NEW_BASE = 'https://media.shikkha24.com'
const TMP = fs.mkdtempSync('/tmp/t89-media-')

const client = new Client({ connectionString: neonUrl })
await client.connect()
const rows = await client.query(`SELECT id, url, filename, mime_type FROM media ORDER BY id`)
await client.end()

let copied = 0
let failed = 0

for (const row of rows.rows) {
  if (row.url.startsWith(NEW_BASE)) {
    console.log(`media ${row.id}: already on R2, skipped`)
    continue
  }
  try {
    // the Neon rows carry relative urls (/api/media/file/...) — prefix the CMS origin
    const fileUrl = row.url.startsWith('http')
      ? row.url
      : `https://cms.shikkha24.com${row.url}`
    const res = await fetch(fileUrl)
    if (!res.ok) {
      failed++
      console.error(`media ${row.id}: download failed ${res.status}`)
      continue
    }
    const buffer = Buffer.from(await res.arrayBuffer())
    const tmpFile = path.join(TMP, row.filename)
    fs.writeFileSync(tmpFile, buffer)

    // wrangler r2 object put — uses the OAuth token, no S3 creds needed
    execSyncSafe(
      `npx wrangler r2 object put "shikkha24-media/${row.filename}" --file "${tmpFile}" --content-type "${row.mime_type}" --remote`,
    )
    fs.unlinkSync(tmpFile)

    const newUrl = `${NEW_BASE}/${encodeURIComponent(row.filename)}`
    const upd = new Client({ connectionString: neonUrl })
    await upd.connect()
    await upd.query(`UPDATE media SET url = $1 WHERE id = $2`, [newUrl, row.id])
    await upd.end()

    copied++
    console.log(`media ${row.id}: copied ${row.filename} (${buffer.length} bytes) → ${newUrl}`)
    await new Promise((r) => setTimeout(r, 1500))
  } catch (e) {
    failed++
    console.error(`media ${row.id}: ${(e as Error).message.slice(0, 140)}`)
  }
}

fs.rmSync(TMP, { recursive: true, force: true })
console.log(`\n=== P3 MEDIA COPY DONE === copied: ${copied}, failed: ${failed}`)
process.exit(0)

function execSyncSafe(cmd: string) {
  const { execSync } = require('node:child_process')
  try {
    execSync(cmd, { stdio: 'pipe', cwd: '/Volumes/SSD/CODES/NewsPortal/frontend' })
  } catch (e) {
    throw new Error(`wrangler failed: ${(e as Error).message.slice(0, 200)}`)
  }
}
