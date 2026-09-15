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
import { readdirSync, readFileSync } from 'node:fs'

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

/**
 * Every built page of a listing, concatenated.
 *
 * A listing is not one page. `/latest` paginates at `PAGE_SIZE`, so its first
 * page holds only the newest slice — checking `/latest/index.html` alone reports
 * every older record as missing the moment the corpus exceeds one page. That is
 * precisely what happened when the demo corpus grew past `PAGE_SIZE` (M17): the
 * harness had assumed a single page, and the assumption had never been tested
 * because the corpus was exactly `PAGE_SIZE`.
 *
 * Returns the base page plus every `/page/:n` subpage, so the check is against
 * the whole listing however many pages it takes.
 */
function listing(basePath) {
  const dir = `${DIST}${basePath}`
  const files = [`${dir}/index.html`]
  try {
    for (const name of readdirSync(`${dir}/page`)) files.push(`${dir}/page/${name}/index.html`)
  } catch {
    // No `page/` directory — the listing fits on a single page.
  }
  return files
    .map((file) => {
      try {
        return readFileSync(file, 'utf8')
      } catch {
        return ''
      }
    })
    .join('\n')
}

let failures = 0

/**
 * @param label     collection name, for the report
 * @param endpoint  CMS endpoint to fetch the records from
 * @param pick      the identifying string to look for
 * @param html      the built page (or concatenated listing) that should contain them
 * @param describe  what that page is, for the failure message
 */
const verify = async (label, endpoint, pick, html, describe) => {
  const data = await get(endpoint)
  const docs = data.docs ?? []
  const missing = docs.filter((d) => !html.includes(pick(d)))

  const ok = docs.length > 0 && missing.length === 0 && html !== ''
  if (!ok) failures += 1

  const detail =
    html === '' ? `PAGE MISSING ${describe}` : `${docs.length - missing.length}/${docs.length}`
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(20)} ${detail}`)
  if (missing.length) {
    console.log(`        missing: ${missing.slice(0, 4).map(pick).join(' | ')}`)
  }
}

await verify(
  'articles',
  '/api/articles?limit=100&depth=0',
  (d) => d.title,
  listing('/latest'),
  '/latest',
)
await verify(
  'categories',
  '/api/categories?limit=100&depth=0',
  (d) => d.nameBn,
  page('/index.html'),
  '/index.html',
)
await verify(
  'scholarships',
  '/api/scholarships?limit=100&depth=0',
  (d) => d.title,
  listing('/scholarships'),
  '/scholarships',
)
await verify(
  'result-links',
  '/api/result-links?limit=100&depth=0',
  (d) => d.examName,
  listing('/results'),
  '/results',
)
await verify(
  'study-abroad',
  '/api/study-abroad-guides?limit=100&depth=0',
  (d) => d.country,
  listing('/study-abroad'),
  '/study-abroad',
)
await verify(
  'institutions',
  '/api/institutions?limit=100&depth=0',
  (d) => d.nameBn,
  listing('/institutions'),
  '/institutions',
)
await verify(
  'circulars',
  '/api/circulars?limit=100&depth=0',
  (d) => d.title,
  listing('/circulars'),
  '/circulars',
)
await verify(
  'deadlines',
  '/api/deadlines?limit=100&depth=0',
  (d) => d.title,
  listing('/deadlines'),
  '/deadlines',
)

console.log(
  failures === 0
    ? '\nEvery CMS record appears on its page — the read path is in sync.'
    : `\n${failures} collection(s) NOT fully synced.`,
)
process.exit(failures === 0 ? 0 : 1)
