#!/usr/bin/env node
/**
 * Regression gate: the archive's month navigation and its month listing must
 * agree on what a month is.
 *
 * ## The bug this guards
 *
 * `getArchiveBuckets` keys each article with `getDhakaYearMonth`, so the archive
 * navigation counted articles by **Dhaka** calendar month. The listing beside it,
 * `getArticlesByMonth`, filtered on `Date.UTC(year, month - 1, 1)` — **UTC**.
 *
 * Bangladesh is UTC+6 with no DST, so the two definitions of "October" are six
 * hours apart. An article published between 00:00 and 06:00 local was counted in
 * the nav under October and then **excluded** from October's listing: a number on
 * the page that the page below it could not add up to.
 *
 * Six hours is the entire width of the bug. Nothing looks wrong until an article
 * lands in that window, which is why nothing caught it — including a CI gate that
 * compares the two functions' outputs would not have, unless it uses instants in
 * the window.
 *
 * ## Why it is checked here and not in a unit test
 *
 * The functions live in an Astro module graph, and the existing gates in this repo
 * are plain scripts run in CI. This reimplements the boundary arithmetic rather
 * than importing it, which is a real limitation: the check would still pass if
 * someone changed `dhakaMonthUtcRange` itself. It is paired with a typecheck and
 * with the boundary maths being small and stated in one place. **Treat a failure
 * here as "the two functions have diverged again", and check which one moved.**
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const DHAKA = 'Asia/Dhaka'

/** Mirrors `offsetMsAt` in `frontend/src/lib/bangla-date.ts`. */
function offsetMsAt(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
  const f = (t) => Number(parts.find((p) => p.type === t)?.value ?? '0')
  return (
    Date.UTC(f('year'), f('month') - 1, f('day'), f('hour') % 24, f('minute'), f('second')) -
    date.getTime()
  )
}

/** Mirrors `dhakaMonthUtcRange`. */
function dhakaMonthUtcRange(year, month) {
  const a = Date.UTC(year, month - 1, 1)
  const start = new Date(a - offsetMsAt(new Date(a), DHAKA))
  const b = Date.UTC(year, month, 1)
  const end = new Date(b - offsetMsAt(new Date(b), DHAKA))
  return { start, end }
}

/** Mirrors `getDhakaYearMonth`. */
function getDhakaYearMonth(iso) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DHAKA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date(iso))
    .slice(0, 7)
}

let failures = 0

/**
 * @param {string} label what the case represents.
 * @param {string} instant an ISO instant.
 */
function check(label, instant) {
  const key = getDhakaYearMonth(instant)
  const year = Number(key.slice(0, 4))
  const month = Number(key.slice(5, 7))
  const { start, end } = dhakaMonthUtcRange(year, month)
  const at = new Date(instant)
  const inRange = at >= start && at < end

  // What the old UTC-bounded listing would have done, so the gate can show the
  // window it closes rather than only asserting the current behaviour.
  const utcStart = new Date(Date.UTC(year, month - 1, 1))
  const utcEnd = new Date(Date.UTC(year, month, 1))
  const utcWouldMiss = !(at >= utcStart && at < utcEnd)

  if (!inRange) {
    failures++
    console.log(`  FAIL  ${instant}  → ${key}  (${label})`)
    console.log(`        nav counts it in ${key} but the listing excludes it`)
    return
  }
  console.log(
    `  ok    ${instant}  → ${key}  (${label})` +
      (utcWouldMiss ? '   ← UTC bounds would have missed this' : ''),
  )
}

console.log('\nArchive month boundaries — nav key and listing must agree\n')

check('02:00 Dhaka on 1 Oct — six hours into the month', '2026-09-30T20:00:00Z')
check('02:30 Dhaka on 2 Oct', '2026-10-01T20:30:00Z')
check('18:00 Dhaka mid-month', '2026-10-05T12:00:00Z')
check('00:00 Dhaka on 1 Nov — belongs to November', '2026-10-31T18:00:00Z')
check('06:00 Dhaka on 1 Oct — the last misbucketed instant', '2026-10-01T00:00:00Z')
check('05:59 Dhaka on 1 Oct — just inside the window', '2026-09-30T23:59:00Z')

// ── The source assertion, which is what makes this gate counter-proofable ────
//
// The cases above reimplement the boundary maths, so they would keep passing if
// someone reverted `getArticlesByMonth` to `Date.UTC`. A gate that cannot go red
// when the fix is undone is decoration. So assert the call site too: the listing
// must derive its bounds from `dhakaMonthUtcRange`, and must not build them with
// `Date.UTC` in the same function.
console.log('\nSource assertion — the listing must use the Dhaka helper\n')
{
  const src = readFileSync(join(ROOT, 'frontend/src/lib/cms.ts'), 'utf8')
  const fn = src.slice(src.indexOf('export async function getArticlesByMonth'))
  const body = fn.slice(0, fn.indexOf('\n}'))

  const usesHelper = /dhakaMonthUtcRange\s*\(/.test(body)
  if (!usesHelper) {
    failures++
    console.log('  FAIL  getArticlesByMonth does not call dhakaMonthUtcRange')
    console.log('        It must take its bounds from the same Dhaka anchor the nav uses.')
  } else {
    console.log('  ok    getArticlesByMonth takes its bounds from dhakaMonthUtcRange')
  }

  const usesUtc = /Date\.UTC\s*\(/.test(body)
  if (usesUtc) {
    failures++
    console.log('  FAIL  getArticlesByMonth still builds boundaries with Date.UTC')
    console.log('        UTC bounds are what excluded 00:00–06:00 local from their own month.')
  } else {
    console.log('  ok    getArticlesByMonth no longer builds UTC month boundaries')
  }
}

console.log(
  failures === 0
    ? '\nPASS  nav and listing agree, and the listing is anchored to Dhaka\n'
    : `\n${failures} failure(s)\n`,
)
process.exit(failures === 0 ? 0 : 1)
