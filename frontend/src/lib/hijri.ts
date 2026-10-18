/**
 * Hijri date, rendered in Bengali.
 *
 * ## Why this is its own module
 *
 * Aladhan returns the Hijri month as an English transliteration
 * ("Rabīʿ al-thānī"), which would be the only non-Bengali text in a
 * Bengali-only header. This used to live in `widgets.ts` and run at **build
 * time**, which meant the date in the panel was baked when the site was
 * deployed and went stale the next day. It is now used from the browser, where
 * it is read from the same Aladhan response as the prayer times.
 */

/** Correction in days applied to the Hijri date. Set `PUBLIC_HIJRI_OFFSET_DAYS`. */
const HIJRI_OFFSET_DAYS = Number(import.meta.env.PUBLIC_HIJRI_OFFSET_DAYS ?? -2) || 0

/**
 * Bengali names for the Hijri months.
 *
 * Aladhan also exposes `month.number`, but mapping the `en` string keeps us
 * independent of which field survives an API change. Unmapped values fall
 * through unchanged rather than disappearing.
 */
const HIJRI_MONTHS_BN: Record<string, string> = {
  muharram: 'মুহররম',
  safar: 'সফর',
  rabialawwal: 'রবিউল আউয়াল',
  rabialthani: 'রবিউস সানি',
  jumadaalawwal: 'জুমাদাল উলা',
  jumadaalthani: 'জুমাদাস সানি',
  jumadaakhirah: 'জুমাদাস সানি',
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
 * Without this the Bengali label silently disappears: Aladhan has returned
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

/** Latin → Bengali digits. The UI is Bengali-only, so "12" must read "১২". */
function toBnDigits(value: string | number): string {
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']
  return String(value).replace(/\d/g, (d) => bn[Number(d)])
}

/** The `date` payload Aladhan nests its Hijri fields in. */
export interface AladhanDate {
  hijri?: { day?: string; month?: { en?: string }; year?: string }
}

/**
 * Format an Aladhan `date` payload as a Bengali Hijri date.
 *
 * @returns e.g. `"২৩ রবিউস সানি ১৪৪৮"`, or `''` when the payload has no day —
 *          the header omits the line rather than printing something wrong.
 */
export function formatHijri(date: AladhanDate | undefined, _offsetDays: number): string {
  const hijri = date?.hijri
  if (!hijri?.day) return ''
  const monthEn = hijri.month?.en ?? ''
  const monthBn = HIJRI_MONTHS_BN[normaliseMonth(monthEn)] ?? monthEn
  return `${toBnDigits(hijri.day)} ${monthBn} ${toBnDigits(hijri.year ?? '')}`.trim()
}

/** The configured Hijri correction, in days. */
export const HIJRI_OFFSET = HIJRI_OFFSET_DAYS
