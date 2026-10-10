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
 *   8. **The build is not thin.** `lib/cms.ts` is deliberately built so a CMS
 *      outage cannot fail the build — which means a dead CMS yields a *green*
 *      build holding a fraction of the pages, and the deploy then `rsync
 *      --delete`s them off the live site. See section 3a.
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

// ── 3a. The build is not THIN ────────────────────────────────────────────────
/**
 * A "thin build" is a build that succeeded while holding almost no content.
 *
 * `lib/cms.ts` is built so a CMS outage **cannot** fail the build — a hard
 * requirement, because a throwing build would take the whole newsroom offline
 * at the worst possible moment. Every helper degrades to a documented fallback
 * and warns instead. That is correct, and it has one sharp edge: a dead CMS
 * produces a **green** build containing a fraction of the pages.
 *
 * The deploy step then runs `rsync --delete`, so a thin build does not merely
 * fail to publish — it **deletes every article the live site currently has**,
 * and Google re-indexes the loss. This is the single most destructive failure
 * mode in the pipeline, and the one most likely to happen at the worst time,
 * because a CMS outage and a scheduled rebuild are independent events.
 *
 * ## Why the old `length > 0` was not a guard
 *
 * It asserted that *at least one* article page exists. A build with 25 article
 * pages passes it exactly as comfortably as one with 2,000. The check read as
 * protection and provided none — which is the specific trap
 * `docs/feature-register.md` §7 warns about ("a check that is vacuous").
 *
 * ## The two-tier assertion
 *
 * 1. **Exact, when a CMS is configured** (`CMS_URL` set): ask the CMS how many
 *    articles it has published and require the build to contain at least that
 *    many article pages. Self-calibrating — it stays correct as the archive
 *    grows, and it needs no number to be maintained by hand. This is the tier
 *    that matters, because `CMS_URL` is set on the deploy path and unset on
 *    the CI path.
 * 2. **A floor, when no CMS is configured.** CI builds against a seeded local
 *    CMS that is not running by the time this gate executes, so there is
 *    nothing to ask. `THIN_BUILD_MIN_ARTICLE_PAGES` is a deliberately low
 *    absolute floor: it only has to distinguish "a real build" from "a build
 *    that fetched nothing", and a low floor cannot produce a false failure as
 *    the archive grows.
 *
 * ⚠️ **A configured-but-unreachable CMS FAILS. It does not fall back to the
 * floor.** Falling back would be exactly the silence this check exists to
 * remove: the deploy path has a CMS URL, so an unreachable one means the
 * content fetch is suspect, and the safe answer is to stop rather than to
 * `rsync --delete` a site on the strength of a guess.
 */

/** Article pages below this with no CMS to compare against = a thin build. */
const THIN_BUILD_MIN_ARTICLE_PAGES = 10

/** Milliseconds to wait on the CMS before calling it unreachable. */
const CMS_PROBE_TIMEOUT_MS = 5000

/**
 * How many articles the CMS says are published, or `null` when no CMS is
 * configured.
 *
 * `limit=1` with `depth=0` — this reads `totalDocs` only. Asking for a
 * thousand documents to learn a count would be the wrong trade on a 2 GB host.
 */
async function publishedArticleCount() {
  const base = (process.env.CMS_URL || '').trim().replace(/\/$/, '')
  if (!base) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CMS_PROBE_TIMEOUT_MS)
  try {
    const response = await fetch(
      `${base}/api/articles?limit=1&depth=0&where[_status][equals]=published`,
      { signal: controller.signal },
    )
    if (!response.ok) return { error: `the CMS answered HTTP ${response.status}` }
    const body = await response.json()
    const total = Number(body?.totalDocs)
    if (!Number.isFinite(total) || total < 0) {
      return { error: 'the CMS response carried no usable totalDocs' }
    }
    return { total }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  } finally {
    clearTimeout(timer)
  }
}

const cmsCount = await publishedArticleCount()

if (cmsCount && 'error' in cmsCount) {
  check(
    'the CMS is reachable for the thin-build check (CMS_URL is set)',
    false,
    `${cmsCount.error} — refusing to certify a build whose content fetch is suspect`,
  )
} else if (cmsCount) {
  check(
    'every published article reached the build (thin-build guard)',
    articlePages.length >= cmsCount.total,
    `${articlePages.length} article page(s) built, CMS reports ${cmsCount.total} published`,
  )
} else {
  check(
    'the build is above the thin-build floor (no CMS_URL to compare against)',
    articlePages.length >= THIN_BUILD_MIN_ARTICLE_PAGES,
    `${articlePages.length} article page(s), floor ${THIN_BUILD_MIN_ARTICLE_PAGES}`,
  )
}

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

// ── 9. The calculators' DOM contract (N6 + the CGPA tool) ────────────────────
/*
 * Both calculators bind to elements by id and by class. A renamed id in the markup
 * — or a typo in the script — makes `getElementById(…)` return `null`, and the
 * non-null assertion that satisfies TypeScript disappears at runtime, so the page
 * throws before it renders anything.
 *
 * That is the failure class `/gpa` already demonstrated: its calculation was
 * unverifiable, and nothing checked the wiring was even intact. The rules now live
 * in `frontend/src/lib/gpa.ts` and `lib/cgpa.ts` with `verify:gpa` / `verify:cgpa`
 * over them; this is the other half — that the modules are actually connected.
 *
 * The selectors are read **from the built bundle**, not restated here, so the check
 * cannot drift from the code it checks. Adding a calculator means adding its slug.
 */
const CALCULATOR_PAGES = [
  { slug: 'gpa', label: 'GPA' },
  { slug: 'cgpa', label: 'CGPA' },
]

/** Every class token inside every `class="…"` attribute of some markup. */
function classTokensOf(markup) {
  const tokens = new Set()
  for (const match of markup.matchAll(/class="([^"]*)"/g)) {
    for (const token of match[1].split(/\s+/)) {
      if (token) tokens.add(token)
    }
  }
  return tokens
}

for (const { slug, label } of CALCULATOR_PAGES) {
  const pagePath = join(DIST, slug, 'index.html')
  if (!existsSync(pagePath)) {
    console.log(`      note: no /${slug} page in this build — its DOM contract check is skipped`)
    continue
  }

  const html = readFileSync(pagePath, 'utf8')
  const bundles = [
    ...html.matchAll(new RegExp(`src="(\\/_astro\\/${slug}\\.astro[^"]*\\.js)"`, 'g')),
  ].map((match) => match[1])

  const requiredIds = new Set()
  const requiredClasses = new Set()
  let bundleSource = ''
  for (const src of bundles) {
    const bundlePath = join(DIST, src)
    if (!existsSync(bundlePath)) continue
    const js = readFileSync(bundlePath, 'utf8')
    bundleSource += js
    for (const match of js.matchAll(/getElementById\([`'"]([^`'"]+)[`'"]\)/g)) {
      requiredIds.add(match[1])
    }
    // Capture the whole selector, then pull `.name` out of it — a querySelector can
    // be `input.cgpa-scale:checked`, and a regex anchored on a leading dot misses it.
    for (const match of js.matchAll(/querySelector(?:All)?\([`'"]([^`'"]+)[`'"]\)/g)) {
      for (const cls of match[1].matchAll(/\.([a-z][a-z0-9-]*)/g)) requiredClasses.add(cls[1])
    }
  }

  const missingIds = [...requiredIds].filter((id) => !html.includes(`id="${id}"`))
  check(
    `every element the ${label} calculator looks up by id exists in the built page`,
    requiredIds.size > 0 && missingIds.length === 0,
    requiredIds.size === 0
      ? `no getElementById ids found in the ${slug} bundle — the check is vacuous`
      : missingIds.length > 0
        ? `missing: ${missingIds.join(', ')}`
        : `${requiredIds.size} id(s) checked`,
  )

  /*
   * A class selector must match something that actually exists. Two sources, and
   * both are needed: the **page** for classes the script queries but does not
   * create (`cgpa-scale`, the radios it reads), and the **bundle** for the per-row
   * classes the script injects itself.
   *
   * ⚠️ The comparison is on **whole class tokens**, not substrings. A plain
   * `includes('class="gpa-marks')` also matches `class="gpa-marks-2` — and a CSS
   * class selector matches whole names, so that rename genuinely breaks the query
   * while the check stays green. (Found by counter-proving this check: the first
   * version passed with the class deliberately renamed.)
   */
  const knownClasses = classTokensOf(html)
  for (const token of classTokensOf(bundleSource)) knownClasses.add(token)

  const ownClasses = [...requiredClasses].filter((name) => name.startsWith(`${slug}-`))
  const missingClasses = ownClasses.filter((name) => !knownClasses.has(name))
  check(
    `every ${label} class the script queries exists somewhere it can match`,
    ownClasses.length > 0 && missingClasses.length === 0,
    ownClasses.length === 0
      ? `no ${slug}- class selectors found in the bundle — the check is vacuous`
      : missingClasses.length > 0
        ? `matches nothing: ${missingClasses.join(', ')}`
        : `${ownClasses.length} class selector(s) checked`,
  )
}

/*
 * ── The Cloudflare Pages security contract ───────────────────────────────────
 *
 * `public/.htaccess` carries the whole security posture — CSP, HSTS,
 * X-Frame-Options, Referrer-Policy, Permissions-Policy — and **Cloudflare Pages
 * ignores `.htaccess` entirely**. So a build deployed to Pages without
 * `public/_headers` serves the site with no security headers at all, and fails
 * silently: nothing reports a missing header, and `verify:apache` passes because
 * it tests Apache, not Pages.
 *
 * This is the M18 shape the project has already paid for twice — a check that
 * cannot fail. So the absence of `dist/_headers`, or of the CSP inside it, is a
 * build failure here rather than a surprise after deploying.
 */
console.log('\n-- Cloudflare Pages ships the security headers --')
{
  const headersPath = join(DIST, '_headers')
  const headers = existsSync(headersPath) ? readFileSync(headersPath, 'utf8') : ''

  check(
    'dist/_headers exists (Cloudflare Pages ignores .htaccess)',
    headers.length > 0,
    headers.length === 0
      ? 'public/_headers is missing — a Pages deploy would send NO security headers'
      : '',
  )

  // ⚠️ Assertions run against the **directives only**, never the whole file. This
  // file is heavily commented, and the prose names the very directives being
  // asserted — `frame-ancestors 'none'` appears in the explanation above the
  // policy. A `String.includes` over the raw file therefore passed while the
  // actual CSP had lost the directive entirely, which is the M18 shape this
  // section exists to prevent. `_headers` treats `#` lines as comments, so
  // stripping them is also the correct parse.
  const directives = headers
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('#'))
    .join('\n')

  // The CSP is scoped to its own header value, so a directive cannot be satisfied
  // by appearing in some other header.
  const cspMatch = directives.match(/Content-Security-Policy:\s*(.+)/)
  const csp = cspMatch ? cspMatch[1].trim() : ''

  // Each of these is a header the Apache configuration sets today. Losing one is
  // a silent regression, so each is asserted by name.
  for (const name of [
    'Content-Security-Policy',
    'Strict-Transport-Security',
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Referrer-Policy',
    'Permissions-Policy',
  ]) {
    check(`${name} is set for /*`, directives.includes(`${name}:`))
  }

  check('the CSP header is non-empty', csp.length > 0, csp.length === 0 ? 'no CSP value found' : '')

  // The CSP directives that do the actual work, asserted **inside the CSP value**.
  for (const directive of [
    "default-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ]) {
    check(`CSP keeps \`${directive}\``, csp.includes(directive))
  }

  // The hashed asset families must stay immutable, and HTML must revalidate — the
  // same contract `.htaccess` encodes via SHIKKHA24_IMMUTABLE.
  check('/_astro/* is cached immutably', /\/_astro\/\*[\s\S]*?immutable/.test(directives))
  check('/fonts/* is cached immutably', /\/fonts\/\*[\s\S]*?immutable/.test(directives))

  // ⚠️ **Cloudflare APPENDS `Cache-Control` when two rules set it** — the more
  // specific rule does not win. Setting it on `/*` *and* on the hashed families
  // shipped this on the first live deploy (2026-10-09), and a hashed asset came
  // back with
  //
  //     public, max-age=0, must-revalidate, public, max-age=31536000, immutable
  //
  // — told to revalidate immediately *and* never to change for a year, so it was
  // effectively uncached. Measured on the live response, not inferred.
  //
  // The assertion is structural rather than a live probe: `/*` must not set
  // `Cache-Control` at all, since Pages already sends `max-age=0,
  // must-revalidate` for HTML on its own.
  //
  // Parsed by splitting on blank lines rather than with a regex: the first attempt
  // used `/^\/\*\n([\s\S]*?)(?=\n\n|\n\/|$)/m`, and with the `m` flag `$` matches
  // at *every* line end, so the lazy capture stopped after the first header and the
  // check passed against a file that had the bug. A rule block is a blank-line
  // delimited paragraph, so that is how it is read here.
  const ruleBlocks = directives
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
  const catchAllBlock = ruleBlocks.find((block) => block.startsWith('/*'))
  check(
    'the /* rule does not set Cache-Control (it would be appended to the hashed families)',
    catchAllBlock !== undefined && !/Cache-Control/i.test(catchAllBlock),
    catchAllBlock === undefined
      ? 'no /* rule block found in dist/_headers'
      : 'move Cache-Control to the hashed families only',
  )
}

console.log(
  failures === 0
    ? '\nBuild output is deployable.\n'
    : `\n${failures} build-output check(s) FAILED.\n`,
)
process.exit(failures === 0 ? 0 : 1)
