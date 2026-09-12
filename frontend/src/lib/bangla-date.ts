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
  while (monthIndex < 11 && remaining > days[monthIndex]!) {
    remaining -= days[monthIndex]!
    monthIndex++
  }

  return {
    year: banglaYear,
    monthName: BN_MONTH_NAMES[monthIndex]!,
    day: remaining,
    weekday: BN_WEEKDAYS[today.getDay()]!,
  }
}

/** Latin → Bengali digits. */
export function toBnDigits(value: string | number): string {
  const digits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']
  return String(value).replace(/\d/g, (d) => digits[Number(d)]!)
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
