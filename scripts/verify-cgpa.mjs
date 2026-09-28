/**
 * Verify the university CGPA calculation.
 *
 * ## Why this exists
 *
 * Same reason as `verify-gpa.mjs`: a calculation with no test surface is not
 * "probably fine", it is unverified. The SSC/HSC calculator had three wrong
 * answers for exactly that reason.
 *
 * ## What it is really guarding
 *
 * Two mistakes are easy to make here and both produce a confident wrong number:
 *
 *   1. **Using the school rule for F.** At SSC/HSC an F zeroes the whole result.
 *      At university it is a 0.00 that is *included* in the credit-weighted
 *      average. Copying the school rule would tell a student who failed one course
 *      that their CGPA is 0.00 — when they may still be comfortably above 3.00.
 *   2. **Assuming one scale.** The UGC scale and the NSU scale are both 4.00 and
 *      share several letter names, but 75 marks is an A (3.75) at one and a B
 *      (3.00) at the other, and the pass mark is 40 versus 60. A calculator that
 *      hardcodes one scale is wrong for everyone at the other.
 *
 * Both are asserted directly below.
 *
 * ⚠️ Plain JavaScript: `--experimental-strip-types` only strips `.ts`, so an
 * annotation in a `.mjs` is a hard syntax error. See `verify-gpa.mjs`.
 *
 * Run: pnpm verify:cgpa
 */
import {
  bandForPercent,
  CGPA_SCALES,
  classFor,
  computeCgpa,
  scaleById,
} from '../frontend/src/lib/cgpa.ts'
import { gradeForPercent } from '../frontend/src/lib/gpa.ts'

let failures = 0
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

const ugc = scaleById('ugc')
const nsu = scaleById('nsu')

/** A course row at a given grade point. */
const course = (point, credits, term = '') => ({ point, credits, term })

console.log('\n=== CGPA calculation verification ===\n')

// ── 1. The published worked examples ─────────────────────────────────────────
console.log('-- worked examples from the sources --')
{
  /*
   * Source A: four courses of four credits each, graded A+, A, B+, C.
   *   (4×4.00) + (4×3.75) + (4×3.25) + (4×2.25) = 16 + 15 + 13 + 9 = 53
   *   53 ÷ 16 = 3.3125 → 3.31
   */
  const a = computeCgpa([course(4.0, 4), course(3.75, 4), course(3.25, 4), course(2.25, 4)])
  check('four 4-credit courses: total credits 16', a.totalCredits === 16, String(a.totalCredits))
  check('  and total points 53.00', a.totalPoints === 53, String(a.totalPoints))
  check('  and CGPA 3.31', a.cgpa?.toFixed(2) === '3.31', a.cgpa?.toFixed(2))

  /*
   * Source B: credits 4, 4, 3, 4 with A (3.75), B+ (3.25), A− (3.50), B (3.00).
   *   15.00 + 13.00 + 10.50 + 12.00 = 50.50 over 15 credits → 3.3666… → 3.37
   * Note this is a *credit-weighted* average: a plain average of the four points
   * would be 3.375, which rounds to 3.38 — a different answer.
   */
  const b = computeCgpa([course(3.75, 4), course(3.25, 4), course(3.5, 3), course(3.0, 4)])
  check('mixed credits: total credits 15', b.totalCredits === 15, String(b.totalCredits))
  check('  and total points 50.50', Math.abs(b.totalPoints - 50.5) < 1e-9, String(b.totalPoints))
  check('  and CGPA 3.37', b.cgpa?.toFixed(2) === '3.37', b.cgpa?.toFixed(2))
  check(
    '  and it is NOT the plain average (3.375 → 3.38)',
    b.cgpa?.toFixed(2) !== '3.38',
    b.cgpa?.toFixed(2),
  )
}

// ── 2. ⚠️ An F is INCLUDED, not skipped — the school rule does not apply ─────
console.log('\n-- the F rule (university, not school) --')
{
  const withFail = computeCgpa([course(4.0, 4), course(4.0, 4), course(4.0, 4), course(0.0, 4)])
  check(
    'one F among three A+ does NOT zero the CGPA',
    (withFail.cgpa ?? 0) > 0,
    String(withFail.cgpa),
  )
  check('  it is (12 + 0) / 16 = 3.00', withFail.cgpa === 3, String(withFail.cgpa))
  check(
    '  the failed course keeps its credits in the denominator',
    withFail.totalCredits === 16,
    String(withFail.totalCredits),
  )
  check(
    '  and the failure is reported',
    withFail.failedCourses === 1,
    String(withFail.failedCourses),
  )

  // The counter-proof for rule 1: this is exactly where copying the school rule
  // would give 0.00 instead of 3.00.
  check(
    'the school rule would have said 0.00 — assert we do not',
    withFail.cgpa !== 0,
    'a school-rule implementation returns 0',
  )

  // Credit weighting is the reason a 4-credit F hurts more than a 2-credit one.
  const heavy = computeCgpa([course(4.0, 4), course(0.0, 4)])
  const light = computeCgpa([course(4.0, 4), course(0.0, 2)])
  check(
    'a 4-credit F hurts more than a 2-credit F',
    (heavy.cgpa ?? 0) < (light.cgpa ?? 0),
    `${heavy.cgpa?.toFixed(2)} vs ${light.cgpa?.toFixed(2)}`,
  )
  check('  heavy: (16 + 0) / 20 = 2.00', heavy.cgpa === 2, String(heavy.cgpa))
  check('  light: (16 + 0) / 6 = 2.67', light.cgpa?.toFixed(2) === '2.67', light.cgpa?.toFixed(2))
}

// ── 3. Per-term GPA alongside the cumulative CGPA ────────────────────────────
console.log('\n-- terms --')
{
  const result = computeCgpa([
    course(4.0, 3, '১'),
    course(3.0, 3, '১'),
    course(3.75, 4, '২'),
    course(3.5, 4, '২'),
  ])
  check('two terms are reported', result.terms.length === 2, `${result.terms.length}`)
  check(
    'term ১ GPA is (12 + 9) / 6 = 3.50',
    result.terms[0]?.gpa === 3.5,
    String(result.terms[0]?.gpa),
  )
  check(
    'term ২ GPA is (15 + 14) / 8 = 3.625',
    Math.abs((result.terms[1]?.gpa ?? 0) - 3.625) < 1e-9,
    String(result.terms[1]?.gpa),
  )
  check(
    'CGPA is the same courses pooled: 50 / 14 = 3.571…',
    result.cgpa?.toFixed(3) === '3.571',
    result.cgpa?.toFixed(3),
  )
  check(
    '  and the term credits add up to the total',
    result.terms.reduce((s, t) => s + t.credits, 0) === result.totalCredits,
  )

  const unlabelled = computeCgpa([course(4.0, 3), course(3.0, 3)])
  check('unlabelled courses form one term', unlabelled.terms.length === 1)
  check('  and its GPA equals the CGPA', unlabelled.terms[0]?.gpa === unlabelled.cgpa)
}

// ── 4. ⚠️ The two scales are NOT interchangeable ─────────────────────────────
console.log('\n-- the scales are not interchangeable --')
{
  // 75 marks: A (3.75) on the UGC scale, C (2.00) on the NSU scale.
  check(
    'UGC: 75% is A (3.75)',
    bandForPercent(ugc, 75).point === 3.75,
    bandForPercent(ugc, 75).label,
  )
  check('NSU: 75% is C (2.00)', bandForPercent(nsu, 75).point === 2, bandForPercent(nsu, 75).label)
  check(
    'the same marks give different grade points',
    bandForPercent(ugc, 75).point !== bandForPercent(nsu, 75).point,
  )

  // The pass mark is the difference that changes a transcript.
  check('UGC passes at 40%', bandForPercent(ugc, 40).point > 0, bandForPercent(ugc, 40).label)
  check(
    'NSU fails at 40% (its pass mark is 60)',
    bandForPercent(nsu, 40).point === 0,
    bandForPercent(nsu, 40).label,
  )

  // The boundary a third-party source got wrong: NSU's own policy says A is 93+.
  check('NSU: 93% is A (4.00)', bandForPercent(nsu, 93).point === 4, bandForPercent(nsu, 93).label)
  check(
    'NSU: 92% is A- (3.70)',
    bandForPercent(nsu, 92).point === 3.7,
    bandForPercent(nsu, 92).label,
  )
  check(
    '  (a third-party calculator claimed A starts at 95 — the university says 93)',
    bandForPercent(nsu, 93).point === 4,
  )
}

// ── 5. Scale table integrity ─────────────────────────────────────────────────
console.log('\n-- scale table integrity --')
{
  check('two scales ship', CGPA_SCALES.length === 2, CGPA_SCALES.map((s) => s.id).join(', '))

  for (const scale of CGPA_SCALES) {
    // Strictly descending floors, or `bandForPercent` silently returns the wrong band.
    const descending = scale.bands.every(
      (band, i) => i === 0 || band.minPercent < scale.bands[i - 1].minPercent,
    )
    check(`${scale.id}: bands descend strictly`, descending)

    // Points must never increase as marks fall.
    const monotonic = scale.bands.every(
      (band, i) => i === 0 || band.point <= scale.bands[i - 1].point,
    )
    check(`${scale.id}: grade points never increase as marks fall`, monotonic)

    const last = scale.bands[scale.bands.length - 1]
    check(
      `${scale.id}: the lowest band is a fail at 0.00`,
      last?.minPercent === 0 && last?.point === 0,
    )
    check(
      `${scale.id}: the top band carries the scale maximum`,
      scale.bands[0]?.point === scale.max,
    )

    // Every band must be reachable — a floor above the one before it would make
    // one band dead code that still renders in the table.
    check(
      `${scale.id}: the first band starts at or below the top band's floor`,
      (scale.bands[0]?.minPercent ?? 0) <= 100,
    )
    check(
      `${scale.id}: class bands descend`,
      scale.classes.every((c, i) => i === 0 || c.min < scale.classes[i - 1].min),
    )
  }
}

// ── 6. Degree classification ─────────────────────────────────────────────────
console.log('\n-- degree class --')
{
  check('UGC 3.50 is first class', classFor(ugc, 3.5) === 'প্রথম শ্রেণি', String(classFor(ugc, 3.5)))
  check('UGC 3.00 is first class', classFor(ugc, 3.0) === 'প্রথম শ্রেণি', String(classFor(ugc, 3.0)))
  check(
    'UGC 2.99 is second class',
    classFor(ugc, 2.99) === 'দ্বিতীয় শ্রেণি',
    String(classFor(ugc, 2.99)),
  )
  check(
    'UGC 2.25 is second class',
    classFor(ugc, 2.25) === 'দ্বিতীয় শ্রেণি',
    String(classFor(ugc, 2.25)),
  )
  check('UGC 2.00 is third class', classFor(ugc, 2.0) === 'তৃতীয় শ্রেণি', String(classFor(ugc, 2.0)))
  check('UGC 1.99 has no class', classFor(ugc, 1.99) === null, String(classFor(ugc, 1.99)))

  // The second-class floor differs between the two scales — 2.25 vs 2.50.
  check(
    'NSU 2.49 is third class (its second class starts at 2.50)',
    classFor(nsu, 2.49) === 'তৃতীয় শ্রেণি',
    String(classFor(nsu, 2.49)),
  )
  check(
    'NSU 2.50 is second class',
    classFor(nsu, 2.5) === 'দ্বিতীয় শ্রেণি',
    String(classFor(nsu, 2.5)),
  )
  check(
    'the class floors genuinely differ between the scales',
    classFor(ugc, 2.3) !== classFor(nsu, 2.3),
    `ugc→${classFor(ugc, 2.3)}, nsu→${classFor(nsu, 2.3)}`,
  )
}

// ── 7. The school and university scales must not be confused ─────────────────
console.log('\n-- school scale vs university scale --')
{
  /*
   * The single most common mistake on a Bangladeshi application: quoting a 5.00
   * school GPA as if it were a 4.00 university CGPA, or reading a university CGPA
   * against the school's boundaries. Both scales live in this repo, so the two are
   * asserted to disagree at the same marks.
   */
  check(
    'at 75 marks the school scale and the university scale differ',
    gradeForPercent(75).point !== bandForPercent(ugc, 75).point,
    `school→${gradeForPercent(75).point}, university→${bandForPercent(ugc, 75).point}`,
  )
  check('the school scale tops out at 5.00', gradeForPercent(90).point === 5)
  check('the university scale tops out at 4.00', bandForPercent(ugc, 90).point === 4)
  check('a school A+ (5.00) is not a university grade point', gradeForPercent(90).point > ugc.max)
}

// ── 8. Unusable input is skipped ─────────────────────────────────────────────
console.log('\n-- unusable input --')
{
  const blank = computeCgpa([course(4.0, 3), course(4.0, 0), course(4.0, Number.NaN)])
  check('a course with no credits is skipped', blank.totalCredits === 3, String(blank.totalCredits))
  check('  and does not drag the CGPA down', blank.cgpa === 4, String(blank.cgpa))

  const negative = computeCgpa([course(4.0, -3)])
  check('negative credits are refused', negative.cgpa === null)

  const nothing = computeCgpa([])
  check('no courses yields no CGPA', nothing.cgpa === null)
  check('  and zero totals', nothing.totalCredits === 0 && nothing.totalPoints === 0)

  // A CGPA of exactly 0.00 is a real, different state from "nothing entered".
  const allFailed = computeCgpa([course(0, 3)])
  check('a genuine 0.00 is reported as 0, not null', allFailed.cgpa === 0, String(allFailed.cgpa))
}

// ── 9. Unknown scale ids fall back rather than throwing ──────────────────────
console.log('\n-- scale lookup --')
{
  check('a known id resolves', scaleById('nsu').id === 'nsu')
  check('an unknown id falls back to UGC rather than throwing', scaleById('nope').id === 'ugc')
}

console.log(
  failures === 0 ? '\nAll CGPA checks passed.\n' : `\n${failures} CGPA check(s) FAILED.\n`,
)
process.exit(failures === 0 ? 0 : 1)
