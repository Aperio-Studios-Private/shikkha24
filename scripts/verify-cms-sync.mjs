/**
 * Verify the build-time READ path: every CMS record the frontend renders must
 * actually appear on the page it is rendered by.
 *
 * ## Why this exists
 *
 * A report of "CMS data is not syncing" can mean either direction:
 *
 *   - the **read** path — build-time fetch from the CMS into the static pages
 *   - the **write** path — reader submissions back to the CMS
 *
 * This harness covers the read half; `cms/src/verify/endpoints.ts` covers the
 * write half. Splitting them matters because they fail in completely different
 * ways: a read failure produces a page that builds green and looks fine but is
 * missing rows, while a write failure produces a 404 the reader hits.
 *
 * ## What it asserts
 *
 * For each collection the storefront lists, every record's identifying string
 * must be present in the built page. A record in the CMS but absent from the
 * page is a sync failure — and it is invisible to a build exit code, because
 * every fetch degrades to an empty list by design (`docs/reliability.md` §1).
 *
 * Requires the CMS running AND the frontend built. Run: node scripts/verify-cms-sync.mjs
 */
import { readFileSync } from 'node:fs'

const BASE = process.env.CMS_URL ?? 'http://localhost:3000'
const DIST = 'frontend/dist'

const get = async (path) => {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`)
  return res.json()
}

const cache = new Map()
const page = (path) => {
  if (cache.has(path)) return cache.get(path)
  let html = ''
  try {
    html = readFileSync(`${DIST}${path}`, 'utf8')
  } catch {
    html = ''
  }
  cache.set(path, html)
  return html
}

let failures = 0

/**
 * @param label   collection name, for the report
 * @param items   records fetched from the CMS
 * @param pick    the identifying string to look for
 * @param target  the built page that should contain them
 */
const verify = async (label, endpoint, pick, target) => {
  const data = await get(endpoint)
  const docs = data.docs ?? []
  const html = page(target)
  const missing = docs.filter((d) => !html.includes(pick(d)))

  const ok = docs.length > 0 && missing.length === 0 && html !== ''
  if (!ok) failures += 1

  const detail =
    html === '' ? `PAGE MISSING ${target}` : `${docs.length - missing.length}/${docs.length}`
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(20)} ${detail}`)
  if (missing.length) {
    console.log(`        missing: ${missing.slice(0, 4).map(pick).join(' | ')}`)
  }
}

await verify('articles', '/api/articles?limit=100&depth=0', (d) => d.title, '/latest/index.html')
await verify('categories', '/api/categories?limit=100&depth=0', (d) => d.nameBn, '/index.html')
await verify(
  'scholarships',
  '/api/scholarships?limit=100&depth=0',
  (d) => d.title,
  '/scholarships/index.html',
)
await verify(
  'result-links',
  '/api/result-links?limit=100&depth=0',
  (d) => d.examName,
  '/results/index.html',
)
await verify(
  'study-abroad',
  '/api/study-abroad-guides?limit=100&depth=0',
  (d) => d.country,
  '/study-abroad/index.html',
)
await verify(
  'institutions',
  '/api/institutions?limit=100&depth=0',
  (d) => d.nameBn,
  '/institutions/index.html',
)
await verify(
  'circulars',
  '/api/circulars?limit=100&depth=0',
  (d) => d.title,
  '/circulars/index.html',
)
await verify(
  'deadlines',
  '/api/deadlines?limit=100&depth=0',
  (d) => d.title,
  '/deadlines/index.html',
)

console.log(
  failures === 0
    ? '\nEvery CMS record appears on its page — the read path is in sync.'
    : `\n${failures} collection(s) NOT fully synced.`,
)
process.exit(failures === 0 ? 0 : 1)
