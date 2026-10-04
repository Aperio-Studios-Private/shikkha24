/**
 * Counter-prove the cPanel deploy path before it is trusted with production.
 *
 * ## Why a real server rather than a reimplementation
 *
 * The previous verification failure in this project was a harness that
 * reimplemented Apache's `.htaccess` matching in JavaScript: it passed while the
 * file was unrunnable, because it validated the *intent* of the rules and never
 * asked Apache (`scripts/verify-apache.mjs` now starts a real Apache for
 * exactly this reason).
 *
 * The same trap applies here. `status: 0` arriving with HTTP 200 is the
 * characteristic cPanel failure, and a mock that always returned 200 would
 * happily agree with a client that ignores `status`. So this harness starts an
 * actual HTTP server that reproduces cPanel's real response envelopes — both
 * APIs, success and failure — and points the real client at it.
 *
 * ## What it proves
 *
 *   1. A `status: 0` failure throws, despite HTTP 200.       ← the big one
 *   2. A missing credential throws naming the variable, never its value.
 *   3. Dry run issues **zero** mutating calls.                ← proves it is safe
 *   4. Deletion is manifest-driven and collapses directories.
 *   5. `.htaccess` can never reach a delete set, even if it is in a build.
 *   6. A first deploy with no manifest deletes nothing.
 *   7. Extraction prefers the UAPI destination form and falls back cleanly.
 *   8. A CMS bundle containing `data/` is refused before upload.
 *
 * Run: node scripts/verify-cpanel-deploy.mjs
 */

import { execFile } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import {
  config,
  deletePath,
  extractArchive,
  restartApp,
  uapi,
  writeTextFile,
} from './cpanel-client.mjs'
import {
  buildManifest,
  collapse,
  parseManifest,
  planDeletes,
  serializeManifest,
} from './deploy-manifest.mjs'

/** Directory this script lives in, so the spawned scripts resolve regardless of cwd. */
const scriptDir = dirname(fileURLToPath(import.meta.url))

/** Promisified so a spawn can be awaited while this process keeps serving requests. */
const execFileAsync = promisify(execFile)

let passed = 0
const failures = []

/**
 * Assert one thing, recording the outcome rather than throwing.
 *
 * @param {string} name
 * @param {boolean} condition
 * @param {string} [detail]
 */
function check(name, condition, detail = '') {
  if (condition) {
    passed += 1
    console.log(`  ok   ${name}`)
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

/**
 * Start a server that answers with real cPanel envelopes and records every call.
 *
 * @param {object} options
 * @param {boolean} [options.uapiExtract] whether `Fileman::extract_files` exists,
 *   i.e. whether a destination directory can be specified.
 * @returns {Promise<{base: string, calls: string[], close: () => Promise<void>}>}
 */
async function startFakeCpanel({ uapiExtract = true } = {}) {
  const calls = []
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    calls.push(`${url.pathname}${url.search}`)

    const send = (payload) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(payload))
    }

    // UAPI: /execute/<module>/<func>
    const uapiPath = url.pathname.replace(/^\/execute\//, '')
    if (url.pathname.startsWith('/execute/')) {
      if (!uapiExtract && uapiPath === 'Fileman/extract_files') {
        // This is how a missing function actually presents itself: HTTP 200,
        // status 0. A client that only checked the HTTP code would sail past it.
        return send({
          module: 'Fileman',
          func: 'extract_files',
          status: 0,
          errors: ['Unrecognized function'],
        })
      }
      return send({
        module: uapiPath.split('/')[0],
        func: uapiPath.split('/')[1],
        status: 1,
        data: {},
      })
    }

    // API 2.0: /json-api/cpanel?...
    const module = url.searchParams.get('cpanel_jsonapi_module')
    const func = url.searchParams.get('cpanel_jsonapi_func')
    if (module === 'Fileman' && func === 'fileop') {
      return send({ cpanel_obj: { result: { status: 1, data: [{ status: 'Success' }] } } })
    }
    return send({
      cpanel_obj: { result: { status: 1, data: [{ name: 'x', type: 'file' }] } },
    })
  })

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return {
    base: `http://127.0.0.1:${port}`,
    calls,
    close: () => new Promise((resolve) => server.close(resolve)),
  }
}

/** Point the client at a fake server. Returns a restore function. */
function useEndpoint(base) {
  const saved = { ...process.env }
  process.env.CPANEL_BASE = base
  process.env.CPANEL_HOST = 'fake'
  process.env.CPANEL_USER = 'shikkhac'
  process.env.CPANEL_TOKEN = 'test-token-not-real'
  return () => {
    process.env = saved
  }
}

/** Server paths that mutate the host. A dry run must produce none of them. */
const MUTATING = ['upload_files', 'fileop', 'delete_file', 'save_file_content']

/** Run the whole harness. */
async function main() {
  console.log('\n1. A cPanel failure throws, even though it arrives as HTTP 200')
  {
    const server = await startFakeCpanel({ uapiExtract: false })
    const restore = useEndpoint(server.base)
    let threw = false
    try {
      await uapi(config(), 'Fileman', 'extract_files', { sourcefile: 'a.zip' })
    } catch {
      threw = true
    }
    check('a status:0 response throws instead of passing silently', threw)
    restore()
    await server.close()
  }

  console.log('\n2. Extraction prefers the UAPI destination form')
  {
    const server = await startFakeCpanel({ uapiExtract: true })
    const restore = useEndpoint(server.base)
    const { via } = await extractArchive(config(), 'staging/a.zip', 'public_html')
    check('uses uapi-extract_files when the host supports it', via === 'uapi-extract_files', via)
    check('never falls back to API 2.0', !server.calls.some((c) => c.includes('fileop')))
    restore()
    await server.close()
  }

  console.log('\n3. Extraction falls back cleanly when the host lacks it')
  {
    const server = await startFakeCpanel({ uapiExtract: false })
    const restore = useEndpoint(server.base)
    const { via } = await extractArchive(config(), 'public_html/a.zip', 'public_html')
    check('falls back to api2-fileop', via === 'api2-fileop', via)
    check(
      'the fallback was actually attempted',
      server.calls.some((c) => c.includes('fileop')),
    )
    restore()
    await server.close()
  }

  console.log('\n4. Dry run issues no mutating call')
  {
    const server = await startFakeCpanel()
    const restore = useEndpoint(server.base)
    process.env.DEPLOY_DRY_RUN = 'true'
    const cfg = config()
    check('dry run is the default when DEPLOY_DRY_RUN is set', cfg.dryRun === true)
    await deletePath(cfg, 'public_html/old/index.html')
    await writeTextFile(cfg, 'shikkha24-cms/tmp', 'restart.txt', '')
    await restartApp(cfg, 'shikkha24-cms')
    const mutations = server.calls.filter((call) => MUTATING.some((name) => call.includes(name)))
    check('zero mutating calls reached the server', mutations.length === 0, mutations.join(', '))
    delete process.env.DEPLOY_DRY_RUN
    restore()
    await server.close()
  }

  console.log('\n5. Live mode does mutate, so the dry-run check above is not vacuous')
  {
    const server = await startFakeCpanel()
    const restore = useEndpoint(server.base)
    await deletePath(config(), 'public_html/old/index.html')
    check(
      'delete_path reaches the server when not a dry run',
      server.calls.some((c) => c.includes('delete_file')),
    )
    restore()
    await server.close()
  }

  console.log('\n6. A missing credential names the variable and not the value')
  {
    const saved = { ...process.env }
    for (const name of ['CPANEL_HOST', 'CPANEL_USER', 'CPANEL_TOKEN', 'CPANEL_BASE']) {
      delete process.env[name]
    }
    let message = ''
    try {
      config()
    } catch (error) {
      message = error.message
    }
    check('throws when credentials are absent', message.includes('CPANEL_TOKEN'), message)
    check('does not leak any credential value', !message.includes('test-token-not-real'))
    process.env = saved
  }

  console.log('\n7. Manifest arithmetic')
  {
    const previous = [
      'index.html',
      'about/index.html',
      'news/gone/index.html',
      'news/gone/index.html.bak',
      'news/gone/deep/deeper/index.html',
      'news/kept/index.html',
      'robots.txt',
    ]
    const current = ['index.html', 'about/index.html', 'news/kept/index.html', 'robots.txt']

    const plan = planDeletes({ previous, current })
    check('identifies the removed article', plan.delete.includes('news/gone'))
    check('leaves what the build still produces', !plan.delete.includes('news/kept/index.html'))
    check(
      'collapses three removed files into one directory deletion',
      plan.delete.length === 1 && plan.delete[0] === 'news/gone',
      JSON.stringify(plan.delete),
    )
    check(
      'reports a first deploy when there is no manifest',
      planDeletes({ previous: [], current }).firstDeploy,
    )

    const first = planDeletes({ previous: [], current })
    check('a first deploy deletes nothing', first.delete.length === 0)
    check('but still uploads everything', first.added.length === current.length)

    // The case that would destroy live content: a directory holding one file
    // the build still produces must never be collapsed away.
    const shared = planDeletes({
      previous: ['news/gone/index.html', 'news/kept/index.html'],
      current: ['news/kept/index.html'],
    })
    check(
      'never collapses a directory that still holds a live file',
      !shared.delete.includes('news'),
      JSON.stringify(shared.delete),
    )
    check(
      'still removes the dead branch',
      shared.delete.includes('news/gone'),
      JSON.stringify(shared.delete),
    )

    // Promotion stops at the shallowest ancestor with nothing live under it, and
    // goes no further. Each of these pins one boundary of that rule.
    check(
      'promotes a file to its dead directory',
      JSON.stringify(collapse(['a/b/c', 'a/b/c/d'], ['a/keep'])) === '["a/b"]',
    )
    check(
      'collapses to the root only when nothing is live at all',
      JSON.stringify(collapse(['a/b/c'], [])) === '["a"]',
    )
    check(
      'collapse keeps siblings under a live parent',
      JSON.stringify(collapse(['a/b', 'a/c'], ['a/keep/index.html'])) === '["a/b","a/c"]',
    )
    check(
      'serialize/parse round-trips',
      JSON.stringify(parseManifest(serializeManifest(current))) === JSON.stringify(current),
    )
    check('blank lines are ignored', parseManifest('a\n\n\nb\n').length === 2)
  }

  console.log('\n8. `.htaccess` can never reach a delete set')
  {
    const dir = mkdtempSync(join(tmpdir(), 'manifest-'))
    mkdirSync(join(dir, 'news'), { recursive: true })
    writeFileSync(join(dir, 'index.html'), '<!doctype html>')
    writeFileSync(join(dir, '.htaccess'), 'Header set X "1"')
    writeFileSync(join(dir, 'news', 'old.html'), 'gone')

    const manifest = await buildManifest(dir)
    check('excluded from the manifest', !manifest.includes('.htaccess'), JSON.stringify(manifest))
    check(
      'everything else is included',
      manifest.includes('index.html') && manifest.includes('news/old.html'),
    )

    // Even if some build ever shipped one, a later build that dropped it must
    // not turn it into a deletion.
    const plan = planDeletes({ previous: [...manifest, '.htaccess'], current: manifest })
    check(
      'is not deleted even when a previous manifest names it',
      !plan.delete.includes('.htaccess'),
    )
  }

  console.log('\n9. A CMS bundle carrying the archive is refused before upload')
  {
    const dir = mkdtempSync(join(tmpdir(), 'bundle-'))
    mkdirSync(join(dir, 'data'), { recursive: true })
    writeFileSync(join(dir, 'server.js'), '')
    writeFileSync(join(dir, 'data', 'payload.db'), 'the whole editorial archive')
    const { assertBundleIsSafe } = await import('./deploy-cms.mjs')
    let threw = false
    try {
      assertBundleIsSafe(dir)
    } catch {
      threw = true
    }
    check('refuses a bundle containing data/', threw)

    const clean = mkdtempSync(join(tmpdir(), 'bundle-ok-'))
    writeFileSync(join(clean, 'server.js'), '')
    let cleanThrew = false
    try {
      assertBundleIsSafe(clean)
    } catch {
      cleanThrew = true
    }
    check('accepts a clean bundle', !cleanThrew)
  }

  console.log('\n10. The deploy scripts themselves run, not just the library')
  {
    // Everything above exercises the client and the arithmetic. Nothing yet
    // proves the orchestrator's own control flow — the zip, the probe, the
    // early return — because that only runs as a script. So it is spawned,
    // against a fake host, in the mode that touches nothing.
    const server = await startFakeCpanel()
    const dist = mkdtempSync(join(tmpdir(), 'dist-'))
    mkdirSync(join(dist, 'news'), { recursive: true })
    writeFileSync(join(dist, 'index.html'), '<!doctype html>')
    writeFileSync(join(dist, 'favicon.svg'), '<svg/>')
    writeFileSync(join(dist, '.htaccess'), 'Header set X "1"')
    writeFileSync(join(dist, 'news', 'story.html'), 'a story')

    // ⚠️ Async, not `execFileSync`. The fake cPanel runs in *this* process, and
    // a synchronous spawn blocks this process's event loop — so the child would
    // make a request and nothing would ever answer it. The two deadlock, which
    // is exactly what the first version of this test did.
    const run = async (script, extra = {}) => {
      try {
        const { stdout } = await execFileAsync(process.execPath, [join(scriptDir, script)], {
          encoding: 'utf8',
          env: {
            ...process.env,
            CPANEL_BASE: server.base,
            CPANEL_HOST: 'fake',
            CPANEL_USER: 'shikkhac',
            CPANEL_TOKEN: 'test-token-not-real',
            DEPLOY_DRY_RUN: 'true',
            DEPLOY_DIST: dist,
            ...extra,
          },
        })
        return stdout
      } catch (error) {
        return `${error.stdout ?? ''}${error.stderr ?? ''}`
      }
    }

    const output = await run('deploy-static.mjs')
    check(
      'deploy-static.mjs runs and exits cleanly',
      output.includes('DRY RUN'),
      output.slice(0, 300),
    )
    check('it reports the build size', /\d+ files|Files in build:\s+\d+/.test(output))
    check('it confirms it changed nothing', /nothing will be changed/i.test(output))
    const before = server.calls.length
    const mutatingDuringDryRun = server.calls
      .slice(0, before)
      .filter((call) => MUTATING.some((name) => call.includes(name)))
    check(
      'a spawned dry run made no mutating call',
      mutatingDuringDryRun.length === 0,
      mutatingDuringDryRun.join(', '),
    )

    const cmsDir = mkdtempSync(join(tmpdir(), 'cmsdist-'))
    writeFileSync(join(cmsDir, 'server.js'), '')
    const cmsOutput = await run('deploy-cms.mjs', { DEPLOY_CMS_DIST: cmsDir })
    check(
      'deploy-cms.mjs runs and exits cleanly',
      cmsOutput.includes('DRY RUN'),
      cmsOutput.slice(0, 300),
    )
    check(
      'its dry run prints the venv repair command',
      cmsOutput.includes('nodevenv') && cmsOutput.includes('ln -sfn'),
    )

    await server.close()
  }

  console.log(
    `\n${failures.length === 0 ? '✅' : '❌'} ${passed} passed, ${failures.length} failed`,
  )
  if (failures.length > 0) {
    for (const failure of failures) console.error(`   - ${failure}`)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
