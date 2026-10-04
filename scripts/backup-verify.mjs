/**
 * Deciding whether a downloaded backup could actually be restored.
 *
 * ## Why this exists at all
 *
 * `docs/backup-and-recovery.md` §2 states the rule: **an untested backup is not a backup.**
 * The corollary is worse and is the reason this file is separate from the workflow: a
 * backup that *runs* and produces a file is not evidence that the file is restorable. A
 * truncated transfer, a WAL file pulled without its database, a database pulled without
 * its media directory — each produces a green workflow run and an archive that is
 * worthless at the moment it is needed.
 *
 * So this refuses anything it cannot prove restorable, and says which check failed.
 *
 * ## Why `node:sqlite` and not the `sqlite3` CLI
 *
 * Three reasons, all of them about removing ways for this to fail on a runner that is
 * not this machine:
 *
 * - **No install step.** The runner would need `apt-get install sqlite3` before the one
 *   step that decides whether the archive is worth keeping.
 * - **No shell quoting.** The archive path is attacker-adjacent in the loosest sense —
 *   it comes from a filename the host chose — and building a `sqlite3 "file" "query"`
 *   command line is how spaces and quotes become a second failure mode.
 * - **No version skew.** `PRAGMA` output format has changed across SQLite releases. The
 *   library returns rows; the assertion is then an ordinary array comparison.
 *
 * ## ⚠️ Opened read-write on purpose
 *
 * A database in WAL mode cannot be opened read-only unless its `-shm` file already
 * exists — SQLite returns *"unable to open database file"* rather than replaying the
 * log. **Replaying that log is exactly what we want**: it is what makes the snapshot
 * consistent. The file being opened is a throwaway copy in a temp directory, so this
 * writes nothing of consequence.
 *
 * Run: node scripts/backup-verify.mjs <archive.tar.gz>
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// `require` rather than a static `import` for one reason: `node:sqlite` emits an
// ExperimentalWarning on some releases, and a warning printed to stderr reads like a
// problem that is not there. Keeping it behind `require` puts the noise where it can be
// noted rather than mistaken for a fault.
const require = createRequire(import.meta.url)

/**
 * Tables whose presence proves this is *our* database and not some other `.db` file,
 * or an empty one that a fresh `init` would also satisfy.
 *
 * Named from the live schema (`SELECT name FROM sqlite_master`), not guessed: this
 * project has `articles`, not `posts` — Payload's default collection name, which a
 * hand-written check would have used.
 */
export const CORE_TABLES = ['articles', 'categories', 'media', 'users']

/**
 * Count files under a directory, recursively.
 *
 * @param {string} dir
 * @returns {number}
 */
function countFiles(dir) {
  let total = 0
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return 0
  }
  for (const entry of entries) {
    if (entry.isDirectory()) total += countFiles(join(dir, entry.name))
    else if (entry.isFile()) total += 1
  }
  return total
}

/**
 * Open a SQLite file and report what a restore would find.
 *
 * @param {string} dbPath Absolute path to the `.db`.
 * @returns {{problems: string[], counts: Record<string, number>, bytes: number}}
 */
export function inspectDatabase(dbPath) {
  const problems = []
  const warnings = []
  const counts = {}

  let bytes = 0
  try {
    bytes = statSync(dbPath).size
  } catch {
    return { problems: [`payload.db is missing at ${dbPath}`], warnings, counts, bytes: 0 }
  }
  if (bytes === 0) {
    // An empty file is a 0-byte `payload.db`, which is what the host had before the
    // first migration ran. Restoring it produces a site with no schema and no data.
    return {
      problems: ['payload.db is 0 bytes — this is an uninitialised database'],
      warnings,
      counts,
      bytes,
    }
  }

  // Imported here rather than at the top of the file: see the `createRequire` note.
  const { DatabaseSync } = require('node:sqlite')
  let db
  try {
    db = new DatabaseSync(dbPath)
  } catch (error) {
    return {
      problems: [`payload.db could not be opened: ${error.message}`],
      warnings,
      counts,
      bytes,
    }
  }

  try {
    // `integrity_check` is the whole point. It walks every page and verifies checksums,
    // so a transfer that stopped halfway is caught here rather than at 3am.
    //
    // ⚠️ And it can *throw* rather than return a verdict: a database whose pages are
    // damaged often fails inside `prepare()` with `SQLITE_CORRUPT` ("database disk image
    // is malformed") rather than reporting a bad verdict. That is a rejection either way,
    // but an uncaught throw produces a stack trace instead of the sentence explaining
    // which check failed — which is the entire value of this module. So the whole
    // inspection is wrapped, and a thrown SQLite error becomes a reported problem.
    try {
      const integrity = db.prepare('PRAGMA integrity_check').all()
      const verdict = integrity.map((row) => Object.values(row)[0])
      if (verdict.length !== 1 || verdict[0] !== 'ok') {
        problems.push(`SQLite integrity_check failed: ${verdict.slice(0, 5).join('; ')}`)
      }

      // Structural soundness is not logical soundness — but the difference matters
      // here, and it was found by running this against the real database.
      //
      // ⚠️ `foreign_key_check` is a **warning, not a failure**. The live payload.db has
      // three orphaned rows in `users_sessions`: reader accounts deleted over months,
      // whose session records remain. That is normal for Payload, whose SQLite adapter
      // does not cascade the delete. Making this a hard failure rejected a perfectly
      // good backup of the real database — and a gate that rejects every real backup is
      // as useless as one that accepts everything. Corruption is caught by
      // `integrity_check` above, which is the check that means it.
      const orphans = db.prepare('PRAGMA foreign_key_check').all()
      if (orphans.length > 0) {
        const where = [...new Set(orphans.map((row) => row.table))].sort()
        warnings.push(
          `${orphans.length} orphaned foreign-key row(s) in ${where.join(', ')} — normal for ` +
            'deleted reader accounts, reported for visibility and not treated as corruption',
        )
      }

      const present = new Set(
        db
          .prepare("SELECT name FROM sqlite_master WHERE type='table'")
          .all()
          .map((row) => row.name),
      )
      for (const table of CORE_TABLES) {
        if (!present.has(table)) {
          problems.push(`missing table "${table}" — this is not a Shikkha24 payload.db`)
          continue
        }
        try {
          counts[table] = Number(db.prepare(`SELECT count(*) AS n FROM "${table}"`).get().n)
        } catch (error) {
          problems.push(`could not count "${table}": ${error.message}`)
        }
      }

      // A structurally perfect, correctly-shaped, entirely empty database restores to a
      // blank site with no error anywhere. That is the failure this catches: pulling the
      // wrong file, or a database that was re-initialised after the archive was taken.
      const total = Object.values(counts).reduce((sum, n) => sum + n, 0)
      if (Object.keys(counts).length === CORE_TABLES.length && total === 0) {
        problems.push(
          'every core table is empty — this restores to a blank site, so either the ' +
            'wrong file was pulled or the database was re-initialised after the dump',
        )
      }
    } catch (error) {
      // `errcode` 11 is SQLITE_CORRUPT; 8 is SQLITE_READONLY. Either way SQLite is
      // telling us this file is not usable, which is all we need to know.
      const code = error.errcode === undefined ? '' : ` (SQLite errcode ${error.errcode})`
      problems.push(`SQLite could not read this database${code}: ${error.message}`)
    }
  } finally {
    // Closing a damaged database can throw too, and there is nothing left to report on.
    try {
      db.close()
    } catch {
      /* the problems array already says the file is unusable */
    }
  }

  return { problems, warnings, counts, bytes }
}

/**
 * Check an extracted backup directory.
 *
 * @param {string} dir Directory holding `payload.db` and `media/` **at its root** — the
 *   archive layout the host-side dump produces. Guessing at a nested layout is how a
 *   restore ends up pointing at a path that does not exist.
 * @param {object} [options]
 * @param {boolean} [options.requireMedia] Fail when `media/` is absent or empty.
 * @returns {{ok: boolean, problems: string[], warnings: string[], counts: Record<string, number>, bytes: number, mediaFiles: number}}
 */
export function verifyRestorable(dir, { requireMedia = true } = {}) {
  const { problems, warnings, counts, bytes } = inspectDatabase(join(dir, 'payload.db'))
  const mediaFiles = countFiles(join(dir, 'media'))

  if (requireMedia && mediaFiles === 0) {
    // `docs/backup-and-recovery.md` §7: "a backup that silently omits media is worse
    // than no backup, because it hides the gap." Every image would be gone and the
    // database would look perfectly healthy.
    problems.push('media/ is missing or empty — every uploaded image would be lost')
  }

  return { ok: problems.length === 0, problems, warnings, counts, bytes, mediaFiles }
}

/**
 * Extract a `.tar.gz` and verify what is inside it.
 *
 * Extraction goes to a fresh temp directory that is always removed, including on the
 * failure path — a corrupt archive must not leave a half-written directory behind for
 * the next run to trip over.
 *
 * @param {string} archive Path to the `.tar.gz`.
 * @returns {{ok: boolean, problems: string[], counts: Record<string, number>, bytes: number, mediaFiles: number, archiveBytes: number}}
 */
export function verifyArchive(archive) {
  const work = mkdtempSync(join(tmpdir(), 'shikkha24-verify-'))
  try {
    let archiveBytes = 0
    try {
      archiveBytes = statSync(archive).size
    } catch {
      return {
        ok: false,
        problems: [`archive not found: ${archive}`],
        warnings: [],
        counts: {},
        bytes: 0,
        mediaFiles: 0,
        archiveBytes: 0,
      }
    }

    try {
      // `-z` because it is always gzipped. Nothing else: macOS ships bsdtar and Linux
      // ships GNU tar, and the only flags they agree on are the portable ones. A
      // GNU-only flag here would mean this verifier cannot be run on the machine it was
      // written on, which is how a verification step quietly stops being run at all.
      execFileSync('tar', ['-xzf', archive, '-C', work], { stdio: 'pipe' })
    } catch (error) {
      const detail =
        error.stderr?.toString().trim().split('\n').slice(-3).join(' ') ?? error.message
      return {
        ok: false,
        problems: [`the archive would not extract — it is truncated or not a gzip: ${detail}`],
        warnings: [],
        counts: {},
        bytes: 0,
        mediaFiles: 0,
        archiveBytes,
      }
    }

    const result = verifyRestorable(work)
    return { ...result, archiveBytes }
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

/**
 * Print a verification result as GitHub Actions commands plus a readable report.
 *
 * @param {ReturnType<typeof verifyArchive>} result
 * @returns {void}
 */
function report(result) {
  for (const warning of result.warnings ?? []) console.log(`::warning::${warning}`)

  if (result.ok) {
    console.log(
      `Database ${(result.bytes / 1024).toFixed(0)} KB, ${result.mediaFiles} media file(s).`,
    )
    for (const [table, n] of Object.entries(result.counts)) {
      console.log(`  ${table.padEnd(12)} ${n}`)
    }
    console.log('✅ The archive is restorable: integrity_check passed and media is present.')
    return
  }
  for (const problem of result.problems) console.error(`::error::${problem}`)
  console.error(
    'This archive was NOT stored as a backup. A file that cannot be restored is worse than ' +
      'no file, because it makes the run look green.',
  )
}

// Only run as a script; the harness imports this without wanting an archive checked.
if (process.argv[1]?.endsWith('backup-verify.mjs')) {
  const archive = process.argv[2]
  if (!archive) {
    console.error('usage: node scripts/backup-verify.mjs <archive.tar.gz>')
    process.exit(2)
  }
  const result = verifyArchive(archive)
  report(result)
  process.exit(result.ok ? 0 : 1)
}
