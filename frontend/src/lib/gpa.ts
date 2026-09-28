/**
 * SSC / HSC GPA — the calculation, as a pure function.
 *
 * ## Why this is a module and not inline in the page
 *
 * It was inline in `gpa.astro` until 2026-09-28, which is why three wrong answers
 * survived: **a calculation inside a browser script has no test surface at all**.
 * Nothing could call it, so nothing could check it. Extracting it here lets
 * `scripts/verify-gpa.mjs` exercise the real function against worked examples.
 *
 * ## The rules, and where they come from
 *
 * Bangladesh's general education boards grade on a 5.00 scale. Verified against
 * three independent sources before this was written (see `.sps/handoff.md`):
 *
 * | Marks % | Grade | Point |
 * |---|---|---|
 * | 80–100 | A+ | 5.00 |
 * | 70–79 | A | 4.00 |
 * | 60–69 | A− | 3.50 |
 * | 50–59 | B | 3.00 |
 * | 40–49 | C | 2.00 |
 * | 33–39 | D | 1.00 |
 * | 0–32 | F | 0.00 |
 *
 * 1. **The 4th subject is a bonus, not an average.**
 *    `৪র্থ বিষয় বোনাস = সর্বোচ্চ(০, ৪র্থ বিষয়ের পয়েন্ট − ২.০০)`
 *    Only the part **above 2.00** is added, and the 4th subject is **not** part of
 *    the divisor. A 4th subject at A+ (5.00) contributes **3.00**, not 5.00 and not
 *    2.00. The maximum possible bonus is therefore **3.00**, not 2.00.
 * 2. **The divisor is the number of compulsory subjects** — 6 for HSC, and
 *    whatever the programme's compulsory set is for SSC. It is *not* a fixed
 *    constant, which is why the caller passes the subjects rather than a count.
 * 3. **An F in a compulsory subject zeroes the whole result.** Not "that subject
 *    scores 0" — the overall GPA is **0.00** however good the others are.
 * 4. **An F in the 4th subject does not fail anything.** It simply earns no bonus.
 *    This is one of the most common misconceptions the sources call out.
 * 5. **The result is capped at 5.00.** The bonus can push the raw average above it
 *    (an all-A+ candidate with an A+ 4th subject computes 5.60), so the cap is a
 *    real branch and not a formality.
 *
 * ## ⚠️ Rounding is the one rule the sources disagree about
 *
 * One source states the board **truncates** rather than rounding up ("without
 * arbitrary upward rounding"), and another's worked example rounds
 * (`42 ÷ 9 = 4.666…` reported as **4.67**). They cannot both be right.
 *
 * So this module does not hide the disagreement: `rawGpa` is returned unrounded
 * and the page shows it. A student whose exact figure is 4.6667 can see that,
 * rather than being handed a rounded number and told it is authoritative. The
 * displayed GPA rounds to two decimals, which is the standard presentation.
 */

/** The 5.00 scale. Boundaries are **percentages**, so a 200-mark subject works unchanged. */
export const GRADES = [
  { minPercent: 80, point: 5.0, label: 'A+', bn: 'এ+' },
  { minPercent: 70, point: 4.0, label: 'A', bn: 'এ' },
  { minPercent: 60, point: 3.5, label: 'A-', bn: 'এ-' },
  { minPercent: 50, point: 3.0, label: 'B', bn: 'বি' },
  { minPercent: 40, point: 2.0, label: 'C', bn: 'সি' },
  { minPercent: 33, point: 1.0, label: 'D', bn: 'ডি' },
  { minPercent: 0, point: 0.0, label: 'F', bn: 'এফ' },
] as const

export type Grade = (typeof GRADES)[number]

/** The lowest point a 4th subject must exceed before it contributes anything. */
export const OPTIONAL_THRESHOLD = 2.0

/** The scale maximum. A raw average above this is capped, not reported. */
export const GPA_CAP = 5.0

/** One row of the calculator. */
export interface SubjectInput {
  /** Marks obtained. */
  marks: number
  /**
   * What those marks are out of.
   *
   * 100 for most subjects, **200 for Bangla and English** — both are examined as
   * two papers and graded on the combined total. The grade depends on the
   * percentage, so accepting 200 here is what lets a student enter the marks
   * actually printed on their marksheet instead of converting first.
   */
  outOf: number
  /** The 4th (optional) subject. Exactly one is expected; see `computeGpa`. */
  optional: boolean
}

export interface GpaResult {
  /** The GPA to two decimals, or `null` when nothing usable was entered. */
  gpa: number | null
  /**
   * The value **before** rounding, at full precision.
   *
   * Exposed because the sources disagree about rounding (see the file header), so
   * the page shows the exact figure rather than presenting a rounded one as
   * authoritative.
   */
  rawGpa: number | null
  /** The band the GPA falls in. `F` when the result is a fail. */
  grade: Grade
  /** How many compulsory subjects were counted — the divisor. */
  compulsoryCount: number
  /** Sum of the compulsory grade points, before the bonus. */
  compulsoryPoints: number
  /** The bonus the 4th subject actually contributed (`0` when it earns none). */
  bonus: number
  /** `true` when a compulsory subject is F — the result is **0.00**, not an average. */
  failed: boolean
}

/** The grade band for a percentage (0–100). */
export function gradeForPercent(percent: number): Grade {
  for (const grade of GRADES) {
    if (percent >= grade.minPercent) return grade
  }
  return GRADES[GRADES.length - 1]
}

/**
 * The band a GPA falls in.
 *
 * ⚠️ This is **not** the same lookup as `gradeForPercent`. The marks boundaries
 * (80, 70, 60 …) are percentages; a GPA is already on the 5.00 point scale, so it
 * is matched against the grade **points** (5.00, 4.00, 3.50 …). Comparing a GPA
 * against the percentage boundaries is what made the old code report **এফ for
 * every result** — the first boundary it could satisfy was always the 0 one.
 */
export function gradeForGpa(gpa: number): Grade {
  for (const grade of GRADES) {
    if (gpa >= grade.point) return grade
  }
  return GRADES[GRADES.length - 1]
}

/**
 * Compute the GPA from a set of subject rows.
 *
 * Rows with unusable input (not a finite number, negative, or above their own
 * total) are **skipped**, which is what the page shows as a blank grade. A row the
 * reader has not filled in yet must not drag the average down.
 *
 * If more than one row is marked optional, the **highest** of them is used. The
 * boards have exactly one 4th subject; taking the best keeps the number sensible
 * when a reader has not yet decided which row is the optional one, rather than
 * silently picking whichever came first.
 */
export function computeGpa(subjects: SubjectInput[]): GpaResult {
  let compulsoryPoints = 0
  let compulsoryCount = 0
  let bestOptionalPoint = 0
  let failed = false

  for (const subject of subjects) {
    const outOf = Number.isFinite(subject.outOf) && subject.outOf > 0 ? subject.outOf : 100
    if (!Number.isFinite(subject.marks) || subject.marks < 0 || subject.marks > outOf) continue

    const grade = gradeForPercent((subject.marks / outOf) * 100)

    if (subject.optional) {
      bestOptionalPoint = Math.max(bestOptionalPoint, grade.point)
      continue
    }

    compulsoryPoints += grade.point
    compulsoryCount += 1
    // Rule 3: one F anywhere in the compulsory set is a hard zero, not a zero for
    // that subject alone.
    if (grade.point === 0) failed = true
  }

  if (compulsoryCount === 0) {
    return {
      gpa: null,
      rawGpa: null,
      grade: GRADES[GRADES.length - 1],
      compulsoryCount: 0,
      compulsoryPoints: 0,
      bonus: 0,
      failed: false,
    }
  }

  // Rule 1: only the part of the 4th subject above 2.00 is added, and it does not
  // join the divisor. `max(0, …)` is what makes an F or a D in the 4th subject a
  // no-op instead of a penalty.
  const bonus = Math.max(0, bestOptionalPoint - OPTIONAL_THRESHOLD)

  // Rule 3, applied: a failed result is exactly 0.00 — the bonus cannot rescue it.
  const rawGpa = failed ? 0 : (compulsoryPoints + bonus) / compulsoryCount
  const gpa = Math.min(rawGpa, GPA_CAP)

  return {
    gpa,
    rawGpa,
    grade: gradeForGpa(gpa),
    compulsoryCount,
    compulsoryPoints,
    bonus,
    failed,
  }
}
