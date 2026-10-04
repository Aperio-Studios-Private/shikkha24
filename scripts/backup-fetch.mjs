/**
 * Fetch the newest host-side backup over FTPS, and refuse to hand on anything unusable.
 *
 * ## Why FTPS
 *
 * This host refuses SSH — ports 22, 2222, 222, 2200 and 2022 all reject, which is why
 * `backup-db.yml` failed 6 runs out of 6: it pulled the dump with `ssh` and `scp`.
 * `docs/hosting-and-deployment.md` had recorded "only 443, 2083 and 2087 are open", and
 * that was wrong: **port 21 is open**, and the server answers as Pure-FTPd with TLS.
 *
 * FTP is the one transport on this host that can move a *binary* file out without a
 * shell. The cPanel API can move files too, but its file functions are text-shaped, and
 * a base64 workaround for a multi-megabyte SQLite file is a design nobody should sign
 * off on.
 *
 * ## ⚠️ The password is never in `argv`
 *
 * The same reasoning as `cpanel-client.mjs`: `curl -u user:pass` puts the credential in
 * the process argument list, where any process on the runner can read it with `ps`. It
 * goes in a `.netrc` file, mode 0600, inside a temp directory that is removed in a
 * `finally` whether the run succeeds or not.
 *
 * Run: node scripts/backup-fetch.mjs <output-directory>
 */
import { execFileSync } from 'node:child_process'
import {
  appendFileSync,
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { verifyArchive } from './backup-verify.mjs'

/**
 * A daily archive older than this means the host cron is not running.
 *
 * Without it, a cron job that silently stopped — a deleted script, a suspended account,
 * a typo in a command — produces a *green* backup run forever, because the fetch keeps
 * succeeding on yesterday's file. That is the same class of failure as the SSH one: a
 * backup that has quietly stopped backing up. 30 hours gives a day's slack for a job
 * that runs at 19:00 UTC and for a runner that is briefly delayed.
 */
export const MAX_AGE_HOURS = 30

/** Where the host writes its archives, relative to the FTP account's home. */
const REMOTE_DIR = '.'

/**
 * Parse the name the host wrote into `latest.txt`.
 *
 * The host writes this file rather than making the fetcher parse an FTP directory
 * listing: one deterministic file, and a host with no archive is a clean "no such file"
 * instead of a subtle mis-parse of an HTML listing.
 *
 * @param {string} text Contents of `latest.txt`.
 * @returns {string} the archive filename.
 * @throws {Error} if it is absent, empty, or not the expected shape.
 */
export function parseLatest(text) {
  const name = text.trim().split('\n')[0]?.trim() ?? ''
  if (name === '') throw new Error('latest.txt was empty — the host cron has probably never run')
  // Deliberately strict. The name is written by the host and interpolated into a URL, so
  // anything that is not exactly a name we produce is refused rather than escaped.
  if (!/^shikkha24-\d{8}T\d{6}Z\.tar\.gz$/.test(name)) {
    throw new Error(`latest.txt holds an unexpected name: ${JSON.stringify(name)}`)
  }
  return name
}

/**
 * Decide whether a stamped archive is too old to accept.
 *
 * @param {string} name As produced by `parseLatest`.
 * @param {Date} now
 * @returns {number} age in hours.
 */
export function ageInHours(name, now) {
  const stamp = name.slice('shikkha24-'.length, -'.tar.gz'.length)
  const iso = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T${stamp.slice(9, 11)}:${stamp.slice(11, 13)}:${stamp.slice(13, 15)}Z`
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) throw new Error(`could not read a timestamp from ${name}`)
  return (now.getTime() - then.getTime()) / 3_600_000
}

/**
 * Write a `.netrc` holding the FTP credential, mode 0600.
 *
 * @param {object} options
 * @param {string} options.dir Directory to write into.
 * @param {string} options.host
 * @param {string} options.user
 * @param {string} options.password
 * @returns {string} the netrc path.
 */
export function writeNetrc({ dir, host, user, password }) {
  // netrc is whitespace-delimited, so a password containing a space would silently
  // truncate and authenticate as something else — a failure that looks like bad
  // credentials. Refuse it here, where the message can say why.
  if (/\s/.test(password)) {
    throw new Error(
      'FTP_PASSWORD contains whitespace, which .netrc cannot represent. Generate a ' +
        'password with letters, digits and - _ only.',
    )
  }
  if (/\s/.test(user)) throw new Error('FTP_USER contains whitespace')
  const path = join(dir, 'netrc')
  writeFileSync(path, `machine ${host}\nlogin ${user}\npassword ${password}\n`)
  chmodSync(path, 0o600)
  return path
}

/**
 * The curl flags every fetch uses.
 *
 * ⚠️ `--proto` is an **allowlist of URL schemes**, not an encryption setting — and getting it
 * wrong is silent and total. The first version of this file shipped `--proto '=ftps'`, which
 * permits only the `ftps` scheme, while the URL below is `ftp://…`. curl therefore refused its
 * own URL before opening a socket: `Protocol "ftp" disabled`, exit 1, no network traffic at all.
 *
 * That is the *same failure mode as the workflow this file replaced* — a transfer that can
 * never work — and it survived review because nothing ever executed the curl. The harness
 * tested the netrc writer, the name parser and the age maths, and never these flags.
 *
 * Two flags do two different jobs and neither substitutes for the other:
 *   `--proto '=ftp,ftps'` — scheme allowlist. Must include the scheme of the URL used below.
 *   `--ssl-reqd`          — **this** is what forces TLS. Dropping it sends the credential in
 *                           the clear; keeping it is the actual security control.
 *
 * `verify-backup.mjs` asserts both properties, and `protocolAllowed()` is what catches the
 * allowlist mistake.
 */
export const CURL_FLAGS = [
  '--proto',
  '=ftp,ftps',
  '--ssl-reqd',
  '--fail',
  '--silent',
  '--show-error',
  '--connect-timeout',
  '30',
  '--max-time',
  '600',
]

/**
 * Would curl refuse the URL it has been handed, because of the `--proto` allowlist?
 *
 * This is the check that would have caught the `--proto '=ftps'` bug on the day it was
 * written. It is deliberately a pure function over the flags, so the harness can feed it a
 * deliberately broken allowlist and watch it fail rather than trusting a pass.
 *
 * @param {string[]} flags curl arguments, including the `--proto` pair if present.
 * @param {string} url The URL curl will be given.
 * @returns {boolean} true when curl would proceed.
 */
export function protocolAllowed(flags, url) {
  const at = flags.indexOf('--proto')
  // No `--proto` means no allowlist, so curl permits every scheme.
  if (at === -1) return true
  const value = flags[at + 1] ?? ''
  // `=ftp` is exclusive; without the `=` curl treats the list as "additionally allow these".
  const allowed = value.replace(/^=/, '').split(',').filter(Boolean)
  const scheme = url.slice(0, url.indexOf(':'))
  return allowed.includes(scheme)
}

/**
 * The FTP URL for a path relative to the account's home.
 *
 * ⚠️ The scheme is `ftp`, not `ftps`. `ftps://` is *implicit* FTPS, which runs on a different
 * port and is not what this host serves — port 21 here is **explicit** FTPS, verified 2026-10-04:
 * the server sends a plaintext `220-` banner before any TLS handshake, so AUTH TLS follows a
 * normal login exchange. `--ssl-reqd` is what upgrades that connection.
 *
 * @param {string} host
 * @param {string} remote Path relative to the FTP home.
 * @returns {string}
 */
export const ftpUrl = (host, remote) => `ftp://${host}/${remote}`

/**
 * Fetch one file over FTPS into `dest`.
 *
 * @param {string} netrc Path to the 0600 credential file.
 * @param {string} host
 * @param {string} remote Path relative to the FTP home.
 * @param {string} dest Local path to write.
 * @throws {Error} if curl fails; its stderr is included.
 */
function fetch(netrc, host, remote, dest) {
  const url = ftpUrl(host, remote)
  if (!protocolAllowed(CURL_FLAGS, url)) {
    // Unreachable with the shipped flags. It exists so that editing CURL_FLAGS cannot
    // reintroduce the bug as a confusing `Protocol "ftp" disabled` from curl itself.
    throw new Error(
      `curl would refuse its own URL: --proto does not allow the ` +
        `"${url.slice(0, url.indexOf(':'))}" scheme. Check CURL_FLAGS against ftpUrl().`,
    )
  }
  // `--fail` turns an FTP error body into a non-zero exit instead of a 0-byte "successful"
  // download — which is the failure this whole module exists to catch one layer earlier.
  execFileSync('curl', ['--netrc-file', netrc, ...CURL_FLAGS.slice(1), '-o', dest, url], {
    stdio: ['ignore', 'inherit', 'pipe'],
  })
}

/** Run the whole fetch. */
function main() {
  const outDir = process.argv[2] ?? '.'
  const host = process.env.FTP_HOST
  const user = process.env.FTP_USER
  const password = process.env.FTP_PASSWORD

  const missing = Object.entries({ FTP_HOST: host, FTP_USER: user, FTP_PASSWORD: password })
    .filter(([, value]) => !value)
    .map(([name]) => name)
  if (missing.length > 0) {
    // Names only. Never the value, and never a partial echo of it.
    throw new Error(
      `backup credentials not set: ${missing.join(', ')}. Set them as GitHub Secrets ` +
        '(FTP_HOST, FTP_USER, FTP_PASSWORD) — the FTP account is the one cPanel creates ' +
        'for the backup directory, not the main account.',
    )
  }

  const scratch = mkdtempSync(join(tmpdir(), 'shikkha24-fetch-'))
  // ⚠️ Tracked outside the try so the `finally` can delete it on ANY failure.
  //
  // curl's `-o` writes progressively, so a transfer that dies halfway leaves a partial file
  // on disk. Without this, that partial archive sits in the working directory under the exact
  // name a good one would have — and anything that globs `shikkha24-*.tar.gz` picks it up.
  // Leaving a rejected file behind is how a backup system ends up serving the one it refused.
  let downloaded = null
  let accepted = false
  try {
    const netrc = writeNetrc({ dir: scratch, host, user, password })

    const marker = join(scratch, 'latest.txt')
    fetch(netrc, host, `${REMOTE_DIR}/latest.txt`, marker)

    const name = parseLatest(readFileSync(marker, 'utf8'))
    const hours = ageInHours(name, new Date())
    if (hours > MAX_AGE_HOURS) {
      // This is the loud failure that replaces six silent green runs.
      throw new Error(
        `the newest archive on the host is ${name}, which is ${hours.toFixed(1)} hours old. ` +
          `That is over the ${MAX_AGE_HOURS}h limit, so the host-side cron job is not ` +
          'running. Check cPanel → Cron Jobs, and run ~/bin/shikkha24-backup-dump.sh by hand.',
      )
    }

    const archive = join(outDir, name)
    downloaded = archive
    fetch(netrc, host, `${REMOTE_DIR}/${name}`, archive)
    console.log(`Fetched ${name} (${hours.toFixed(1)}h old).`)

    const result = verifyArchive(archive)
    if (!result.ok) {
      for (const problem of result.problems) console.error(`::error::${problem}`)
      throw new Error(
        'the fetched archive is not restorable, so it was not accepted as a backup. ' +
          'A file that cannot be restored is worse than no file, because it makes the run look green.',
      )
    }

    accepted = true
    console.log(
      `Verified: ${(result.bytes / 1024).toFixed(0)} KB database, ${result.mediaFiles} media file(s), ` +
        `integrity_check ok — ${Object.entries(result.counts)
          .map(([table, n]) => `${table} ${n}`)
          .join(', ')}.`,
    )
    // `$GITHUB_OUTPUT`, not `::set-output` — that command was deprecated and removed.
    // Written only when Actions provides it, so a local run is unaffected.
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(process.env.GITHUB_OUTPUT, `archive=${name}\n`)
    }
  } finally {
    // The credential file goes whether this succeeded or not.
    rmSync(scratch, { recursive: true, force: true })
    if (downloaded && !accepted) {
      rmSync(downloaded, { force: true })
      console.log(`Removed the rejected download ${basename(downloaded)}.`)
    }
  }
}

if (process.argv[1]?.endsWith('backup-fetch.mjs')) {
  try {
    main()
  } catch (error) {
    console.error(`::error::${error.message}`)
    process.exit(1)
  }
}
