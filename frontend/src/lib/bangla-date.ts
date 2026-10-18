/**
 * Gregorian → Bengali calendar (বঙ্গাব্দ) conversion.
 *
 * ## Why this exists
 *
 * `toLocaleDateString('bn-BD')` gives the **Gregorian** date written in Bengali
 * digits — "১২ সেপ্টেম্বর ২০২৬". That is not what a Bengali newspaper means by
 * "the Bengali date". Bengali papers print বঙ্গাব্দ: "২৮ ভাদ্র, ১৪৩৩". The
 * header must show both.
 *
 * ## Which calendar
 *
 * **Bangladesh** version (Bangla Calendar 1963 / reformed 2019), not the Indian
 * version. They differ: in Bangladesh the year begins 14 April and month lengths
 * are fixed, whereas the Indian variant keys off the solar sidereal year and its
 * month boundaries drift. Serving a Bangladeshi readership, the Bangladesh
 * rules are the correct ones.
 *
 * ## Month lengths
 *
 * Since the 2019 reform: বৈশাখ–ভাদ্র (months 1–5) have 31 days and
 * আশ্বিন–চৈত্র (6–12) have 30, giving 365. In a year containing a 29 February
 * (i.e. when the following Gregorian year is a leap year) ফাল্গুন gains a day.
 */

const BN_MONTH_NAMES = [
  'বৈশাখ',
  'জ্যৈষ্ঠ',
  'আষাঢ়',
  'শ্রাবণ',
  'ভাদ্র',
  'আশ্বিন',
  'কার্তিক',
  'অগ্রহায়ণ',
  'পৌষ',
  'মাঘ',
  'ফাল্গুন',
  'চৈত্র',
] as const

/** Days per Bengali month. Index 10 (ফাল্গুন) gains a day in a leap year. */
const BN_MONTH_DAYS = [31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30, 30]

const BN_WEEKDAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'] as const

const MS_PER_DAY = 86_400_000

function isGregorianLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export interface BanglaDate {
  /** Bengali year, e.g. 1433. */
  year: number
  /** Month name in Bengali, e.g. "ভাদ্র". */
  monthName: string
  /** Day of month, e.g. 28. */
  day: number
  /** Weekday in Bengali, e.g. "শনিবার". */
  weekday: string
}

/**
 * Convert a Gregorian date to the Bangladesh Bengali calendar.
 *
 * @param date Any Date. Uses local time, since the calendar is civil.
 */
export function toBanglaDate(date: Date = new Date()): BanglaDate {
  const gy = date.getFullYear()
  const gm = date.getMonth() // 0-based
  const gd = date.getDate()

  /*
   * The Bengali year turns over on 14 April. On/after that date the Bengali
   * year is `gy - 593` and the year began this Gregorian year; before it, the
   * Bengali year is `gy - 594` and it began last Gregorian year.
   */
  const afterNewYear = gm > 3 || (gm === 3 && gd >= 14)
  const banglaYear = afterNewYear ? gy - 593 : gy - 594
  const startYear = afterNewYear ? gy : gy - 1

  // Days elapsed since 1 Boishakh, 1-based.
  const start = new Date(startYear, 3, 14)
  const today = new Date(gy, gm, gd)
  let remaining = Math.round((today.getTime() - start.getTime()) / MS_PER_DAY) + 1

  // In a year spanning a 29 February, ফাল্গুন has 31 days.
  const days = [...BN_MONTH_DAYS]
  if (isGregorianLeap(startYear + 1)) days[10] = 31

  let monthIndex = 0
  while (monthIndex < 11 && remaining > (days[monthIndex] ?? 0)) {
    remaining -= days[monthIndex] ?? 0
    monthIndex++
  }

  return {
    year: banglaYear,
    monthName: BN_MONTH_NAMES[monthIndex] ?? BN_MONTH_NAMES[0] ?? '',
    day: remaining,
    weekday: BN_WEEKDAYS[today.getDay()] ?? '',
  }
}

/** Latin → Bengali digits. */
export function toBnDigits(value: string | number): string {
  const digits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']
  return String(value).replace(/\d/g, (d) => digits[Number(d)] ?? d)
}

/**
 * The header string: "শনিবার, ২৮ ভাদ্র, ১৪৩৩".
 *
 * Weekday + Bengali calendar date — the form a reader expects from the masthead.
 */
export function formatBanglaDate(date: Date = new Date()): string {
  const bd = toBanglaDate(date)
  return `${bd.weekday}, ${toBnDigits(bd.day)} ${bd.monthName}, ${toBnDigits(bd.year)}`
}

/* ────────────────────────────────────────────────────────────────────────────
 * Dhaka-timezone helpers
 *
 * Problem: `toLocaleDateString('bn-BD')` without `timeZone` uses the runtime's
 * local timezone. In CI (UTC) a story published at 02:00 Dhaka on 1 September
 * displays as "31 August", and the date-filter month key disagrees with the
 * displayed date. These helpers always anchor to Asia/Dhaka.
 * ──────────────────────────────────────────────────────────────────────────── */

const DHAKA_TZ = 'Asia/Dhaka'

/** Shared formatter that yields `YYYY-MM-DD` in Dhaka time. */
const dhakaIsoFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: DHAKA_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Format a date in Bengali (bn-BD) with Asia/Dhaka timezone.
 * Accepts ISO strings or Date objects.
 */
export function formatBnBd(iso: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleDateString('bn-BD', { ...options, timeZone: DHAKA_TZ })
}

/**
 * Return `YYYY-MM` in Dhaka time — used for Pagefind date-filter keys so the
 * filter value always agrees with the displayed date.
 */
export function getDhakaYearMonth(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return dhakaIsoFormatter.format(d).slice(0, 7)
}

/**
 * Return `YYYY-MM-DD` in Dhaka time.
 */
export function getDhakaDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return dhakaIsoFormatter.format(d)
}

/**
 * How far ahead of UTC a timezone is, at a given instant, in milliseconds.
 *
 * Derived from the real zone rather than a hardcoded `-6`, so it stays correct if
 * the offset is ever changed and — unlike a constant — it does not silently become
 * wrong if a zone ever observes DST.
 *
 * @param date the instant to measure at.
 * @param timeZone an IANA zone name.
 * @returns the offset to **add** to UTC to get local time at that instant.
 */
function offsetMsAt(date: Date, timeZone: string): number {
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
  const field = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0')
  const asUtc = Date.UTC(
    field('year'),
    field('month') - 1,
    field('day'),
    field('hour') % 24,
    field('minute'),
    field('second'),
  )
  return asUtc - date.getTime()
}

/**
 * The UTC instants bounding a calendar month **in Dhaka time**.
 *
 * ## Why this exists
 *
 * `getArchiveBuckets` keys each article with `getDhakaYearMonth`, so the archive
 * navigation and the article listing for a month were built from two different
 * definitions of that month: the nav used Dhaka, the listing used
 * `Date.UTC(year, month - 1, 1)`. Bangladesh is UTC+6 with no DST, so the two are
 * six hours apart and an article published between 00:00 and 06:00 local was
 * counted in the nav under one month and *excluded* from that month's listing —
 * a number on the page that the page below it could not add up to.
 *
 * Six hours is the whole width of the bug: nothing looks wrong until an article
 * lands in that window.
 *
 * @param year the 1-indexed month number, 1–12.
 * @param month the calendar month, 1-indexed to match the existing callers.
 * @returns `{start, end}` as Dates, `end` exclusive.
 */
export function dhakaMonthUtcRange(year: number, month: number): { start: Date; end: Date } {
  // Two passes: the first lands near the boundary, the second corrects for any
  // offset change between the naive guess and the real instant.
  const naiveStart = Date.UTC(year, month - 1, 1)
  const start = new Date(naiveStart - offsetMsAt(new Date(naiveStart), DHAKA_TZ))
  const naiveEnd = Date.UTC(year, month, 1)
  const end = new Date(naiveEnd - offsetMsAt(new Date(naiveEnd), DHAKA_TZ))
  return { start, end }
}
