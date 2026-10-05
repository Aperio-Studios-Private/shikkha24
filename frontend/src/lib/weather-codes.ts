/**
 * WMO 4677 weather codes, as Open-Meteo returns them in `weather_code`.
 *
 * ## Why this lives in its own module
 *
 * The table is needed in **two places**: the build-time fetch (`widgets.ts`) and
 * the browser (`HeaderWidgets.astro`). Duplicating it is how the two drift, and
 * the drift is invisible — a stale copy simply renders a different word.
 *
 * ## Why the labels are short
 *
 * These render in the masthead ribbon next to the temperature. The old table's
 * labels were already short for that reason and the width is part of the
 * design; a long phrase like "হালকা তুষা-মিশ্রিত বৃষ্টি" would wrap the header.
 *
 * ## Drizzle is not rain
 *
 * Codes 51–57 are **drizzle** (গুঁড়া গুঁড়ি) and 56–57 / 66–67 are freezing
 * drizzle and freezing rain. The table previously mapped 51/53/55 — drizzle —
 * to `হালকা বৃষ্টি` / `বৃষ্টি` / `ভারী বৃষ্টি`, so the site told readers it was
 * raining when the sky was only drizzling. The owner saw exactly that: the site
 * reported `হালকা বৃষ্টি` while their own weather app reported mostly sunny.
 *
 * **All 29 codes are present.** The ten that were missing fell through to the
 * generic `আবহাওয়া`, so heavy snow, freezing rain and snow showers were all
 * reported as "weather".
 */

/**
 * Bengali label per WMO code.
 *
 * Covers the complete WMO 4677 code space that Open-Meteo's `weather_code`
 * can return. `weatherLabel` is the only supported way to read it — never index
 * this record directly, because an unknown code must yield `null` and not a
 * fabricated "clear sky".
 */
export const WMO_LABELS: Readonly<Record<number, string>> = {
  0: 'পরিষ্কার', // clear sky
  1: 'প্রায় পরিষ্কার', // mainly clear
  2: 'আংশিক মেঘ', // partly cloudy
  3: 'মেঘলা', // overcast
  45: 'কুয়াশা', // fog
  48: 'কুয়াশা', // depositing rime fog

  // Drizzle — NOT rain. Distinct phenomenon, distinct label.
  51: 'গুঁড়া গুঁড়ি', // light drizzle
  52: 'মাঝারি গুঁড়া', // moderate drizzle
  53: 'ঘন গুঁড়া', // dense drizzle
  55: 'ভারী গুঁড়া', // dense heavy drizzle
  56: 'তুষা-বৃষ্টি', // light freezing drizzle
  57: 'তুষা-বৃষ্টি', // dense freezing drizzle

  61: 'হালকা বৃষ্টি', // slight rain
  63: 'মাঝারি বৃষ্টি', // moderate rain
  65: 'ভারী বৃষ্টি', // heavy rain
  66: 'তুষা-বৃষ্টি', // light freezing rain
  67: 'তুষা-বৃষ্টি', // heavy freezing rain

  71: 'হালকা তুষার', // slight snow
  73: 'মাঝারি তুষার', // moderate snow
  75: 'ভারী তুষার', // heavy snow
  77: 'তুষার দানা', // snow grains

  80: 'হালকা বৃষ্টি', // slight rain showers
  81: 'মাঝারি বৃষ্টি', // moderate rain showers
  82: 'প্রবল বৃষ্টি', // violent rain showers
  85: 'হালকা তুষার', // slight snow showers
  86: 'ভারী তুষার', // heavy snow showers

  95: 'বজ্রপাত', // thunderstorm
  96: 'বজ্রপাত', // thunderstorm with slight hail
  99: 'বজ্রপাত', // thunderstorm with heavy hail
}

/**
 * The Bengali label for a WMO code.
 *
 * @param code `current.weather_code` from Open-Meteo.
 * @returns The Bengali label, or `null` when the code is absent or unknown.
 *
 * ⚠️ **`null` is the honest answer for an unknown code — do not default it.**
 * The previous table read `weather_code ?? 0`, and WMO code `0` is *clear
 * sky*: a missing code was therefore rendered as a confident blue-sky
 * forecast. An absent value means the provider did not say; saying
 * "পরিষ্কার" anyway is a fabricated forecast, which is the one thing a
 * weather widget must never do. Callers render nothing instead.
 */
export function weatherLabel(code: number | null | undefined): string | null {
  if (typeof code !== 'number' || !Number.isFinite(code)) return null
  return WMO_LABELS[code] ?? null
}
