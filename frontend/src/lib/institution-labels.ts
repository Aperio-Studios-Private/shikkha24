/**
 * Bengali labels for the institution directory's two axes.
 *
 * ⚠️ **One source, not one per page.** This map was duplicated verbatim in
 * `pages/institutions/index.astro` and `pages/institutions/[slug].astro`, and
 * the copy had drifted — both still listed the `college` value that S18 removed.
 * A duplicated label map does not fail loudly; it silently renders a raw English
 * value on a Bengali-only page.
 *
 * The CMS keeps its own copy on the collection's `options` (`cms/src/collections/
 * Institutions.ts`) because the two workspaces cannot share a module. If a value
 * is added there, it must be added here too — `verify:access` asserts the CMS
 * side, so a change to the axis is caught on the CMS before it reaches a page.
 */

/** Ownership axis — who runs the institution. */
export const INSTITUTION_TYPE_LABELS: Record<string, string> = {
  public: 'সরকারি',
  private: 'বেসরকারি',
  'nu-college': 'জাতীয় বিশ্ববিদ্যালয় অধিভুক্ত কলেজ',
  madrasa: 'মাদ্রাসা',
}

/** Subject axis — what the institution teaches. Separate from ownership. */
export const INSTITUTION_DISCIPLINE_LABELS: Record<string, string> = {
  general: 'সাধারণ',
  engineering: 'প্রকৌশল',
  medical: 'চিকিৎসা',
  agricultural: 'কৃষি',
  islamic: 'ইসলামি শিক্ষা',
  'science-technology': 'বিজ্ঞান ও প্রযুক্তি',
  other: 'অন্যান্য',
}

/** The Bengali label for a stored ownership value, or null when unset. */
export function institutionTypeLabel(value?: string | null): string | null {
  if (!value) return null
  return INSTITUTION_TYPE_LABELS[value] ?? value
}

/** The Bengali label for a stored discipline value, or null when unset. */
export function institutionDisciplineLabel(value?: string | null): string | null {
  if (!value) return null
  return INSTITUTION_DISCIPLINE_LABELS[value] ?? value
}

/**
 * Fee periods. An amount with no period is meaningless — "৫০,০০০" answers
 * nothing without "per year" — so the label is printed with every figure.
 */
export const FEE_PERIOD_LABELS: Record<string, string> = {
  'per-semester': 'প্রতি সেমিস্টার',
  'per-year': 'প্রতি বছর',
  'per-credit': 'প্রতি ক্রেডিট',
  'one-time': 'এককালীন',
}

/** The Bengali label for a stored fee period, or the raw value if unknown. */
export function feePeriodLabel(value?: string | null): string | null {
  if (!value) return null
  return FEE_PERIOD_LABELS[value] ?? value
}
