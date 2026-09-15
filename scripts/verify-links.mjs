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
 *   - **every URL inside the page's JSON-LD** (`url`, `item`, `@id`,
 *     `mainEntityOfPage`), which is a second surface the attribute scan cannot
 *     see. A `Person.url` pointing at a route that does not exist is a 404
 *     advertised to every crawler and is invisible to an `href`-only check —
 *     which is exactly how it went unnoticed here.
 *   - same-origin URLs containing a **double slash** (`https://site//x`). These
 *     still resolve, because a filesystem join collapses the slash, so the
 *     resolution check cannot see them — but they are a different URL to a
 *     crawler, and they are what `${siteUrl}/x` produces when `siteUrl` already
 *     ends in one.
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

/**
 * A same-origin path that begins `//` — `https://site//author/x`.
 *
 * It still *resolves*: a filesystem join collapses the double slash, so the
 * resolution check below cannot see it. It is wrong anyway. It is a different
 * URL to a crawler, and it is exactly what `${siteUrl}/author/…` produces when
 * `siteUrl` already ends in a slash — which is how the article page shipped
 * `https://shikkha24.com//author/demo-reporter`.
 */
const isMalformed = (pathname) => pathname.startsWith('//')

/** The JSON-LD keys whose string values are URLs pointing at our own pages. */
const STRUCTURED_URL_KEYS = new Set(['url', 'item', '@id', 'mainEntityOfPage'])

/**
 * Every URL inside the page's JSON-LD.
 *
 * These are **not** `href` attributes, so the attribute scan never sees them.
 * That is precisely how the article page shipped a `Person.url` pointing at
 * `/author/:slug` while no such route existed — structured data advertising a
 * 404 to every crawler, invisible to a check that only reads `href`.
 *
 * Walks the parsed object rather than regex-matching the raw text, so a nested
 * `url` inside `author`, `publisher` or `itemListElement` is found too.
 */
function structuredUrls(html) {
  const found = []
  for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let parsed
    try {
      parsed = JSON.parse(block[1])
    } catch {
      // A malformed block is a different failure, and not this harness's job.
      continue
    }
    const visit = (node) => {
      if (Array.isArray(node)) {
        for (const item of node) visit(item)
        return
      }
      if (!node || typeof node !== 'object') return
      for (const [key, value] of Object.entries(node)) {
        if (typeof value === 'string' && STRUCTURED_URL_KEYS.has(key)) found.push(value)
        else visit(value)
      }
    }
    visit(parsed)
  }
  return found
}

if (!existsSync(DIST)) {
  console.error(`✗ ${DIST} does not exist — run the frontend build first.`)
  process.exit(1)
}

const pages = collectPages()
const broken = new Map()
const malformed = new Map()
let linksChecked = 0
let structuredChecked = 0

/** Record a bad target against every page that referenced it. */
const note = (map, target, from) => {
  if (!map.has(target)) map.set(target, new Set())
  map.get(target)?.add(from)
}

/** Resolve a classified URL, recording it as broken or malformed if it fails. */
const inspect = (raw, from, { structured = false } = {}) => {
  const classified = classify(raw)
  if (!classified) return

  // Strip the query and the fragment: a static host ignores the query for
  // routing, and `?utm_source=…` must not read as a missing file.
  const pathname = classified.path.split('#')[0]?.split('?')[0] ?? ''
  if (pathname === '') return

  if (structured) structuredChecked += 1
  else linksChecked += 1

  const label = structured ? `${from} (JSON-LD)` : from
  if (isMalformed(pathname)) {
    note(malformed, pathname, label)
    return
  }
  if (resolveToFile(pathname)) return
  note(broken, pathname, label)
}

for (const page of pages) {
  const html = readFileSync(page.file, 'utf8')

  // `href` for links, `src` for local assets. `<link rel="canonical">` is caught
  // here too, since it is a real `href`.
  for (const match of html.matchAll(/\b(?:href|src)\s*=\s*"([^"]*)"/g)) {
    inspect(match[1], page.urlPath)
  }

  // JSON-LD is a second, separate surface — see `structuredUrls`.
  for (const raw of structuredUrls(html)) {
    inspect(raw, page.urlPath, { structured: true })
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
check(
  'resolved a meaningful number of JSON-LD URLs',
  structuredChecked > 50,
  `${structuredChecked} structured URLs`,
)

// Report the most-referenced breakages first — a link on every page matters more
// than a link on one.
const ordered = [...broken.entries()].sort((a, b) => b[1].size - a[1].size)

for (const [target, referrers] of ordered) {
  const from = [...referrers].slice(0, 3).join(', ')
  const more = referrers.size > 3 ? ` (+${referrers.size - 3} more)` : ''
  console.log(`      missing: ${target} ← ${from}${more}`)
}

for (const [target, referrers] of malformed) {
  console.log(`      double slash: ${target} ← ${[...referrers].slice(0, 2).join(', ')}`)
}

check(
  'every internal link resolves to a built file',
  broken.size === 0,
  broken.size === 0 ? `${pages.length} pages checked` : `${broken.size} broken target(s)`,
)
check(
  'no same-origin URL contains a double slash',
  malformed.size === 0,
  malformed.size === 0 ? 'canonicals and JSON-LD included' : `${malformed.size} malformed`,
)

console.log(
  failures === 0 ? '\nAll internal links resolve.\n' : `\n${failures} link check(s) FAILED.\n`,
)
process.exit(failures === 0 ? 0 : 1)
