/**
 * Verify the built `dist/` is deployable.
 *
 * This is the gate that runs after the build and before a deploy. It asserts the
 * invariants that are invisible in a build exit code:
 *
 *   1. **Zero executable inline scripts.** The CSP is `script-src 'self'` with
 *      no `'unsafe-inline'`, so an inlined component script is blocked in
 *      production. Astro inlines small scripts by default; `assetsInlineLimit: 0`
 *      is what prevents it. A regression here kills every interactive control
 *      silently.
 *   2. **The deploy-critical root files exist.** Apache reads
 *      `.htaccess`; crawlers read the feeds; AI crawlers read `llms.txt`. A
 *      missing one is a silent production failure, not a build error.
 *   3. **The article URL architecture is the one we decided.** Articles live at
 *      `/:category/:id/:slug`, with `/article/:slug` as a redirect stub.
 *   4. **No leftover build scratch.** `dist/.prerender/` gets deployed as junk.
 *   5. **No page nests `.container-page` inside another.** A component that
 *      renders its own container — because it is also used standalone — insets
 *      its whole subtree by another 24px when nested inside a page that already
 *      has one. Nothing fails; the page just does not line up.
 *
 * Run after `pnpm build`: node scripts/verify-build-output.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'frontend/dist'

let failures = 0
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

/** Every .html file in dist/, as paths relative to dist. */
const htmlFiles = []
;(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full)
    else if (name.endsWith('.html')) htmlFiles.push(full)
  }
})(DIST)

console.log(`\n=== build output verification (${htmlFiles.length} html files) ===\n`)

// ── 1. Zero executable inline scripts ────────────────────────────────────────
let inlineCount = 0
const offenders = []
// `matchAll` rather than `while ((m = re.exec(...)))` — the assignment-in-
// expression form trips `lint/suspicious/noAssignInExpressions`.
const INLINE_SCRIPT =
  /<script(?![^>]*\bsrc=)(?![^>]*type="application\/(?:ld\+)?json")[^>]*>([\s\S]*?)<\/script>/gi
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8')
  for (const match of html.matchAll(INLINE_SCRIPT)) {
    if (match[1].trim() === '') continue // empty script tag, not executable code
    inlineCount += 1
    if (offenders.length < 3) offenders.push(file.replace(`${DIST}/`, ''))
  }
}
check(
  'zero executable inline scripts (strict-CSP invariant)',
  inlineCount === 0,
  `${inlineCount} found ${offenders.join(', ')}`,
)

// ── 2. Deploy-critical root files ────────────────────────────────────────────
const rootFiles = [
  '.htaccess',
  '_redirects',
  'robots.txt',
  'sitemap.xml',
  'news-sitemap.xml',
  'rss.xml',
  'llms.txt',
  'og-default.png',
  '404.html',
  'favicon.svg',
]
for (const f of rootFiles) {
  const present = existsSync(join(DIST, f))
  // _redirects is optional (the article redirect stubs cover it), so note only.
  check(`root file present: ${f}`, present || f === '_redirects', present ? '' : 'MISSING')
}

// ── 3. URL architecture ──────────────────────────────────────────────────────
const articlePages = htmlFiles.filter((f) => {
  const rel = f.slice(DIST.length + 1)
  return rel.split('/').length === 4 && rel.endsWith('/index.html')
})
check(
  'articles built at /:category/:id/:slug',
  articlePages.length > 0,
  `${articlePages.length} found`,
)

const legacyStubs = htmlFiles.filter((f) => f.includes('/article/'))
check(
  'legacy /article/:slug redirect stubs exist',
  legacyStubs.length > 0,
  `${legacyStubs.length} found`,
)

if (legacyStubs[0]) {
  const stub = readFileSync(legacyStubs[0], 'utf8')
  check(
    'a legacy stub carries a meta refresh + canonical',
    /http-equiv="refresh"/.test(stub) && /rel="canonical"/.test(stub),
  )
}

// ── 4. Search index ──────────────────────────────────────────────────────────
const pagefindEntry = join(DIST, 'pagefind', 'pagefind-entry.json')
check('pagefind index was generated (post-build step ran)', existsSync(pagefindEntry))

// ── 5. No leftover scratch ───────────────────────────────────────────────────
check('no dist/.prerender left behind', !existsSync(join(DIST, '.prerender')))

// ── 6. Feeds are non-empty and use the new URL scheme ────────────────────────
// `news-sitemap.xml` is deliberately NOT in this loop — see below.
for (const feed of ['sitemap.xml', 'rss.xml']) {
  const p = join(DIST, feed)
  if (!existsSync(p)) continue
  const body = readFileSync(p, 'utf8')
  const urlCount = (body.match(/<loc>|<link>/g) ?? []).length
  const stalePrefix = body.includes('/article/')
  check(`${feed} is populated`, urlCount > 0, `${urlCount} entries`)
  check(`${feed} uses the new URL scheme`, !stalePrefix, stalePrefix ? 'contains /article/' : '')
}

// ── 6b. news-sitemap.xml is TIME-WINDOWED, so emptiness is not a failure ─────
// Google News ignores entries older than 48 hours, and `news-sitemap.xml.ts`
// filters on exactly that. An empty file is therefore the CORRECT output whenever
// no article was published inside the window — which is the normal state of the
// demo dataset (seeded 2026-09-12; by 2026-09-14 every article is ~60h old).
//
// Asserting "populated" here failed for the wrong reason and would train a reader
// to ignore the harness. What IS checkable from `dist/` alone: the file is
// well-formed, declares the news namespace, and carries no stale URL prefix.
// Entry count is reported, not asserted — verifying the 48h filter itself needs
// the CMS publish dates, which this harness deliberately does not read.
{
  const p = join(DIST, 'news-sitemap.xml')
  if (existsSync(p)) {
    const body = readFileSync(p, 'utf8')
    const urlCount = (body.match(/<loc>/g) ?? []).length
    const wellFormed = body.includes('<urlset') && body.includes('</urlset>')
    check('news-sitemap.xml is well-formed', wellFormed, wellFormed ? '' : 'missing urlset element')
    check('news-sitemap.xml declares the news namespace', body.includes('sitemap-news'))
    check(
      'news-sitemap.xml uses the new URL scheme',
      !body.includes('/article/'),
      body.includes('/article/') ? 'contains /article/' : '',
    )
    console.log(
      `      note: news-sitemap.xml holds ${urlCount} entr${urlCount === 1 ? 'y' : 'ies'} — ` +
        'legitimately 0 when no article falls inside the 48h window',
    )
  }
}

// ── 7. The CSP relaxed rules target the real route shapes ────────────────────
const htaccess = readFileSync(join(DIST, '.htaccess'), 'utf8')

/*
 * Directive lines only — comment lines are stripped first.
 *
 * The file documents *why* the relaxed rule moved off the old `/article/`
 * prefix, so a raw text search matches that prose and fails on documentation
 * rather than on a directive. A harness that fails for the wrong reason trains
 * you to ignore it (`.sps/deployment-readiness.md` §2).
 *
 * The patterns are read out of the `SetEnvIf Request_URI` directives. This is a
 * fast static pre-filter; `pnpm verify:apache` is the real gate, because only
 * running Apache can prove the file is loadable at all.
 */
const htaccessDirectives = htaccess
  .split('\n')
  .filter((line) => !line.trim().startsWith('#'))
  .join('\n')
const routePatterns = [...htaccessDirectives.matchAll(/SetEnvIf Request_URI "([^"]+)"/g)].map(
  (match) => match[1],
)

check('.htaccess dispatches routes with SetEnvIf Request_URI', routePatterns.length > 0)
check(
  '.htaccess contains no <LocationMatch> — illegal in .htaccess context (HTTP 500)',
  !htaccessDirectives.includes('<LocationMatch'),
)
check(
  '.htaccess has no CSP rule targeting the retired /article/ prefix',
  routePatterns.length > 0 && !routePatterns.some((p) => p.includes('/article/')),
)
// The article rule is the three-segment shape *minus* the one other
// three-segment path in the tree, `/latest/page/:n`. Both halves are asserted:
// the shape alone tagged paginated listing pages with the article profile.
const articleRule = routePatterns.find((pattern) => pattern.startsWith('^/[^/?#]+/'))
check(
  '.htaccess relaxes the CSP for article paths (exactly 3 segments)',
  Boolean(articleRule) && (articleRule.match(/\[\^\/\?#\]\+/g) ?? []).length === 3,
  articleRule ?? 'no three-segment article rule found',
)
check(
  '.htaccess excludes /:base/page/:n from the article rule',
  Boolean(articleRule) && articleRule.includes('(?!page/)'),
  articleRule ?? 'no three-segment article rule found',
)

// ── 5. No component nests a page container inside another ────────────────────
/**
 * `.container-page` carries `padding-inline` and a `max-width`. It belongs once
 * per page, at the top. A component that renders its own — because it is also
 * used standalone — insets its whole subtree by another 24px when it is nested
 * inside a page that already has one.
 *
 * That happened: `CategorySection` wrapped itself in `container-page` while
 * `index.astro` had already wrapped the sections in one, so all eight homepage
 * sections sat 24px inside the masthead, the sidebar and the neighbouring block
 * in the same grid. Nothing failed; the page just did not line up.
 *
 * `<script>` and comments are stripped first. A `<div>` inside either is not an
 * element, and counting it skews the depth — a naive version of this check
 * reported 95 false positives before that was accounted for.
 */
const stripNonMarkup = (html) =>
  html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<!--[\s\S]*?-->/g, '')

const nestedContainerPages = []
for (const file of htmlFiles) {
  const html = stripNonMarkup(readFileSync(file, 'utf8'))
  const stack = []
  let containerDepth = null

  for (const match of html.matchAll(/<div\b[^>]*>|<\/div>/g)) {
    if (match[0] === '</div>') {
      stack.pop()
      if (containerDepth !== null && stack.length <= containerDepth) containerDepth = null
      continue
    }
    const isContainer = /class="container-page/.test(match[0])
    if (isContainer && containerDepth !== null) {
      nestedContainerPages.push(file.replace(`${DIST}/`, ''))
      break
    }
    if (isContainer) containerDepth = stack.length
    stack.push(1)
  }
}
check(
  'no page nests .container-page inside another',
  nestedContainerPages.length === 0,
  nestedContainerPages.length === 0
    ? `${htmlFiles.length} pages checked`
    : nestedContainerPages.slice(0, 3).join(', '),
)

console.log(
  failures === 0
    ? '\nBuild output is deployable.\n'
    : `\n${failures} build-output check(s) FAILED.\n`,
)
process.exit(failures === 0 ? 0 : 1)
