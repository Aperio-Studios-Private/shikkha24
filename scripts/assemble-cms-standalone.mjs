#!/usr/bin/env node
/**
 * Assemble the CMS standalone bundle for hosts that run
 * `node .next/standalone/cms/server.js` directly (Render today, the same
 * bundle shape the DianaHost deploy workflow assembles in bash).
 *
 * Why this exists — four assets Next's `output: 'standalone'` tracing does NOT
 * copy into the bundle. Each one reached production broken exactly once; see
 * .github/workflows/deploy.yml "Assemble the standalone deploy bundle" for the
 * full history:
 *
 *   1. .next/static            → the admin loads, every JS/CSS asset 404s
 *   2. assets/fonts/vendor/*   → /api/idcard/:id.png answers 503 (Bengali card
 *                                font is read relative to the bundle root)
 *   3. src/migrations          → `payload migrate` finds nothing; the host
 *                                cannot build or migrate its schema
 *   4. public/                 → brand-icon.svg 404s (Next also skips this)
 *
 * pnpm's hoisted fallback promotion (deploy.yml step 5) is NOT needed here:
 * Render builds with `pnpm install` in cms/ and Turbopack's standalone output
 * already carries a real node_modules tree for the runtime (verified on the
 * live service — the server boots and serves API routes).
 *
 * Usage: node scripts/assemble-cms-standalone.mjs [repo-root]
 * Exits non-zero listing anything missing instead of producing a dead bundle.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.argv[2] ?? '.')
const bundle = path.join(root, 'cms', '.next', 'standalone', 'cms')

const failures = []

/** Copy a directory tree into the bundle, creating the target first. */
function copyDir(from, to, label) {
  if (!existsSync(from)) {
    failures.push(`${label}: source missing: ${from}`)
    return
  }
  mkdirSync(to, { recursive: true })
  cpSync(from, to, { recursive: true })
}

/** Copy files, checking each one exists. */
function copyFiles(fromDir, files, toDir, label) {
  mkdirSync(toDir, { recursive: true })
  for (const file of files) {
    const src = path.join(root, fromDir, file)
    if (!existsSync(src)) {
      failures.push(`${label}: source missing: ${src}`)
      continue
    }
    cpSync(src, path.join(toDir, file))
  }
}

/** Assert a directory in the bundle is non-empty after the copy. */
function assertPopulated(dir, label) {
  if (!existsSync(dir) || readdirSync(dir).length === 0) {
    failures.push(`${label}: bundle path empty or missing: ${dir}`)
  }
}

if (!existsSync(path.join(bundle, 'server.js'))) {
  failures.push(`entry point missing: ${path.join(bundle, 'server.js')}`)
}

// 1+4. Browser assets the admin cannot load without.
copyDir(path.join(root, 'cms', '.next', 'static'), path.join(bundle, '.next', 'static'), 'static')
assertPopulated(path.join(bundle, '.next', 'static'), 'static')
copyDir(path.join(root, 'cms', 'public'), path.join(bundle, 'public'), 'public')

// 2. The Bengali ID-card font, read at runtime relative to the bundle root.
copyFiles(
  'assets/fonts/vendor',
  ['solaimanlipi-400.woff2', 'solaimanlipi-700.woff2'],
  path.join(bundle, 'fonts'),
  'fonts',
)

// 3. Migrations for `payload migrate` (schema bootstrap / future migrations).
copyDir(
  path.join(root, 'cms', 'src', 'migrations'),
  path.join(bundle, 'src', 'migrations'),
  'migrations',
)
assertPopulated(path.join(bundle, 'src', 'migrations'), 'migrations')

if (failures.length > 0) {
  console.error('Bundle assembly FAILED:')
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}

const sizeMB = (statSync(bundle).size / (1024 * 1024)).toFixed(1)
console.log(`CMS standalone bundle assembled at ${bundle} (${sizeMB} MB top level)`)
