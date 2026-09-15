/**
 * Check every internal link in the built output against the built files.
 *
 * ## Why this exists
 *
 * The site is static, so an `<a href>` is a promise that a file exists. Nothing
 * else in the toolchain checks it: Astro does not resolve `href` strings, and a
 * link to a route that was never generated is still valid HTML, so the build
 * stays green and the reader gets a 404.
 *
 * That is not hypothetical. `/latest` was a single page reading `?page=N` from
 * the URL — which on a static build is evaluated at build time, where there is
 * no query string — while `Pagination` builds its links as `${basePath}/page/${n}`.
 * No route emitted `/latest/page/2`. It stayed invisible only because the demo
 * corpus holds exactly `PAGE_SIZE` articles, so the control never rendered.
 *
 * The same class produced the 171-broken-link finding in the 2026-09-14 audit
 * (a footer linking to `/page/privacy-policy` when no such CMS page existed).
 *
 * ## What it checks
 *
 *   - every `href` and same-origin `src` that resolves inside the site
 *   - including absolute URLs on the site's own origin, so a stale
 *     `rel="canonical"` is caught as well as a stale link
 *
 * Run: node scripts/verify-links.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'frontend/dist'
/** Absolute URLs on this origin are internal for our purposes. */
const SITE_ORIGINS = ['https://shikkha24.com', 'http://shikkha24.com']

let failures = 0

/** Every `.html` file under dist, as { file, urlPath }. */
function collectPages() {
  const pages = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (name.endsWith('.html')) {
        const rel = full.slice(DIST.length)
        pages.push({
          file: full,
          urlPath: rel === '/index.html' ? '/' : rel.replace(/\/index\.html$/, ''),
        })
      }
    }
  }
  walk(DIST)
  return pages
}

/**
 * Resolve a site-relative path to a file in `dist`, or null.
 *
 * A static host serves three shapes, so all three count as a hit:
 *   `/foo`      → `dist/foo/index.html`   (directory index)
 *   `/foo/`     → `dist/foo/index.html`
 *   `/foo.html` → `dist/foo.html`
 *   `/foo.txt`  → `dist/foo.txt`          (a real file, e.g. robots.txt)
 */
function resolveToFile(pathname) {
  const clean = pathname.replace(/\/+$/, '')
  const candidates = [
    join(DIST, clean, 'index.html'),
    join(DIST, `${clean}.html`),
    join(DIST, clean),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

/** Should this URL be checked, and as what? */
function classify(raw) {
  const value = raw.trim()
  if (!value) return null
  // Not navigational.
  if (/^(?:mailto:|tel:|javascript:|data:|blob:|sms:)/i.test(value)) return null
  // Fragment-only, e.g. a skip link or an SVG `<use href="#icon">`.
  if (value.startsWith('#')) return null
  // Protocol-relative or any other scheme we do not serve.
  if (value.startsWith('//')) return null

  for (const origin of SITE_ORIGINS) {
    if (value.startsWith(origin)) {
      return { kind: 'internal', path: value.slice(origin.length) || '/' }
    }
  }
  // Any remaining absolute URL is genuinely external.
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return null

  return { kind: 'internal', path: value }
}

if (!existsSync(DIST)) {
  console.error(`✗ ${DIST} does not exist — run the frontend build first.`)
  process.exit(1)
}

const pages = collectPages()
const broken = new Map()
let linksChecked = 0

for (const page of pages) {
  const html = readFileSync(page.file, 'utf8')

  // `href` for links, `src` for local assets. Both are plain attribute matches;
  // JSON-LD inside <script> uses `"url":"…"`, not `href=`, so it is not picked
  // up here — canonicals are checked through the real <link rel="canonical">.
  const matches = html.matchAll(/\b(?:href|src)\s*=\s*"([^"]*)"/g)

  for (const match of matches) {
    const classified = classify(match[1])
    if (!classified) continue

    // Strip the query and the fragment: a static host ignores the query for
    // routing, and `?utm_source=…` must not read as a missing file.
    const pathname = classified.path.split('#')[0]?.split('?')[0] ?? ''
    if (pathname === '') continue
    linksChecked += 1

    if (resolveToFile(pathname)) continue

    if (!broken.has(pathname)) broken.set(pathname, new Set())
    broken.get(pathname)?.add(page.urlPath)
  }
}

const check = (label, ok, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

check('found built pages to scan', pages.length > 0, `${pages.length} pages`)
// A count, not just a verdict: a checker that scans nothing passes vacuously,
// and this project has already been burned once by a harness that did.
check('resolved a meaningful number of internal links', linksChecked > 100, `${linksChecked} links`)

// Report the most-referenced breakages first — a link on every page matters more
// than a link on one.
const ordered = [...broken.entries()].sort((a, b) => b[1].size - a[1].size)

for (const [target, referrers] of ordered) {
  const from = [...referrers].slice(0, 3).join(', ')
  const more = referrers.size > 3 ? ` (+${referrers.size - 3} more)` : ''
  console.log(`      missing: ${target} ← ${from}${more}`)
}

check(
  'every internal link resolves to a built file',
  broken.size === 0,
  broken.size === 0 ? `${pages.length} pages checked` : `${broken.size} broken target(s)`,
)

console.log(
  failures === 0 ? '\nAll internal links resolve.\n' : `\n${failures} link check(s) FAILED.\n`,
)
process.exit(failures === 0 ? 0 : 1)
