/**
 * University CGPA — the calculation, as a pure function.
 *
 * ## ⚠️ This is a DIFFERENT scale from the SSC/HSC one in `lib/gpa.ts`
 *
 * Bangladesh runs two grade-point systems and mixing them is the most common
 * mistake on an application. `lib/gpa.ts` is the **school-leaving 5.00 scale**
 * (SSC/HSC, where A+ is 5.00). This is the **university 4.00 scale**, where A+ is
 * 4.00 — the same maximum a US transcript uses, so a university CGPA needs no
 * conversion for an application abroad.
 *
 * ## ⚠️ And a different rule for F
 *
 * At school, an F in a compulsory subject **zeroes the whole result**. At
 * university it does not: an F is a 0.00 grade point that is **included** in the
 * credit-weighted average, and its credits still count in the denominator. One
 * failed course drags a CGPA down; it does not annihilate it. Copying the school
 * rule here would produce a confidently wrong number for anyone who has failed a
 * course — which is exactly when the number matters most.
 *
 * ## Verified sources, per scale
 *
 * The two scales below are not interchangeable and are not guesses:
 *
 * | Scale | Source |
 * |---|---|
 * | `ugc` — public universities & National University | three independent sources agreeing exactly on the quarter-point table |
 * | `nsu` — the private-university `+/-` variant | **North South University's own published grading policy** |
 *
 * ⚠️ **The NSU table was deliberately taken from the university's own page rather
 * than a third-party calculator**, and the two disagreed: a third-party source
 * put A at 95 marks, NSU's policy says **93**. Third-party calculators are not
 * authorities on someone else's regulations.
 *
 * Private universities differ from each other, so the scale is a **preset the
 * reader chooses**, never an assumption — and the page shows which one is in use
 * and where it came from.
 */

/** One grade band: a floor, the letter, and the point it carries. */
export interface CgpaBand {
  /** Lowest percentage in this band. */
  minPercent: number
  label: string
  point: number
}

/** A named grading scale, with the class bands that go with it. */
export interface CgpaScale {
  id: string
  /** Bengali name shown in the selector. */
  labelBn: string
  /** The highest grade point — the denominator in "CGPA x.xx / 4.00". */
  max: number
  /** Bands, highest first. */
  bands: readonly CgpaBand[]
  /** Degree-classification bands, highest first. */
  classes: readonly { min: number; labelBn: string }[]
  /** Where these numbers come from. Shown to the reader, not buried in a comment. */
  sourceBn: string
}

/**
 * Public universities and the National University — the UGC 4.00 scale.
 *
 * The steps are **quarter points covering five percentage marks each**, which is
 * finer than most national scales: 74 and 75 differ by a quarter of a grade point.
 */
const UGC: CgpaScale = {
  id: 'ugc',
  labelBn: 'সরকারি বিশ্ববিদ্যালয় / জাতীয় বিশ্ববিদ্যালয়',
  max: 4,
  bands: [
    { minPercent: 80, label: 'A+', point: 4.0 },
    { minPercent: 75, label: 'A', point: 3.75 },
    { minPercent: 70, label: 'A-', point: 3.5 },
    { minPercent: 65, label: 'B+', point: 3.25 },
    { minPercent: 60, label: 'B', point: 3.0 },
    { minPercent: 55, label: 'B-', point: 2.75 },
    { minPercent: 50, label: 'C+', point: 2.5 },
    { minPercent: 45, label: 'C', point: 2.25 },
    { minPercent: 40, label: 'D', point: 2.0 },
    { minPercent: 0, label: 'F', point: 0.0 },
  ],
  classes: [
    { min: 3.0, labelBn: 'প্রথম শ্রেণি' },
    { min: 2.25, labelBn: 'দ্বিতীয় শ্রেণি' },
    { min: 2.0, labelBn: 'তৃতীয় শ্রেণি' },
  ],
  sourceBn: 'ইউজিসি / জাতীয় বিশ্ববিদ্যালয়ের ৪.০০ স্কেল — পাস গ্রেড ডি (৪০%)।',
}

/**
 * The private-university `+/-` variant, taken from North South University's own
 * published grading policy.
 *
 * ⚠️ **Not a stand-in for "private universities" as a category.** They differ from
 * each other, which is why this is labelled by the university it came from and the
 * page tells the reader to check their own policy.
 *
 * Note the pass mark: **60**, not 40. A grade that passes at one university fails
 * at the other, which is precisely why the scale cannot be assumed.
 */
const NSU: CgpaScale = {
  id: 'nsu',
  labelBn: 'বেসরকারি বিশ্ববিদ্যালয় (+/- পদ্ধতি)',
  max: 4,
  bands: [
    { minPercent: 93, label: 'A', point: 4.0 },
    { minPercent: 90, label: 'A-', point: 3.7 },
    { minPercent: 87, label: 'B+', point: 3.3 },
    { minPercent: 83, label: 'B', point: 3.0 },
    { minPercent: 80, label: 'B-', point: 2.7 },
    { minPercent: 77, label: 'C+', point: 2.3 },
    { minPercent: 73, label: 'C', point: 2.0 },
    { minPercent: 70, label: 'C-', point: 1.7 },
    { minPercent: 67, label: 'D+', point: 1.3 },
    { minPercent: 60, label: 'D', point: 1.0 },
    { minPercent: 0, label: 'F', point: 0.0 },
  ],
  classes: [
    { min: 3.0, labelBn: 'প্রথম শ্রেণি' },
    { min: 2.5, labelBn: 'দ্বিতীয় শ্রেণি' },
    { min: 2.0, labelBn: 'তৃতীয় শ্রেণি' },
  ],
  sourceBn: 'নর্থ সাউথ ইউনিভার্সিটির প্রকাশিত গ্রেডিং নীতি — পাস গ্রেড ডি (৬০%)।',
}

/** The selectable presets, in the order the page offers them. */
export const CGPA_SCALES: readonly CgpaScale[] = [UGC, NSU]

/** Look a scale up by id, falling back to the UGC scale. */
export function scaleById(id: string): CgpaScale {
  return CGPA_SCALES.find((scale) => scale.id === id) ?? UGC
}

/** One course row. */
export interface CgpaCourse {
  /** Credit hours. A course with no credits contributes nothing and is skipped. */
  credits: number
  /** The grade point earned, taken from the selected scale's bands. */
  point: number
  /** Optional semester/year label. Empty means "one term". */
  term: string
}

/** A per-term GPA. */
export interface CgpaTerm {
  term: string
  credits: number
  points: number
  gpa: number
}

export interface CgpaResult {
  /** The cumulative GPA to two decimals, or `null` when nothing usable was entered. */
  cgpa: number | null
  /** Credits counted — the denominator. Includes credits from failed courses. */
  totalCredits: number
  /** Σ (grade point × credits). */
  totalPoints: number
  /** One entry per term, in first-seen order. */
  terms: CgpaTerm[]
  /** How many courses carry an F. Reported, never used to zero the result. */
  failedCourses: number
}

/** The band a percentage falls in, or the lowest band if it is below every floor. */
export function bandForPercent(scale: CgpaScale, percent: number): CgpaBand {
  for (const band of scale.bands) {
    if (percent >= band.minPercent) return band
  }
  return scale.bands[scale.bands.length - 1] as CgpaBand
}

/** The degree class for a CGPA, or `null` when it falls below the lowest band. */
export function classFor(scale: CgpaScale, cgpa: number): string | null {
  for (const band of scale.classes) {
    if (cgpa >= band.min) return band.labelBn
  }
  return null
}

/**
 * Compute the CGPA, and each term's GPA.
 *
 * ## The denominator is credits **attempted**, not credits passed
 *
 * A failed course keeps its credits in the denominator and contributes 0.00 to the
 * numerator. That is the whole reason one F can hurt so much: it is not skipped,
 * and it is not averaged away — it is a zero sitting in a weighted average.
 *
 * ## Unusable rows are skipped
 *
 * A row with no credits, no grade, or a non-finite value is ignored, which is what
 * the page shows as an incomplete row. A half-filled row must not drag the result
 * down while the reader is still typing.
 */
export function computeCgpa(courses: CgpaCourse[]): CgpaResult {
  let totalCredits = 0
  let totalPoints = 0
  let failedCourses = 0
  const byTerm = new Map<string, { credits: number; points: number }>()

  for (const course of courses) {
    if (!Number.isFinite(course.credits) || course.credits <= 0) continue
    if (!Number.isFinite(course.point) || course.point < 0) continue

    const earned = course.point * course.credits
    totalCredits += course.credits
    totalPoints += earned
    if (course.point === 0) failedCourses += 1

    // An unlabelled course joins the unnamed term, so a reader who ignores the
    // term column still gets one sensible GPA rather than a blank breakdown.
    const key = course.term.trim() || '—'
    const bucket = byTerm.get(key) ?? { credits: 0, points: 0 }
    bucket.credits += course.credits
    bucket.points += earned
    byTerm.set(key, bucket)
  }

  const terms: CgpaTerm[] = [...byTerm.entries()].map(([term, bucket]) => ({
    term,
    credits: bucket.credits,
    points: bucket.points,
    gpa: bucket.credits > 0 ? bucket.points / bucket.credits : 0,
  }))

  return {
    cgpa: totalCredits > 0 ? totalPoints / totalCredits : null,
    totalCredits,
    totalPoints,
    terms,
    failedCourses,
  }
}
