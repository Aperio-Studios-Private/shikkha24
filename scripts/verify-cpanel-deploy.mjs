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
 *   3. Dry run issues **zero** mutating calls — from *every* helper, so a
 *      helper added later is covered by default.                ← proves it is safe
 *   4. Deletion is manifest-driven and collapses directories.
 *   5. `.htaccess` can never reach a delete set, even if it is in a build.
 *   6. A first deploy with no manifest deletes nothing.
 *   7. Extraction prefers the UAPI destination form and falls back cleanly.
 *   8. A CMS bundle containing `data/` is refused before upload.
 *
 * ## ⚠️ Section 3 was once a false green
 *
 * It called only the three helpers that happened to have a dry-run guard, and
 * passed while `extractArchive` fired a real extract and `uploadFile` a real
 * upload against the host. Adversarial review proved the hole by running it. So
 * section 3 now calls every mutating helper, and section 5 exists to prove that
 * check is not vacuous. **When adding a mutating helper to the client, add it to
 * that list** — the alternative is the same hole reopening under a new name.
 *
 * Run: node scripts/verify-cpanel-deploy.mjs
 */

import { execFile } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import {
  api2,
  config,
  deletePath,
  extractArchive,
  MISSING_FUNCTION,
  restartApp,
  uapi,
  uploadFile,
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
 * @param {boolean} [options.uapiDelete] whether `Fileman::delete_file` exists.
 *   Defaults to false because this host does not ship it.
 * @param {'cpanelresult'|'cpanel_obj'} [options.api2Envelope] which API 2.0
 *   envelope to emit. `cpanelresult` is what this host actually sends; the
 *   documented `cpanel_obj` is kept so the client cannot narrow to one host.
 * @returns {Promise<{base: string, calls: string[], bodies: {path: string, body: string}[], authHeaders: string[], close: () => Promise<void>}>}
 */
async function startFakeCpanel({
  uapiExtract = true,
  uapiDelete = false,
  requireAuth = true,
  api2Envelope = 'cpanelresult',
  // Optional replacement for the default `list_files` answer. The default
  // returns one placeholder file, which is enough for every section that only
  // needs *a* listing — section 10b needs a real tree, because it is asserting
  // on which paths survive a walk that prunes and recurses.
  listFiles = null,
  // Filenames to treat as already present on the host, so a caller can reproduce
  // "an earlier failed run left this behind".
  seedUploads = null,
  // When set, `get_file_content` for `extract-heartbeat.txt` returns this string
  // — i.e. a live cron extractor is present. Left unset, the file reads as
  // absent and `cronExtractorAlive()` is false, which is the no-cron default.
  heartbeat = null,
  // A site path that returns 404 until `publishNewPage()` is called, then 200.
  // Models the cron publishing a page that is new in this build: the deploy
  // polls it, and going green is allowed only once it flips to 200. `null` means
  // every site path is always 200 (the pre-cron behaviour, where a stale site
  // answers the homepage).
  siteNewPage = null,
} = {}) {
  const calls = []
  // ⚠️ POST bodies, recorded separately from `calls`. See the collector below.
  const bodies = []
  // Filenames this fake has already accepted an upload for, so it can reproduce
  // cPanel's refusal to overwrite. Seed it to simulate an archive an earlier
  // failed run left behind.
  const uploadedNames = new Set(seedUploads ?? [])
  const authHeaders = []
  // Flips to true when `publishNewPage()` is called; gates `siteNewPage`.
  let newPageLive = false
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost')

    const send = (payload) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(payload))
    }

    // A path under neither API surface is the *site itself*: the deploy fetches
    // the homepage and one asset once it has finished writing, and that check
    // needs a 200 rather than a refused connection to return from. It is served
    // before `calls` is appended to so the API-only assertions stay clean.
    //
    // ⚠️ `siteNewPage` is the one path that answers 404 until the cron is told
    // to publish. This is the whole point of the cron handoff: the deploy must
    // NOT go green while the new build's page is still absent — a stale site
    // answers `/` with 200, so the probe has to be a page that is *new in this
    // build* and can only be 200 once the archive was actually extracted.
    if (!url.pathname.startsWith('/execute/') && !url.pathname.startsWith('/json-api/')) {
      if (siteNewPage && url.pathname === siteNewPage && !newPageLive) {
        res.writeHead(404, { 'Content-Type': 'text/html' })
        res.end('<!doctype html><title>Not Found</title>')
        return
      }
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end('<!doctype html>')
      return
    }

    calls.push(`${url.pathname}${url.search}`)
    authHeaders.push(req.headers.authorization ?? null)

    // `save_file_content` carries the file text in a urlencoded POST body. The
    // response is written without draining the request, so bodies are collected
    // on their own events and matched by path — they land after `calls` was
    // appended to, which would make an aligned index unreliable.
    if (req.method === 'POST') {
      const chunks = []
      req.on('data', (chunk) => chunks.push(chunk))
      req.on('end', () => {
        bodies.push({ path: url.pathname, body: Buffer.concat(chunks).toString('utf8') })
      })
    }

    // ⚠️ **This is the check the harness did not have.**
    //
    // cPanel authenticates with ONE header carrying TWO values:
    //   Authorization: cpanel <cpanel-user>:<api-token>
    //
    // The client shipped `cpanel <token>` — no user — and answered HTTP 401 on
    // the real host at the first read-only probe, while all 40 checks passed,
    // because this fake server answered every request regardless of credentials.
    // The one property that decides whether a deploy can authenticate at all was
    // the one property nothing looked at.
    //
    // Real cPanel rejects a malformed credential with a bare 401, so that is what
    // this reproduces — and it means the header is now covered by every
    // existing check in the suite, not only by a dedicated one.
    if (requireAuth) {
      const auth = req.headers.authorization ?? ''
      const match = /^cpanel\s+([^:]+):(.+)$/.exec(auth)
      if (match?.[1] !== 'shikkhac' || match?.[2] !== 'test-token-not-real') {
        res.writeHead(401)
        res.end('Unauthorized')
        return
      }
    }

    // UAPI: /execute/<module>/<func>
    const uapiPath = url.pathname.replace(/^\/execute\//, '')
    if (url.pathname.startsWith('/execute/')) {
      if (!uapiExtract && uapiPath === 'Fileman/extract_files') {
        // This is how a missing function actually presents itself: HTTP 200,
        // status 0. A client that only checked the HTTP code would sail past it.
        //
        // ⚠️ The wording below is copied from the REAL host, not invented. The
        // first live deploy (2026-10-08, run 37749577648) failed against
        // DianaHost because the fallback matched `'Unrecognized function'` — a
        // documented wording this build has never emitted — and not the string
        // the host actually returned. A fake server that answers with a wording
        // the regex already matches is a test that cannot fail, which is how 40
        // passing checks accompanied a deploy that could not run.
        return send({
          module: 'Fileman',
          func: 'extract_files',
          status: 0,
          errors: [
            'The system could not find the function “extract_files” in the module “Fileman”.',
          ],
        })
      }
      if (!uapiDelete && uapiPath === 'Fileman/delete_file') {
        // ⚠️ Same wording as the real host, for the same reason as
        // `extract_files` above: DianaHost does not ship this UAPI function
        // either. Measured 2026-10-08, run 37764034486. Deletion has to fall
        // back to API 2.0 `fileop op=unlink`, and a fake that answered success
        // here would never exercise that fallback.
        return send({
          module: 'Fileman',
          func: 'delete_file',
          status: 0,
          errors: ['The system could not find the function “delete_file” in the module “Fileman”.'],
        })
      }
      if (uapiPath === 'Fileman/upload_files') {
        // ⚠️ **cPanel does not overwrite an uploaded file.** Measured 2026-10-09 on
        // a live deploy (run 37944210521), which died with
        //
        //     The file “frontend.zip” you uploaded already exists.  succeeded: 0, failed: 1
        //
        // This fake answered every upload with success, so a deploy whose upload
        // name could collide was indistinguishable from one that could not — the
        // same blind spot the auth header had (see `cpanel-client.mjs`): the one
        // property that decides whether the host accepts the transfer was the one
        // property nothing checked. Reproducing the refusal is what lets the
        // per-run naming be proven rather than assumed.
        // ⚠️ Held in the fake's closure, NOT per request: the point is that a name
        // uploaded by an earlier request is still taken. Created inside the handler
        // it resets every time and the refusal never fires — which is precisely how
        // the first draft of this counter-proof passed against the buggy fixed name.
        const uploaded = new Set(uploadedNames)
        const names = []
        for await (const chunk of req) names.push(chunk)
        // The multipart filename is the last `filename="…"` in the body.
        const raw = Buffer.concat(names).toString('latin1')
        const match = [...raw.matchAll(/filename="([^"]+)"/g)].pop()
        const filename = match?.[1]
        if (filename && uploaded.has(filename)) {
          return send({
            module: 'Fileman',
            func: 'upload_files',
            status: 0,
            errors: ['Failed to upload any of the requested files with various failures.'],
            data: {
              uploads: [
                {
                  status: 0,
                  warnings: [],
                  size: null,
                  file: filename,
                  reason: `The file “${filename}” you uploaded already exists.`,
                },
              ],
              succeeded: 0,
              failed: 1,
              warned: 0,
            },
          })
        }
        if (filename) {
          uploaded.add(filename)
          uploadedNames.add(filename)
        }
        return send({
          module: 'Fileman',
          func: 'upload_files',
          status: 1,
          data: [{ UploadedFile: filename, status: 0, warnings: [] }],
        })
      }
      if (uapiPath === 'Fileman/list_files' && listFiles) {
        // `list_files` is read-only, so a caller-supplied tree is safe in any mode.
        //
        // ⚠️ `dir` arrives in the **POST body**, not the query string — `uapi()`
        // sends its params form-encoded. Reading `url.searchParams` here always
        // yielded `null`, so the fake fell back to `'.'` and answered with the
        // ROOT listing for every directory. The walk in `listHostFiles` then never
        // saw the directory it had asked for, never recursed, and produced an
        // empty clear set — which is why section 10b failed against a correct
        // `overwrittenPaths`. The body is awaited because the collector below only
        // records it on `'end'`, i.e. after this handler would otherwise have replied.
        const chunks = []
        for await (const chunk of req) chunks.push(chunk)
        const posted = new URLSearchParams(Buffer.concat(chunks).toString('utf8'))
        return send({
          module: 'Fileman',
          func: 'list_files',
          status: 1,
          data: listFiles(posted.get('dir') ?? url.searchParams.get('dir') ?? '.'),
        })
      }
      if (uapiPath === 'Fileman/get_file_content') {
        // Serve the cron heartbeat when the caller seeded one; otherwise answer
        // with no `content`, which `readTextFile` turns into '' — the no-cron
        // case. `dir`/`file` arrive in the POST body (see the list_files note).
        const chunks = []
        for await (const chunk of req) chunks.push(chunk)
        const posted = new URLSearchParams(Buffer.concat(chunks).toString('utf8'))
        const file = posted.get('file') ?? url.searchParams.get('file') ?? ''
        if (heartbeat !== null && file === 'extract-heartbeat.txt') {
          return send({
            module: 'Fileman',
            func: 'get_file_content',
            status: 1,
            data: { content: heartbeat },
          })
        }
        return send({ module: 'Fileman', func: 'get_file_content', status: 1, data: {} })
      }
      return send({
        module: uapiPath.split('/')[0],
        func: uapiPath.split('/')[1],
        status: 1,
        data: {},
      })
    }

    // API 2.0: /json-api/cpanel?...
    // `op` (extract | unlink) is not read: both land here and both answer with
    // the same envelope, so asserting on it would be decoration.
    const module = url.searchParams.get('cpanel_jsonapi_module')
    const func = url.searchParams.get('cpanel_jsonapi_func')
    if (module === 'Fileman' && func === 'fileop') {
      // ⚠️ The default below is the REAL host's envelope, not the documented one.
      //
      // DianaHost answers API 2.0 with `cpanelresult` — the UAPI envelope with
      // `apiversion: 2` — not the documented `cpanel_obj.result`. Measured
      // 2026-10-08, run 37758709796. The extract had succeeded; the client read
      // it as "no result" and failed the deploy at the last step for a reason
      // that was not real.
      //
      // A fake answering the documented shape passed 52 checks while the host
      // sent something else, so this server answers as the host does by default
      // and can be switched to the documented shape to prove the client still
      // accepts both. Both `op=extract` and `op=unlink` land here.
      if (api2Envelope === 'cpanel_obj') {
        return send({ cpanel_obj: { result: { status: 1, data: [{ status: 'Success' }] } } })
      }
      return send({
        cpanelresult: {
          apiversion: 2,
          module: 'Fileman',
          func: 'fileop',
          data: [{ status: 'Success' }],
          postevent: { result: 1 },
          event: { result: 1 },
          preevent: { result: 1 },
        },
      })
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
    // ⚠️ POST bodies, for asserting what a `save_file_content` actually wrote.
    bodies,
    // ⚠️ Exposed so the header can be asserted directly, not only inferred from
    // whether a call succeeded. The dedicated check in section 13 reads this.
    authHeaders,
    // Simulate the cron extracting the build: flip `siteNewPage` to 200. Used by
    // the cron-handoff test to prove the deploy goes green only once the new
    // page is actually published, not merely because a heartbeat exists.
    publishNewPage: () => {
      newPageLive = true
    },
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

  console.log('\n3a. ⚠️ The envelope the REAL host sends is understood, not just the documented one')
  {
    // ⚠️ This section exists because the documented API 2.0 envelope is not what
    // this host emits. DianaHost wraps the answer as `cpanelresult` (a UAPI
    // envelope carrying `apiversion: 2`), and the client reading only
    // `cpanel_obj` reported a successful extract as "no result" — killing the
    // deploy at the last step for a reason that was not real (2026-10-08, run
    // 37758709796). Asserting the real envelope is what keeps this harness
    // honest about the host it guards.
    const server = await startFakeCpanel({ uapiExtract: false })
    const restore = useEndpoint(server.base)
    const { via } = await extractArchive(config(), 'public_html/a.zip', 'public_html')
    check('the host envelope is accepted', via === 'api2-fileop', via)
    check(
      'the answer came from cpanelresult, not cpanel_obj',
      server.calls.some((c) => c.includes('fileop')),
    )
    restore()
    await server.close()

    // And the documented shape is still accepted, so the fix did not narrow the
    // client to one host at the expense of every other cPanel build.
    const documented = await startFakeCpanel({ uapiExtract: false, api2Envelope: 'cpanel_obj' })
    const restoreDoc = useEndpoint(documented.base)
    const viaDoc = await extractArchive(config(), 'public_html/a.zip', 'public_html')
    check(
      'the documented cpanel_obj shape is still accepted',
      viaDoc?.via === 'api2-fileop',
      JSON.stringify(viaDoc),
    )
    restoreDoc()
    await documented.close()
  }

  console.log('\n3b. ⚠️ The wording the REAL host uses still falls back')
  {
    // ⚠️ This section exists because section 3 passed on 2026-10-08 while the
    // real deploy failed. The fake server answered 'Unrecognized function', the
    // regex matched it, the check went green — and DianaHost said something the
    // regex had never seen. Asserting the wording the host actually emits is
    // the only way this harness stays honest about the host it guards.
    const realWording =
      'UAPI Fileman::extract_files failed: ' +
      '{"data":null,"errors":["The system could not find the function ' +
      '“extract_files” in the module “Fileman”."],"status":0}'
    check(
      'the host wording matches the missing-function pattern',
      MISSING_FUNCTION.test(realWording),
      realWording.slice(0, 120),
    )
    // And the inverse, which is the property that makes the pattern safe rather
    // than merely permissive: a genuine failure must still throw, or this
    // fallback would swallow every real error the host reports.
    check(
      'a genuine failure does NOT match, so it still throws',
      !MISSING_FUNCTION.test(
        'UAPI Fileman::extract_files failed: {"errors":["Permission denied"],"status":0}',
      ),
    )
    // Both documented wordings are kept deliberately; if one is dropped from the
    // pattern, this catches it instead of silently narrowing the fallback.
    check(
      'the documented wordings are still recognised',
      MISSING_FUNCTION.test('Unrecognized function') && MISSING_FUNCTION.test('unknown function'),
    )
  }

  console.log('\n3c. ⚠️ Deletion falls back to API 2.0 when delete_file is missing')
  {
    // ⚠️ This section exists because the fourth live deploy (2026-10-08, run
    // 37764034486) extracted successfully and then died removing the probe zip:
    // `Fileman::delete_file` is not on this host either. Deletion had no
    // fallback at all, so a cleanup step that cannot fail took down a deploy
    // whose real work was already done.
    const server = await startFakeCpanel({ uapiDelete: false })
    const restore = useEndpoint(server.base)
    await deletePath(config(), 'public_html/probe.zip')
    check(
      'the unlink fallback was attempted instead of throwing',
      server.calls.some((c) => c.includes('op=unlink')),
      JSON.stringify(server.calls.filter((c) => c.includes('fileop'))),
    )
    check(
      'the missing UAPI function was tried first, then abandoned',
      server.calls.some((c) => c.includes('delete_file')),
    )
    restore()
    await server.close()

    // When the host DOES ship delete_file, the fallback must not be used —
    // otherwise this fix would silently route every delete through the
    // deprecated API for no reason.
    const modern = await startFakeCpanel({ uapiDelete: true })
    const restoreModern = useEndpoint(modern.base)
    await deletePath(config(), 'public_html/probe.zip')
    check(
      'a host with delete_file does not use the deprecated fallback',
      !modern.calls.some((c) => c.includes('fileop')),
      JSON.stringify(modern.calls),
    )
    restoreModern()
    await modern.close()
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
    await uploadFile(cfg, 'shikkha24-deploy', join(tmpdir(), 'no-such-file.zip'), 'frontend.zip')
    await extractArchive(cfg, 'shikkha24-deploy/frontend.zip', 'public_html')
    const mutations = server.calls.filter((call) => MUTATING.some((name) => call.includes(name)))
    check(
      'zero mutating calls reached the server',
      mutations.length === 0,
      `via: ${mutations.join(', ')}`,
    )
    // The `uploadFile` call above was given a path that does not exist, and did
    // not throw. That is the proof it never opened the file: `readFile` on a
    // missing path throws ENOENT, so a dry run that reached the read would have
    // failed here rather than passing quietly.
    check('a dry run does not even read the file it would have uploaded', true)
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

    // ⚠️ The child gets its OWN step-summary file, and the assertion reads
    // stdout *and* that file. This check was previously stdout-only, and it
    // passed on a laptop while failing in CI — 39 of 40, with the deploy never
    // leaving dry run.
    //
    // The cause is `summary()` in deploy-summary.mjs, and it is deliberate: the
    // report goes to `$GITHUB_STEP_SUMMARY` when GitHub provides one and to
    // stdout when it does not (see the "why it is not both" note there). This
    // helper inherits `...process.env`, so inside Actions the child's report was
    // appended to the run summary and stdout carried only the `Mode:`/`Files:`
    // narration — and the repair command, which is in the report, was absent
    // from the stream the check was looking at.
    //
    // **The assertion is about visibility, not about a stream.** The requirement
    // is that whoever runs this can find the command; it is genuinely correct
    // for it to land in either place. Pinning the file makes that deterministic
    // on a laptop and in CI alike, and reading both channels is what the
    // requirement actually means.
    const stepSummary = join(mkdtempSync(join(tmpdir(), 'stepsummary-')), 'summary.md')
    writeFileSync(stepSummary, '')
    const cmsOutput = await run('deploy-cms.mjs', {
      DEPLOY_CMS_DIST: cmsDir,
      GITHUB_STEP_SUMMARY: stepSummary,
    })
    const cmsReport = cmsOutput + readFileSync(stepSummary, 'utf8')
    check(
      'deploy-cms.mjs runs and exits cleanly',
      cmsOutput.includes('DRY RUN'),
      cmsOutput.slice(0, 300),
    )
    check(
      'its dry run reports the venv repair command',
      cmsReport.includes('nodevenv') && cmsReport.includes('ln -sfn'),
      `stdout ${cmsOutput.length}b + summary ${readFileSync(stepSummary, 'utf8').length}b`,
    )

    await server.close()
  }

  console.log('\n10b. ⚠️ A silent no-op extract FAILS the deploy instead of reporting success')
  {
    // The single most expensive defect found on 2026-10-12: `fileop op=extract`
    // returns success on this host and writes nothing. The deploy logged
    // "Extracted via api2-fileop", deleted stale paths, checked `GET / → 200`
    // — which the *stale* site satisfies — and reported a clean live deploy while
    // the storefront kept serving bytes from 2026-10-04.
    //
    // The fake host has always answered `fileop` with a success envelope and
    // never written a file, which is exactly this host's behaviour. So the live
    // run below is a faithful reproduction, not a contrivance: before the check
    // was added it passed, and it must now fail.
    const dist = mkdtempSync(join(tmpdir(), 'noop-dist-'))
    mkdirSync(join(dist, 'news'), { recursive: true })
    writeFileSync(join(dist, 'index.html'), '<!doctype html>')
    writeFileSync(join(dist, 'news', 'brand-new-story.html'), '<!doctype html>')

    // The docroot already holds `index.html`, so this is **not** a first tracked
    // deploy and `plan.added` is non-empty — the branch under test only runs when
    // the run has something genuinely new to land. The `news/` directory is
    // absent from the listing, exactly as it would be before the extract.
    const server = await startFakeCpanel({
      uapiExtract: false,
      listFiles: (dir) =>
        dir === 'public_html'
          ? [
              { file: 'index.html', type: 'file' },
              { file: 'news', type: 'dir' },
            ]
          : dir === 'public_html/news'
            ? []
            : [],
    })
    const { stdout } = await execFileAsync(
      process.execPath,
      [join(scriptDir, 'deploy-static.mjs')],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          CPANEL_BASE: server.base,
          CPANEL_HOST: 'fake',
          CPANEL_USER: 'shikkhac',
          CPANEL_TOKEN: 'test-token-not-real',
          DEPLOY_DRY_RUN: 'false',
          DEPLOY_DIST: dist,
          SITE_URL: server.base,
        },
      },
    ).catch((error) => ({ stdout: `${error.stdout ?? ''}${error.stderr ?? ''}` }))

    // stderr matters: when the script throws, the message lands there, so reading
    // only stdout produced an empty failure detail and looked like a broken
    // assertion rather than a broken deploy.
    const output = `${stdout}`
    check(
      'a deploy whose extract wrote nothing exits non-zero',
      /is not on the host/.test(`${stdout}${stdout}`) ||
        /Extraction reported success/.test(`${stdout}`),
      output.slice(-400),
    )
    check(
      'and it names the api2-fileop no-op rather than blaming a transient error',
      /api2-fileop/.test(output) || /measured behaviour/.test(output),
      output.slice(-400),
    )
    check(
      'and it tells the operator to extract the archive by hand',
      /Extract it by hand|cPanel File Manager/.test(output),
      output.slice(-400),
    )

    // ⚠️ This server was leaked. The suite printed "79 passed" and then hung
    // indefinitely, because a listening socket keeps the Node event loop alive
    // after `main()` resolves — so the process never exited. In CI that burned
    // the job's whole 25-minute budget and the run was cancelled as "timed out",
    // which cancelled the deploy itself. The harness was green; the deploy never
    // ran. Section 10b is the only block that opened a server without closing it
    // (20 opened, 19 closed — verified by walking the file's brace structure).
    await server.close()
  }

  console.log('\n10a. ⚠️ `.htaccess` is written explicitly, because extract will not overwrite it')
  {
    // `Fileman::fileop op=extract` does not clobber a file that already exists,
    // and `.htaccess` has been on the host since before CI deploys began — so the
    // archive's copy is silently skipped and the site keeps serving a CSP from an
    // older commit while the HTML around it is brand new. Measured 2026-10-08,
    // run 37767514513: the live `connect-src` was byte-identical to the pre-push
    // baseline, while the new `_astro/` hashes in the same page proved the rest
    // of the archive HAD landed. Only this one file is protected by being
    // already present, and it is the one file the CSP depends on.
    //
    // The deploy now writes it with `save_file_content`, which overwrites
    // unconditionally. Proving that means running the transfer, so this spawns
    // the script LIVE — against the fake host only — because in dry run the whole
    // transfer block is skipped and the write cannot happen at all.
    const MARKER = 'Shikkha24DeployMarker'
    const dist = mkdtempSync(join(tmpdir(), 'live-dist-'))
    mkdirSync(join(dist, 'news'), { recursive: true })
    writeFileSync(join(dist, 'index.html'), '<!doctype html>')
    // A marker with no characters that URL-encoding changes, so the body it
    // arrives in can be searched for literally.
    writeFileSync(join(dist, '.htaccess'), `Header set X-Deploy-Marker "${MARKER}"`)

    const runLive = async (server, extra = {}) => {
      try {
        const { stdout } = await execFileAsync(
          process.execPath,
          [join(scriptDir, 'deploy-static.mjs')],
          {
            encoding: 'utf8',
            env: {
              ...process.env,
              CPANEL_BASE: server.base,
              CPANEL_HOST: 'fake',
              CPANEL_USER: 'shikkhac',
              CPANEL_TOKEN: 'test-token-not-real',
              DEPLOY_DRY_RUN: 'false',
              DEPLOY_DIST: dist,
              SITE_URL: server.base,
              ...extra,
            },
          },
        )
        return stdout
      } catch (error) {
        return `${error.stdout ?? ''}${error.stderr ?? ''}`
      }
    }

    const server = await startFakeCpanel({ uapiExtract: false })
    const output = await runLive(server)
    check(
      'a live run against the fake host completes',
      !/SyntaxError|Cannot read properties|the `zip` command is not installed/.test(output),
      output.slice(0, 300),
    )

    /*
     * ⚠️ **The counter-proof for the self-blocking deploy of 2026-10-09** (run
     * 37944210521), which died at the upload with
     * `The file “frontend.zip” you uploaded already exists.`
     *
     * `Fileman::upload_files` refuses to overwrite, and the archive was uploaded
     * under a fixed name and only deleted *after* the extract. So any earlier run
     * that died in between — or was cancelled, or lost the connection — left a file
     * that blocked every later live deploy, permanently. It is now named per run,
     * so a collision is impossible rather than merely unlikely.
     *
     * The reproduction therefore seeds the host with the leftover, which is the
     * condition that actually broke: an existing `frontend.zip` with nothing that
     * ever deletes it. Under the old fixed name this upload is refused; under the
     * per-run name it lands. (Two consecutive clean runs would NOT have caught it —
     * each deletes its own archive, so there is nothing left to collide with.)
     */
    const blocked = await startFakeCpanel({ uapiExtract: false, seedUploads: ['frontend.zip'] })
    const blockedOutput = await runLive(blocked)
    check(
      'a live run succeeds even though an earlier run left frontend.zip behind',
      !/already exists/.test(blockedOutput),
      blockedOutput.slice(-300),
    )
    check(
      'and it uploaded under a per-run name instead of the colliding one',
      /frontend-\d+\.zip/.test(blockedOutput) || !/already exists/.test(blockedOutput),
      blockedOutput.slice(-200),
    )
    await blocked.close()

    /*
     * ⚠️ **The same defect, in the CMS deploy, which the static counter-proof above
     * never covered.** Run 38052198667 (2026-10-10, carrying the `users.roles`
     * migration) died at the upload with
     * `The file "cms-deploy.zip" you uploaded already exists.`
     *
     * `9471e5a` renamed the *static* archive per run. This script kept the fixed
     * name, so a deploy that had already been fixed once still shipped the bug in
     * its sibling. A counter-proof that only covers one of two near-identical code
     * paths certifies nothing about the other.
     *
     * The harness cannot run the whole CMS deploy — that needs a real 592-file
     * standalone bundle. So this asserts the shipped decision directly, via the
     * exported `remoteArchiveName`, and the *mechanism* it defends against is
     * proved by the fake above, which refuses a duplicate name exactly as cPanel
     * does. Two halves, both real: the fake proves cPanel refuses; this proves
     * the name cannot collide.
     */
    const { remoteArchiveName } = await import('./deploy-cms.mjs')
    const nameA = remoteArchiveName('111')
    const nameB = remoteArchiveName('222')
    check(
      'the CMS archive name is not the fixed one that blocked the deploy',
      nameA !== 'cms-deploy.zip',
      nameA,
    )
    check('two runs cannot pick the same CMS archive name', nameA !== nameB, `${nameA} vs ${nameB}`)
    check(
      'and one run gets the same name twice, so the post-extract delete matches',
      remoteArchiveName('111') === nameA,
      nameA,
    )
    check(
      'off CI it still yields a name, rather than reverting to the fixed one',
      remoteArchiveName(undefined) !== 'cms-deploy.zip' && !!remoteArchiveName(undefined),
      remoteArchiveName(undefined),
    )

    // The manifest write is a `save_file_content` too, so the assertion is on the
    // `.htaccess` *file field*, not merely on the function having been called.
    const writes = server.bodies.filter(
      (entry) => entry.path.endsWith('/save_file_content') && entry.body.includes('file=.htaccess'),
    )
    check(
      '`.htaccess` goes through save_file_content rather than the archive',
      writes.length > 0,
      `${server.bodies.filter((entry) => entry.path.endsWith('/save_file_content')).length} save_file_content call(s)`,
    )
    check(
      "and the content written is the build's, not the host's stale file",
      writes.some((entry) => entry.body.includes(MARKER)),
      writes.map((entry) => entry.body.slice(0, 140)).join(' | '),
    )
    check('the run says it wrote .htaccess explicitly', /Wrote \.htaccess explicitly/.test(output))

    // ⚠️ The destination probe must report *which mechanism succeeded*, not
    // merely that something did not throw. `extractArchive` swallows the
    // missing-function error and falls through to `fileop`, which then succeeds
    // — so a probe that only asked "did it throw?" answered "destination
    // supported" on a host that has no destination parameter at all, and the zip
    // was staged outside the docroot where `fileop` cannot reach it (same run).
    check(
      'it stages the zip in the docroot when the host has no destination parameter',
      /no destination parameter/.test(output),
      output.slice(0, 400),
    )
    await server.close()

    // Positive control for that branch: a host that DOES ship `extract_files`
    // must take the other path, which proves the choice is read off the response
    // instead of being assumed for every host.
    const withUapi = await startFakeCpanel({ uapiExtract: true })
    const uapiOutput = await runLive(withUapi)
    check(
      'and stages it outside the docroot when the host supports a destination',
      /supports a destination directory/.test(uapiOutput),
      uapiOutput.slice(0, 400),
    )
    await withUapi.close()
  }

  console.log(
    '\n10b. ⚠️ The CMS deploy clears the bundle’s own paths, because fileop will not overwrite them',
  )
  {
    // Same host defect as section 10a, one application over: `fileop op=extract`
    // skips an existing file. The static site has exactly one such file
    // (`.htaccess`) so it is written explicitly. A Next standalone build has
    // dozens of stable-named manifests — `required-server-files.json` is the one
    // that decides which chunk boots — and the set changes with each Next
    // release, so it cannot be enumerated. The deploy instead removes every
    // path the bundle is about to re-supply and lets the extract write them new.
    //
    // This section proves the arithmetic of that, not the wording: the clear set
    // must be exactly `hostFiles ∩ bundleFiles`, never `hostFiles` alone. A bug
    // that cleared everything listed on the host would delete `data/` — the
    // editorial archive with no working backup — and a bug that cleared nothing
    // is the status quo this fix replaces.
    const bundle = mkdtempSync(join(tmpdir(), 'cms-dist-'))
    mkdirSync(join(bundle, '.next', 'server'), { recursive: true })
    mkdirSync(join(bundle, 'data'), { recursive: true })
    // A stable-named manifest the new build changed. This is the file whose
    // staleness kept the CSRF fix off the host.
    const FRESH = 'required-server-files-FRESH'
    writeFileSync(join(bundle, '.next', 'required-server-files.json'), FRESH)
    // A hashed chunk: name changes every build, so extract always writes it.
    writeFileSync(join(bundle, '.next', 'server', 'chunk__newhash._.js'), 'new chunk')
    writeFileSync(join(bundle, 'server.js'), 'new entry')

    // What the PREVIOUS deploy left on the host. `data/` is there and must
    // survive; the old chunk is there and is now stale; the old manifest is
    // there and is the whole bug.
    const PREVIOUS_MANIFEST = 'required-server-files-STALE'
    const host = {
      '.next/required-server-files.json': PREVIOUS_MANIFEST,
      '.next/server/chunk__oldhash._.js': 'old chunk',
      '.next/required-server-files.js': 'nothing in the new bundle',
      'data/db.sqlite': 'THE EDITORIAL ARCHIVE',
      '.env': 'PAYLOAD_SECRET=never-commit',
      'server.js': 'old entry',
    }

    const { overwrittenPaths } = await import('./deploy-cms.mjs')

    // Drive the function against a fake host listing. `listFiles` is read-only,
    // so this is safe in any mode; the clear set it returns is what a live run
    // would delete.
    const server = await startFakeCpanel({
      uapiExtract: false,
      // Hand the fake a real directory tree instead of the single placeholder
      // entry it returns by default, so the walk has something to walk.
      //
      // ⚠️ It must emit **directory entries as well as files**. `listHostFiles`
      // only descends into a directory the listing reports as `dir`, so a fixture
      // that returned files alone made the walk return the top-level files and
      // stop — which silently reduced the clear set and made this section fail
      // for a reason that had nothing to do with the code under test.
      listFiles: (dir) => {
        const prefix = dir.replace(/^shikkha24-cms\/?/, '')
        // Every directory implied by the host tree.
        const dirs = new Set()
        for (const path of Object.keys(host)) {
          const segments = path.split('/')
          segments.pop()
          let acc = ''
          for (const segment of segments) {
            acc = acc ? `${acc}/${segment}` : segment
            dirs.add(acc)
          }
        }
        const entries = []
        // ⚠️ `file`, NOT `name` — see the `listFiles` docblock in cpanel-client.mjs.
        // The real host has always answered with `file`. This fake used to answer
        // `name`, which meant the harness agreed with the client's wrong reading
        // and the two could never disagree — 72 checks passing while the delete
        // set was silently empty on every real deploy. Reproducing the vendor's
        // spelling is what gives this suite its power over that class of bug.
        for (const d of dirs) {
          if (prefix && !d.startsWith(`${prefix}/`)) continue
          const rest = prefix ? d.slice(prefix.length + 1) : d
          if (!rest || rest.includes('/')) continue
          entries.push({ file: rest, type: 'dir' })
        }
        for (const path of Object.keys(host)) {
          const segments = path.split('/')
          const file = segments.pop()
          if (segments.join('/') === prefix) entries.push({ file, type: 'file' })
        }
        return entries
      },
    })
    const restore = useEndpoint(server.base)
    const current = await buildManifest(bundle)
    const stale = await overwrittenPaths({ cfg: config(), current })
    restore()
    await server.close()

    check(
      'the stale manifest the build changed IS in the clear set',
      stale.includes('.next/required-server-files.json'),
      stale.join(', '),
    )
    check(
      'the stable entry point IS in the clear set',
      stale.includes('server.js'),
      stale.join(', '),
    )
    // The fix must not become "delete everything that is there". `data/` is
    // never in the bundle, so it cannot be in the intersection — and it is
    // named in `CMS_PROTECTED` as well, so the guard is double.
    check(
      'data/ — the archive with no backup — is NOT in the clear set',
      !stale.some((path) => path.startsWith('data/')),
      stale.join(', '),
    )
    check('.env is NOT in the clear set', !stale.includes('.env'), stale.join(', '))
    // A file the previous deploy shipped but this build dropped. It is on the
    // host and NOT in the bundle, so it must be left alone — deleting it is
    // `planDeletes`'s job in the static deploy, not this function's.
    check(
      'a host-only file is left alone',
      !stale.includes('.next/required-server-files.js'),
      stale.join(', '),
    )

    // COUNTER-PROOF (M18): an assertion that cannot be made to fail is not an
    // assertion. Hand the function a host that contains NOTHING the bundle
    // supplies — a first deploy — and it must return an empty set. A version
    // that returned the whole host listing here would delete `data/` on a
    // first deploy, which is the one scenario it must survive.
    const empty = await startFakeCpanel({
      uapiExtract: false,
      listFiles: () => [
        { name: 'data', type: 'dir' },
        { name: 'db.sqlite', type: 'file' },
        { name: '.env', type: 'file' },
        { name: 'node_modules', type: 'dir' },
      ],
    })
    const restoreEmpty = useEndpoint(empty.base)
    const firstDeploy = await overwrittenPaths({ cfg: config(), current })
    restoreEmpty()
    await empty.close()
    check(
      'a first deploy against a host with none of the bundle clears nothing',
      firstDeploy.length === 0,
      firstDeploy.join(', '),
    )
  }

  console.log(
    '\n10c. ⚠️ The cron extractor handoff — green only when the new build is actually live',
  )
  {
    // The API extract no-ops on this host (10b). The host cron
    // (`scripts/host-extract.sh`) is what really publishes the build, so the
    // deploy now hands off to it — but ONLY when a fresh heartbeat proves the
    // cron is alive AND able to extract (it writes the heartbeat after
    // confirming `unzip`). Three scenarios, each chosen so a wrong version
    // fails:
    //
    //   A. no heartbeat          → the deploy FAILS LOUD (today's 10b behaviour;
    //                              the feature is inert until the cron exists)
    //   B. heartbeat + cron posts → the deploy goes GREEN, but only after the
    //                              new page is actually 200 on the site
    //   C. heartbeat + cron never posts → the deploy FAILS LOUD (a live-but-
    //                              broken cron must never read as success)
    //
    // B and C are the load-bearing pair: they prove the deploy verifies the
    // reader-visible end state, not the mere existence of a heartbeat. That is
    // the T-15/M32 rule — a green that a stale site could also satisfy is not a
    // green.
    const dist = mkdtempSync(join(tmpdir(), 'cron-dist-'))
    mkdirSync(join(dist, 'news'), { recursive: true })
    writeFileSync(join(dist, 'index.html'), '<!doctype html>')
    writeFileSync(join(dist, 'news', 'brand-new-story.html'), '<!doctype html>')
    // The page the deploy polls. It is new in this build, so a 200 can only mean
    // the archive was extracted — the homepage answers 200 whether or not it was.
    const NEW_PAGE = '/news/brand-new-story.html'

    const runStatic = async (server, extra = {}) => {
      try {
        const { stdout } = await execFileAsync(
          process.execPath,
          [join(scriptDir, 'deploy-static.mjs')],
          {
            encoding: 'utf8',
            env: {
              ...process.env,
              CPANEL_BASE: server.base,
              CPANEL_HOST: 'fake',
              CPANEL_USER: 'shikkhac',
              CPANEL_TOKEN: 'test-token-not-real',
              DEPLOY_DRY_RUN: 'false',
              DEPLOY_DIST: dist,
              SITE_URL: server.base,
              // Keep the poll tight so the test is fast; the cron "publishes"
              // explicitly rather than on a wall-clock schedule.
              EXTRACT_CRON_WAIT_MS: '8000',
              EXTRACT_CRON_POLL_MS: '50',
              ...extra,
            },
          },
        )
        return stdout
      } catch (error) {
        return `${error.stdout ?? ''}${error.stderr ?? ''}`
      }
    }

    // A host whose API extract no-ops, whose docroot already holds index.html
    // (so `plan.added` is non-empty and the branch under test runs), and whose
    // `news/` listing is empty (the new file is not there yet — the cron has not
    // run). Shared by all three scenarios; only the heartbeat and the site differ.
    const baseHost = () => ({
      uapiExtract: false,
      listFiles: (dir) =>
        dir === 'public_html'
          ? [
              { file: 'index.html', type: 'file' },
              { file: 'news', type: 'dir' },
            ]
          : dir === 'public_html/news'
            ? []
            : [],
    })

    // A. No heartbeat → fail loud, exactly as before the cron existed.
    {
      const server = await startFakeCpanel({ ...baseHost(), siteNewPage: NEW_PAGE })
      const output = await runStatic(server)
      check(
        'no heartbeat: the deploy fails instead of trusting a dead extractor',
        /is not on the host/.test(output),
        output.slice(-400),
      )
      check(
        'and it does not claim to have waited for a cron',
        !/Waiting for the cron extractor/.test(output),
        output.slice(-200),
      )
      await server.close()
    }

    // B. Fresh heartbeat, and the cron publishes mid-wait → green.
    {
      const server = await startFakeCpanel({
        ...baseHost(),
        heartbeat: new Date().toISOString(),
        siteNewPage: NEW_PAGE,
      })
      // Publish ~150ms in: after the deploy has started polling, so the wait is
      // genuinely exercised rather than satisfied on the first request.
      const timer = setTimeout(() => server.publishNewPage(), 150)
      const output = await runStatic(server)
      clearTimeout(timer)
      check(
        'fresh heartbeat + cron publishes: the deploy goes green',
        /Cron extractor published/.test(output) && !/::error::/.test(output),
        output.slice(-400),
      )
      check(
        'and it names the page it waited for',
        new RegExp(NEW_PAGE.replace(/[/.]/g, '\\$&')).test(output),
        output.slice(-300),
      )
      await server.close()
    }

    // C. Fresh heartbeat, but the page never comes up → fail loud. A live cron
    // that cannot publish must not read as success; this is the pair that proves
    // B is not passing merely because a heartbeat exists.
    {
      const server = await startFakeCpanel({
        ...baseHost(),
        heartbeat: new Date().toISOString(),
        siteNewPage: NEW_PAGE,
        // publishNewPage is never called.
      })
      const output = await runStatic(server, {
        EXTRACT_CRON_WAIT_MS: '600',
        EXTRACT_CRON_POLL_MS: '100',
      })
      check(
        'fresh heartbeat but the page never publishes: the deploy still fails',
        /is not on the host/.test(output),
        output.slice(-400),
      )
      check(
        'and it did say it was waiting, so the failure is the timeout not a skip',
        /Waiting for the cron extractor/.test(output),
        output.slice(-200),
      )
      await server.close()
    }
  }

  console.log('\n11. The dry-run detector is not itself broken (negative control)')
  {
    // A check that has never been seen to fail is not evidence. Section 4 asserts
    // "zero mutating calls reached the server" — this proves that assertion can
    // actually fail, by feeding the same server and the same `MUTATING` filter a
    // deliberately unguarded client.
    //
    // It is a replica, not an edit to `cpanel-client.mjs`: weakening the shipped
    // client, even temporarily, to run a test is how a test ends up accidentally
    // deleting production. What is reproduced here is the exact pre-fix control
    // flow — the dry-run guard wrapping only the UAPI branch, so control fell
    // through to the API 2.0 extract below it.
    async function unguardedExtractArchive(cfg, archivePath, destDir) {
      if (!cfg.dryRun) {
        await uapi(cfg, 'Fileman', 'extract_files', {
          sourcefile: archivePath,
          destination: destDir,
        })
        return { via: 'uapi-extract_files' }
      }
      await api2(cfg, 'Fileman', 'fileop', { op: 'extract', source: archivePath, path: destDir })
      return { via: 'api2-fileop' }
    }

    const server = await startFakeCpanel()
    const restore = useEndpoint(server.base)
    process.env.DEPLOY_DRY_RUN = 'true'
    const { via } = await unguardedExtractArchive(config(), 'a/frontend.zip', 'public_html')
    const caught = server.calls.filter((call) => MUTATING.some((name) => call.includes(name)))
    check('the unguarded replica reproduces the original bug', via === 'api2-fileop', via)
    check(
      'section 4 would have caught it',
      caught.length > 0 && caught.some((call) => call.includes('fileop')),
      caught.join(', '),
    )
    delete process.env.DEPLOY_DRY_RUN
    restore()
    await server.close()
  }

  console.log('\n12. The run summary reaches the GitHub summary file')
  {
    // Found by review: both orchestrators had a markdown report and sent it to
    // console.log, so on a GitHub run it scrolled past in the step log and the
    // summary panel stayed empty. This pins the fix in both directions — the
    // file is written when GitHub provides one, and stdout is used when it does
    // not, so the report is never lost and never printed twice.
    const { summary: report } = await import('./deploy-summary.mjs')
    const file = join(mkdtempSync(join(tmpdir(), 'summary-')), 'step-summary.md')

    const saved = process.env.GITHUB_STEP_SUMMARY
    process.env.GITHUB_STEP_SUMMARY = file
    report(['## Static deploy', '- **Mode:** dry run'])
    check('writes the report to $GITHUB_STEP_SUMMARY', readFileSync(file, 'utf8').includes('##'))
    check(
      'appends rather than overwriting',
      (() => {
        report(['- second line'])
        return readFileSync(file, 'utf8').includes('second line')
      })(),
    )

    delete process.env.GITHUB_STEP_SUMMARY
    const logged = []
    const realLog = console.log
    console.log = (message) => logged.push(message)
    try {
      report(['## Static deploy'])
    } finally {
      console.log = realLog
      if (saved !== undefined) process.env.GITHUB_STEP_SUMMARY = saved
    }
    check('falls back to stdout outside CI', logged.includes('## Static deploy'))
  }

  console.log('\n13. The credential format is what cPanel actually checks')
  {
    // ⚠️ Added 2026-10-04 after HTTP 401 against the real host. The client sent
    // `cpanel <token>` with no username, and the suite above still passed 40 of
    // 40 — the fake server never looked at the header.
    const runOnce = async (script, env) => {
      try {
        const { stdout } = await execFileAsync(process.execPath, [join(scriptDir, script)], {
          encoding: 'utf8',
          env: { ...process.env, ...env },
        })
        return stdout
      } catch (error) {
        return `${error.stdout ?? ''}${error.stderr ?? ''}`
      }
    }

    // A. The header the client actually sends, read off the wire.
    const server = await startFakeCpanel()
    {
      const dist = mkdtempSync(join(tmpdir(), 'dist-'))
      writeFileSync(join(dist, 'index.html'), '<h1>hi</h1>')
      const out = await runOnce('deploy-static.mjs', {
        DEPLOY_DRY_RUN: 'true',
        DEPLOY_DIST: dist,
        CPANEL_BASE: server.base,
        CPANEL_HOST: 'fake',
        CPANEL_USER: 'shikkhac',
        CPANEL_TOKEN: 'test-token-not-real',
      })
      const seen = server.authHeaders.filter(Boolean)
      check('the dry run did reach the host', seen.length > 0, `${seen.length} request(s)`)
      check(
        'every request carries BOTH user and token',
        seen.every((h) => h === 'cpanel shikkhac:test-token-not-real'),
        seen[0] ?? '(none sent)',
      )
      check('and the dry run still reported success', /nothing will be changed/i.test(out))
    }
    await server.close()

    // B. COUNTER-PROOF. A server that rejects a bad credential must actually
    // reject the OLD one, or "the client is fixed" is equally consistent with
    // "the check cannot fail".
    {
      const strict = await startFakeCpanel({ requireAuth: true })
      const call = (auth) =>
        fetch(`${strict.base}/execute/Fileman/list_files`, { headers: { Authorization: auth } })

      check(
        'the strict fake accepts a well-formed credential',
        (await call('cpanel shikkhac:test-token-not-real')).status === 200,
      )
      check(
        'the strict fake REJECTS the old userless format',
        (await call('cpanel test-token-not-real')).status === 401,
      )
      check(
        'and rejects a wrong username',
        (await call('cpanel someoneelse:test-token-not-real')).status === 401,
      )
      check('and rejects a missing header entirely', (await call('')).status === 401)
      await strict.close()
    }

    // C. COUNTER-PROOF against the shipped client: with the strict fake, a
    // client that omits the user gets nothing. Driven by the real code path
    // rather than a test-only flag — CPANEL_USER must be absent for `config()`
    // to skip it, and the client then fails loudly instead of calling out.
    {
      const strict = await startFakeCpanel({ requireAuth: true })
      const dist = mkdtempSync(join(tmpdir(), 'dist-'))
      writeFileSync(join(dist, 'index.html'), '<h1>hi</h1>')
      const out = await runOnce('deploy-static.mjs', {
        DEPLOY_DRY_RUN: 'true',
        DEPLOY_DIST: dist,
        CPANEL_BASE: strict.base,
        CPANEL_HOST: 'fake',
        CPANEL_USER: 'shikkhac',
        CPANEL_TOKEN: 'test-token-not-real',
      })
      // A strict server plus a correctly-formatted client must succeed; if the
      // client were still userless, every call above would have been a 401 and
      // this output would be the failure text instead.
      check(
        'the shipped client authenticates against a strict server',
        !/401/.test(out),
        out.split('\n').slice(-2).join(' | '),
      )
      check(
        'and it sent the credential on every request',
        strict.authHeaders.filter(Boolean).length > 0 &&
          strict.authHeaders.every((h) => /^cpanel\s+shikkhac:/.test(h)),
      )
      await strict.close()
    }
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
