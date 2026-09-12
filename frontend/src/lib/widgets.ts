/**
 * Build-time header utilities: weather and prayer times.
 *
 * ## Why these run at BUILD time, not in the reader's browser
 *
 * The site is pre-built static HTML on Cloudflare Pages. Fetching in the reader's
 * browser would add a third-party connection to the critical path, leak quota,
 * and fail in data-saver mode. Fetching at build time bakes the value into the
 * HTML — the "cache" is the page itself, refreshed on every publish.
 *
 * The trade-off is honest and deliberate: the weather is as fresh as the last
 * build, not the last minute. For a header utility on a news portal that is the
 * right trade — `docs/data-sources.md` §1.
 *
 * ## Non-negotiable: never break the page
 *
 * Both helpers return `null` on any failure — network, timeout, bad JSON,
 * unexpected shape. The header renders the remaining utilities and simply omits
 * the one that failed. A dead weather API must never take the newsroom offline.
 *
 * ## Zero CLS
 *
 * The header reserves space for these utilities via CSS (a fixed-height row), so
 * data arriving — or not arriving — cannot shift the layout.
 *
 * Sources (both free, no API key, verified live — `docs/data-sources.md`):
 *   Weather → Open-Meteo          api.open-meteo.com
 *   Prayer  → Aladhan             api.aladhan.com  (also returns the Hijri date)
 */

/** Fail fast — a build must not hang on a slow third party. */
const TIMEOUT_MS = 4000

/** Dhaka. Overridable so a future district-aware build can pass coordinates in. */
const DEFAULT_LAT = 23.8103
const DEFAULT_LON = 90.4125

/** Aladhan method 1 — University of Islamic Sciences, Karachi, the convention
 *  commonly used in Bangladesh. */
const ALADHAN_METHOD = 1

/**
 * Hijri date correction, in days.
 *
 * **This is a real calendar disagreement, not a bug.** Aladhan's Hijri is
 * computed; Bangladesh follows the published calendar, and the two differ.
 * Verified 2026-09-12: Aladhan reports 1 Rabi' al-Thani 1448, whereas the date
 * in use is 28 Rabi' al-Awwal 1448 — two days earlier.
 *
 * Rather than guess an offset permanently, it is exposed as an env var so the
 * owner can re-calibrate if the calendars drift again:
 *   PUBLIC_HIJRI_OFFSET_DAYS=-2
 *
 * Only the Hijri date is shifted. Prayer times are always today's.
 */
const HIJRI_OFFSET_DAYS = Number(import.meta.env.PUBLIC_HIJRI_OFFSET_DAYS ?? -2) || 0

export interface Weather {
  /** Celsius, rounded. */
  tempC: number
  /** Short Bengali description. */
  label: string
}

export interface PrayerTimes {
  fajr: string
  dhuhr: string
  asr: string
  maghrib: string
  isha: string
  /** Hijri date string as returned by Aladhan, e.g. "12 Rabi'al-Awwal 1448". */
  hijri: string
}

/**
 * Latin → Bengali digits.
 *
 * The UI is Bengali-only, so a temperature of "31" must read as "৩১". Without
 * this the header would mix scripts for no good reason.
 */
export function toBnDigits(value: string | number): string {
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']
  return String(value).replace(/\d/g, (d) => bn[Number(d)])
}

/**
 * Bengali names for the Hijri months.
 *
 * Aladhan returns the month as an English/Arabic transliteration
 * ("Rabīʿ al-thānī"), which would be the only non-Bengali text on the page —
 * jarring in a Bengali-only UI. Aladhan also exposes `month.number`, but
 * mapping the `en` string keeps us independent of which field survives an API
 * change. Unmapped values fall through unchanged rather than disappearing.
 */
const HIJRI_MONTHS_BN: Record<string, string> = {
  muharram: 'মুহররম',
  safar: 'সফর',
  rabialawwal: 'রবিউল আউয়াল',
  rabialthani: 'রবিউস সানি',
  jumadaalawwal: 'জুমাদাল উলা',
  jumadaalakhirah: 'জুমাদাস সানি',
  jumadaalthani: 'জুমাদাস সানি',
  rajab: 'রজব',
  shaban: 'শাবান',
  ramadan: 'রমজান',
  shawwal: 'শাওয়াল',
  dhualqidah: 'জিলকদ',
  dhualhijjah: 'জিলহজ',
}

/**
 * Reduce a transliterated month name to a comparable key.
 *
 * `"Rabīʿ al-awwal"` → `"rabialawwal"`
 *
 * Without this the Bengali label silently disappears: Aladhan returned
 * `Rabīʿ al-awwal` while the map only held `Rabi' al-Awwal`, so the month fell
 * through to the English fallback and the header read half-Bengali.
 */
function normaliseMonth(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacritics
    .replace(/[ʿʾ'’`]/g, '') // strip ayn / hamza / apostrophes
    .replace(/[^a-z]/gi, '') // drop punctuation and spaces
    .toLowerCase()
}

/** WMO weather codes Open-Meteo returns, mapped to short Bengali labels. */
const WMO_LABELS: Record<number, string> = {
  0: 'পরিষ্কার',
  1: 'প্রায় পরিষ্কার',
  2: 'আংশিক মেঘ',
  3: 'মেঘলা',
  45: 'কুয়াশা',
  48: 'কুয়াশা',
  51: 'হালকা বৃষ্টি',
  53: 'বৃষ্টি',
  55: 'ভারী বৃষ্টি',
  61: 'হালকা বৃষ্টি',
  63: 'বৃষ্টি',
  65: 'ভারী বৃষ্টি',
  71: 'তুষার',
  80: 'বৃষ্টি',
  81: 'বৃষ্টি',
  82: 'প্রবল বৃষ্টি',
  95: 'বজ্রবিদ্যুৎ',
  96: 'ঝড়',
  99: 'ঝড়',
}

/** Fetch JSON, returning `null` on any failure. Never throws. */
async function safeFetch<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    // Network error, timeout, or malformed JSON — all mean "no data", never "crash".
    return null
  }
}

/**
 * Build-wide memo cache.
 *
 * **Why this is necessary, not an optimisation.** A static build renders every
 * page in the same process. Without a cache, a 5,000-article site would make
 * 10,000 third-party calls per build — enough to be rate-limited, and it would
 * also hammer a free API for no reason. Memoising means the whole build costs
 * **two** requests.
 *
 * The cache stores the *promise*, not the result, so concurrent pages share one
 * in-flight request rather than each starting their own.
 *
 * A failed fetch is cached as `null` too — otherwise every page would retry a
 * dead API and the build would get slower the more broken the provider was.
 */
const weatherCache = new Map<string, Promise<Weather | null>>()
const prayerCache = new Map<string, Promise<PrayerTimes | null>>()

/**
 * Current temperature for a point.
 *
 * @returns `null` when the API is unreachable — the header omits the widget.
 */
export async function getWeather(
  lat: number = DEFAULT_LAT,
  lon: number = DEFAULT_LON,
): Promise<Weather | null> {
  const key = `${lat},${lon}`
  let cached = weatherCache.get(key)
  if (!cached) {
    cached = fetchWeather(lat, lon)
    weatherCache.set(key, cached)
  }
  return cached
}

async function fetchWeather(lat: number, lon: number): Promise<Weather | null> {
  const data = await safeFetch<{
    current?: { temperature_2m?: number; weather_code?: number }
  }>(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weather_code&timezone=Asia%2FDhaka`,
  )

  const temp = data?.current?.temperature_2m
  if (typeof temp !== 'number') return null

  const code = data?.current?.weather_code ?? 0
  return {
    tempC: Math.round(temp),
    label: WMO_LABELS[code] ?? 'আবহাওয়া',
  }
}

/**
 * The Hijri date label, corrected by `HIJRI_OFFSET_DAYS`.
 *
 * A separate request from the prayer times, because the correction shifts the
 * Gregorian date we ask about. It is cheap, and both are memoised.
 *
 * @returns `''` when unavailable — the header omits the date rather than
 *          printing something wrong.
 */
async function fetchHijriLabel(lat: number, lon: number): Promise<string> {
  try {
    const date = new Date()
    date.setDate(date.getDate() + HIJRI_OFFSET_DAYS)

    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const yyyy = date.getFullYear()

    const data = await safeFetch<{
      data?: {
        date?: {
          hijri?: { day?: string; month?: { en?: string }; year?: string }
        }
      }
    }>(
      `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}` +
        `?latitude=${lat}&longitude=${lon}&method=${ALADHAN_METHOD}`,
    )

    const hijri = data?.data?.date?.hijri
    if (!hijri?.day) return ''

    const monthEn = hijri.month?.en ?? ''
    const monthBn = HIJRI_MONTHS_BN[normaliseMonth(monthEn)] ?? monthEn
    return `${toBnDigits(hijri.day)} ${monthBn} ${toBnDigits(hijri.year ?? '')}`.trim()
  } catch {
    return ''
  }
}

/**
 * Today's prayer times and the Hijri date.
 *
 * Aladhan returns `HH:MM` in 24h; we keep it as-is because the header shows it
 * compactly and Bengali readers are accustomed to 24h timetables.
 */
export async function getPrayerTimes(
  lat: number = DEFAULT_LAT,
  lon: number = DEFAULT_LON,
): Promise<PrayerTimes | null> {
  const key = `${lat},${lon}`
  let cached = prayerCache.get(key)
  if (!cached) {
    cached = fetchPrayerTimes(lat, lon)
    prayerCache.set(key, cached)
  }
  return cached
}

async function fetchPrayerTimes(lat: number, lon: number): Promise<PrayerTimes | null> {
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = now.getFullYear()

  const data = await safeFetch<{
    data?: {
      timings?: Record<string, string>
      date?: { hijri?: { day?: string; month?: { en?: string }; year?: string } }
    }
  }>(
    `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}` +
      `?latitude=${lat}&longitude=${lon}&method=${ALADHAN_METHOD}`,
  )

  const timings = data?.data?.timings
  if (!timings?.Fajr) return null

  // Aladhan appends a timezone suffix ("05:12 (+06)") — strip it.
  const clean = (value: string | undefined) => (value ?? '').split(' ')[0]

  /*
   * Hijri date, corrected.
   *
   * Aladhan returns the Hijri for the requested Gregorian date. To apply the
   * correction we ask for the date `HIJRI_OFFSET_DAYS` away and take the Hijri
   * from that response — which handles month lengths correctly, since Aladhan
   * does the arithmetic. Shifting the day number ourselves would break at every
   * month boundary (a 29- vs 30-day month).
   *
   * Prayer times above are unaffected: they come from today's request.
   */
  const hijriLabel = await fetchHijriLabel(lat, lon)

  return {
    fajr: clean(timings.Fajr),
    dhuhr: clean(timings.Dhuhr),
    asr: clean(timings.Asr),
    maghrib: clean(timings.Maghrib),
    isha: clean(timings.Isha),
    hijri: hijriLabel,
  }
}
