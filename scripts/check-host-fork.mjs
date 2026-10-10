/**
 * Read-only health check: can this cPanel account still fork a process?
 *
 * ## Why this file exists
 *
 * On 2026-10-10 the account hit a process ceiling and produced three unrelated
 * symptoms that looked like three unrelated bugs:
 *
 *   1. `BlockingIOError: [Errno 11] Resource temporarily unavailable`
 *      — creating the staging Node.js application
 *   2. `cagefs_enter: Unable to fork` — saving any application setting
 *   3. `jailshell: fork: retry: Resource temporarily unavailable`
 *      — the backup cron, failing continuously since 2026-10-04
 *
 * All three are the same failure: CloudLinux refuses to spawn a new process.
 * The host was never "broken" — `shikkha24.com` and the production CMS served
 * throughout, because long-running processes never need to fork again. Only
 * *spawning* failed.
 *
 * We spent a long time inferring this from HTTP 503s. That inference was wrong
 * twice: first blaming the app's startup file, then blaming Passenger. This
 * script measures the thing directly instead.
 *
 * ## What a "fork" costs, and why this call tests it
 *
 * Every cPanel UAPI request is handled by a PHP process the host must spawn.
 * `Fileman::list_files` is the cheapest call in the API — it opens a directory
 * and returns names. It writes nothing, creates nothing, and moves no data. If
 * it returns an entry list, the account spawned a process successfully.
 *
 * ## ⚠️ What this does NOT prove
 *
 * It proves the account can fork **for an API request**. It does not prove
 * Passenger can spawn a long-lived Node process, which needs a bigger and
 * longer-held allocation than a one-shot API call. A green run here means a
 * deploy's upload/extract calls will get through; it is not a promise that a
 * Node application will boot. That is a separate question, answered by booting
 * the app, not by this script.
 *
 * ## ⚠️ Why it probes repeatedly instead of once
 *
 * The ceiling is **intermittent**. Staging application creation failed with
 * `[Errno 11]`, then succeeded on a retry minutes later. A single successful
 * call is therefore not evidence that the ceiling has cleared — it may have
 * been sampled in a gap. `--probes` defaults to 5 spaced attempts so an
 * intermittent failure shows up as a partial run rather than a lucky pass.
 *
 * ## Read-only guarantee
 *
 * Only `listFiles` is called. No upload, extract, write, delete or restart is
 * reachable from this file. Running it against production changes nothing,
 * which is what makes it safe to run while a deploy is being considered.
 *
 * Run: node scripts/check-host-fork.mjs [--probes N] [--delay MS] [--dir PATH]
 */
import { config, listFiles, readTextFile } from './cpanel-client.mjs'

/** Directories probed when `--dir` is not given: home, the live CMS, the docroot. */
const DEFAULT_DIRS = ['.', 'shikkha24-cms', 'public_html']

const say = (message) => console.log(message)

/**
 * The only error wordings that may be reported as a process ceiling.
 *
 * Everything else — a directory that does not exist, a denied path — is an
 * ordinary API error. Conflating them produced a false "the account cannot fork"
 * verdict on 2026-10-10, complete with advice to abort a deploy.
 */
export const FORK_EXHAUSTION =
  /fork|Resource temporarily unavailable|EAGAIN|cagefs|jailshell|too many open files|out of memory|ENOMEM|EMFILE/i

/**
 * Parse argv into options. Unknown flags are ignored rather than fatal, because
 * this runs in CI where an unexpected flag must not mask the actual result.
 *
 * `--dir` accumulates rather than replaces, so several paths can be inspected in
 * one run — the workflow relies on that to check host setup without anyone
 * navigating File Manager.
 *
 * @param {string[]} argv typically `process.argv.slice(2)`.
 * @returns {{probes: number, delayMs: number, dirs: string[]}}
 */
export function parseArgs(argv) {
  // Spread, not assignment: `opts.dirs = DEFAULT_DIRS` would alias the module-level
  // array, and the `--dir` pushes below would mutate it permanently — so a second
  // call in the same process silently inherited the first call's directories.
  const opts = {
    probes: 5,
    delayMs: 1500,
    dirs: [...DEFAULT_DIRS],
    names: false,
    cats: [],
    catDir: '.',
  }
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--probes') opts.probes = Number(argv[++i])
    else if (argv[i] === '--delay') opts.delayMs = Number(argv[++i])
    else if (argv[i] === '--dir') opts.dirs.push(argv[++i])
    else if (argv[i] === '--names') opts.names = true
    else if (argv[i] === '--cat') opts.cats.push(argv[++i])
    else if (argv[i] === '--cat-dir') opts.catDir = argv[++i]
  }
  if (!Number.isInteger(opts.probes) || opts.probes < 1) opts.probes = 5
  if (!Number.isFinite(opts.delayMs) || opts.delayMs < 0) opts.delayMs = 1500
  if (opts.dirs.length === 0) opts.dirs = [...DEFAULT_DIRS]
  return opts
}

/**
 * Print the contents of small text files on the host.
 *
 * Read-only, and the only way to see what a server-side process actually
 * complained about — Passenger writes `stderr.log` beside the app, and with no
 * Terminal that file is otherwise unreachable. This is how "the CMS boots but
 * every write returns 403" gets answered from evidence instead of inference.
 *
 * Output is capped, because the failure mode of a log viewer is a log viewer
 * that runs out of CI log space before anyone reads the first error.
 *
 * @param {ReturnType<typeof config>} cfg
 * @param {string} dir directory relative to home.
 * @param {string[]} paths file names within `dir`.
 * @param {(m: string) => void} say output function.
 * @param {number} cap maximum characters printed per file.
 */
export async function catFiles(cfg, dir, paths, say, cap = 4000) {
  for (const path of paths) {
    // cPanel's get_file_content takes `dir` and `file` separately and **rejects a
    // filename containing `/`**. A caller naturally writes
    // `node_modules/@libsql/core/package.json`, so the last segment is split off
    // here rather than making every caller remember the rule.
    const cut = path.lastIndexOf('/')
    const subDir = cut === -1 ? dir : `${dir}/${path.slice(0, cut)}`
    const file = cut === -1 ? path : path.slice(cut + 1)
    try {
      const body = await readTextFile(cfg, subDir, file)
      say(`  --- ${subDir}/${file} (${body.length} bytes) ---`)
      say(body ? body.slice(0, cap) : '  (empty)')
      if (body.length > cap) say(`  … truncated, ${body.length - cap} more bytes`)
    } catch (error) {
      say(`  --- ${subDir}/${file}: could not read — ${error.message}`)
    }
  }
}

/** @returns {Promise<void>} resolves after the requested pause. */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Run the probes and print a report.
 *
 * @param {{probes: number, delayMs: number, dirs: string[]}} opts
 * @returns {Promise<{ok: boolean, attempted: number, failed: number}>} summary
 */
export async function run(opts) {
  const cfg = config()

  say(`Fork canary — read-only. ${opts.probes} probes across ${opts.dirs.length} directories.`)
  say('Proves the account can spawn a process for an API call. Not a promise that Node boots.\n')

  let attempted = 0
  let failed = 0
  let firstError = ''
  const failedErrors = []

  const label = (probe, dir) => `  probe ${probe}/${opts.probes}  ${dir.padEnd(16)}`

  for (let probe = 1; probe <= opts.probes; probe += 1) {
    for (const dir of opts.dirs) {
      attempted += 1
      const started = Date.now()
      try {
        const entries = await listFiles(cfg, dir)
        const ms = Date.now() - started
        // An empty directory is a valid answer; a thrown call is not. The
        // distinction matters, so both are reported explicitly.
        const count = String(entries.length).padStart(4)
        say(`${label(probe, dir)} OK    ${count} entries  ${ms}ms`)
        // Counts answer "is forking working". They do not answer "is the right
        // code actually in that directory" — a deploy that extracts to the wrong
        // path still reports a healthy count, which is exactly the confusion this
        // flag exists to remove.
        if (opts.names) {
          for (const entry of entries) {
            say(`        ${entry.type === 'dir' ? 'd' : '-'} ${entry.name}`)
          }
        }
      } catch (error) {
        failed += 1
        const ms = Date.now() - started
        if (!firstError) firstError = error.message
        failedErrors.push(error.message)
        say(`${label(probe, dir)} FAIL  ${ms}ms`)
        say(`      ${error.message}`)
      }
    }
    if (probe < opts.probes) await sleep(opts.delayMs)
  }

  // Read files after the probes, so a cat failure cannot mask a fork verdict.
  if (opts.cats.length > 0) await catFiles(cfg, opts.catDir, opts.cats, say)

  say('')
  if (failed === 0) {
    say(`Result: PASS — ${attempted}/${attempted} read-only calls succeeded. The account can fork.`)
  } else {
    // ⚠️ Do NOT report every API error as a fork failure. An absent directory is
    // not a process ceiling, and calling it one produces a false verdict that
    // says a deploy would die partway through an extract — which is both wrong
    // and alarming enough to stop a deploy that would have been fine.
    //
    // That exact false verdict was produced on 2026-10-10 by probing a directory
    // that did not exist, and the failure text blamed `cagefs_enter`. Only the
    // errors that actually name process exhaustion may claim to be one.
    const ceiling = failedErrors.filter((message) => FORK_EXHAUSTION.test(message)).length
    if (ceiling === failedErrors.length && failedErrors.length > 0) {
      say(`Result: FAIL — ${failed}/${attempted} calls failed, all naming process exhaustion.`)
      say(`First error: ${firstError}`)
      say('This matches the `cagefs_enter: Unable to fork` and `[Errno 11]` symptoms. It is a')
      say('host-side process ceiling. A CMS deploy now would likely die partway through an')
      say('extract, so do not start one until this reads PASS.')
    } else {
      say(
        `Result: INDETERMINATE — ${failed}/${attempted} calls failed, but not from process exhaustion.`,
      )
      say(`First error: ${firstError}`)
      say('A path that does not exist, or a permission problem, looks identical to a')
      say('ceiling at the HTTP layer. Check the path before concluding anything about forking:')
      say('re-run with a directory you know exists (omit `dir` for the defaults).')
    }
  }
  return {
    ok: failed === 0,
    attempted,
    failed,
    ceiling: failedErrors.length > 0 && failedErrors.every((m) => FORK_EXHAUSTION.test(m)),
  }
}

// Only run when invoked directly, so the exports stay testable.
if (import.meta.url === `file://${process.argv[1]}`) {
  const opts = parseArgs(process.argv.slice(2))
  run(opts)
    .then(({ ok }) => process.exit(ok ? 0 : 1))
    .catch((error) => {
      console.error(`Fork canary could not run: ${error.message}`)
      process.exit(2)
    })
}
