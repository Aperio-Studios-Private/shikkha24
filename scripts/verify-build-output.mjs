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
 *   6. **One source of tab icon, and it is versioned.** A page offers the
 *      CMS-managed favicon *or* the bundled pair, never both — three candidates
 *      with no `sizes` to disambiguate them lets the browser keep showing the
 *      stale one. And the managed URL must carry a cache-buster, because
 *      browsers cache favicons far more stubbornly than other assets.
 *   7. **`search-init.js` still has the markup it sorts.** It reorders the date
 *      filter in the DOM, so it depends on Pagefind's *internal* class names —
 *      and if those are renamed the sort dies silently.
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
const routeRules = [...htaccessDirectives.matchAll(/SetEnvIf Request_URI "([^"]+)"\s+(\S+)/g)].map(
  (match) => ({ pattern: match[1], env: match[2] }),
)
const routePatterns = routeRules.map((rule) => rule.pattern)

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

// ── 7b. The third CSP profile (S15) ──────────────────────────────────────────
/*
 * `/live-tv` frames **YouTube and Facebook**. Neither existing profile can
 * express that — strict is `frame-src 'none'`, and the relaxed profile carries no
 * video at all — so a third profile, `SHIKKHA24_CSP_MEDIA`, is scoped to it.
 *
 * Three things must hold together, and **each fails silently on its own**:
 *
 *   1. the route is tagged,
 *   2. a `Header` line consumes the tag, and
 *   3. that header actually frames both providers.
 *
 * A tagged route with no consuming header gets the strict policy and the player
 * is blocked with no error anywhere — the same failure class as the `/article/*`
 * rule that stopped matching at S11 and would have dropped AdSense sitewide.
 *
 * ⚠️ This is a static pre-filter. `pnpm verify:apache` is the real gate: only
 * running Apache proves the file is loadable and the header is served.
 */
/**
 * The routes that legitimately need the media profile.
 *
 * Scoping is asserted as an **explicit set**, not a count. A count would keep
 * passing if a tag were moved from one route to another, and the whole point of
 * the third profile is that it is scoped: the homepage, every category listing
 * and `/quiz` must not gain iframe permission.
 */
const MEDIA_ROUTES = ['/live-tv', '/video']
const mediaTagRules = routeRules
  .filter((rule) => rule.env === 'SHIKKHA24_CSP_MEDIA=1')
  .map((rule) => rule.pattern)

check(
  `SHIKKHA24_CSP_MEDIA is scoped to exactly ${MEDIA_ROUTES.length} routes, not sitewide`,
  mediaTagRules.length === MEDIA_ROUTES.length,
  `${mediaTagRules.length} tag(s): ${mediaTagRules.join(' | ') || 'none'}`,
)
for (const route of MEDIA_ROUTES) {
  check(
    `.htaccess tags ${route} for the media profile`,
    mediaTagRules.some((pattern) => pattern.includes(route)),
    mediaTagRules.join(' | ') || 'no media tag found',
  )
}

const mediaHeader = [
  ...htaccessDirectives.matchAll(/Header always set Content-Security-Policy "([^"]+)" env=(\S+)/g),
].find((match) => match[2] === 'SHIKKHA24_CSP_MEDIA')
check(
  'a CSP header consumes SHIKKHA24_CSP_MEDIA',
  Boolean(mediaHeader),
  mediaHeader ? '' : 'the route is tagged but nothing consumes it — it would fall to strict',
)
if (mediaHeader) {
  const frameSrc = mediaHeader[1].match(/frame-src ([^;]+);/)?.[1] ?? ''
  check('the media profile frames YouTube', frameSrc.includes('youtube-nocookie.com'), frameSrc)
  check('the media profile frames Facebook', frameSrc.includes('www.facebook.com'), frameSrc)
  // The relaxed profile must NOT have gained video — that was the rejected
  // option, and it is a security regression rather than a style choice.
  const relaxedHeader = [
    ...htaccessDirectives.matchAll(
      /Header always set Content-Security-Policy "([^"]+)" env=(\S+)/g,
    ),
  ].find((match) => match[2] === 'SHIKKHA24_CSP_RELAXED')
  const relaxedFrameSrc = relaxedHeader?.[1].match(/frame-src ([^;]+);/)?.[1] ?? ''
  check(
    'the relaxed profile did NOT gain video (the rejected regression)',
    !relaxedFrameSrc.includes('facebook.com') && !relaxedFrameSrc.includes('youtube'),
    relaxedFrameSrc || 'no frame-src directive',
  )
}

/*
 * ⚠️ S17: the ARTICLE profile must frame Facebook as well as YouTube.
 *
 * `Articles.videoProvider` can be `facebook`, so an article carrying a Facebook
 * video needs it. This coupling was missing, and `verify:apache` is what found it:
 * an article page rendering a player was served a policy whose `frame-src` had no
 * Facebook in it, so the player would have been dead on the highest-traffic route
 * with no error anywhere. Asserting it here means the next person to touch either
 * side finds out at build time rather than from a reader.
 */
const articleHeader = [
  ...htaccessDirectives.matchAll(/Header always set Content-Security-Policy "([^"]+)" env=(\S+)/g),
].find((match) => match[2] === 'SHIKKHA24_CSP_ARTICLE')
check(
  'a CSP header consumes SHIKKHA24_CSP_ARTICLE',
  Boolean(articleHeader),
  articleHeader ? '' : 'the article rule is tagged but nothing consumes it',
)
if (articleHeader) {
  const articleFrameSrc = articleHeader[1].match(/frame-src ([^;]+);/)?.[1] ?? ''
  check(
    'the article profile frames YouTube',
    articleFrameSrc.includes('youtube-nocookie.com'),
    articleFrameSrc,
  )
  check(
    'the article profile frames Facebook (an article may carry a Facebook video)',
    articleFrameSrc.includes('www.facebook.com'),
    articleFrameSrc,
  )
}

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

// ── 6. Exactly one source of tab icon, and it is versioned ───────────────────
/**
 * A page offers **either** the CMS-managed favicon **or** the bundled pair —
 * never both.
 *
 * Emitting the managed icon *and* `/favicon.svg` + `/favicon.ico` leaves three
 * `rel="icon"` candidates with no `sizes` to disambiguate them, and the browser
 * is then free to pick a stale bundled file. That is how "I changed the favicon
 * and nothing happened" happens, and it is invisible to every other check —
 * the markup is valid, the build is green, the icon is simply not the new one.
 *
 * The managed URL must also be versioned. Browsers cache favicons far more
 * stubbornly than other assets — Chrome keeps them in a store that ignores
 * ordinary cache headers — so without a changing URL, replacing the icon under
 * the same filename keeps showing the old one.
 */
const mixedIconPages = []
const unversionedIconPages = []
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8')
  const hrefs = [...html.matchAll(/<link[^>]+rel="icon"[^>]*>/g)]
    .map((match) => match[0].match(/href="([^"]*)"/)?.[1] ?? '')
    .filter(Boolean)

  const bundled = hrefs.filter((href) => href.startsWith('/favicon.'))
  const managed = hrefs.filter((href) => !href.startsWith('/favicon.'))

  if (bundled.length > 0 && managed.length > 0) mixedIconPages.push(file.replace(`${DIST}/`, ''))
  if (managed.some((href) => !href.includes('?v='))) {
    unversionedIconPages.push(file.replace(`${DIST}/`, ''))
  }
}

check(
  'no page mixes a managed favicon with a bundled one',
  mixedIconPages.length === 0,
  mixedIconPages.length === 0
    ? `${htmlFiles.length} pages checked`
    : mixedIconPages.slice(0, 3).join(', '),
)
check(
  'every managed favicon URL is versioned (cache-busting)',
  unversionedIconPages.length === 0,
  unversionedIconPages.length === 0
    ? 'no unversioned managed icons'
    : unversionedIconPages.slice(0, 3).join(', '),
)

// ── 7. The date-filter sort still has the markup it depends on ───────────────
/**
 * `public/search-init.js` reorders the date filter's values in the DOM, so it has
 * to select Pagefind's filter markup — which is **internal**, not a public API.
 * If a Pagefind update renames those classes the sort stops working silently: no
 * error, no failing check, just months back in index order.
 *
 * This asserts the hooks are still present. It is deliberately a check on someone
 * else's internals — the coupling is real, and a build-time failure beats finding
 * out from a reader.
 */
const PAGEFIND_UI = join(DIST, 'pagefind/pagefind-ui.js')
const REQUIRED_FILTER_HOOKS = [
  'pagefind-ui__filter-block',
  'pagefind-ui__filter-name',
  'pagefind-ui__filter-value',
  'pagefind-ui__filter-checkbox',
]
let missingHooks = REQUIRED_FILTER_HOOKS
if (existsSync(PAGEFIND_UI)) {
  const ui = readFileSync(PAGEFIND_UI, 'utf8')
  missingHooks = REQUIRED_FILTER_HOOKS.filter((hook) => !ui.includes(hook))
}
check(
  'pagefind-ui.js still exposes the filter markup search-init.js sorts',
  missingHooks.length === 0,
  missingHooks.length === 0
    ? `${REQUIRED_FILTER_HOOKS.length} hooks present`
    : `missing: ${missingHooks.join(', ')}`,
)

// ── 8. Reaction counts are NOT baked into the static HTML (S16) ──────────────
/*
 * The reaction counts are read at runtime, on the reader's first tap. Rendered at
 * build time they would freeze until the next rebuild, so a reader's own reaction
 * would appear to do nothing — the silent-staleness failure this static frontend
 * has already been bitten by once (`.sps/handoff.md`, "the frontend is STATIC").
 *
 * The count box is **reserved and empty** in the markup; this asserts it stayed
 * empty. It is deliberately an assertion about absence, so it cannot pass by
 * finding the wrong thing.
 *
 * The non-vacuity guard is a **note, not a check**, because the bar self-hides
 * when `PUBLIC_CMS_ORIGIN` is unset — a legitimate degraded build, and one that
 * must not turn a gate red.
 */
const bakedCounts = []
let reactionBars = 0
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8')
  if (html.includes('data-reaction-bar')) reactionBars += 1
  for (const match of html.matchAll(/<span[^>]*data-reaction-count[^>]*>([\s\S]*?)<\/span>/g)) {
    if (match[1].trim() !== '') bakedCounts.push(file.replace(`${DIST}/`, ''))
  }
}
check(
  'no reaction count is baked into the static HTML',
  bakedCounts.length === 0,
  bakedCounts.length === 0 ? '' : `counts rendered on: ${bakedCounts.slice(0, 3).join(', ')}`,
)
if (reactionBars === 0) {
  console.log(
    '      note: no page rendered a reaction bar — the islands self-hide when ' +
      'PUBLIC_CMS_ORIGIN is unset, so the check above is vacuous in this build',
  )
}

console.log(
  failures === 0
    ? '\nBuild output is deployable.\n'
    : `\n${failures} build-output check(s) FAILED.\n`,
)
process.exit(failures === 0 ? 0 : 1)
