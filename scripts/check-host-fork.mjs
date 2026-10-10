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
import { config, listFiles } from './cpanel-client.mjs'

/** Directories probed when `--dir` is not given: home, the live CMS, the docroot. */
const DEFAULT_DIRS = ['.', 'shikkha24-cms', 'public_html']

const say = (message) => console.log(message)

/**
 * Parse argv into options. Unknown flags are ignored rather than fatal, because
 * this runs in CI where an unexpected flag must not mask the actual result.
 *
 * @param {string[]} argv typically `process.argv.slice(2)`.
 * @returns {{probes: number, delayMs: number, dirs: string[]}}
 */
export function parseArgs(argv) {
  const opts = { probes: 5, delayMs: 1500, dirs: DEFAULT_DIRS }
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--probes') opts.probes = Number(argv[++i])
    else if (argv[i] === '--delay') opts.delayMs = Number(argv[++i])
    else if (argv[i] === '--dir') opts.dirs = [argv[++i]]
  }
  if (!Number.isInteger(opts.probes) || opts.probes < 1) opts.probes = 5
  if (!Number.isFinite(opts.delayMs) || opts.delayMs < 0) opts.delayMs = 1500
  return opts
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
      } catch (error) {
        failed += 1
        const ms = Date.now() - started
        if (!firstError) firstError = error.message
        say(`${label(probe, dir)} FAIL  ${ms}ms`)
        say(`      ${error.message}`)
      }
    }
    if (probe < opts.probes) await sleep(opts.delayMs)
  }

  say('')
  if (failed === 0) {
    say(`Result: PASS — ${attempted}/${attempted} read-only calls succeeded. The account can fork.`)
  } else {
    say(`Result: FAIL — ${failed}/${attempted} calls failed. The account cannot reliably fork.`)
    say(`First error: ${firstError}`)
    say('This matches the `cagefs_enter: Unable to fork` and `[Errno 11]` symptoms. It is a')
    say('host-side process ceiling. A CMS deploy now would likely die partway through an')
    say('extract, so do not start one until this reads PASS.')
  }
  return { ok: failed === 0, attempted, failed }
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
