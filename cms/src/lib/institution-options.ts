/**
 * The institution directory's two axes, and their Bengali labels.
 *
 * ⚠️ **Two axes, not one category.** `type` is ownership — who runs it.
 * `discipline` is subject — what it teaches. The seven browse categories on the
 * frontend are *filters over these two axes*, not the values of one field
 * (`docs/university-directory.md` §2.1). A single exclusive category would have
 * to file BUET either as "Public" or as "Engineering", and either choice hides
 * it from the browse path a student actually uses.
 *
 * Declared here rather than inside the collection so the S19 import can
 * normalise `discipline` against the very list the collection validates
 * against. That import needs it: the GitHub dataset it replaces spells the same
 * subject three ways (`Agricultural Science`, `Agricultural science`, and null
 * for 25 rows), so a second hand-written list would silently diverge.
 */

/** Ownership axis — who runs the institution. */
export const INSTITUTION_TYPES = ['public', 'private', 'nu-college', 'madrasa'] as const

/** Subject axis — what the institution teaches. */
export const INSTITUTION_DISCIPLINES = [
  'general',
  'engineering',
  'medical',
  'agricultural',
  'islamic',
  'science-technology',
  'other',
] as const

export type InstitutionType = (typeof INSTITUTION_TYPES)[number]
export type InstitutionDiscipline = (typeof INSTITUTION_DISCIPLINES)[number]

/** Bengali labels — the admin UI is Bengali-only (`docs/profile.md`). */
const TYPE_LABELS: Record<InstitutionType, string> = {
  public: 'সরকারি',
  private: 'বেসরকারি',
  'nu-college': 'জাতীয় বিশ্ববিদ্যালয় অধিভুক্ত কলেজ',
  madrasa: 'মাদ্রাসা',
}

const DISCIPLINE_LABELS: Record<InstitutionDiscipline, string> = {
  general: 'সাধারণ',
  engineering: 'প্রকৌশল',
  medical: 'চিকিৎসা',
  agricultural: 'কৃষি',
  islamic: 'ইসলামি শিক্ষা',
  'science-technology': 'বিজ্ঞান ও প্রযুক্তি',
  other: 'অন্যান্য',
}

/** Ready-made `options` for the collection's select fields. */
export const INSTITUTION_TYPE_OPTIONS = INSTITUTION_TYPES.map((value) => ({
  value,
  label: TYPE_LABELS[value],
}))

export const INSTITUTION_DISCIPLINE_OPTIONS = INSTITUTION_DISCIPLINES.map((value) => ({
  value,
  label: DISCIPLINE_LABELS[value],
}))
