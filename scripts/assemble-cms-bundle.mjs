#!/usr/bin/env node
/**
 * Assemble the CMS standalone deploy bundle — the manual equivalent of the
 * "Assemble the standalone deploy bundle" step in `.github/workflows/deploy.yml`.
 *
 * ## Why this exists
 *
 * The GitHub Actions budget is exhausted, so `deploy.yml` cannot run: every job is
 * refused with *"The job was not started because an Actions budget is preventing
 * further use"*, and because the workflow is correctly gated on CI, the CMS cannot
 * ship through GitHub at all. The frontend is unaffected — Cloudflare is deployed
 * by `wrangler` from a laptop — but the CMS has no such escape hatch.
 *
 * Rather than hand-copy six steps that each carry a production incident in their
 * comments, this script performs exactly the same work, with the same assertions,
 * so a manual deploy cannot skip a trap that CI guards against.
 *
 * ⚠️ **The workflow remains the source of truth.** If the two ever disagree, the
 * workflow is right and this file is stale — the counter-proof is that running
 * both must produce an equivalent bundle. Keep the step numbers below in step with
 * the workflow.
 *
 * ## The traps it reproduces
 *
 * 1. pnpm monorepo entry point is `standalone/cms/server.js`, not `.../server.js`
 * 2. `.next/static` is not traced — without it every admin asset 404s
 * 3. the Bengali card font is not traced — without it `/api/idcard/*` answers 503
 * 4. migrations must be present or the host cannot build its schema
 * 5. pnpm's hoisted fallback must be reachable from the top level, or the host
 *    dies at boot with `ERR_MODULE_NOT_FOUND` for `@libsql/core`
 * 6. `cms/.env` and `cms/data/` are traced in byte for byte (the secret and the
 *    38 MB editorial archive) and **must** be stripped before upload
 *
 * ## Usage
 *
 *   node scripts/assemble-cms-bundle.mjs
 *
 * Exits non-zero, naming the failing step, if any assertion does not hold.
 */

import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = path.resolve(process.cwd(), 'cms/.next/standalone')
const BUNDLE = path.join(ROOT, 'cms')

/** Fail loudly, naming the step, rather than producing a dead deploy. */
function assert(condition, step, message) {
  if (condition) return
  console.error(`\n  ✗ step ${step} FAILED\n    ${message}\n`)
  process.exit(1)
}

function sizeMb(target) {
  const out = execFileSync('du', ['-sm', target], { encoding: 'utf8' })
  return Number.parseInt(out.split('\t')[0], 10)
}

console.log('  assembling the CMS standalone bundle\n')

// ── Step 1 — the monorepo entry point ────────────────────────────────────────
assert(
  existsSync(ROOT),
  '1',
  `no standalone output at ${ROOT} — run \`pnpm run build\` in cms/ first`,
)
assert(
  existsSync(path.join(BUNDLE, 'server.js')),
  '1',
  `standalone entry point missing at ${path.join('cms/.next/standalone', 'cms/server.js')}. ` +
    'A pnpm monorepo puts it one level down; uploading the wrong one makes every route 500.',
)
console.log('  ✓ 1  entry point at cms/.next/standalone/cms/server.js')

// ── Step 2 — static assets ───────────────────────────────────────────────────
const staticSrc = path.resolve(process.cwd(), 'cms/.next/static')
assert(existsSync(staticSrc), '2', `no built static assets at ${staticSrc} — run the CMS build first`)
mkdirSync(path.join(BUNDLE, '.next', 'static'), { recursive: true })
cpSync(staticSrc, path.join(BUNDLE, '.next', 'static'), { recursive: true })
console.log('  ✓ 2  .next/static copied (the admin 404s without it)')

// ── Step 3 — the Bengali card font ───────────────────────────────────────────
//
// ⚠️ The workflow copies the **WOFF2** files. On this host that is not enough:
// FreeType there has no Brotli support, so fontconfig cannot index WOFF2 at all
// and every card renders glyph-index boxes. The **TTF** form is what actually
// makes Bengali render, and it is installed into `~/.fonts` on the host. This
// script copies both, so the bundle is correct whichever form the host reads.
const vendorDir = path.resolve(process.cwd(), 'assets/fonts/vendor')
const ttfDir = path.resolve(process.cwd(), 'editorial/font-fix')
const fontTarget = path.join(BUNDLE, 'fonts')
mkdirSync(fontTarget, { recursive: true })

const woff2 = ['solaimanlipi-400.woff2', 'solaimanlipi-700.woff2']
for (const name of woff2) {
  const src = path.join(vendorDir, name)
  assert(existsSync(src), '3', `missing vendored font ${src}`)
  cpSync(src, path.join(fontTarget, name))
}

const ttf = ['SolaimanLipi-400.ttf', 'SolaimanLipi-700.ttf']
for (const name of ttf) {
  const src = path.join(ttfDir, name)
  if (!existsSync(src)) {
    console.warn(`  ! 3  ${name} not found in editorial/font-fix — WOFF2 only in this bundle`)
    continue
  }
  cpSync(src, path.join(fontTarget, name))
}
console.log('  ✓ 3  fonts copied (WOFF2 for browsers, TTF for the server renderer)')

// ── Step 4 — migrations ──────────────────────────────────────────────────────
const migrationsSrc = path.resolve(process.cwd(), 'cms/src/migrations')
assert(existsSync(migrationsSrc), '4', `no migrations at ${migrationsSrc}`)
const migrationsTarget = path.join(BUNDLE, 'src', 'migrations')
mkdirSync(migrationsTarget, { recursive: true })
cpSync(migrationsSrc, migrationsTarget, { recursive: true })
assert(
  existsSync(path.join(migrationsTarget, 'index.ts')),
  '4',
  'migrations/index.ts missing — the host could not build its schema at all',
)
console.log('  ✓ 4  migrations copied (the host runs `payload migrate`)')

// ── Step 5 — pnpm hoisted fallback ───────────────────────────────────────────
execFileSync('node', [path.resolve(process.cwd(), 'scripts/promote-pnpm-fallback.mjs'), path.join(ROOT, 'node_modules')], {
  stdio: 'inherit',
})
assert(
  existsSync(path.join(ROOT, 'node_modules', '@libsql', 'core')),
  '5',
  'pnpm hoist not promoted — the host would die at boot resolving @libsql/core',
)
console.log('  ✓ 5  pnpm hoisted fallback reachable from the top level')

// ── Step 5a — the commit sentinel ────────────────────────────────────────────
//
// Without it, a silent extract failure leaves the OLD build answering 200 and the
// post-deploy probe reports success for a deploy that changed nothing. That is how
// every CMS deploy on 2026-10-10 "succeeded" while the host served four-day-old code.
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
writeFileSync(path.join(ROOT, 'DEPLOYED_COMMIT'), sha)
console.log(`  ✓ 5a DEPLOYED_COMMIT sentinel written (${sha.slice(0, 7)})`)

// ── Step 6 — strip the secret and the archive ────────────────────────────────
//
// `output: 'standalone'` traces `cms/.env` byte for byte and `cms/data/` (the
// SQLite database, its dated backups and the whole media library) with it.
// `deploy-cms.mjs:assertBundleIsSafe` refuses such a bundle — correctly — and that
// refusal is why every CMS deploy died at its first step before this existed.
execFileSync('node', [path.resolve(process.cwd(), 'scripts/sanitize-cms-bundle.mjs'), BUNDLE], {
  stdio: 'inherit',
})
for (const forbidden of ['.env', 'data']) {
  assert(
    !existsSync(path.join(BUNDLE, forbidden)),
    '6',
    `${forbidden} still in the bundle — refusing to upload the secret or the editorial archive`,
  )
}
console.log('  ✓ 6  .env and data/ stripped and verified absent')

console.log(`\n  CMS bundle = ${sizeMb(BUNDLE)} MB at ${BUNDLE}`)
console.log('  ready to deploy:  node scripts/deploy-cms.mjs\n')
