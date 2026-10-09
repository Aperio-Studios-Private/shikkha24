/**
 * Counter-proofs for `sanitize-cms-bundle.mjs`.
 *
 * ## Why a deletion script needs its own gate
 *
 * `.sps/mistakes.md` **M18** records the project's standing lesson: an assertion
 * that cannot be made to fail is not an assertion. A script whose whole job is
 * to remove files is the worst candidate for shipping unproven — a bug here does
 * not fail a build, it deletes an archive. So every claim it makes is asserted
 * here, including the two that matter most:
 *
 *   * it removes exactly what it claims and nothing else — a nested `data/`
 *     inside `.next/` is **app data**, not the archive, and must survive;
 *   * it **refuses** a path that is not a bundle root, so a mistyped argument
 *     fails loudly instead of deleting something.
 */
import { chmodSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { sanitizeBundle } from './sanitize-cms-bundle.mjs'

let passed = 0
let failed = 0

/**
 * Assert one condition.
 *
 * @param {string} label What is being claimed.
 * @param {boolean} condition The observed result.
 * @param {string} [detail] Extra context printed on failure.
 */
function check(label, condition, detail = '') {
  if (condition) {
    passed += 1
    console.log(`  ok   ${label}`)
  } else {
    failed += 1
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

/**
 * Build a throwaway directory that looks like a standalone CMS bundle.
 *
 * @param {Record<string, string>} extra Extra relative paths to create.
 * @returns {string} the bundle root.
 */
function makeBundle(extra = {}) {
  const root = mkdtempSync(join(tmpdir(), 'sanitize-'))
  writeFileSync(join(root, 'server.js'), '// entry point')
  writeFileSync(join(root, 'package.json'), '{}')
  mkdirSync(join(root, 'data'), { recursive: true })
  writeFileSync(join(root, 'data', 'payload.db'), 'THE ARCHIVE')
  mkdirSync(join(root, 'data', 'media'), { recursive: true })
  writeFileSync(join(root, 'data', 'media', 'a.jpg'), 'image')
  writeFileSync(join(root, '.env'), 'PAYLOAD_SECRET=hunter2')
  writeFileSync(join(root, '.env.bak-1790836104'), 'PAYLOAD_SECRET=older')
  for (const [path, content] of Object.entries(extra)) {
    const full = join(root, path)
    mkdirSync(join(full, '..'), { recursive: true })
    writeFileSync(full, content)
  }
  return root
}

console.log('\n1. It removes the archive and the secrets from the bundle root')
{
  const root = makeBundle()
  const { removed } = sanitizeBundle(root)
  check('data/ is reported as removed', removed.includes('data'), removed.join(', '))
  check('.env is reported as removed', removed.includes('.env'), removed.join(', '))
  check(
    '.env.bak-* is reported as removed',
    removed.some((r) => r.startsWith('.env.bak')),
    removed.join(', '),
  )
  check('the archive is gone from disk', !existsSync(join(root, 'data')))
  check('the live secret is gone from disk', !existsSync(join(root, '.env')))
  check('the stale backup secret is gone from disk', !existsSync(join(root, '.env.bak-1790836104')))
}

console.log('\n2. ⚠️ It leaves everything else alone — including a NESTED data/')
{
  // `.next/` legitimately contains directories called `data`. Those are app
  // data produced by the build, not the editorial archive. A `data/`-matching
  // implementation would delete them and break the bundle.
  const root = makeBundle({ '.next/standalone/app/data/route.js': 'app data' })
  sanitizeBundle(root)
  check('the app itself survives', existsSync(join(root, 'server.js')))
  check('package.json survives', existsSync(join(root, 'package.json')))
  check(
    'a nested .next/**/data survives — only the ROOT data/ is the archive',
    existsSync(join(root, '.next', 'standalone', 'app', 'data', 'route.js')),
    'a recursive implementation would have deleted this',
  )
}

console.log('\n3. ⚠️ It refuses a path that is not a bundle root')
{
  // The mistyped-argument case. `server.js` is the only thing that distinguishes
  // a bundle from any other directory, so its absence must stop the deletion.
  const notABundle = mkdtempSync(join(tmpdir(), 'not-a-bundle-'))
  mkdirSync(join(notABundle, 'data'), { recursive: true })
  writeFileSync(join(notABundle, 'data', 'payload.db'), 'NOT AN ARCHIVE')
  let threw = false
  try {
    sanitizeBundle(notABundle)
  } catch {
    threw = true
  }
  check('a directory with no server.js is refused', threw)
  check('and nothing in it was deleted', existsSync(join(notABundle, 'data', 'payload.db')))
}

console.log('\n4. It is idempotent — a second run is a no-op, not an error')
{
  const root = makeBundle()
  sanitizeBundle(root)
  let second = null
  let threw = false
  try {
    second = sanitizeBundle(root)
  } catch {
    threw = true
  }
  check('the second run does not throw', !threw)
  check(
    'the second run removes nothing',
    second?.removed.length === 0,
    `removed: ${second?.removed.join(', ')}`,
  )
  check('the bundle still has its entry point', existsSync(join(root, 'server.js')))
}

console.log('\n5. ⚠️ When it cannot delete, it fails loudly instead of claiming success')
{
  // A no-op implementation would pass 1–4 while never removing anything. Make the
  // removal genuinely impossible by making the bundle root read-only, so `rmSync`
  // cannot unlink inside it, and require the call to THROW. Silence here would
  // mean a deploy that believes it stripped the secret while the secret is still
  // in the artifact.
  const root = makeBundle()
  chmodSync(root, 0o555)
  let threw = false
  try {
    sanitizeBundle(root)
  } catch {
    threw = true
  } finally {
    chmodSync(root, 0o755)
  }
  check('an undeletable archive makes sanitise throw, not pass silently', threw)
  check(
    'and the secret is genuinely still there — so the throw was honest',
    existsSync(join(root, '.env')),
  )
}

console.log(`\n${failed === 0 ? '✅' : '❌'} ${passed} passed, ${failed} failed`)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(failed === 0 ? 0 : 1)
}
