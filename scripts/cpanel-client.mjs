/**
 * Minimal cPanel API client — the only deployment transport DianaHost allows.
 *
 * ## Why this exists
 *
 * The previous deploy path was `rsync` and `scp` over SSH. **The host refuses
 * SSH**: ports 22, 2222, 222, 2200 and 2022 all reject, and only 443, 2083 and
 * 2087 are open. Since that was discovered, every deploy has been done by hand
 * through cPanel File Manager. This client is the replacement.
 *
 * ## Why `fetch` and not `curl`
 *
 * `curl -H "Authorization: cpanel $USER:$TOKEN"` puts the token in the process
 * argument list, where any process on the machine can read it with `ps`.
 * `fetch` keeps it in the environment and off `argv` entirely.
 *
 * ## What authentication actually is
 *
 * **Not OAuth.** A cPanel API token is a static credential sent as one plain
 * header — no exchange, no refresh, no expiry:
 *
 *     Authorization: cpanel <user>:<token>
 *
 * Both APIs accept it. UAPI (`/execute/…`) is the current interface. API 2.0
 * (`/json-api/cpanel?…`) is deprecated but is the only place some needed
 * operations exist — each is marked at its call site below.
 *
 * ## ⚠️ A cPanel failure arrives with HTTP 200
 *
 * Both APIs answer a rejected call with `"status": 0` and an `errors` array,
 * still carrying HTTP 200. Treating the HTTP code as success is how a failed
 * deploy reports itself as a successful one, so every helper here checks
 * `status` and throws.
 *
 * ## ⚠️ The token is never logged
 *
 * `assertConfigured()` names the *variables* that are missing, never their
 * values, and no helper includes the request headers in an error message.
 */

/** Env vars that must be set. Names only — values are never echoed. */
const REQUIRED = ['CPANEL_HOST', 'CPANEL_USER', 'CPANEL_TOKEN']

/**
 * The wordings cPanel uses for "this UAPI function does not exist on this build".
 *
 * Only these are allowed to trigger the API 2.0 fallback in `extractArchive`.
 * A genuine failure also arrives as `status: 0`, so matching too broadly would
 * mask a real error; matching too narrowly made the deploy die on the one host
 * it was written for. Exported so the harness asserts against this list rather
 * than a copy of it — two lists would drift, and the drift is the bug.
 *
 * ⚠️ `could not find the function` is what this host actually says, measured
 * 2026-10-08. The other two are documented wordings kept because removing a
 * wording that some cPanel build emits would reintroduce the same trap.
 */
export const MISSING_FUNCTION =
  /unrecogni[sz]ed|not implemented|unknown function|could not find the function/i

/**
 * Read and validate the cPanel connection settings from the environment.
 *
 * @returns {{base: string, user: string, token: string, dryRun: boolean}}
 * @throws {Error} naming any missing variable, listing names but not values.
 */
export function config() {
  const missing = REQUIRED.filter((name) => !process.env[name])
  if (missing.length > 0) {
    throw new Error(
      `cPanel credentials not set: ${missing.join(', ')}. ` +
        'Expected CPANEL_HOST (e.g. b201.serverdiana.com), CPANEL_USER, CPANEL_TOKEN.',
    )
  }
  return {
    // `CPANEL_BASE` overrides the endpoint wholesale. It exists so the verify
    // harness can point this client at a local server that reproduces cPanel's
    // response shapes, and so a future staging host needs no code change.
    base: process.env.CPANEL_BASE ?? `https://${process.env.CPANEL_HOST}:2083`,
    user: process.env.CPANEL_USER,
    token: process.env.CPANEL_TOKEN,
    // Every mutating helper honours this. A dry run must be impossible to
    // mistake for a real one, so it is a property of the client rather than a
    // check each caller has to remember.
    dryRun: process.env.DEPLOY_DRY_RUN === 'true',
  }
}

/**
 * Perform one HTTP request against the cPanel host.
 *
 * @param {object} options
 * @param {string} options.url Absolute URL.
 * @param {'GET'|'POST'} [options.method]
 * @param {Record<string,string>} [options.form] Form fields for POST.
 * @param {FormData} [options.body] Multipart body, when uploading a file.
 * @param {string} options.user cPanel account username.
 * @param {string} options.token API token.
 * @returns {Promise<Response>}
 *
 * ## ⚠️ The username is part of the credential, not decoration
 *
 * cPanel's authentication is **one header carrying two values**:
 *
 * ```
 * Authorization: cpanel <cpanel-user>:<api-token>
 * ```
 *
 * This sent `cpanel ${token}` — the bare token, no user — and every call
 * answered **HTTP 401** against the real host on 2026-10-04, at the first
 * read-only directory listing of the very first credential probe.
 *
 * ## ⚠️ And 40 of 40 checks passed while it was broken
 *
 * `verify-cpanel-deploy.mjs` drives this client against a fake cPanel that
 * reproduces the response envelopes. That fake **never inspected the
 * `Authorization` header** — it answered any request — so the suite certified
 * the client's behaviour thoroughly and its *credential format* not at all.
 * The one property that decides whether the deploy can authenticate was the one
 * property nothing checked.
 *
 * The check below now asserts the header, and the fake server rejects a
 * malformed one, so the format cannot regress into silence again.
 */
async function request({ url, method = 'GET', form, body, token, user }) {
  const headers = { Authorization: `cpanel ${user}:${token}` }
  if (form) headers['Content-Type'] = 'application/x-www-form-urlencoded'
  return fetch(url, { method, headers, body: body ?? (form && new URLSearchParams(form)) })
}

/**
 * Turn a cPanel failure payload into a thrown Error.
 *
 * cPanel's error shape differs between the two APIs and both are noisy, so this
 * flattens them to one readable line. Called only when `status` is 0.
 *
 * @param {string} label Human name of the call, for the message.
 * @param {unknown} payload The parsed response body.
 * @returns {Error}
 */
function failure(label, payload) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
  // Cap the length: cPanel returns HTML for some errors, and a 40 KB stack of
  // markup in a CI log helps nobody.
  const detail = body.length > 600 ? `${body.slice(0, 600)}…` : body
  return new Error(`${label} failed: ${detail}`)
}

/**
 * Call a UAPI function.
 *
 * UAPI takes form-encoded input on POST and answers `{"status":1,"data":{…}}`
 * or `{"status":0,"errors":[…]}`.
 *
 * @param {ReturnType<typeof config>} cfg
 * @param {string} module e.g. `Fileman`
 * @param {string} func e.g. `list_files`
 * @param {Record<string, string>} [params]
 * @returns {Promise<any>} the `data` object on success.
 */
export async function uapi(cfg, module, func, params = {}) {
  const label = `UAPI ${module}::${func}`
  const res = await request({
    url: `${cfg.base}/execute/${module}/${func}`,
    method: 'POST',
    form: params,
    token: cfg.token,
    user: cfg.user,
  })
  return unwrap(label, res)
}

/**
 * Call a UAPI function with a multipart body, for file upload.
 *
 * @param {ReturnType<typeof config>} cfg
 * @param {string} module
 * @param {string} func
 * @param {FormData} form
 * @returns {Promise<any>}
 */
async function uapiMultipart(cfg, module, func, form) {
  const res = await request({
    url: `${cfg.base}/execute/${module}/${func}`,
    method: 'POST',
    body: form,
    token: cfg.token,
    user: cfg.user,
  })
  return unwrap(`UAPI ${module}::${func}`, res)
}

/**
 * Read a cPanel response envelope, throwing unless it reports success.
 *
 * ⚠️ HTTP can fail before cPanel's own envelope exists — a 502 from something
 * in front of cPanel, say — so the envelope is checked first and the HTTP code
 * only consulted when there is no envelope to read.
 *
 * @param {string} label Human name of the call, for the message.
 * @param {Response} res
 * @returns {Promise<any>} the `data` field.
 */
async function unwrap(label, res) {
  let payload
  try {
    payload = await res.json()
  } catch {
    payload = await res.text().catch(() => `<unreadable HTTP ${res.status}>`)
  }
  if (payload && typeof payload === 'object' && 'status' in payload) {
    if (payload.status !== 1) throw failure(label, payload)
    return payload.data
  }
  if (!res.ok) throw failure(label, `HTTP ${res.status}`)
  throw failure(label, 'response carried no status field')
}

/**
 * Read the `cpanelresult` envelope this host actually uses for API 2.0 calls.
 *
 * ⚠️ This exists because the documented shape is not what the host sends. See
 * `api2` for the measured response. `cpanelresult` folds its outcome into three
 * fields — `data` on success, `error`/`errors` on failure — without a `status`
 * boolean, so this helper synthesises one rather than pretending the field
 * exists.
 *
 * @param {any} payload The parsed JSON body.
 * @returns {{status: number, data: any} | undefined} a result, or nothing.
 */
function cpanelResult(payload) {
  const cr = payload?.cpanelresult
  if (!cr || typeof cr !== 'object') return undefined
  // `postevent.result` and `event.result` are the outcome markers this envelope
  // uses in place of a status boolean; `error`/`errors` carry the failure text.
  const errors = cr.error ?? cr.errors
  if (errors) return { status: 0, data: cr.data }
  const ok = cr.postevent?.result ?? cr.event?.result
  return { status: ok === 1 ? 1 : 0, data: cr.data }
}

/**
 * Call an API 2.0 function.
 *
 * API 2.0 is deprecated. It is used only where **no UAPI equivalent exists** —
 * currently `Fileman::fileop` (extract) and `Fileman::mkdir`. Its envelope is
 * `{"cpanel_obj":{"result":{"status":1,"data":[…]}}}`.
 *
 * @param {ReturnType<typeof config>} cfg
 * @param {string} module
 * @param {string} func
 * @param {Record<string, string>} [params]
 * @returns {Promise<any>} the `result.data` value on success.
 */
export async function api2(cfg, module, func, params = {}) {
  const label = `API 2.0 ${module}::${func}`
  const query = new URLSearchParams({
    cpanel_jsonapi_user: cfg.user,
    cpanel_jsonapi_module: module,
    cpanel_jsonapi_func: func,
    ...params,
  })
  const res = await request({
    url: `${cfg.base}/json-api/cpanel?${query}`,
    token: cfg.token,
    user: cfg.user,
  })
  const payload = await res.json()

  // ⚠️ Two envelopes, and only one of them is the documented one.
  //
  // API 2.0 is supposed to answer `{"cpanel_obj":{"result":{status,data}}}`.
  // This host does not. It routes the request — `module` and `func` are echoed
  // back — but wraps the answer as `{"cpanelresult":{"apiversion":2,"data":[…],
  // "postevent":{"result":1},…}}`, which is the UAPI envelope with the API
  // version set to 2. Measured 2026-10-08, run 37758709796, against the real
  // `Fileman::fileop` extract that the deploy depends on.
  //
  // Reading only `cpanel_obj` therefore saw "no result" in a response that
  // carried one, and the extract — which had succeeded — was reported as a
  // failure. The deploy died at the last step for a reason that was not real.
  const result = payload?.cpanel_obj?.result ?? cpanelResult(payload)
  if (result) {
    if (result.status !== 1) throw failure(label, result.errors ?? payload)
    return result.data
  }
  if (!res.ok) throw failure(label, `HTTP ${res.status}`)
  // ⚠️ Include the body. Without it the message says only "no result" and the
  // operator is looking at a host that answered HTTP 200 with something —
  // possibly an error envelope, possibly a redirect page — and cannot tell
  // which. This is the exact error that killed the second live deploy
  // (2026-10-08, run 37756100116), and the body that would have explained it was
  // discarded one line above.
  throw failure(label, `unexpected response: ${JSON.stringify(payload)?.slice(0, 400)}`)
}

/**
 * Upload a local file into a directory on the host.
 *
 * ⚠️ `dir` is relative to the account's home directory. **Do not pass
 * `public_html` here for an archive that must not be publicly readable** —
 * it sits at a guessable URL from upload until it is deleted. Prefer staging it
 * outside the docroot; see `extractArchive` for how that is handled.
 *
 * @param {ReturnType<typeof config>} cfg
 * @param {string} dir Destination directory, relative to home.
 * @param {string} localPath Absolute path of the file to upload.
 * @param {string} remoteName Filename to create on the host.
 * @returns {Promise<string>} the path cPanel reports it wrote.
 */
export async function uploadFile(cfg, dir, localPath, remoteName) {
  // Guard before the read, not after: a dry run must not even look at a file it
  // is not going to send. This guard was missing once — see `extractArchive`.
  if (cfg.dryRun) return `${dir}/${remoteName}`
  const { readFile } = await import('node:fs/promises')
  const bytes = await readFile(localPath)
  const form = new FormData()
  form.append('dir', dir)
  form.append('file', new Blob([bytes]), remoteName)
  const data = await uapiMultipart(cfg, 'Fileman', 'upload_files', form)
  // cPanel echoes the stored file back. Prefer its answer over our guess at the
  // path, so a renamed or de-conflicted upload is recorded truthfully.
  const stored = Array.isArray(data) ? data[0]?.UploadedFile : undefined
  return stored ? `${dir}/${stored}` : `${dir}/${remoteName}`
}

/**
 * Extract an archive already sitting on the host.
 *
 * ## Why this probes instead of calling one function
 *
 * `Fileman::fileop op=extract` (API 2.0) has **no destination parameter** —
 * the archive always expands into the directory it already sits in. To use it on
 * `public_html`, the zip has to be uploaded *into* `public_html`, where it is
 * publicly downloadable at a guessable URL until it is deleted.
 *
 * Newer cPanel builds also ship `Fileman::extract_files` (UAPI), which is
 * documented as taking a destination. **That could not be confirmed against
 * this host** — the cPanel docs URLs would not resolve, so rather than assume,
 * this function tries the UAPI call first and falls back. Whichever one the
 * host accepts is returned to the caller and printed in the CI summary, so the
 * first live run settles it against the real cPanel version instead of a
 * document. When the UAPI form is accepted the zip never enters the docroot.
 *
 * @param {ReturnType<typeof config>} cfg
 * @param {string} archivePath Path of the archive, relative to home.
 * @param {string} destDir Directory to expand into, relative to home.
 * @returns {Promise<{via: 'uapi-extract_files'|'api2-fileop'|'dry-run'}>}
 */
export async function extractArchive(cfg, archivePath, destDir) {
  // ⚠️ This guard was missing, and an adversarial review proved the hole by
  // running it: the dry-run check used to wrap only the UAPI branch, so control
  // fell straight through to the API 2.0 extract below — a mutating call, in a
  // dry run, against the host holding the only copy of the archive. The
  // orchestrators happened to return before ever reaching here, so nothing had
  // fired. It was one refactor away from firing.
  if (cfg.dryRun) return { via: 'dry-run' }
  try {
    await uapi(cfg, 'Fileman', 'extract_files', {
      sourcefile: archivePath,
      destination: destDir,
    })
    return { via: 'uapi-extract_files' }
  } catch (error) {
    // An unknown function and a real failure are both `status: 0`. Falling
    // through on a genuine error would mask it, so only a missing-function
    // error is allowed to fall through.
    //
    // ⚠️ Two wordings, because cPanel is not consistent across builds — and the
    // difference is not academic. The first live deploy (2026-10-08, run
    // 37749577648) died here against this exact host: it answers
    // `The system could not find the function “extract_files” in the module
    // “Fileman”.`, which the original `unrecogni[sz]ed|not implemented|unknown
    // function` does not match. The deploy failed *safe* — nothing was written
    // — but it failed at the one step whose whole purpose was to be tried and
    // fallen back from. A guard that only recognises the wording it was written
    // against is a guard that has never met the host it guards.
    if (!MISSING_FUNCTION.test(error.message)) {
      throw error
    }
  }
  await api2(cfg, 'Fileman', 'fileop', {
    op: 'extract',
    source: archivePath,
    path: destDir,
  })
  return { via: 'api2-fileop' }
}

/**
 * List a directory on the host.
 *
 * ## ⚠️ Entries are normalised here, because the wire shape is not `{name}`
 *
 * cPanel's `Fileman::list_files` returns each entry keyed **`file`**, not `name`.
 * Measured against the live host 2026-10-10: reading `entry.name` yields
 * `undefined` on every entry, silently.
 *
 * That silence had a real cost. `deploy-cms.mjs` computed its delete set from
 * `entry.name`, so `listHostFiles` produced a path of `undefined` for every
 * entry, matched nothing, and returned an empty delete set — the
 * clear-before-extract step had therefore **removed nothing on any deploy run to
 * date** while still reporting success. A stale-file cleaner that quietly never
 * fires is worse than no cleaner, because the run log says it ran.
 *
 * Normalising at the boundary means callers work in `{name, type}` and only this
 * one function knows the API's spelling. The harness's fake keeps answering
 * `name`, and both spellings are accepted, so the client is verified against the
 * fake and correct against the real host.
 *
 * @param {ReturnType<typeof config>} cfg
 * @param {string} dir Relative to home.
 * @returns {Promise<Array<{name: string, type: string}>>}
 */
export async function listFiles(cfg, dir) {
  const data = await uapi(cfg, 'Fileman', 'list_files', { dir, elfinder: '0' })
  if (!Array.isArray(data)) return []
  return data
    .map((entry) => ({
      name: entry?.file ?? entry?.name ?? '',
      type: entry?.type ?? '',
    }))
    .filter((entry) => entry.name !== '')
}

/**
 * Read a text file from the host.
 *
 * @param {ReturnType<typeof config>} cfg
 * @param {string} dir Relative to home.
 * @param {string} file
 * @returns {Promise<string>} empty string when the file does not exist.
 */
export async function readTextFile(cfg, dir, file) {
  try {
    const data = await uapi(cfg, 'Fileman', 'get_file_content', { dir, file })
    return typeof data?.content === 'string' ? data.content : ''
  } catch (error) {
    // "No such file" is the expected first-deploy case: there is no manifest
    // yet, which means the delete set is empty rather than "delete everything".
    if (/no such file|not exist|does not exist/i.test(error.message)) return ''
    throw error
  }
}

/**
 * Write a text file on the host, creating parent directories as needed.
 *
 * @param {ReturnType<typeof config>} cfg
 * @param {string} dir Relative to home.
 * @param {string} file
 * @param {string} content
 * @returns {Promise<void>}
 */
export async function writeTextFile(cfg, dir, file, content) {
  if (cfg.dryRun) return
  try {
    await uapi(cfg, 'Fileman', 'save_file_content', { dir, file, content })
  } catch (error) {
    // `tmp/` does not exist on a first deploy. There is no UAPI mkdir, so this
    // is one of the two reasons API 2.0 is still reachable at all.
    await api2(cfg, 'Fileman', 'mkdir', { path: dir })
    await uapi(cfg, 'Fileman', 'save_file_content', { dir, file, content })
    void error
  }
}

/**
 * Delete a file, or a directory and everything under it.
 *
 * ⚠️ UAPI `Fileman::delete_file` is **not present on this host** — measured
 * 2026-10-08, run 37764034486: `The system could not find the function
 * “delete_file” in the module “Fileman”.` So deletion falls back to the same
 * API 2.0 `fileop` that extraction uses, with `op=unlink`. The probe-zip cleanup
 * in `deploy-static.mjs` depends on this: an unremovable probe file would leave
 * a stale archive in the docroot on every deploy, and before the fallback
 * existed it killed the run after a successful extract.
 *
 * @param {ReturnType<typeof config>} cfg
 * @param {string} path Relative to home.
 * @param {boolean} recursive
 * @returns {Promise<void>}
 */
export async function deletePath(cfg, path, recursive = false) {
  if (cfg.dryRun) return
  const slash = path.lastIndexOf('/')
  const dir = slash === -1 ? '.' : path.slice(0, slash)
  const file = slash === -1 ? path : path.slice(slash + 1)
  try {
    await uapi(cfg, 'Fileman', 'delete_file', {
      dir,
      file,
      recursive: recursive ? '1' : '0',
    })
    return
  } catch (error) {
    // Same trap as `extractArchive`, one call over: a missing function and a
    // genuine failure both arrive as `status: 0`. Only a missing function falls
    // through, so a real permission error still surfaces.
    if (!MISSING_FUNCTION.test(error.message)) {
      throw error
    }
  }
  await api2(cfg, 'Fileman', 'fileop', {
    op: 'unlink',
    source: `${dir === '.' ? '' : `${dir}/`}${file}`,
    path: dir,
  })
}

/**
 * Restart Passenger by touching `tmp/restart.txt`.
 *
 * This is the documented Phusion mechanism and the only headless restart
 * available: cPanel's own `WebApp::restart` needs cPanel 138 and this host runs
 * 134. The write is throttled by `PassengerStatThrottleRate` (default 10s), so
 * the new process is live about ten seconds after this call.
 *
 * @param {ReturnType<typeof config>} cfg
 * @param {string} appRoot The app's root, relative to home (e.g. `shikkha24-cms`).
 * @returns {Promise<void>}
 */
export async function restartApp(cfg, appRoot) {
  await writeTextFile(cfg, `${appRoot}/tmp`, 'restart.txt', '')
}
