/**
 * Which prayer is next.
 *
 * Pure logic, no DOM and no network, so it can be tested and reasoned about
 * without a browser.
 *
 * ## The wrap-around case
 *
 * After ইশা (Isha) there is no "next" prayer *today* — the next one is ফজর
 * tomorrow. Returning "none" would blank the widget every night, which is
 * exactly when a reader checking sehri times most needs it. So the answer wraps
 * to tomorrow's ফজর and is flagged `isTomorrow` so the UI can say "আগামীকাল".
 *
 * ⚠️ **Tomorrow's ফজর is not today's ফজর.** They drift by a minute or two most
 * days, and by more than that near the solstices. The rollover therefore takes
 * the *next day's* Fajr as a separate argument: showing today's time beside an
 * "আগামীকাল" label is how the widget ends up confidently displaying a time
 * for the wrong day — in the one window a reader is most likely to be reading
 * it, since after Isha is exactly when sehri matters.
 */

/** The five daily prayers, in order. */
export const PRAYER_NAMES = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const

export type PrayerName = (typeof PRAYER_NAMES)[number]

/** Bengali labels. */
export const PRAYER_LABELS_BN: Record<PrayerName, string> = {
  fajr: 'ফজর',
  dhuhr: 'যোহর',
  asr: 'আসর',
  maghrib: 'মাগরিব',
  isha: 'এশা',
}

export type PrayerTimes = Record<PrayerName, string>

export interface NextPrayer {
  name: PrayerName
  label: string
  /** "HH:MM", 24-hour. */
  time: string
  /** Minutes until it begins. Negative would mean already past. */
  minutesUntil: number
  /** True when this is tomorrow's ফজর (i.e. Isha has already passed). */
  isTomorrow: boolean
}

/**
 * Turn "HH:MM" into minutes since midnight.
 *
 * @returns `null` when the string is not a usable time, so one malformed value
 *          cannot break the whole widget.
 */
function parseTime(value: string | undefined | null): number | null {
  if (!value) return null
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

/**
 * Find the next prayer from the current time.
 *
 * @param times       Today's five times as "HH:MM".
 * @param now         The moment to compare against. Defaults to now.
 * @param tomorrowFajr **Tomorrow's** ফজর as "HH:MM". Only used on the wrap-around
 *                     path after ইশা. Falls back to today's ফজর when absent, which
 *                     is a minute-level error rather than a blank widget.
 * @returns The next prayer, or `null` if nothing parseable is available.
 */
export function getNextPrayer(
  times: PrayerTimes,
  now: Date = new Date(),
  tomorrowFajr?: string,
): NextPrayer | null {
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  for (const name of PRAYER_NAMES) {
    const minutes = parseTime(times[name])
    if (minutes === null) continue
    if (minutes >= nowMinutes) {
      return {
        name,
        label: PRAYER_LABELS_BN[name],
        time: times[name]!,
        minutesUntil: minutes - nowMinutes,
        isTomorrow: false,
      }
    }
  }

  // Everything today has passed → tomorrow's ফজর, at tomorrow's own time.
  const fajr = parseTime(tomorrowFajr ?? times.fajr)
  if (fajr === null) return null

  return {
    name: 'fajr',
    label: PRAYER_LABELS_BN.fajr,
    time: (tomorrowFajr ?? times.fajr)!,
    minutesUntil: 24 * 60 - nowMinutes + fajr,
    isTomorrow: true,
  }
}

/**
 * Human-readable countdown, e.g. "২ ঘণ্টা ১৫ মিনিট পর".
 *
 * Bengali digits throughout, because the UI is Bengali-only.
 */
export function formatCountdown(minutes: number, toBn: (v: string | number) => string): string {
  if (minutes < 1) return 'এখনই'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${toBn(mins)} মিনিট পর`
  if (mins === 0) return `${toBn(hours)} ঘণ্টা পর`
  return `${toBn(hours)} ঘণ্টা ${toBn(mins)} মিনিট পর`
}
