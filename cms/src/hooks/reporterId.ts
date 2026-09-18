import type { CollectionBeforeValidateHook } from 'payload'

/**
 * Public reporter identifier — `SHK-R-<year>-<seq>`.
 *
 * ## Why it is generated, not typed
 *
 * A hand-entered ID drifts the moment two editors type the same one, and a
 * *guessable* ID is worse: the whole point of the number is that a reader can
 * scan a press card and trust that the person holding it is the person the site
 * says they are. `unique: true` on the field is the backstop, but a collision
 * surfaces as a validation error to whoever happened to save second — so the
 * value is derived here and the field is not editable.
 *
 * ## Sequence, not random
 *
 * The sequence is zero-padded to four digits, which does two things: it reads
 * as a credential rather than a hash, and it sorts **lexicographically in the
 * same order it sorts numerically** (`…-0009` < `…-0010`). That is what lets the
 * lookup below ask the database for the single highest row instead of scanning
 * every author.
 *
 * ## The year is the Dhaka year, not the runtime year
 *
 * The site is Bangladesh-facing and every other date on it is anchored to
 * Asia/Dhaka (`frontend/src/lib/bangla-date.ts`). A card issued at 02:00 Dhaka
 * on 1 January must not be numbered with the previous year just because the
 * server happened to be running in UTC.
 *
 * ## Concurrency
 *
 * Two simultaneous creates could read the same maximum and compute the same
 * next value. The database's unique constraint turns that into a failed save
 * rather than a duplicate credential — the safe direction to fail. Reporter
 * records are created a handful of times a year, so a retry is acceptable; a
 * duplicate identity number is not.
 *
 * ## It also backfills
 *
 * Any author saved without an ID receives one, not just newly created records —
 * see the note in the hook body for why that is load-bearing.
 */

const PREFIX = 'SHK-R'

/** The current year in Asia/Dhaka, so the ID cannot disagree with the site's dates. */
function dhakaYear(): number {
  return Number(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric' }).format(
      new Date(),
    ),
  )
}

export const assignReporterId: CollectionBeforeValidateHook = async ({ data, req }) => {
  if (!data || data.reporterId) return data

  /*
   * ⚠️ Deliberately **not** restricted to `operation === 'create'`.
   *
   * Any author without an ID gets one on the next save. Restricting this to
   * creation looked correct and was wrong: every author that already existed
   * when S13 shipped would have been left permanently without a `reporterId`,
   * so their verification badge would render while the ID line beside it stayed
   * empty — and nothing would ever fix it. A credential that some holders can
   * never obtain is not a credential. Self-healing on save is the migration.
   */
  const prefix = `${PREFIX}-${dhakaYear()}-`

  /*
   * Ask for the single highest existing ID for this year. The `like` filter is
   * anchored on the year prefix, so last year's highest number cannot leak into
   * this year's sequence.
   */
  const highest = await req.payload.find({
    collection: 'authors',
    where: { reporterId: { like: `${prefix}%` } },
    sort: '-reporterId',
    limit: 1,
    depth: 0,
  })

  const last = (highest.docs[0] as { reporterId?: string } | undefined)?.reporterId
  const lastSeq = last ? Number.parseInt(last.slice(prefix.length), 10) : 0
  const next = Number.isFinite(lastSeq) ? lastSeq + 1 : 1

  return { ...data, reporterId: `${prefix}${String(next).padStart(4, '0')}` }
}
