/**
 * Counter-prove the backup verification before it is trusted to reject an archive.
 *
 * ## Why a backup gate needs this more than any other
 *
 * Every other harness in this project checks that working code stays working. This one
 * checks that **broken** input gets rejected — and a gate that only ever sees good input
 * is indistinguishable from a gate that accepts everything. The failure mode is the worst
 * one available: a green run, an artifact nobody inspects, and a restore that fails when
 * the site is already down.
 *
 * So every check is proved against the specific defect it claims to catch, using real
 * SQLite files rather than mocks. `docs/backup-and-recovery.md` §2: *an untested backup is
 * not a backup* — which applies to the code that judges backups too.
 *
 * Run: node scripts/verify-backup.mjs
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  ageInHours,
  CURL_FLAGS,
  ftpUrl,
  MAX_AGE_HOURS,
  parseLatest,
  protocolAllowed,
  writeNetrc,
} from './backup-fetch.mjs'
import { CORE_TABLES, verifyArchive, verifyRestorable } from './backup-verify.mjs'

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite')

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
 * Whether `fn` throws.
 *
 * Used to assert that a guard refuses bad input. Paired with a check that the message names
 * the right values, because "it threw" and "it threw for the correct reason" are different
 * claims and only the second is worth anything.
 *
 * @param {() => unknown} fn
 * @returns {boolean}
 */
function rejects(fn) {
  try {
    fn()
    return false
  } catch {
    return true
  }
}

/**
 * Build a directory that looks exactly like an extracted backup.
 *
 * Uses the project's real table names from the live schema — `articles`, not Payload's
 * default `posts` — so a check written against the wrong name fails here rather than in
 * production.
 *
 * @param {object} [options]
 * @param {number} [options.articles]
 * @param {number} [options.mediaRows]
 * @param {number} [options.mediaFiles] Files written under `media/`.
 * @param {boolean} [options.withMediaDir]
 * @returns {string} the directory path.
 */
function makeBackupDir({
  articles = 3,
  categories = 1,
  mediaRows = 2,
  users = 1,
  mediaFiles = 2,
  withMediaDir = true,
} = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'backup-'))
  const db = new DatabaseSync(join(dir, 'payload.db'))
  db.exec(`
    CREATE TABLE articles (id TEXT PRIMARY KEY, title TEXT);
    CREATE TABLE categories (id TEXT PRIMARY KEY);
    CREATE TABLE media (id TEXT PRIMARY KEY);
    CREATE TABLE users (id TEXT PRIMARY KEY);
  `)
  // Every table is seeded from a parameter, including the ones that default to 1. A
  // fixture that hardcoded a row in `users` could never reproduce the genuinely-empty
  // database — which is the case section 7 exists to test.
  const seed = (table, n) => {
    const insert = db.prepare(`INSERT INTO ${table} (id) VALUES (?)`)
    for (let i = 0; i < n; i += 1) insert.run(`${table}-${i}`)
  }
  seed('articles', articles)
  seed('categories', categories)
  seed('media', mediaRows)
  seed('users', users)
  db.close()

  if (withMediaDir) {
    mkdirSync(join(dir, 'media'), { recursive: true })
    for (let i = 0; i < mediaFiles; i += 1) {
      writeFileSync(join(dir, 'media', `image-${i}.webp`), 'fake image bytes')
    }
  }
  return dir
}

/**
 * Pack a directory into a `.tar.gz` the way the host-side cron does.
 *
 * @param {string} dir
 * @param {object} [options]
 * @param {number} [options.truncateTo] Bytes to keep, for the truncated-transfer test.
 * @returns {string} the archive path.
 */
function pack(dir, { truncateTo } = {}) {
  const archive = `${dir}.tar.gz`
  execFileSync('tar', ['-czf', archive, '-C', dir, '.'], { stdio: 'pipe' })
  if (truncateTo !== undefined) {
    const bytes = readFileSync(archive)
    writeFileSync(archive, bytes.subarray(0, truncateTo))
  }
  return archive
}

/** Run the whole harness. */
function main() {
  console.log('\n1. A real backup passes')
  {
    const dir = makeBackupDir()
    const result = verifyRestorable(dir)
    check('accepted', result.ok, result.problems.join('; '))
    check(
      'reports the row counts a restore would find',
      result.counts.articles === 3,
      JSON.stringify(result.counts),
    )
    check('counts the media files', result.mediaFiles === 2, String(result.mediaFiles))
  }

  console.log('\n2. A truncated transfer is rejected — the check that earns its keep')
  {
    // ⚠️ This is the real one. A transfer that stops halfway is the single most likely
    // way a backup silently becomes worthless, and it is invisible until the restore.
    const archive = pack(makeBackupDir(), { truncateTo: 512 })
    const result = verifyArchive(archive)
    check('rejected', !result.ok, JSON.stringify(result.problems))
    check(
      'and the reason is reported, not swallowed',
      result.problems.some((p) => /extract|gzip|truncat/i.test(p)),
      JSON.stringify(result.problems),
    )
  }

  console.log('\n3. A corrupted database is rejected')
  {
    const dir = makeBackupDir()
    // Overwrite pages in the middle of the file. The header and the first pages stay
    // valid, so anything less thorough than a full integrity_check would call this fine.
    const bytes = readFileSync(join(dir, 'payload.db'))
    const from = Math.floor(bytes.length / 2)
    bytes.fill(0xff, from, from + 4096)
    writeFileSync(join(dir, 'payload.db'), bytes)

    const result = verifyRestorable(dir)
    check('rejected', !result.ok, JSON.stringify(result.problems))
    check(
      'named as an integrity failure',
      result.problems.some((p) => /integrity|could not read/i.test(p)),
      JSON.stringify(result.problems),
    )
    check(
      'reported rather than thrown, so the operator is told which check failed',
      typeof result.problems[0] === 'string' && result.problems[0].length > 0,
    )
  }

  console.log('\n4. A missing database is rejected')
  {
    const dir = makeBackupDir()
    execFileSync('rm', ['-f', join(dir, 'payload.db')])
    const result = verifyRestorable(dir)
    check('rejected', !result.ok)
    check(
      'says the database is missing',
      result.problems.some((p) => /missing/i.test(p)),
      result.problems.join('; '),
    )
  }

  console.log('\n5. A 0-byte database is rejected, not mistaken for an empty one')
  {
    // The host carried exactly this before the first migration: `payload.db` present,
    // zero tables. Restoring it gives a site with no schema and no error.
    const dir = makeBackupDir()
    writeFileSync(join(dir, 'payload.db'), '')
    const result = verifyRestorable(dir)
    check('rejected', !result.ok)
    check(
      'named as uninitialised',
      result.problems.some((p) => /0 bytes/i.test(p)),
      result.problems.join('; '),
    )
  }

  console.log('\n6. An archive with no media is rejected')
  {
    // `docs/backup-and-recovery.md` §7 calls this out explicitly: a backup that silently
    // omits media is worse than no backup, because it hides the gap.
    const dir = makeBackupDir({ withMediaDir: false })
    const result = verifyRestorable(dir)
    check('rejected', !result.ok)
    check(
      'says the images would be lost',
      result.problems.some((p) => /media/i.test(p)),
      result.problems.join('; '),
    )
  }

  console.log('\n7. A correctly-shaped but entirely empty database is rejected')
  {
    const dir = makeBackupDir({
      articles: 0,
      categories: 0,
      mediaRows: 0,
      users: 0,
      mediaFiles: 1,
    })
    const result = verifyRestorable(dir)
    check('rejected', !result.ok, JSON.stringify(result.problems))
    check(
      'named as restoring to a blank site',
      result.problems.some((p) => /blank site/i.test(p)),
      result.problems.join('; '),
    )
  }

  console.log("\n8. Another project's database is rejected")
  {
    // A `.db` that is perfectly valid, and is not ours. Only the table names catch this.
    const dir = mkdtempSync(join(tmpdir(), 'foreign-'))
    const db = new DatabaseSync(join(dir, 'payload.db'))
    db.exec('CREATE TABLE unrelated (id TEXT)')
    db.close()
    mkdirSync(join(dir, 'media'), { recursive: true })
    writeFileSync(join(dir, 'media', 'x.webp'), 'x')

    const result = verifyRestorable(dir)
    check('rejected', !result.ok)
    check(
      'names the missing tables',
      CORE_TABLES.every((t) => result.problems.some((p) => p.includes(t))),
      result.problems.join('; '),
    )
  }

  console.log('\n9. The full archive path works end to end')
  {
    const archive = pack(makeBackupDir())
    const result = verifyArchive(archive)
    check('a packed backup passes', result.ok, result.problems.join('; '))
    check('and reports its size', result.archiveBytes > 0)

    check(
      'a missing archive is refused rather than throwing',
      !verifyArchive('/tmp/definitely-not-here.tar.gz').ok,
    )
  }

  console.log('\n10. Orphaned session rows are a warning, not a rejection')
  {
    // ⚠️ Added because the *real* payload.db failed the first version of this check.
    // It has three orphaned rows in `users_sessions` — reader accounts deleted months
    // ago whose session records Payload does not cascade. Treating that as corruption
    // rejected a perfectly good backup of the live database, which is a gate as useless
    // as one that accepts everything. This is the case that keeps the check honest.
    const dir = makeBackupDir()
    const db = new DatabaseSync(join(dir, 'payload.db'))
    db.exec(`
      CREATE TABLE users_sessions (id TEXT PRIMARY KEY, user TEXT REFERENCES users(id));
      PRAGMA foreign_keys = OFF;
    `)
    db.prepare('INSERT INTO users_sessions (id, user) VALUES (?, ?)').run(
      's1',
      'user-who-was-deleted',
    )
    db.close()

    const result = verifyRestorable(dir)
    check('the backup is still accepted', result.ok, result.problems.join('; '))
    check(
      'but the operator is told about it',
      result.warnings.some((w) => /users_sessions/.test(w)),
      JSON.stringify(result.warnings),
    )
    check('and it is not silently swallowed', result.warnings.length > 0)
  }

  console.log('\n11. A host cron that stopped running is caught')
  {
    // ⚠️ Without this, a deleted or suspended cron job produces a *green* backup run
    // forever, because the fetch keeps succeeding on yesterday's archive. That is the
    // same class of failure as the SSH one this replaces: a backup that has quietly
    // stopped backing up. It is the check most worth having.
    const now = new Date('2026-10-04T20:00:00Z')
    const fresh = parseLatest('shikkha24-20261004T190000Z.tar.gz')
    check('a fresh archive is accepted', ageInHours(fresh, now) < MAX_AGE_HOURS)

    const stale = parseLatest('shikkha24-20260928T190000Z.tar.gz')
    check(
      'a 6-day-old archive is over the limit',
      ageInHours(stale, now) > MAX_AGE_HOURS,
      `${ageInHours(stale, now).toFixed(1)}h`,
    )

    // The timestamp the host writes is in UTC and the runner may be anywhere. A parse
    // that read it as local time would shift the age by the runner's offset and either
    // reject a fresh archive or accept a week-old one.
    const midnight = parseLatest('shikkha24-20261004T000500Z.tar.gz')
    check(
      'the stamp is read as UTC, not local time',
      ageInHours(midnight, now) < 21,
      `${ageInHours(midnight, now).toFixed(1)}h`,
    )
  }

  console.log('\n12. latest.txt cannot be used to inject a path')
  {
    // The name is written by the host and goes straight into a URL. Anything that is not
    // exactly the name our own dump script produces is refused, not escaped — an
    // escaping bug here would be a way to make the fetcher write outside its directory.
    for (const bad of ['', '   ', '../latest.txt', 'latest.txt', 'shikkha24-x.tar.gz']) {
      let threw = false
      try {
        parseLatest(bad)
      } catch {
        threw = true
      }
      check(`refused ${JSON.stringify(bad)}`, threw)
    }
    check(
      'accepts the exact name the dump script writes',
      parseLatest('shikkha24-20261004T190000Z.tar.gz\n') === 'shikkha24-20261004T190000Z.tar.gz',
    )
  }

  console.log('\n13. A credential that .netrc cannot represent is refused, not truncated')
  {
    const dir = mkdtempSync(join(tmpdir(), 'netrc-'))
    let threw = false
    try {
      writeNetrc({ dir, host: 'example.com', user: 'backup', password: 'has space' })
    } catch {
      threw = true
    }
    check('a password with whitespace is refused', threw)
    check(
      'the message explains what to do instead',
      (() => {
        try {
          writeNetrc({ dir, host: 'example.com', user: 'backup', password: 'a b' })
          return false
        } catch (error) {
          return error.message.includes('letters, digits')
        }
      })(),
    )

    const ok = writeNetrc({ dir, host: 'example.com', user: 'backup', password: 'abc-123_XYZ' })
    check('a normal password is accepted', ok.endsWith('netrc'))
    // And the file must not be world-readable — it holds the credential in the clear.
    const mode = statSync(ok).mode & 0o777
    check('the credential file is 0600', mode === 0o600, `0${mode.toString(8)}`)
    check(
      'and the value really is in it, so the check above is not vacuous',
      readFileSync(ok, 'utf8').includes('abc-123_XYZ'),
    )
  }

  console.log('\n14. ⚠️ The curl flags can actually fetch — the bug that hid for a whole build')
  {
    // ⚠️ This section exists because `--proto '=ftps'` shipped and was wrong.
    //
    // `--proto` is an ALLOWLIST OF URL SCHEMES. `'=ftps'` permits only the `ftps` scheme,
    // while the URL was `ftp://…` — so curl refused its own URL before opening a socket:
    //   curl: (1) Protocol "ftp" disabled        exit 1, no network traffic
    //
    // The nightly backup could therefore never have worked. It is the same failure mode as
    // the ssh/scp workflow this replaced, arrived at by a different route, and it survived
    // every review because **nothing ever executed the curl**. The harness tested the netrc
    // writer, the name parser and the age maths, and never these flags.
    //
    // So they are asserted here, and — per section 15 — against a deliberately broken copy.
    const url = ftpUrl('example.com', 'latest.txt')

    check('the URL scheme is the expected ftp', url.startsWith('ftp://'), url)
    check(
      '⚠️ the --proto allowlist permits the scheme curl will be given',
      protocolAllowed(CURL_FLAGS, url),
      `--proto does not allow the scheme of ${url}`,
    )
    check(
      '--ssl-reqd is present — this, not --proto, is what forces TLS',
      CURL_FLAGS.includes('--ssl-reqd'),
      JSON.stringify(CURL_FLAGS),
    )
    check(
      '--fail is present, so an error body is not a 0-byte "success"',
      CURL_FLAGS.includes('--fail'),
    )
    check(
      'the credential comes from a file, never from -u/--user in argv',
      !CURL_FLAGS.includes('-u') &&
        !CURL_FLAGS.includes('--user') &&
        !CURL_FLAGS.some((flag) => flag.startsWith('--user=')),
      JSON.stringify(CURL_FLAGS),
    )
    check(
      'no --insecure: a certificate failure must fail the backup, not bypass TLS',
      !CURL_FLAGS.includes('-k') && !CURL_FLAGS.includes('--insecure'),
    )

    // The allowlist is exclusive when written `=a,b`. Confirm the parser understands that,
    // because getting it wrong would make the check above pass for the wrong reason.
    check(
      "an exclusive allowlist is parsed as a list ('=ftp,ftps' allows ftp)",
      protocolAllowed(['--proto', '=ftp,ftps'], 'ftp://h/f') === true,
    )
    check(
      'and an exclusive allowlist still refuses what it omits',
      protocolAllowed(['--proto', '=ftps'], 'ftp://h/f') === false,
    )
    check(
      'no --proto at all means curl permits every scheme',
      protocolAllowed([], 'ftp://h/f') === true,
    )
  }

  console.log('\n15. ⚠️ FTP_HOST must be a bare hostname — a pasted scheme fails as "Bad hostname"')
  {
    // ⚠️ This section exists because a real run failed on 2026-10-05 with THREE distinct
    // errors — `curl: (3) Bad hostname`, `curl: (60)` and then an absent archive — all from
    // one mis-pasted value. `curl: (3)` names neither the secret nor the mistake, and the
    // operator's first move is to blame the FTP password, which is not the cause.
    //
    // The value has to be `b201.serverdiana.com`: cPanel's FTP Accounts page displays
    // `ftp.shikkha24.com`, but the certificate is issued for the other name, so that host
    // fails at `curl: (60)` before authenticating at all.

    // The exact paste an owner makes, since that is how a URL is normally written:
    check(
      'a pasted ftp:// scheme is rejected, not silently doubled into ftp://ftp://',
      rejects(() => ftpUrl('ftp://b201.serverdiana.com', './latest.txt')),
    )
    check(
      'and so is a trailing slash, a port and embedded credentials',
      rejects(() => ftpUrl('b201.serverdiana.com/', './latest.txt')) &&
        rejects(() => ftpUrl('b201.serverdiana.com:21', './latest.txt')) &&
        rejects(() => ftpUrl('user:pass@b201.serverdiana.com', './latest.txt')),
    )
    check(
      'and surrounding whitespace, which a copy-paste brings silently',
      rejects(() => ftpUrl(' b201.serverdiana.com', './latest.txt')) &&
        rejects(() => ftpUrl('b201.serverdiana.com ', './latest.txt')),
    )
    // A hostname with an empty label or a leading hyphen is not a hostname. Permitting it
    // would let the value through to curl, which rejects it far less legibly.
    check(
      'a malformed hostname is rejected rather than passed to curl',
      rejects(() => ftpUrl('b201..com', './latest.txt')) &&
        rejects(() => ftpUrl('-bad.com', './latest.txt')),
    )
    check(
      'the empty value is rejected',
      rejects(() => ftpUrl('', './latest.txt')),
    )
    // The rejections must be for the RIGHT reason, not merely "it threw". A guard that
    // refused everything would satisfy every line above while being useless.
    check(
      '⚠️ and the message names the wrong value and the right one',
      (() => {
        try {
          ftpUrl('ftp://b201.serverdiana.com', './latest.txt')
          return false
        } catch (error) {
          return (
            error.message.includes('b201.serverdiana.com') &&
            error.message.includes('ftp.shikkha24.com')
          )
        }
      })(),
    )
    // …and the value that actually works must still be accepted, or the guard is a wall.
    check(
      'the real hostname is still accepted and builds the expected URL',
      (() => {
        try {
          return (
            ftpUrl('b201.serverdiana.com', './latest.txt') ===
            'ftp://b201.serverdiana.com/./latest.txt'
          )
        } catch {
          return false
        }
      })(),
    )
  }

  console.log(
    `\n${failures.length === 0 ? '✅' : '❌'} ${passed} passed, ${failures.length} failed`,
  )
  if (failures.length > 0) {
    for (const failure of failures) console.error(`   - ${failure}`)
    process.exit(1)
  }
}

main()
