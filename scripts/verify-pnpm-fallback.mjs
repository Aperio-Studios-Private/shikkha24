#!/usr/bin/env node
/**
 * Counter-proof for the pnpm fallback promotion — `node scripts/verify-pnpm-fallback.mjs`
 *
 * ## The defect this prevents
 *
 * `deploy.yml` promoted pnpm's hoisted fallback with:
 *
 * ```sh
 * cp -Rn "$ROOT/node_modules/.pnpm/node_modules/." "$ROOT/node_modules/"
 * ```
 *
 * Those are **symlinks whose targets are relative to their own depth**. Copying
 * the contents one level up moves the link and leaves the target string alone,
 * so every link dangles. On 2026-10-04 this failed the CMS deploy at its own
 * gate (`::error::pnpm hoist not promoted`), the first time the step had run.
 *
 * Dereferencing instead is not the answer: the fallback measures 224 KB, but
 * dereferenced it is **3.1 GB** because every link refers into a store that is
 * already present.
 *
 * ## What is asserted, and what would make it vacuous
 *
 * The fixture is a **real symlink farm with the same shape as pnpm's**, not a
 * list of strings — so a check that passes here says something about symlink
 * resolution. Section 3 feeds the same fixture to the old `cp -R` and requires
 * it to **fail**, because otherwise "the new script works" would be equally
 * consistent with "the fixture cannot detect the defect" (M18).
 */
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { promotePnpmFallback, unresolvedFallbackEntries } from './promote-pnpm-fallback.mjs'

let failures = 0
const check = (label, actual, shouldPass = true) => {
  const ok = actual === shouldPass
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
}

/**
 * Build a `node_modules` shaped exactly like a pnpm Next.js standalone bundle.
 *
 * - the store `…/.pnpm/@libsql+core@0.14.0/node_modules/@libsql/core` — the real package
 * - the hoisted fallback `…/.pnpm/node_modules/@libsql/core` — a symlink to it,
 *   with the `../../` depth pnpm actually writes
 * - `@libsql/client` already copied in as a **real directory**, which is what
 *   Turbopack does and what forces the per-child form
 *
 * @returns {string} the fixture's `node_modules`
 */
function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'pnpmfb-'))
  const nm = join(root, 'node_modules')
  const store = join(nm, '.pnpm', '@libsql+core@0.14.0', 'node_modules', '@libsql', 'core')
  mkdirSync(store, { recursive: true })
  writeFileSync(join(store, 'package.json'), '{"name":"@libsql/core","main":"index.js"}')
  writeFileSync(join(store, 'index.js'), 'module.exports = {}')

  // pnpm writes the fallback link at depth .pnpm/node_modules/@scope/pkg, so the
  // target is `../../` (two levels up, landing on .pnpm/).
  const fallbackScope = join(nm, '.pnpm', 'node_modules', '@libsql')
  mkdirSync(fallbackScope, { recursive: true })
  symlinkSync(relative(fallbackScope, store), join(fallbackScope, 'core'), 'dir')

  // An unscoped entry too — those get the whole-dir form.
  const unscopedStore = join(nm, '.pnpm', 'sharp@0.33.5', 'node_modules', 'sharp')
  mkdirSync(unscopedStore, { recursive: true })
  writeFileSync(join(unscopedStore, 'index.js'), '')
  const fallbackFlat = join(nm, '.pnpm', 'node_modules')
  symlinkSync(relative(fallbackFlat, unscopedStore), join(fallbackFlat, 'sharp'), 'dir')

  // Turbopack's real directory — the reason a whole-dir link is not enough.
  mkdirSync(join(nm, '@libsql', 'client'), { recursive: true })
  writeFileSync(join(nm, '@libsql', 'client', 'index.js'), '')

  // An UNTRACED entry, exactly as Next leaves one. The fallback directory is
  // copied wholesale, so it also lists packages the bundle does not contain:
  // `@esbuild/linux-x64` is a build-time binary, its store directory was never
  // traced, and its fallback link dangles *before this script runs*.
  //
  // This is what failed the deploy on 2026-10-04 — the first version of the
  // gate demanded that every fallback entry resolve, which asserts something
  // untrue about a real bundle. Without this fixture line, the assertion could
  // be tightened again and pass, and the failure would return on the next run.
  symlinkSync(
    relative(
      fallbackScope,
      join(nm, '.pnpm', '@esbuild+linux-x64@0.21.5', 'node_modules', '@esbuild', 'linux-x64'),
    ),
    join(fallbackScope, 'linux-x64'),
    'dir',
  )

  return nm
}

console.log('=== the fixture is a real symlink farm, and it starts broken ===')
{
  const nm = makeFixture()
  check('the fixture has the pnpm fallback', existsSync(join(nm, '.pnpm', 'node_modules')))
  check('and @libsql/core does NOT resolve yet', existsSync(join(nm, '@libsql', 'core')), false)
  check(
    "the whole-dir form would clobber Turbopack's real @libsql/client",
    existsSync(join(nm, '@libsql', 'client', 'index.js')),
  )
  rmSync(join(nm, '..'), { recursive: true, force: true })
}

console.log('\n=== promotion makes every entry resolve ===')
{
  const nm = makeFixture()
  const result = promotePnpmFallback(nm)
  check('it reports work to do', result.linked > 0)
  check('it did not consider the fallback missing', result.missingFallback, false)

  const { checked, untraced, broken } = unresolvedFallbackEntries(nm)
  check('nothing is left dangling', broken.length === 0, true)
  if (broken.length) console.log(`       dangling: ${broken.join(', ')}`)
  check('the fixture actually had entries to check', checked >= 2)

  console.log('\n=== an UNTRACED entry is skipped, not reported broken ===')
  // The esbuild case. `@esbuild/linux-x64` has no store directory in the
  // bundle, so it is not this step's business — reporting it would fail every
  // deploy, and the fix would have been to delete the check.
  check('the untraced entry is counted separately', untraced === 1, true)
  check('and it is NOT reported as broken', broken.includes(join('@esbuild', 'linux-x64')), false)
  check('the traced @libsql/core IS checked', checked >= 2)

  console.log('\n=== promotion did not destroy what was already there ===')
  check(
    "Turbopack's real @libsql/client survived",
    existsSync(join(nm, '@libsql', 'client', 'index.js')),
  )
  check('the unscoped entry resolves too', existsSync(join(nm, 'sharp')))
  check(
    'the store itself is untouched',
    existsSync(
      join(nm, '.pnpm', '@libsql+core@0.14.0', 'node_modules', '@libsql', 'core', 'index.js'),
    ),
  )

  console.log('\n=== links are RELATIVE, so the bundle stays relocatable ===')
  // An absolute link would point at the CI runner's disk and 404 on the host.
  const link = join(nm, 'sharp')
  const target = readlinkSync(link)
  check('the unscoped link is relative', !target.startsWith('/'), true)
  check('and it points back into the fallback', target.startsWith('.pnpm'), true)
  check('a second run is a no-op (idempotent)', promotePnpmFallback(nm).linked === 0)
  rmSync(join(nm, '..'), { recursive: true, force: true })
}

console.log('\n=== a bundle with no fallback is a no-op, not a crash ===')
{
  const bare = join(mkdtempSync(join(tmpdir(), 'pnpmfb-bare-')), 'node_modules')
  mkdirSync(bare, { recursive: true })
  const result = promotePnpmFallback(bare)
  check('it reports the fallback missing', result.missingFallback)
  check('and links nothing', result.linked === 0)
  check('and reports nothing broken', unresolvedFallbackEntries(bare).broken.length === 0)
  rmSync(join(bare, '..'), { recursive: true, force: true })
}

console.log('\n=== COUNTER-PROOF: the old cp -R must fail on this same fixture ===')
{
  // Without this, "the new script works" would be equally consistent with
  // "the fixture cannot detect the defect at all" — which is M18.
  const nm = makeFixture()
  execFileSync('cp', ['-Rn', `${join(nm, '.pnpm', 'node_modules', '.')}/`, `${join(nm)}/`])
  check('cp -R leaves @libsql/core dangling', existsSync(join(nm, '@libsql', 'core')), false)
  check(
    'and the old gate would have caught it',
    unresolvedFallbackEntries(nm).broken.includes(join('@libsql', 'core')),
  )
  // And the new script must be able to REPAIR what cp -R broke.
  promotePnpmFallback(nm)
  check('promote repairs the cp -R damage', existsSync(join(nm, '@libsql', 'core')))
  rmSync(join(nm, '..'), { recursive: true, force: true })
}

console.log(
  failures === 0 ? '\nAll pnpm fallback checks passed.' : `\n${failures} check(s) FAILED.`,
)
process.exit(failures === 0 ? 0 : 1)
