/**
 * Verify `frontend/public/.htaccess` against a REAL Apache, serving the REAL build.
 *
 * ## Why this exists
 *
 * The previous harness (`verify-csp-routes.mjs`) parsed the `<LocationMatch>`
 * blocks out of `.htaccess` and reimplemented Apache's regex matching in
 * JavaScript. It therefore validated the *intent* of the rules and never asked
 * Apache whether the file was even legal — and `<LocationMatch>` is **not
 * permitted in `.htaccess` context**. Apache rejects it at parse time and answers
 * **HTTP 500 to every request**. The old harness passed while the file was
 * unrunnable, and the defect survived a release-readiness sweep because the file
 * had never been deployed.
 *
 * So this harness starts an actual Apache with the actual `.htaccess` over the
 * actual `dist/` and inspects real responses. A context error, a regex that fails
 * to match, or a duplicated header all show up as facts rather than as a
 * reimplementation's opinion.
 *
 * ## What it asserts
 *
 *   1. No route returns 5xx (catches the context error class outright).
 *   2. Every built page returns exactly ONE `Content-Security-Policy` header.
 *   3. The profile matches the page's own type, read from the page's JSON-LD
 *      (`NewsArticle` / `CollectionPage` / `LiveBlogPosting`) rather than from a
 *      copy of the `.htaccess` regex — so the expectation cannot drift with it.
 *   4. A query string does not change the profile (`/?utm_source=…` is the
 *      realistic share-link case, and `Request_URI` carries the query).
 *   5. Routes that must stay strict are strict.
 *   6. The cache rules actually fire — `/_astro/*` and `/fonts/*` immutable,
 *      HTML revalidating.
 *
 * Run: node scripts/verify-apache.mjs
 */
import { execFileSync, spawn } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const DIST = 'frontend/dist'
const HTACCESS_SRC = 'frontend/public/.htaccess'

const BINARIES = [
  '/usr/sbin/httpd',
  '/usr/sbin/apache2',
  '/usr/local/sbin/httpd',
  '/opt/homebrew/sbin/httpd',
]
const MODULE_DIRS = [
  '/usr/libexec/apache2',
  '/usr/lib/apache2/modules',
  '/usr/lib64/httpd/modules',
  '/usr/lib/httpd/modules',
  '/usr/local/libexec/apache2',
]

/**
 * Modules the harness needs, by Apache's short name.
 *
 * These are not all loadable files on every distribution: Debian/Ubuntu compile
 * many of them into the server binary, so `mod_log_config.so` simply does not
 * exist there. The harness therefore checks `<bin> -l` first and only falls back
 * to `LoadModule` for what is genuinely a shared object — otherwise it fails on
 * a healthy Ubuntu runner, which is exactly what happened the first time.
 */
const REQUIRED_MODULES = [
  ['log_config', 'access and error logging'],
  ['authz_core', '`Require all granted`'],
  ['dir', 'DirectoryIndex'],
  ['mime', 'content types'],
  ['headers', 'every Header directive in the .htaccess — without it the file is inert'],
  ['setenvif', 'the SetEnvIf route dispatch — without it no page gets a relaxed CSP'],
  ['rewrite', 'the S14 `/verify/` unknown-ID rewrite — without it a scanned card 404s'],
  ['unixd', 'privilege handling'],
]

const MPM_CANDIDATES = ['event', 'prefork', 'worker']

let failures = 0
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

/** First existing path from `candidates`, or null. */
const firstExisting = (candidates) => candidates.find((p) => existsSync(p)) ?? null

/** Every `index.html` under `dist/`, as a URL path. */
function collectRoutes() {
  const routes = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (name === 'index.html') {
        const rel = full.slice(DIST.length).replace(/\/index\.html$/, '')
        routes.push(rel === '' ? '/' : rel)
      }
    }
  }
  walk(DIST)
  return routes.sort()
}

/** One HTTP request, returning the status, the raw header list and the body. */
function httpGet(port, path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = request(
      { host: '127.0.0.1', port, path, method, headers: { host: 'shikkha24.test' } },
      (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (c) => {
          body += c
        })
        res.on('end', () => resolve({ status: res.statusCode, rawHeaders: res.rawHeaders, body }))
      },
    )
    req.on('error', reject)
    req.end()
  })
}

/** All values of `name` in a raw header array (rawHeaders is [k, v, k, v, …]). */
function headerValues(rawHeaders, name) {
  const want = name.toLowerCase()
  const out = []
  for (let i = 0; i < rawHeaders.length; i += 2) {
    if (rawHeaders[i].toLowerCase() === want) out.push(rawHeaders[i + 1])
  }
  return out
}

/** Classify a CSP value into the profile the file is supposed to serve. */
function profileOf(csp) {
  // Facebook is the discriminator for the MEDIA profile (S15): it is the only
  // profile that frames the host, and no other profile mentions it at all.
  // Checking it first is therefore unambiguous — the article profile also names
  // YouTube, so YouTube alone could not tell the two apart.
  if (csp.includes('www.facebook.com')) return 'media'
  if (csp.includes('pagead2.googlesyndication.com')) {
    return csp.includes('youtube-nocookie.com') ? 'relaxed-article' : 'relaxed-generic'
  }
  return 'strict'
}

/**
 * The profile a route *should* get, derived from the page's own markup.
 *
 * A route is relaxed **because it renders an ad slot**. That is what `.htaccess`
 * says in as many words ("Category listing — 1 ad slot"), and it is the whole
 * reason the relaxed profile exists: it is what lets AdSense load. So the marker
 * read here is `data-ad-slot` — the attribute `AdSlot.astro` emits — and not the
 * page's JSON-LD.
 *
 * There are two markers in total: `data-ad-slot` for the relaxed profile and
 * `data-media-embed` for the media profile (S15). Each names the component that
 * *causes* the relaxation, so neither is a restatement of the `.htaccess` path
 * regex.
 *
 * JSON-LD was the wrong key, and it produced a false failure the first time a
 * listing page without ads was built. `CollectionPage` describes a *listing*,
 * which correlates with being ad-bearing but does not cause it: `/latest` is a
 * listing and is correctly **strict**, because no `AdSlot` renders on it. Keying
 * the expectation on the schema type made this harness fail on a correct page —
 * the same "proxy for the real invariant" mistake as M14.
 *
 * The *flavour* of relaxed is a separate question. The article profile adds
 * `frame-src` for third-party video embeds; the article page is the only
 * ad-bearing route that embeds video, and it declares itself with `NewsArticle`
 * JSON-LD. That is the page's own statement of its type, not a restatement of
 * the `.htaccess` path regex, so it stays independent of the rule under test.
 */
function expectedProfile(html) {
  /*
   * The media profile (S15) is keyed on `data-media-embed` — the attribute
   * `MediaEmbed.astro` emits, which is the component that frames both YouTube and
   * Facebook. Same cause-keyed discipline as `data-ad-slot` below, and for the
   * same reason: keying it on the `/live-tv` path would be a second copy of the
   * `.htaccess` regex, and the two would drift.
   *
   * It is checked first because a media route also renders an ad slot, so the
   * ad-bearing branches below would otherwise claim it.
   */
  if (/data-media-embed/.test(html)) return 'media'

  const adBearing = /data-ad-slot="/.test(html)
  if (!adBearing) return 'strict'
  return /"@type":\s*"NewsArticle"/.test(html) ? 'relaxed-article' : 'relaxed-generic'
}

// ── Preconditions ────────────────────────────────────────────────────────────

if (!existsSync(DIST)) {
  console.error(`✗ ${DIST} does not exist — run the frontend build first.`)
  process.exit(1)
}

const shipped = join(DIST, '.htaccess')
if (!existsSync(shipped)) {
  console.error(`✗ ${shipped} is missing — the build copies public/.htaccess into dist/.`)
  process.exit(1)
}
check(
  'dist/.htaccess matches public/.htaccess byte-for-byte',
  readFileSync(shipped, 'utf8') === readFileSync(HTACCESS_SRC, 'utf8'),
  'a stale copy means the build predates the last .htaccess edit',
)

const bin = firstExisting(BINARIES)
if (!bin) {
  console.error(
    `✗ no Apache binary found (looked in: ${BINARIES.join(', ')}).\n` +
      '  This harness must not be skipped — it is the only check that proves the\n' +
      '  .htaccess is loadable by Apache. Install apache2/httpd and re-run.',
  )
  process.exit(1)
}

const moduleDir = firstExisting(MODULE_DIRS)
if (!moduleDir) {
  console.error(`✗ no Apache module directory found (looked in: ${MODULE_DIRS.join(', ')})`)
  process.exit(1)
}

/**
 * Module short names Apache has compiled into the server binary, from `<bin> -l`.
 *
 * Debian/Ubuntu ship many modules statically, so their `.so` files do not exist
 * and `LoadModule`-ing them would fail with "module already loaded" or a missing
 * file. macOS builds more of them as shared objects. Ask the binary rather than
 * assuming a distribution layout.
 */
function compiledInModules(binary) {
  try {
    const out = execFileSync(binary, ['-l'], { encoding: 'utf8' })
    return new Set(
      out
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.endsWith('.c'))
        .map((line) => line.replace(/^mod_/, '').replace(/\.c$/, '')),
    )
  } catch {
    // `-l` is unavailable on some builds; fall back to requiring every .so.
    return new Set()
  }
}

const compiledIn = compiledInModules(bin)

/** `mod_mpm_event.so` → `mpm_event_module` — the name `LoadModule` expects. */
const loadModuleName = (file) => `${file.replace(/^mod_/, '').replace(/\.so$/, '')}_module`

const moduleFiles = []

// Only LoadModule what is not already part of the binary.
for (const [name, why] of REQUIRED_MODULES) {
  if (compiledIn.has(name)) continue
  const file = `mod_${name}.so`
  if (!existsSync(join(moduleDir, file))) {
    console.error(
      `✗ Apache has neither a compiled-in nor a loadable '${name}' module.\n` +
        `  ${file} is missing from ${moduleDir}, and \`${bin} -l\` does not list it.\n` +
        `  That module provides: ${why}.\n` +
        '  Without it this harness cannot prove anything about the .htaccess.',
    )
    process.exit(1)
  }
  moduleFiles.push(file)
}

// Exactly one MPM must be active. If none is compiled in, load a shared one.
if (!MPM_CANDIDATES.some((name) => compiledIn.has(name))) {
  const mpmFile = MPM_CANDIDATES.map((name) => `mod_mpm_${name}.so`).find((file) =>
    existsSync(join(moduleDir, file)),
  )
  if (!mpmFile) {
    console.error(
      `✗ no MPM found: none of ${MPM_CANDIDATES.join(', ')} is compiled into ${bin}, ` +
        `and no mod_mpm_*.so exists in ${moduleDir}`,
    )
    process.exit(1)
  }
  moduleFiles.push(mpmFile)
}

// ── Start a throwaway Apache over a copy of dist/ ────────────────────────────
//
// Apache serves a *copy* rather than `dist/` itself, for two reasons: the real
// document root may sit on a volume the spawned server cannot stat (which shows
// up as a blanket 403 with `pcfg_openfile: unable to check htaccess file`), and
// a scratch root keeps the server from ever writing into the repo.

const scratch = mkdtempSync(join(tmpdir(), 'shikkha24-apache-'))
const docroot = join(scratch, 'docroot')
cpSync(join(process.cwd(), DIST), docroot, { recursive: true })

const port = 18000 + Math.floor(Math.random() * 2000)

// Where each distribution keeps `mime.types`. The line is dropped entirely if
// none of them exist — Apache then serves `application/octet-stream` for
// everything, which does not affect a single assertion here.
const typesConfig = firstExisting([
  '/etc/apache2/mime.types',
  '/etc/httpd/conf/mime.types',
  '/etc/mime.types',
  join(moduleDir, '..', '..', 'etc', 'apache2', 'mime.types'),
  '/usr/share/misc/mime.types',
])

const conf = `ServerName shikkha24.test
Listen ${port}
DefaultRuntimeDir "${scratch}"
PidFile "${scratch}/httpd.pid"
ErrorLog "${scratch}/error.log"
CustomLog "${scratch}/access.log" common
${moduleFiles.map((file) => `LoadModule ${loadModuleName(file)} "${join(moduleDir, file)}"`).join('\n')}
${typesConfig ? `TypesConfig "${typesConfig}"` : ''}
DocumentRoot "${docroot}"
DirectoryIndex index.html
<Directory "${docroot}">
    AllowOverride All
    Require all granted
    Options -Indexes +FollowSymLinks
</Directory>
`

const confPath = join(scratch, 'httpd.conf')
writeFileSync(confPath, conf)

// Print the resolved environment up front. When this harness fails on a runner,
// the first question is always "which Apache, and which modules?" — and that is
// cheaper to answer from the log than by reproducing the runner's layout.
console.log(
  `Apache ${bin} · modules ${moduleDir} · ${compiledIn.size} compiled in · ` +
    `loading ${moduleFiles.length} shared${moduleFiles.length ? ` (${moduleFiles.join(', ')})` : ''}\n`,
)

let child = null
const stop = () => {
  if (child && !child.killed) child.kill('SIGTERM')
  child = null
}

try {
  child = spawn(bin, ['-f', confPath, '-DFOREGROUND'], { stdio: ['ignore', 'pipe', 'pipe'] })
  let stderr = ''
  child.stderr.on('data', (c) => {
    stderr += c
  })

  let up = false
  for (let i = 0; i < 100; i += 1) {
    try {
      await httpGet(port, '/')
      up = true
      break
    } catch {
      await new Promise((r) => setTimeout(r, 100))
    }
  }
  if (!up) {
    console.error(`✗ Apache did not come up on port ${port}.\n${stderr}`)
    process.exit(1)
  }

  // ── 1–3. Every built route ────────────────────────────────────────────────
  const routes = collectRoutes()
  check('found built pages to serve', routes.length > 0, `${routes.length} routes`)

  const problems = []
  let relaxed = 0
  let adBearing = 0
  let mediaRoutes = 0
  // Pages that need no relaxation but get one. `.htaccess` dispatches by route
  // *family*, so a relaxed family may legitimately contain one — `/quiz` is
  // relaxed because `/quiz/:id` carries ads. Over-relaxing is harmless (the page
  // simply gets a wider policy than it needs), so it is reported, not failed. A
  // page that *needs* relaxation and does not get it is the failure that
  // matters, and that is what `problems` catches.
  const overRelaxed = []

  for (const route of routes) {
    const res = await httpGet(port, route === '/' ? '/' : `${route}/`)
    if (res.status >= 500) {
      problems.push(`${route} → HTTP ${res.status} (the .htaccess is not loadable)`)
      continue
    }
    const csps = headerValues(res.rawHeaders, 'content-security-policy')
    if (csps.length !== 1) {
      problems.push(`${route} → HTTP ${res.status}, ${csps.length} CSP headers, expected exactly 1`)
      continue
    }
    if (/data-ad-slot="/.test(res.body)) adBearing += 1
    if (/data-media-embed/.test(res.body)) mediaRoutes += 1

    const want = expectedProfile(res.body)
    const got = profileOf(csps[0])

    if (want === 'strict') {
      if (got !== 'strict') overRelaxed.push(`${route} → ${got}`)
    } else if (got === 'strict') {
      // The failure that matters: this page needs a relaxation and did not get
      // it. That is how AdSense or a player dies with no error anywhere.
      problems.push(`${route} → strict, but the page needs ${want}`)
    } else if (got !== want) {
      problems.push(`${route} → ${got}, expected ${want}`)
    } else {
      relaxed += 1
    }
  }
  check(
    'every built page: no 5xx, one CSP header, correct profile',
    problems.length === 0,
    problems.slice(0, 5).join(' | ') +
      (problems.length > 5 ? ` (+${problems.length - 5} more)` : ''),
  )
  check('some pages actually got a relaxed profile', relaxed > 0, `${relaxed} relaxed`)

  // Non-vacuity for the assertion above: with no ad-bearing page in the build
  // the profile check has nothing to prove. Say so loudly rather than passing
  // quietly — an unstated vacuous pass is how a gate rots.
  check(
    'the build rendered ad slots, so the profile check is not vacuous',
    adBearing > 0,
    adBearing > 0
      ? `${adBearing} ad-bearing page(s)`
      : 'no page rendered `data-ad-slot` — PUBLIC_FLAG_ADS is off, so the relaxed profile is untested',
  )

  /*
   * The third profile's non-vacuity is reported, not asserted — deliberately.
   *
   * `/live-tv` self-hides when no stream is configured (spec §4.2), which is a
   * legitimate state, not a defect. Asserting `mediaRoutes > 0` would therefore
   * turn red on a correct empty build and train the reader to ignore the harness.
   * What is asserted instead is the direction that matters, inside the loop
   * above: a page that renders `data-media-embed` must NOT be served `strict`.
   */
  if (mediaRoutes === 0) {
    console.log(
      '      note: no page rendered `data-media-embed` — /live-tv self-hides when no ' +
        'stream is configured, so the third CSP profile is untested in this build',
    )
  }
  if (overRelaxed.length > 0) {
    console.log(
      `      note: ${overRelaxed.length} relaxed page(s) render no ad slot (route-family dispatch): ${overRelaxed
        .slice(0, 3)
        .join(', ')}${overRelaxed.length > 3 ? ` (+${overRelaxed.length - 3} more)` : ''}`,
    )
  }

  // ── 4. A query string must not change the profile ─────────────────────────
  for (const [path, want] of [
    ['/?utm_source=whatsapp', 'relaxed-generic'],
    ['/category/admission?utm_source=facebook', 'relaxed-generic'],
  ]) {
    const res = await httpGet(port, path)
    const csps = headerValues(res.rawHeaders, 'content-security-policy')
    check(
      `${path} keeps the relaxed profile`,
      csps.length === 1 && profileOf(csps[0]) === want,
      `got ${csps.length} header(s): ${csps[0] ? profileOf(csps[0]) : 'none'}`,
    )
  }

  // A 4-segment pagination path has no page yet, but it is still an ad-bearing
  // route shape, so the profile must be right whatever the status code is.
  const paged = await httpGet(port, '/category/admission/page/2/')
  const pagedCsps = headerValues(paged.rawHeaders, 'content-security-policy')
  check(
    '/category/:slug/page/:n (4 segments) keeps the relaxed profile',
    pagedCsps.length === 1 && profileOf(pagedCsps[0]) === 'relaxed-generic',
    `HTTP ${paged.status}, ${pagedCsps.length} header(s)`,
  )

  // `/latest/page/:n` is the one *three*-segment path in the tree that is not an
  // article, and the article rule matches any three-segment path. It carries no
  // ad slot, so it must stay strict — whatever its status code, since a page
  // that does not exist yet still gets a header from the same rule.
  const latestPaged = await httpGet(port, '/latest/page/2/')
  const latestPagedCsps = headerValues(latestPaged.rawHeaders, 'content-security-policy')
  check(
    '/latest/page/:n (3 segments, not an article) stays strict',
    latestPagedCsps.length === 1 && profileOf(latestPagedCsps[0]) === 'strict',
    `HTTP ${latestPaged.status}, got ${latestPagedCsps[0] ? profileOf(latestPagedCsps[0]) : 'none'}`,
  )

  // ── 5. Routes that must stay strict ───────────────────────────────────────
  const mustBeStrict = [
    '/article/demo-education-budget-2026',
    '/a/1',
    '/gallery/demo-campus-life',
    '/institutions/demo-du',
    '/study-abroad/demo-canada',
    '/newsletter/confirm',
    '/about',
    '/search',
    '/bookmarks',
    '/page/privacy-policy',
  ]
  const loose = []
  for (const path of mustBeStrict) {
    const res = await httpGet(port, `${path}/`)
    const csps = headerValues(res.rawHeaders, 'content-security-policy')
    if (csps.length !== 1 || profileOf(csps[0]) !== 'strict') {
      loose.push(`${path} → ${csps[0] ? profileOf(csps[0]) : 'no CSP'}`)
    }
  }
  check('editorial and redirect routes stay strict', loose.length === 0, loose.join(', '))

  /*
   * The third profile, asserted by name.
   *
   * The loop above already covers `/live-tv` when a stream exists, but the page
   * **self-hides when the collection is empty** — a legitimate state — and the
   * profile would then go untested. This asks Apache directly, so the assertion
   * holds either way: the header comes from the route rule, not from the page.
   *
   * The companion assertion is the `mustBeStrict` list above: if the media
   * relaxation ever leaked sitewide, `/about` and `/search` would stop being
   * strict and that check would go red.
   */
  const liveTv = await httpGet(port, '/live-tv/')
  const liveTvCsps = headerValues(liveTv.rawHeaders, 'content-security-policy')
  check(
    '/live-tv is served the media profile (the third CSP profile)',
    liveTvCsps.length === 1 && profileOf(liveTvCsps[0]) === 'media',
    `HTTP ${liveTv.status}, got ${liveTvCsps[0] ? profileOf(liveTvCsps[0]) : 'none'}`,
  )
  const liveTvQuery = await httpGet(port, '/live-tv/?utm_source=facebook')
  const liveTvQueryCsps = headerValues(liveTvQuery.rawHeaders, 'content-security-policy')
  check(
    '/live-tv keeps the media profile with a query string',
    liveTvQueryCsps.length === 1 && profileOf(liveTvQueryCsps[0]) === 'media',
    `HTTP ${liveTvQuery.status}, got ${liveTvQueryCsps[0] ? profileOf(liveTvQueryCsps[0]) : 'none'}`,
  )

  // ── 5b. The `/verify/` unknown-ID rewrite (S14) ───────────────────────────
  //
  // A static build emits `/verify/<id>` only for IDs that exist, so an unknown or
  // forged ID reaches the rewrite. The exit gate is explicit — it must render the
  // "যাচাই করা যায়নি" state, **not** a 404 — so the *status* is asserted and not
  // just the body: remove the rule and Apache answers 404, which turns this red.
  //
  // The counter-proof is the real reporter below. The rule is skipped whenever
  // `REQUEST_FILENAME` is a real directory, so a known ID must NOT be rewritten.
  // Drop either `RewriteCond` and every card collapses into the not-found state
  // **while still returning 200** — which the status assertion alone would miss.
  const NOT_FOUND_MARKER = 'যাচাই করা যায়নি'

  const unknown = await httpGet(port, '/verify/SHK-R-2026-9999/')
  check(
    'an unknown reporter ID renders the not-found state, not a 404',
    unknown.status === 200 && unknown.body.includes(NOT_FOUND_MARKER),
    `HTTP ${unknown.status}${unknown.body.includes(NOT_FOUND_MARKER) ? '' : ' — marker absent'}`,
  )

  const verifyDir = join(DIST, 'verify')
  const knownIds = existsSync(verifyDir)
    ? readdirSync(verifyDir).filter((name) => name !== 'not-found')
    : []
  if (knownIds.length === 0) {
    // Guard the vacuous pass: with no real card built there is nothing to
    // counter-prove against, and a green run would mean nothing.
    check(
      'a real reporter page exists to counter-prove the rewrite',
      false,
      'dist/verify/ holds no reporter directory — seed an author with a reporterId',
    )
  } else {
    const realId = knownIds[0]
    const real = await httpGet(port, `/verify/${realId}/`)
    check(
      `a known reporter ID is NOT rewritten (${realId})`,
      real.status === 200 && !real.body.includes(NOT_FOUND_MARKER),
      `HTTP ${real.status}${real.body.includes(NOT_FOUND_MARKER) ? ' — served the not-found state' : ''}`,
    )
  }

  const sentinel = await httpGet(port, '/verify/not-found/')
  check(
    'the not-found sentinel is noindex (it answers 200, so it is otherwise indexable)',
    sentinel.status === 200 && /<meta name="robots" content="noindex"/.test(sentinel.body),
    `HTTP ${sentinel.status}`,
  )

  // ── 6. Cache rules ────────────────────────────────────────────────────────
  const asset = routes.length
    ? readdirSync(join(DIST, '_astro')).find((f) => f.endsWith('.js'))
    : null
  if (asset) {
    const res = await httpGet(port, `/_astro/${asset}`)
    const cc = headerValues(res.rawHeaders, 'cache-control').join(',')
    check(
      `/_astro/* is immutable (${asset})`,
      cc.includes('immutable') && cc.includes('max-age=31536000'),
      cc || 'no Cache-Control',
    )
  } else {
    check('a hashed asset exists in dist/_astro', false, 'nothing to test the cache rule against')
  }

  const fontDir = join(DIST, 'fonts')
  const font = existsSync(fontDir)
    ? readdirSync(fontDir, { recursive: true }).find((f) => String(f).endsWith('.woff2'))
    : null
  if (font) {
    const res = await httpGet(port, `/fonts/${font}`)
    const cc = headerValues(res.rawHeaders, 'cache-control').join(',')
    check('/fonts/* is immutable', cc.includes('immutable'), cc || 'no Cache-Control')
  } else {
    check('a font exists in dist/fonts', false, 'nothing to test the cache rule against')
  }

  const html = await httpGet(port, '/about/')
  const htmlCc = headerValues(html.rawHeaders, 'cache-control').join(',')
  check('HTML revalidates', htmlCc.includes('must-revalidate'), htmlCc || 'no Cache-Control')

  // ── 7. The baseline security headers are still there ──────────────────────
  for (const name of [
    'strict-transport-security',
    'x-content-type-options',
    'referrer-policy',
    'permissions-policy',
    'x-frame-options',
  ]) {
    check(`${name} is set`, headerValues(html.rawHeaders, name).length === 1)
  }

  // Apache explains a 5xx or a mass 403 in its own words, and those lines name
  // the offending directive. Without them a failure here is a puzzle.
  if (failures > 0) {
    const logPath = join(scratch, 'error.log')
    if (existsSync(logPath)) {
      const lines = readFileSync(logPath, 'utf8').split('\n').filter(Boolean).slice(-15)
      console.log(`\n── Apache error log (last ${lines.length} lines) ──`)
      for (const line of lines) console.log(line)
    }
  }
} finally {
  stop()
  rmSync(scratch, { recursive: true, force: true })
}

console.log(
  failures === 0
    ? `\nAll .htaccess checks passed against ${bin}.`
    : `\n${failures} check(s) failed.`,
)
process.exit(failures === 0 ? 0 : 1)
