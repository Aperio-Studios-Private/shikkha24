import { readFileSync } from 'node:fs'
/**
 * IndexNow ping (T-40) — submits every URL in the built sitemap to Bing/Yandex
 * etc. via api.indexnow.org. Free protocol, no account, no card (budget rule 7).
 *
 * The key file lives at frontend/public/<key>.txt so the search engines can
 * verify site ownership. After each frontend deploy run:
 *   node scripts/ping-indexnow.mjs <key>
 * The key is a public credential by design, but it lives in the repo? No — it
 * is passed as an argument so the key cannot drift between environments.
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
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
})
console.log(`IndexNow: submitted ${urls.length} URLs → HTTP ${res.status}`, res.status === 200 || res.status === 202 ? '✓' : '(non-200, check key)')
