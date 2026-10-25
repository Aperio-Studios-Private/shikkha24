import { readFileSync } from 'node:fs'

/**
 * IndexNow ping (T-40) — submits every URL in the built sitemap to the
 * IndexNow engines. Free protocol, no account, no card (budget rule 7).
 *
 * The key file lives at frontend/public/<key>.txt so the search engines can
 * verify site ownership; it must be live before any submission. Run after each
 * frontend deploy:
 *
 *   node scripts/ping-indexnow.mjs <key>
 *
 * The key is a public credential by design, but it is NOT stored in this file —
 * it is passed as an argument so the key cannot drift between environments.
 *
 * ## Why more than one endpoint
 *
 * The joint endpoint (api.indexnow.org) answered 403 on 2026-10-18 AND
 * 2026-10-25, while the same key was proven valid directly (Yandex 202) and the
 * key file was live (HTTP 200) both times. That is a joint-endpoint
 * suppression, not a bad key. The IndexNow protocol lets each engine expose its
 * own endpoint that takes the exact same POST body, so the submission walks
 * down the list and succeeds at the first engine that accepts. No key rotation
 * is warranted while a per-engine endpoint accepts: the key file, the sitemap
 * and the ping are all consistent.
 *
 * Fallback order: joint first (one POST hits every engine), then Bing (which
 * powers Bing, DuckDuckGo and Yahoo), then Yandex (which already accepted this
 * key once). Exit 0 when at least one engine accepts, 1 otherwise.
 */
const key = process.argv[2]
if (!key || key.length < 8) {
  console.error('usage: node scripts/ping-indexnow.mjs <indexnow-key>')
  process.exit(1)
}
const xml = readFileSync(new URL('../frontend/dist/sitemap.xml', import.meta.url), 'utf-8')
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
const body = {
  host: 'shikkha24.com',
  key,
  keyLocation: `https://shikkha24.com/${key}.txt`,
  urlList: urls,
}

const ENDPOINTS = [
  ['joint (api.indexnow.org)', 'https://api.indexnow.org/indexnow'],
  ['Bing (www.bing.com)', 'https://www.bing.com/indexnow'],
  ['Yandex (yandex.com)', 'https://yandex.com/indexnow'],
]

let acceptedBy = null
for (const [label, endpoint] of ENDPOINTS) {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
      // A hung endpoint must not stall a deploy pipeline for minutes; 30s is
      // generous for a batch POST and the loop moves on below.
      signal: AbortSignal.timeout(30_000),
    })
    const ok = res.status === 200 || res.status === 202
    console.log(`  ${label} → HTTP ${res.status}${ok ? ' ✓ accepted' : ''}`)
    if (ok) {
      acceptedBy = label
      break
    }
  } catch (err) {
    console.log(`  ${label} → network error: ${err instanceof Error ? err.message : String(err)}`)
  }
}

if (acceptedBy) {
  console.log(`IndexNow: submitted ${urls.length} URLs → accepted by ${acceptedBy}`)
} else {
  console.error(
    `IndexNow: NO engine accepted the submission (${urls.length} URLs). If this persists past 24h, rotate the key per the runbook in .sps/tasks.md T-40.`,
  )
  process.exit(1)
}
