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
import { spawn } from 'node:child_process'
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

const MODULES = [
  ['log_config_module', 'mod_log_config.so'],
  ['authz_core_module', 'mod_authz_core.so'],
  ['dir_module', 'mod_dir.so'],
  ['mime_module', 'mod_mime.so'],
  ['headers_module', 'mod_headers.so'],
  ['setenvif_module', 'mod_setenvif.so'],
  ['unixd_module', 'mod_unixd.so'],
]

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
  if (csp.includes('pagead2.googlesyndication.com')) {
    return csp.includes('youtube-nocookie.com') ? 'relaxed-article' : 'relaxed-generic'
  }
  return 'strict'
}

/**
 * The profile a route *should* get, derived from the page's own structured data.
 * Article, category and live-blog pages are identified by the JSON-LD they emit,
 * so this expectation is independent of the `.htaccess` regexes.
 */
function expectedProfile(route, html) {
  if (/"@type":\s*"NewsArticle"/.test(html)) return 'relaxed-article'
  if (/"@type":\s*"(?:CollectionPage|LiveBlogPosting)"/.test(html)) return 'relaxed-generic'
  if (route === '/') return 'relaxed-generic'
  if (route === '/quiz' || route.startsWith('/quiz/')) return 'relaxed-generic'
  return 'strict'
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

const mpmFile = ['mod_mpm_event.so', 'mod_mpm_prefork.so', 'mod_mpm_worker.so'].find((m) =>
  existsSync(join(moduleDir, m)),
)
if (!mpmFile) {
  console.error(`✗ no MPM module found in ${moduleDir}`)
  process.exit(1)
}

const moduleFiles = [...MODULES.map(([, file]) => file), mpmFile]
for (const file of moduleFiles) {
  if (!existsSync(join(moduleDir, file))) {
    console.error(`✗ required module ${file} is missing from ${moduleDir}`)
    process.exit(1)
  }
}

/** `mod_mpm_event.so` → `mpm_event_module` — the name Apache's LoadModule expects. */
const loadModuleName = (file) => `${file.replace(/^mod_/, '').replace(/\.so$/, '')}_module`

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

const conf = `ServerName shikkha24.test
Listen ${port}
DefaultRuntimeDir "${scratch}"
PidFile "${scratch}/httpd.pid"
ErrorLog "${scratch}/error.log"
CustomLog "${scratch}/access.log" common
${moduleFiles.map((file) => `LoadModule ${loadModuleName(file)} "${join(moduleDir, file)}"`).join('\n')}
TypesConfig "${join(moduleDir, '..', '..', 'etc', 'apache2', 'mime.types')}"
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

let child = null
const stop = () => {
  if (child && !child.killed) child.kill('SIGTERM')
  child = null
}

try {
  // A types file that does not exist is not fatal, but an unreadable one is
  // noisy; drop the line if the guessed path is wrong.
  const typesLine = conf.match(/TypesConfig "([^"]+)"/)?.[1]
  if (typesLine && !existsSync(typesLine))
    writeFileSync(confPath, conf.replace(/^TypesConfig.*$/m, ''))

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
    const want = expectedProfile(route, res.body)
    const got = profileOf(csps[0])
    if (got !== want) problems.push(`${route} → ${got}, expected ${want}`)
    else if (want !== 'strict') relaxed += 1
  }
  check(
    'every built page: no 5xx, one CSP header, correct profile',
    problems.length === 0,
    problems.slice(0, 5).join(' | ') +
      (problems.length > 5 ? ` (+${problems.length - 5} more)` : ''),
  )
  check('some pages actually got a relaxed profile', relaxed > 0, `${relaxed} relaxed`)

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
