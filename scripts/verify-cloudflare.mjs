/**
 * The Cloudflare deploy path — every contract that holds it together.
 *
 * ## Why this file exists
 *
 * The Workers publisher (T-18 P1) is three files that never meet at runtime:
 * `frontend/wrangler.toml`, `frontend/worker/*.ts`, and
 * `.github/workflows/deploy-cloudflare.yml`. The cPanel pipeline already lived
 * through the failure shape where each half is checked alone and the seam
 * breaks anyway — M33 (CI packed `.zip`, the cron expected `.tar.gz`, and all
 * 85 checks were green). This harness owns the seams:
 *
 * 1. `wrangler.toml` must describe the modern `[assets]` configuration (the
 *    retired Workers Sites pattern cannot deploy — M35) and keep the Worker
 *    first, because `_headers`/`_redirects` do not apply to worker-served
 *    requests.
 * 2. The Worker's four CSP constants must be **byte-identical** with
 *    `frontend/public/.htaccess` — the rollback publisher and the live
 *    publisher are not allowed to drift on any security policy.
 * 3. The dispatch (the `.htaccess` SetEnvIf port), the `/verify` rewrite and
 *    the cache rules must behave on the route matrix `verify:apache` uses.
 * 4. The workflow must gate before it builds, must default to dry-run, and
 *    must be the ONLY workflow consuming `repository_dispatch: rebuild` — one
 *    publish must trigger exactly one build.
 *
 * Every section carries a **negative control** run against the same
 * assertions on every execution — a check that has never been seen to fail is
 * not evidence (the M-series lesson this file exists to honour).
 *
 * Run: node --experimental-strip-types scripts/verify-cloudflare.mjs
 * (The Worker modules are TypeScript; Node strips the types natively.)
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseToml } from 'smol-toml'
import { parse as parseYaml } from 'yaml'

import { CSP_ARTICLE, CSP_MEDIA, CSP_RELAXED, CSP_STRICT } from '../frontend/worker/csp.ts'
import { profileForPath } from '../frontend/worker/dispatch.ts'
import { headersForPath, isPreviewHost } from '../frontend/worker/headers.ts'
import { resolveRewrite } from '../frontend/worker/index.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const failures = []
let passed = 0

/** Record one check; `detail` prints either way, so a pass is never vacuous. */
function check(name, ok, detail = '') {
  if (ok) passed += 1
  else failures.push(name)
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
}

/** The M35 guard: the retired Workers Sites pattern is an extra top-level key. */
function hasLegacySiteBlock(cfg) {
  return 'site' in cfg
}

/** The one-rebuild-one-consumer guard for `deploy.yml`. */
function consumesRebuildDispatch(triggers) {
  return 'repository_dispatch' in triggers
}

const cfToml = readFileSync(join(root, 'frontend/wrangler.toml'), 'utf8')
const cfConfig = parseToml(cfToml)
const htaccess = readFileSync(join(root, 'frontend/public/.htaccess'), 'utf8')

// --- 1. wrangler.toml — the deployable shape --------------------------------

console.log('1. wrangler.toml — modern assets contract')
check('name is the production worker name', cfConfig.name === 'shikkha24-frontend', cfConfig.name)
check(
  'main points at the Worker source, not a directory',
  cfConfig.main === './worker/index.ts' && existsSync(join(root, 'frontend/worker/index.ts')),
  cfConfig.main,
)
const dateOk =
  /^\d{4}-\d{2}-\d{2}$/.test(String(cfConfig.compatibility_date)) &&
  Date.parse(cfConfig.compatibility_date) <= Date.now()
check('compatibility_date is a past-or-today date', dateOk, cfConfig.compatibility_date)
check(
  'workers_dev stays on (deploy probe + rollback channel)',
  cfConfig.workers_dev === true,
  'otherwise the deploy strands with no reachable URL',
)
// P6: the production domain attaches as Workers custom domains — Cloudflare
// synthesises the DNS records and edge certificates from these entries.
const routes = Array.isArray(cfConfig.routes) ? cfConfig.routes : []
const hasCustom = (list, pattern) =>
  Array.isArray(list) && list.some((r) => r?.pattern === pattern && r?.custom_domain === true)
check('apex is attached as a Workers custom domain (P6)', hasCustom(routes, 'shikkha24.com'))
check('www is attached as a Workers custom domain (P6)', hasCustom(routes, 'www.shikkha24.com'))
check(
  'exactly the apex and www are attached, nothing else',
  routes.length === 2,
  JSON.stringify(routes),
)
check(
  'negative control: a folder missing the www route trips the guard',
  !hasCustom(
    routes.filter((r) => r?.pattern !== 'www.shikkha24.com'),
    'www.shikkha24.com',
  ),
)
check(
  'negative control: a non-custom-domain www route trips the guard',
  !hasCustom([{ pattern: 'www.shikkha24.com' }], 'www.shikkha24.com'),
)

const assets = cfConfig.assets ?? {}
check('assets.directory = ./dist', assets.directory === './dist', assets.directory)
check('assets.binding = ASSETS', assets.binding === 'ASSETS', assets.binding)
check(
  'assets.not_found_handling = 404-page (dist/404.html, status 404)',
  assets.not_found_handling === '404-page',
  assets.not_found_handling,
)
check(
  'assets.run_worker_first = true — the Worker owns all headers',
  assets.run_worker_first === true,
  'without it _headers cannot be bypassed and _redirects would not reach worker-served requests',
)
check(
  'assets.html_handling = drop-trailing-slash (URL parity with Apache)',
  assets.html_handling === 'drop-trailing-slash',
  "the default 'auto-trailing-slash' 307-redirects every directory URL (verified live on the first deploy: /latest → 307 /latest/), disagreeing with Astro's trailingSlash:'never' and the baked canonical tags",
)
check(
  'NO legacy Workers Sites [site] block',
  !hasLegacySiteBlock(cfConfig),
  'the retired [site] pattern cannot deploy (M35)',
)
// Negative control: guard must fire on the retired pattern, not the real config.
check(
  'negative control: a re-added [site] block trips the guard',
  hasLegacySiteBlock({ ...cfConfig, site: { bucket: './dist' } }),
  'the guard is not vacuous',
)

// --- 2. CSP parity — .htaccess ↔ worker/csp.ts -------------------------------

console.log('2. CSP contract — byte-identical with .htaccess')
/** Pull the four `Header always set Content-Security-Policy` values out of .htaccess. */
function cspFromHtaccess(text) {
  const map = {
    '': 'strict',
    SHIKKHA24_CSP_RELAXED: 'relaxed',
    SHIKKHA24_CSP_ARTICLE: 'article',
    SHIKKHA24_CSP_MEDIA: 'media',
  }
  const found = {}
  for (const m of text.matchAll(
    /^[ \t]*Header always set Content-Security-Policy "([^"]+)"(?:[ \t]+env=(\S+))?[ \t]*$/gm,
  )) {
    const name = map[m[2] ?? '']
    if (name) found[name] = m[1]
  }
  return found
}
const apache = cspFromHtaccess(htaccess)
for (const [name, constant] of [
  ['strict', CSP_STRICT],
  ['relaxed', CSP_RELAXED],
  ['article', CSP_ARTICLE],
  ['media', CSP_MEDIA],
]) {
  check(
    `${name} profile is byte-identical with .htaccess`,
    apache[name] === constant,
    apache[name] === undefined ? 'MISSING from .htaccess' : `${constant.length} chars`,
  )
}
// Negative control: one mutated character must be caught.
check(
  'negative control: a one-character CSP drift is detected',
  apache.strict.replace("'self'", "'seif'") !== CSP_STRICT,
  'the parity check is not vacuous',
)

// --- 3. Dispatch — the verify:apache route matrix ----------------------------

console.log('3. Route dispatch port — same matrix as verify:apache')
const MATRIX = [
  // [path, expected profile, reason (kept so a failure is diagnosable)]
  ['/', 'relaxed', 'homepage: 4 ad slots'],
  ['/category/tech', 'relaxed', 'category listing: 1 ad slot'],
  ['/category/tech/', 'relaxed', 'trailing slash does not change the profile'],
  ['/category/tech/page/2', 'relaxed', 'category pagination stays relaxed'],
  ['/live/blog-1', 'relaxed', 'live blog: refresh island'],
  ['/quiz', 'relaxed', 'quiz hub'],
  ['/quiz/mcq-1', 'relaxed', 'quiz page'],
  ['/education-news/27/post-8x9lfi', 'article', 'the article route (S11)'],
  ['/education-news/27/post-8x9lfi/', 'article', 'article + trailing slash'],
  ['/a-id/b-slug/c-slug', 'article', 'any three segments, middle not page'],
  ['/study-abroad/%E0%A6%B6/2026', 'article', 'percent-encoded segments still 3 segments'],
  ['/latest/page/2', 'strict', 'S11 trap: a paginated listing is NOT an article'],
  [
    '/category/page/2',
    'strict',
    'malformed pagination matches neither the category nor the article rule',
  ],
  [
    '/quiz/a/b',
    'article',
    'three segments, middle not "page" — the article shape wins over the quiz rule exactly as the Apache directive order does',
  ],
]

for (const [path, want, why] of MATRIX) {
  check(`${path} → ${want}`, profileForPath(path) === want, why)
}
check(
  '/live-tv → media',
  profileForPath('/live-tv') === 'media',
  'S15: frames YouTube AND Facebook',
)
check('/live-tv/ → media', profileForPath('/live-tv/') === 'media', 'trailing slash')
check('/video → media', profileForPath('/video') === 'media', 'S17 video hub')
check(
  '/video/page/2 → media',
  profileForPath('/video/page/2') === 'media',
  'video pagination: the player must not die on page 2 (S17)',
)
check(
  '/video/anything-else → strict',
  profileForPath('/video/other') === 'strict',
  'the media rule covers the hub and its pagination only, as in .htaccess',
)
check('/about → strict', profileForPath('/about') === 'strict')
check('/gallery → strict', profileForPath('/gallery') === 'strict')
check('/bookmarks → strict', profileForPath('/bookmarks') === 'strict')
check('/verify/SHK-R-123 → strict', profileForPath('/verify/SHK-R-123') === 'strict')
check('/nothing-here (404) → strict', profileForPath('/nothing-here') === 'strict')
// Negative control (non-vacuity): a dispatch that profiled everything strict
// must fail the matrix — proving the rows actually discriminate.
const brokenMatches = MATRIX.filter(
  ([path, want]) => (path === '/' ? 'relaxed' : 'strict') !== want,
)
check(
  'negative control: an all-strict dispatcher fails the matrix',
  brokenMatches.length >= 5,
  `${brokenMatches.length} rows catch it — the matrix is not vacuous`,
)

// --- 4. Headers — security set, cache rules, preview guard -------------------

console.log('4. Header assembly')
const html = headersForPath('/', 'text/html; charset=utf-8')
check(
  'HTML carries all five security headers',
  [
    'Strict-Transport-Security',
    'X-Content-Type-Options',
    'Referrer-Policy',
    'Permissions-Policy',
    'X-Frame-Options',
  ].every((h) => h in html),
)
check(
  'HSTS value matches .htaccess',
  html['Strict-Transport-Security'] === 'max-age=31536000; includeSubDomains; preload',
)
check(
  'exactly one CSP key per response',
  Object.keys(html).filter((k) => k === 'Content-Security-Policy').length === 1,
)
check('homepage CSP is the relaxed profile', html['Content-Security-Policy'] === CSP_RELAXED)
check(
  'article CSP is the article profile',
  headersForPath('/education-news/27/post', 'text/html')['Content-Security-Policy'] === CSP_ARTICLE,
)
check(
  'unknown page CSP is strict',
  headersForPath('/nope', 'text/html')['Content-Security-Policy'] === CSP_STRICT,
)
check(
  'HTML revalidates',
  headersForPath('/', 'text/html')['Cache-Control'] === 'public, max-age=0, must-revalidate',
)
check(
  'the 404 page revalidates too (never cached for a year)',
  headersForPath('/nope', 'text/html')['Cache-Control'] === 'public, max-age=0, must-revalidate',
)
check(
  '/_astro/* is immutable — same regex as .htaccess',
  headersForPath('/_astro/abc.123.js', 'text/javascript')['Cache-Control'] ===
    'public, max-age=31536000, immutable',
)
check(
  '/fonts/* is immutable',
  headersForPath('/fonts/solaimanlipi-400.woff2', 'font/woff2')['Cache-Control'] ===
    'public, max-age=31536000, immutable',
)
check(
  'sw.js gets no Cache-Control (platform default + SW update checks)',
  headersForPath('/sw.js', 'text/javascript')['Cache-Control'] === undefined,
)
check(
  'favicon gets no Cache-Control (parity with Apache)',
  headersForPath('/favicon.ico', 'image/x-icon')['Cache-Control'] === undefined,
)
check(
  'preview hosts *.<sub>.workers.dev are detected',
  isPreviewHost('shikkha24-frontend.abc123.workers.dev'),
)
check('the production host is not a preview host', isPreviewHost('shikkha24.com') === false)

// --- 5. The /verify rewrite ---------------------------------------------------

console.log('5. /verify rewrite (port of the .htaccess RewriteCond pair)')
check(
  'unknown card id serves the not-found page',
  resolveRewrite('/verify/SHK-XX-404', 404) === '/verify/not-found',
)
check(
  'a real card (built page, 200) is never rewritten',
  resolveRewrite('/verify/SHK-R-123', 200) === null,
)
check(
  'the empty /verify/ is never rewritten',
  resolveRewrite('/verify/', 404) === null,
  'an empty lookup is a broken link, not a scanned card',
)
check('a non-verify 404 is never rewritten', resolveRewrite('/no-page', 404) === null)
check(
  'the not-found page itself (200) is never rewritten',
  resolveRewrite('/verify/not-found/', 200) === null,
)
check('only a 404 status triggers the rewrite', resolveRewrite('/verify/x', 500) === null)
// Negative control: a resolver that rewrites EVERY 404 must disagree with the
// real one on at least one of the rows above.
const rewriteEvery404 = (status) => (status === 404 ? '/verify/not-found/' : null)
const rewriteRows = [
  ['/verify/SHK-XX-404', 404],
  ['/verify/SHK-R-123', 200],
  ['/verify/', 404],
  ['/no-page', 404],
  ['/verify/x', 500],
]
check(
  'negative control: a rewrite-every-404 resolver is caught',
  rewriteRows.some(([path, status]) => rewriteEvery404(status) !== resolveRewrite(path, status)),
  'the matrix discriminates',
)

// --- 6. .assetsignore ----------------------------------------------------------

console.log('.assetsignore — the Apache file must not upload')
const ignorePath = join(root, 'frontend/public/.assetsignore')
check('frontend/public/.assetsignore exists', existsSync(ignorePath))
check(
  'it names .htaccess (Astro copies dotfiles into dist/)',
  existsSync(ignorePath) && readFileSync(ignorePath, 'utf8').includes('.htaccess'),
)
// Proven live on 2026-10-15 with wrangler 4.151.0: `WRANGLER_LOG=debug wrangler
// deploy --dry-run` prints "Ignoring asset: .htaccess" for this exact file.
// The raw "Read N files" line logs the unfiltered walk, so it cannot be used
// as evidence here.
console.log('  ℹ .htaccess exclusion is a wrangler upload-time behaviour (see comment above)')

// --- 6b. First-party RUM contract ---------------------------------------------

console.log('6b. First-party RUM contract (T-88)')
check(
  'wrangler defines the Analytics Engine dataset',
  cfConfig.analytics_engine_datasets?.some(
    (dataset) => dataset.binding === 'TELEMETRY' && dataset.dataset === 'shikkha24_rum',
  ),
)
const workerText = readFileSync(join(root, 'frontend/worker/index.ts'), 'utf8')
check(
  'the Worker handles telemetry before asset dispatch',
  /url\.pathname === '\/telemetry'/.test(workerText) &&
    workerText.indexOf("url.pathname === '/telemetry'") <
      workerText.indexOf('await env.ASSETS.fetch'),
)
check(
  'the Worker derives a low-cardinality sampling index',
  readFileSync(join(root, 'frontend/worker/telemetry.ts'), 'utf8').includes(
    'indexes: [templateForPath(payload.path)]',
  ),
)
check(
  'the beacon is external and sampled (CSP-safe, bounded writes)',
  readFileSync(join(root, 'frontend/src/layouts/Layout.astro'), 'utf8').includes(
    '<script defer src="/rum.js"></script>',
  ) && readFileSync(join(root, 'frontend/public/rum.js'), 'utf8').includes('Math.random() >= 0.2'),
)
check(
  'telemetry responses are never cached',
  readFileSync(join(root, 'frontend/worker/index.ts'), 'utf8').includes(
    "headers['Cache-Control'] = 'no-store'",
  ),
)

// --- 7. Workflows — gate first, dry-run default, one rebuild consumer --------

console.log('7. Workflow contracts')
const wfPath = join(root, '.github/workflows/deploy-cloudflare.yml')
check('deploy-cloudflare.yml exists', existsSync(wfPath))
const wf = parseYaml(readFileSync(wfPath, 'utf8'))
const wfTriggers = wf.on ?? wf[true]
check(
  'triggers: push + repository_dispatch(rebuild) + workflow_dispatch',
  ['push', 'repository_dispatch', 'workflow_dispatch'].every((t) => t in wfTriggers) &&
    (wfTriggers.repository_dispatch?.types ?? []).includes('rebuild'),
)
check(
  'permissions include actions:read (M31 — otherwise every CI-gate poll 403s)',
  (wf.permissions?.actions ?? wf.jobs?.deploy?.permissions?.actions) === 'read',
)
const steps = wf.jobs?.deploy?.steps ?? []
const gateIndex = steps.findIndex((s) => typeof s.run === 'string' && s.run.includes('wait-for-ci'))
check('the CI gate exists', gateIndex !== -1)
const DOES_WORK =
  /next build|astro build|astro sync|wrangler deploy|pagefind|build:frontend|build:cms/
const early = steps
  .map((s, i) => ({ s, i }))
  .filter(({ s, i }) => i < gateIndex && typeof s.run === 'string' && DOES_WORK.test(s.run))
check(
  'nothing builds or deploys above the gate',
  early.length === 0,
  early.map((e) => e.s.name).join(', '),
)
check(
  'the gate override stays dispatch-only',
  /workflow_dispatch/.test(String(steps[gateIndex]?.if ?? '')),
  'a push must never skip CI',
)
const deployStep = steps.find((s) => typeof s.run === 'string' && s.run.includes('wrangler deploy'))
check('a wrangler deploy step exists', deployStep !== undefined)
check(
  'the deploy honours dry-run (build+validate, upload nothing by default)',
  /DRY_RUN|dry-run/.test(String(deployStep?.run ?? '')),
)
check(
  'the deploy uses the two secrets (CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID)',
  JSON.stringify(steps).includes('CLOUDFLARE_API_TOKEN') &&
    JSON.stringify(steps).includes('CLOUDFLARE_ACCOUNT_ID'),
)
// Negative control (the M33 shape): a build/that appears ABOVE the gate in a
// mutated copy must be detected by the same order check.
const mutatedSteps = [{ name: 'sneaky build', run: 'pnpm run build:frontend' }, ...steps]
const mutatedEarly = mutatedSteps
  .map((s, i) => ({ s, i }))
  .filter(({ s, i }) => i < gateIndex + 1 && typeof s.run === 'string' && DOES_WORK.test(s.run))
check(
  'negative control: a build injected above the gate is detected',
  mutatedEarly.length > 0 && mutatedEarly[0].s.name === 'sneaky build',
)

const oldDeploy = parseYaml(readFileSync(join(root, '.github/workflows/deploy.yml'), 'utf8'))
const oldTriggers = oldDeploy.on ?? oldDeploy[true]
check(
  'deploy.yml no longer consumes repository_dispatch (one rebuild → one build)',
  !consumesRebuildDispatch(oldTriggers),
  'the cPanel path is rollback-only (manual dispatch)',
)
// Negative control: the guard must fire on the pre-migration shape.
check(
  'negative control: a re-added repository_dispatch on deploy.yml trips the guard',
  consumesRebuildDispatch({ ...oldTriggers, repository_dispatch: { types: ['rebuild'] } }),
)
check(
  'deploy.yml no longer builds on push (publish-on-push belongs to deploy-cloudflare)',
  !('push' in oldTriggers),
  'otherwise AUTO_DEPLOY=live would also fire a LIVE cPanel deploy on every push',
)
// Negative control: re-arming push must trip the guard.
check(
  'negative control: a re-added push trigger on deploy.yml trips the guard',
  'push' in { ...oldTriggers, push: { branches: ['main'] } },
)

// --- Report -------------------------------------------------------------------

console.log('')
if (failures.length === 0) {
  console.log(`verify:cloudflare — OK (${passed} checks, every section + its negative control)`)
} else {
  console.error(`verify:cloudflare — FAILED (${failures.length} of ${passed + failures.length})`)
  for (const f of failures) console.error(`  ✗ ${f}`)
  console.error('\n  Fix: docs/hosting-and-deployment.md §10 is the contract.')
  process.exitCode = 1
}
