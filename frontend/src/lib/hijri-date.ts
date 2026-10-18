/**
 * Hijri (হিজরি) date line for the masthead, in Bengali digits and the
 * month transliterations Bangladeshi newspapers print.
 *
 * Why manual composition instead of one `Intl` call: Node's `bn` ICU output
 * appends a stray era word ("… , ১৪৪৮ যুগ"), and the printed format the masthead
 * needs is exactly `৬ই জমাদিউল আউয়াল, ১৪৪৮ হিজরি`. So `Intl` only supplies the
 * umalqura day/month/year numbers; digits, suffix and month name are ours.
 */
import { toBnDigits } from './bangla-date'

/**
 * Which computed Islamic calendar the masthead trusts.
 *
 * Chosen empirically, not by taste: on 2026-10-17 the owner's ground truth was
 * ৬ই জমাদিউল আউয়াল ১৪৪৮ — of the four Intl islamic variants only
 * `islamic-umalqura` returned 5/6/1448 (`islamic`/`rgsa` → 5/7,
 * `islamic-civil` → 5/5). Bangladesh's moon-sighting calendar can sit ±1 day
 * from ANY computed variant; if a reader ever reports drift, this constant is
 * the single swap point.
 */
const HIJRI_CALENDAR = 'islamic-umalqura'

/** Index 0 = মোহররাম. Bangladesh newspaper transliterations. */
const HIJRI_MONTH_NAMES = [
  'মোহররাম',
  'ছফর',
  'রবিউল আউয়াল',
  'রবিউস সানি',
  'জমাদিউল আউয়াল',
  'জমাদিউস সানি',
  'রজব',
  'শাবান',
  'রমজান',
  'শাওয়াল',
  'জিলক্বদ',
  'জিলহজ্জ',
]

/** Bengali date suffixes as newspapers print them: ১লা, ২রা, ৩রা, ৪ঠা, ৫ই…১৯ই, ২০শে…৩১শে, ২৪ঠা. */
function bengaliDayWithSuffix(day: number): string {
  const bn = toBnDigits(day)
  if (day === 1) return `${bn}লা`
  if (day === 2 || day === 3) return `${bn}রা`
  if (day === 4 || day === 24) return `${bn}ঠা`
  if (day >= 20) return `${bn}শে`
  return `${bn}ই`
}

/**
 * Format a moment as the Dhaka-day Hijri date, e.g.
 * `৬ই জমাদিউল আউয়াল, ১৪৪৮ হিজরি`.
 *
 * @param date any instant; converted to Asia/Dhaka before the Hijri day is taken.
 * @returns the printed newspaper form of the Hijri date.
 */
export function formatHijriDate(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat(`en-US-u-ca-${HIJRI_CALENDAR}`, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Dhaka',
  }).formatToParts(date)
  const value = (type: string): number => Number(parts.find((part) => part.type === type)?.value)
  const day = value('day')
  const month = value('month')
  const year = value('year')
  const monthName = HIJRI_MONTH_NAMES[month - 1]
  return `${bengaliDayWithSuffix(day)} ${monthName}, ${toBnDigits(year)} হিজরি`
}
