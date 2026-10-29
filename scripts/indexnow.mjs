/**
 * IndexNow submission — tells Bing, Yandex, Seznam and Naver that URLs changed.
 *
 * ## Why this exists
 *
 * `robots.txt` + `sitemap.xml` let a crawler *discover* our pages, but the crawl
 * still happens on the search engine's schedule. IndexNow is the push half: one
 * unauthenticated GET per batch and the engine re-crawls within minutes. For a
 * news site that is the difference between a breaking story appearing while it is
 * still current and appearing a day later.
 *
 * It is free, needs no account for the basic protocol, and needs no payment card
 * — which matters here, because owner rule 7 forbids anything that requires an
 * international card at signup. `api.indexnow.org` is a shared endpoint: submit
 * to it once and every participating engine receives the notification.
 *
 * ## Protocol, and the two ways it fails silently
 *
 * The host must serve `/<key>.txt` whose body is exactly the key. That file is
 * committed at `frontend/public/<key>.txt` — a **static asset**, deliberately not
 * a dynamic route: an Astro endpoint cannot return a real 404 in a static build,
 * so a misconfigured key would have been served as `200 OK` with a wrong body and
 * the API would have rejected it with no visible cause. A static file either
 * exists (and matches) or it does not.
 *
 * Failures worth knowing:
 *   - **403** — the key file is missing at the URL or its body does not match.
 *   - **422** — the URLs are not on the host that owns the key.
 * Both are easy to mistake for success if you only check "did the request
 * complete", so this script prints the status and treats anything outside
 * {200, 202} as a failure.
 *
 * ## Usage
 *
 *   node scripts/indexnow.mjs                  # submit every URL in sitemap.xml
 *   node scripts/indexnow.mjs <url> [<url>…]   # submit specific URLs
 *   node scripts/indexnow.mjs --dry-run        # print the batch, send nothing
 *
 * `--dry-run` exists because this is an outbound call to a third party: it should
 * be inspectable before it is fired.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC_DIR = path.join(ROOT, 'frontend', 'public')

/**
 * The key is discovered from the committed `<key>.txt` file rather than being
 * duplicated in a constant — one source of truth means the file and the ping can
 * never disagree, which is the failure mode above.
 */
function findKey() {
  const candidate = readdirSync(PUBLIC_DIR).find((f) => /^[0-9a-f]{8,128}\.txt$/.test(f))
  if (!candidate) {
    throw new Error(
      `No IndexNow key file in ${PUBLIC_DIR}. Expected a <32-hex>.txt file whose body is the key.`,
    )
  }
  const key = readFileSync(path.join(PUBLIC_DIR, candidate), 'utf8').trim()
  if (key !== candidate.replace(/\.txt$/, '')) {
    throw new Error(`${candidate} body does not match its filename — IndexNow would answer 403.`)
  }
  return key
}

/**
 * Every `<loc>` in the built sitemap, which is the authoritative URL list.
 *
 * ⚠️ `dist/sitemap.xml` can be STALE — it describes the last LOCAL build, and
 * this session proved the failure live: after the demo-content purge the fresh
 * remote rebuild served 67 URLs while the stale local dist still listed 81
 * (five demo articles included), and the batch went out with dead URLs. The
 * dist file is therefore only used when it agrees with the live sitemap's URL
 * count; otherwise the LIVE sitemap wins. Pass `--force-dist` to skip the
 * live check (offline use).
 */
async function sitemapUrls(site, { forceDist = false } = {}) {
  const distPath = path.join(ROOT, 'frontend', 'dist', 'sitemap.xml')
  const distUrls = existsSync(distPath)
    ? [...readFileSync(distPath, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())
    : []
  if (forceDist || distUrls.length === 0) return distUrls

  try {
    const res = await fetch(`${site}/sitemap.xml`, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return distUrls
    const liveUrls = [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
      m[1].trim(),
    )
    if (liveUrls.length === distUrls.length) return distUrls
    console.log(
      `  ⚠ dist/sitemap.xml (${distUrls.length} URLs) disagrees with the live sitemap ` +
        `(${liveUrls.length}) — using the LIVE list. Rebuild locally to refresh dist.`,
    )
    return liveUrls
  } catch {
    // Offline: the dist list is the best available.
    return distUrls
  }
}

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const forceDist = args.includes('--force-dist')
const explicit = args.filter((a) => !a.startsWith('--'))

const site = (process.env.PUBLIC_SITE_URL || 'https://shikkha24.com').replace(/\/$/, '')
const key = findKey()
const urls = explicit.length > 0 ? explicit : await sitemapUrls(site, { forceDist })

if (urls.length === 0) {
  console.error('No URLs to submit. Build the frontend first (pnpm build:frontend).')
  process.exit(1)
}

const body = { host: new URL(site).host, key, keyLocation: `${site}/${key}.txt`, urlList: urls }

console.log(`IndexNow — ${urls.length} URL(s) for ${body.host}`)
console.log(`  key file: ${body.keyLocation}`)

if (dryRun) {
  console.log('  --dry-run: nothing sent. Payload:')
  console.log(JSON.stringify(body, null, 2).split('\n').slice(0, 12).join('\n'))
  process.exit(0)
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
})

// 200 = accepted, 202 = accepted but the key is still being validated. Anything
// else is a real failure and is reported as one, with the meaning spelled out.
const ok = res.status === 200 || res.status === 202
const hint =
  res.status === 403
    ? ' — key file missing at the URL, or its body does not match the key'
    : res.status === 422
      ? ' — URLs do not belong to the host that owns the key'
      : res.status === 429
        ? ' — rate limited; try again later'
        : ''

console.log(
  `  ${ok ? 'OK' : 'FAILED'}  HTTP ${res.status}${res.status === 202 ? ' (accepted, key pending validation)' : ''}${hint}`,
)
process.exit(ok ? 0 : 1)
