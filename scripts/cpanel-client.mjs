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
 * @param {string} options.token API token, sent as the cPanel auth header.
 * @returns {Promise<Response>}
 */
async function request({ url, method = 'GET', form, body, token }) {
  const headers = { Authorization: `cpanel ${token}` }
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
  const res = await request({ url: `${cfg.base}/json-api/cpanel?${query}`, token: cfg.token })
  const payload = await res.json()
  const result = payload?.cpanel_obj?.result
  if (result) {
    if (result.status !== 1) throw failure(label, result.errors ?? payload)
    return result.data
  }
  if (!res.ok) throw failure(label, `HTTP ${res.status}`)
  throw failure(label, 'response carried no cpanel_obj.result')
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
 * @returns {Promise<{via: 'uapi-extract_files'|'api2-fileop'}>}
 */
export async function extractArchive(cfg, archivePath, destDir) {
  if (!cfg.dryRun) {
    try {
      await uapi(cfg, 'Fileman', 'extract_files', {
        sourcefile: archivePath,
        destination: destDir,
      })
      return { via: 'uapi-extract_files' }
    } catch (error) {
      // An unknown function and a real failure are both `status: 0`. Falling
      // through on a genuine error would mask it, so the reason is kept and
      // only a missing-function error is allowed to fall through.
      if (
        !/unrecogni[sz]ed|not implemented|unknown function|Unknown function/i.test(error.message)
      ) {
        throw error
      }
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
 * @param {ReturnType<typeof config>} cfg
 * @param {string} dir Relative to home.
 * @returns {Promise<Array<{name: string, type: string}>>}
 */
export async function listFiles(cfg, dir) {
  const data = await uapi(cfg, 'Fileman', 'list_files', { dir, elfinder: '0' })
  return Array.isArray(data) ? data : []
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
 * @param {ReturnType<typeof config>} cfg
 * @param {string} path Relative to home.
 * @param {boolean} recursive
 * @returns {Promise<void>}
 */
export async function deletePath(cfg, path, recursive = false) {
  if (cfg.dryRun) return
  const slash = path.lastIndexOf('/')
  await uapi(cfg, 'Fileman', 'delete_file', {
    dir: slash === -1 ? '.' : path.slice(0, slash),
    file: slash === -1 ? path : path.slice(slash + 1),
    recursive: recursive ? '1' : '0',
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
