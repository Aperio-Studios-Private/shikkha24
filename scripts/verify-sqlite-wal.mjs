#!/usr/bin/env node
/**
 * S0 gate — prove SQLite in WAL mode survives 5+ concurrent writers.
 *
 * Why this is an S0 gate and not an S12 one: the concurrency model is a
 * *foundational* database decision. `.sps/mistakes.md` M10 records the original
 * plan gating this at S12 — after all twelve sections were built — and forbids
 * repeating it. The portal targets 5 editors publishing simultaneously, plus
 * bursts to 40+ articles/day on result days, so lock contention would surface as
 * silently failed publishes.
 *
 * Method: each "editor" is a SEPARATE PROCESS with its own connection, which is
 * what actually happens in production. Each writes in its own BEGIN IMMEDIATE
 * transaction, so writers genuinely contend rather than being serialised by a
 * single connection.
 *
 * Driver note: this uses Node's built-in `node:sqlite`. Production uses
 * `@libsql/client` via `@payloadcms/db-sqlite`. libSQL is a SQLite fork and WAL
 * contention is an engine-level property, so this is a faithful test of the
 * question being asked — but it is not the identical driver. Called out rather
 * than glossed over.
 *
 * ── Finding (2026-09-12): `PRAGMA journal_mode = WAL` is not concurrency-safe ──
 *
 * The first version of this test re-issued `PRAGMA journal_mode = WAL` on every
 * connection. It failed ~80% of runs with "database is locked" — and it was
 * intermittent, so a single green run looked like a pass. Removing that PRAGMA
 * from the per-connection setup took it to 6/6 green.
 *
 * The mechanism: switching journal mode requires a lock, and that PRAGMA does
 * NOT respect `busy_timeout`. Six connections doing it at once collide and fail
 * immediately. It only needs to be set once, on the database, ever.
 *
 * ⚠️ This is a real production risk, not just a test artefact: if Payload's
 * SQLite adapter re-issues `PRAGMA journal_mode = WAL` on every connection open,
 * five editors connecting at once could hit exactly this. Verify against
 * `@payloadcms/db-sqlite` directly at S1, when the collections exist.
 *
 * Run:  node scripts/verify-sqlite-wal.mjs
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

/** The gate says "5+ concurrent writers"; test one more than the minimum. */
const WRITERS = 6
const ROWS_PER_WRITER = 40
const EXPECTED_ROWS = WRITERS * ROWS_PER_WRITER

const childFlag = process.argv.indexOf('--child')

// ─────────────────────────────────────────────────────────────────────────────
// Child mode: one editor process, writing its own rows.
// ─────────────────────────────────────────────────────────────────────────────
if (childFlag !== -1) {
  const dbPath = process.argv[childFlag + 1]
  const writerId = Number(process.argv[process.argv.indexOf('--writer') + 1])

  const db = new DatabaseSync(dbPath)
  // NOTE: `PRAGMA journal_mode = WAL` is deliberately NOT re-issued here. The
  // parent already set it, and re-issuing it is not free — changing the journal
  // mode needs a lock, so six processes doing it simultaneously contend for it.
  // Each connection does still need its own busy_timeout.
  db.exec('PRAGMA busy_timeout = 5000')
  db.exec('PRAGMA synchronous = NORMAL')

  const insert = db.prepare('INSERT INTO articles (writer_id, title, body) VALUES (?, ?, ?)')
  let committed = 0
  const failures = []

  for (let i = 0; i < ROWS_PER_WRITER; i++) {
    let step = 'begin'
    try {
      db.exec('BEGIN IMMEDIATE')
      step = 'insert'
      insert.run(writerId, `লেখা ${writerId}-${i}`, 'দেশ-বিদেশের শিক্ষার খবর। '.repeat(8))
      step = 'commit'
      db.exec('COMMIT')
      committed++
    } catch (err) {
      try {
        db.exec('ROLLBACK')
      } catch {
        /* the transaction may already be gone */
      }
      failures.push(`row ${i} at ${step}: ${err.message}`)
    }
  }

  db.close()
  if (failures.length > 0 || committed !== ROWS_PER_WRITER) {
    console.error(`writer ${writerId} FAILED: committed ${committed}/${ROWS_PER_WRITER}`)
    for (const f of failures.slice(0, 5)) console.error(`   ${f}`)
    process.exit(1)
  }
  process.exit(0)
}

// ─────────────────────────────────────────────────────────────────────────────
// Parent mode: set up the database, run the writers, verify.
// ─────────────────────────────────────────────────────────────────────────────
const dir = mkdtempSync(join(tmpdir(), 'shikkha24-wal-'))
const dbPath = join(dir, 'concurrency.db')

function openDb() {
  const db = new DatabaseSync(dbPath)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA busy_timeout = 5000')
  return db
}

const setup = openDb()
const journalMode = setup.prepare('PRAGMA journal_mode').get()
setup.exec(`
  CREATE TABLE articles (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    writer_id INTEGER NOT NULL,
    title     TEXT    NOT NULL,
    body      TEXT    NOT NULL
  )
`)
setup.close()

console.log(`journal_mode      : ${journalMode.journal_mode}`)
console.log(`concurrent writers: ${WRITERS}`)
console.log(`rows per writer   : ${ROWS_PER_WRITER}`)
console.log(`database          : ${dbPath}`)
console.log('')

const started = Date.now()

const results = await Promise.all(
  Array.from(
    { length: WRITERS },
    (_, i) =>
      new Promise((resolve) => {
        const child = spawn(
          process.execPath,
          [new URL(import.meta.url).pathname, '--child', dbPath, '--writer', String(i)],
          { stdio: ['ignore', 'inherit', 'inherit'] },
        )
        child.on('close', (code) => resolve({ writer: i, code }))
      }),
  ),
)

const elapsedMs = Date.now() - started
const failed = results.filter((r) => r.code !== 0)

const verify = openDb()
const { n } = verify.prepare('SELECT COUNT(*) AS n FROM articles').get()
const distinct = verify.prepare('SELECT COUNT(DISTINCT writer_id) AS n FROM articles').get()
verify.close()

const integrity = (() => {
  const db = openDb()
  const row = db.prepare('PRAGMA integrity_check').get()
  db.close()
  return Object.values(row)[0]
})()

rmSync(dir, { recursive: true, force: true })

console.log(`elapsed           : ${elapsedMs} ms`)
console.log(`writer processes  : ${WRITERS - failed.length}/${WRITERS} clean exit`)
console.log(`rows written      : ${n} / ${EXPECTED_ROWS}`)
console.log(`distinct writers  : ${distinct.n}`)
console.log(`integrity_check   : ${integrity}`)
console.log('')

const pass = failed.length === 0 && n === EXPECTED_ROWS && integrity === 'ok'
console.log(pass ? 'VERDICT: PASS' : 'VERDICT: FAIL')
process.exit(pass ? 0 : 1)
