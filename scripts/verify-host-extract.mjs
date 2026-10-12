/**
 * Counter-proof for scripts/host-extract.sh — the cron extractor that closes
 * the T-14/T-15 "the API can't extract" gap.
 *
 * The whole point of the asset is that it must FAIL LOUDLY and touch nothing
 * when it cannot do its job — a silent skip is the exact defect it replaces. So
 * every scenario here is chosen to make the script fail in a way a broken
 * version would pass:
 *
 *   1. happy        — a valid zip is extracted, index.html lands, zip removed, exit 0
 *   2. supersede    — two zips; the newest is extracted, BOTH are removed, exit 0
 *   3. no-unzip     — `unzip` absent → exit 1, and NEITHER the zip nor a
 *                     pre-existing index.html is touched
 *   4. lying-unzip  — `unzip` exits 0 but writes nothing (the T-15 shape) →
 *                     exit 1 because index.html did not land, archive KEPT
 *   5. no-archive   — nothing to extract → exit 0, silent (the normal gap)
 *
 * Scenarios 3 and 4 are the load-bearing ones: they prove the script does not
 * trust a green exit code, which is the lesson M32/T-15 exist to teach.
 *
 * Paths are injected via SHIKKHA24_DOCROOT / SHIKKHA24_LOGDIR so the real host
 * paths are never touched. `unzip` availability is controlled by PATH.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'host-extract.sh')

let fail = 0
const ok = (cond, label) => {
  if (cond) {
    console.log(`PASS  ${label}`)
  } else {
    fail += 1
    console.log(`FAIL  ${label}`)
  }
}

/** Run the extractor with a controlled PATH and env; returns { code }. */
function run({ docroot, logdir, path }) {
  rmSync(logdir, { recursive: true, force: true })
  mkdirSync(logdir, { recursive: true })
  try {
    execFileSync('/bin/sh', [SCRIPT], {
      env: {
        ...process.env,
        PATH: path,
        SHIKKHA24_DOCROOT: docroot,
        SHIKKHA24_LOGDIR: logdir,
        SHIKKHA24_SITE_URL: 'http://127.0.0.1:1',
      },
      stdio: 'pipe',
    })
    return { code: 0 }
  } catch (error) {
    return { code: error.status ?? 1 }
  }
}

const readLog = (logdir) => {
  const p = join(logdir, 'extract.log')
  return existsSync(p) ? readFileSync(p, 'utf8') : ''
}

/** Build a zip containing the given {relpath: body} files with `zip`. */
function makeZip(dir, name, files) {
  const work = mkdtempSync(join(tmpdir(), 'zip-src-'))
  for (const [rel, body] of Object.entries(files)) {
    const dest = join(work, rel)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, body)
  }
  const out = join(dir, name)
  execFileSync('zip', ['-rq', out, '.'], { cwd: work, stdio: 'pipe' })
  rmSync(work, { recursive: true, force: true })
  return out
}

const root = mkdtempSync(join(tmpdir(), 'host-extract-test-'))

// A PATH that has every tool the script uses EXCEPT unzip and curl — how
// "unzip is not installed" is faked without uninstalling anything.
const fakeBin = join(root, 'fakebin')
mkdirSync(fakeBin, { recursive: true })
for (const tool of ['mkdir', 'date', 'ls', 'head', 'wc', 'rm', 'basename', 'dirname', 'cat']) {
  try {
    const real = execFileSync('sh', ['-c', `command -v ${tool}`], { encoding: 'utf8' }).trim()
    if (real) execFileSync('ln', ['-sf', real, join(fakeBin, tool)])
  } catch {
    // tool genuinely absent on this box; the script does not need it here
  }
}
const NO_UNZIP_PATH = fakeBin

// A shim `unzip` that lies: exits 0, writes nothing — the T-15 no-op shape.
const shimDir = join(root, 'shim')
mkdirSync(shimDir, { recursive: true })
writeFileSync(join(shimDir, 'unzip'), '#!/bin/sh\nexit 0\n')
execFileSync('chmod', ['+x', join(shimDir, 'unzip')])
const LYING_UNZIP_PATH = `${shimDir}:${process.env.PATH}`

try {
  /* 1. happy */
  {
    const docroot = join(root, 'happy')
    mkdirSync(docroot, { recursive: true })
    makeZip(docroot, 'frontend-100.zip', {
      'index.html': '<title>NEW BUILD</title>',
      '_astro/app.js': 'x',
    })
    const { code } = run({ docroot, logdir: join(root, 'happy-log'), path: process.env.PATH })
    ok(code === 0, 'happy: exits 0')
    ok(existsSync(join(docroot, 'index.html')), 'happy: index.html landed')
    ok(
      readFileSync(join(docroot, 'index.html'), 'utf8').includes('NEW BUILD'),
      'happy: index.html is the new build',
    )
    ok(existsSync(join(docroot, '_astro', 'app.js')), 'happy: nested asset landed')
    ok(!existsSync(join(docroot, 'frontend-100.zip')), 'happy: archive removed after extract')
    ok(
      existsSync(join(root, 'happy-log', 'extract-heartbeat.txt')),
      'happy: heartbeat written (cron proves itself able)',
    )
  }

  /* 2. supersede — two zips, newest wins, both removed */
  {
    const docroot = join(root, 'supersede')
    mkdirSync(docroot, { recursive: true })
    makeZip(docroot, 'frontend-200.zip', { 'index.html': 'OLD' })
    execFileSync('touch', ['-t', '202001010000', join(docroot, 'frontend-200.zip')])
    makeZip(docroot, 'frontend-300.zip', { 'index.html': 'NEWEST' })
    const { code } = run({ docroot, logdir: join(root, 'supersede-log'), path: process.env.PATH })
    ok(code === 0, 'supersede: exits 0')
    ok(
      readFileSync(join(docroot, 'index.html'), 'utf8') === 'NEWEST',
      'supersede: newest build is live',
    )
    ok(!existsSync(join(docroot, 'frontend-200.zip')), 'supersede: older archive removed')
    ok(
      !existsSync(join(docroot, 'frontend-300.zip')),
      'supersede: newest archive removed after extract',
    )
  }

  /* 3. no-unzip — the load-bearing fail-loud: exit 1, touch NOTHING */
  {
    const docroot = join(root, 'no-unzip')
    mkdirSync(docroot, { recursive: true })
    writeFileSync(join(docroot, 'index.html'), 'PRE-EXISTING GOOD SITE')
    makeZip(docroot, 'frontend-400.zip', { 'index.html': 'WOULD REPLACE' })
    const { code } = run({ docroot, logdir: join(root, 'no-unzip-log'), path: NO_UNZIP_PATH })
    const log = readLog(join(root, 'no-unzip-log'))
    ok(code === 1, 'no-unzip: exits 1 (does not skip silently)')
    ok(/not installed|ERROR/i.test(log), 'no-unzip: logs the missing-tool reason')
    ok(
      !existsSync(join(root, 'no-unzip-log', 'extract-heartbeat.txt')),
      'no-unzip: NO heartbeat — a dead cron must not vouch for itself',
    )
    ok(existsSync(join(docroot, 'frontend-400.zip')), 'no-unzip: archive left in place')
    ok(
      readFileSync(join(docroot, 'index.html'), 'utf8') === 'PRE-EXISTING GOOD SITE',
      'no-unzip: existing site untouched',
    )
  }

  /* 4. lying-unzip — exit 0 but writes nothing → must fail, archive kept */
  {
    const docroot = join(root, 'lying')
    mkdirSync(docroot, { recursive: true })
    makeZip(docroot, 'frontend-500.zip', { 'index.html': 'NEVER LANDS' })
    const { code } = run({ docroot, logdir: join(root, 'lying-log'), path: LYING_UNZIP_PATH })
    const log = readLog(join(root, 'lying-log'))
    ok(code === 1, 'lying-unzip: exits 1 (does not trust unzip exit code)')
    ok(
      log.includes('missing or empty') || log.includes('unzip failed'),
      'lying-unzip: logs why it failed',
    )
    ok(
      existsSync(join(docroot, 'frontend-500.zip')),
      'lying-unzip: archive kept for a by-hand extract',
    )
    ok(!existsSync(join(docroot, 'index.html')), 'lying-unzip: no phantom index.html claimed')
  }

  /* 5. no-archive — the normal gap between publishes: silent exit 0 */
  {
    const docroot = join(root, 'empty')
    mkdirSync(docroot, { recursive: true })
    writeFileSync(join(docroot, 'index.html'), 'LIVE SITE')
    const { code } = run({ docroot, logdir: join(root, 'empty-log'), path: process.env.PATH })
    const log = readLog(join(root, 'empty-log'))
    ok(code === 0, 'no-archive: exits 0')
    ok(log.includes('nothing to do'), 'no-archive: says nothing to do')
    ok(
      readFileSync(join(docroot, 'index.html'), 'utf8') === 'LIVE SITE',
      'no-archive: site untouched',
    )
  }
} finally {
  rmSync(root, { recursive: true, force: true })
}

console.log(
  `\n${fail === 0 ? 'Every scenario behaved — the extractor fails loud and only when it must.' : `${fail} scenario(s) FAILED.`}`,
)
process.exit(fail === 0 ? 0 : 1)
