/**
 * Verify the SSC/HSC GPA calculation.
 *
 * ## Why this exists
 *
 * The calculation used to live inside a `<script>` in `gpa.astro`, so **nothing
 * could call it** — and three wrong answers shipped:
 *
 *   1. the 4th-subject bonus was `min(GP, 2)` instead of `max(0, GP − 2)`, so an
 *      A+ 4th subject contributed **2.00 instead of 3.00**;
 *   2. an F in a compulsory subject was scored as 0.00 for that subject instead of
 *      zeroing the whole result;
 *   3. the final letter grade was looked up against the **marks** boundaries
 *      (80, 70, 60 …) rather than the grade points (5.00, 4.00, 3.50 …), so every
 *      result was labelled **এফ** — the only boundary a GPA can satisfy is 0.
 *
 * A calculation with no test surface is not "probably fine"; it is unverified. So
 * this runs the **real** function from `frontend/src/lib/gpa.ts` — not a copy of
 * the rules re-typed here, which is the harness-that-lies failure mode
 * (`sandbox-build-traps`).
 *
 * ⚠️ **This file is plain JavaScript on purpose.** Node's `--experimental-strip-types`
 * only strips `.ts` files, so a type annotation in a `.mjs` is a hard syntax error.
 * The types live in `gpa.ts`; nothing here needs to restate them.
 *
 * ⚠️ `gpa.ts` must stay **erasable** for the same reason: no enums, no namespaces,
 * no parameter properties. That is why it imports nothing and uses `as const`.
 *
 * Run: pnpm verify:gpa
 */
import {
  computeGpa,
  GPA_CAP,
  gradeForGpa,
  gradeForPercent,
  OPTIONAL_THRESHOLD,
} from '../frontend/src/lib/gpa.ts'

let failures = 0
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

/** `count` compulsory rows all at the same marks. */
const compulsory = (marks, count, outOf = 100) =>
  Array.from({ length: count }, () => ({ marks, outOf, optional: false }))

/** The same rows with one optional row appended. */
const withOptional = (rows, marks, outOf = 100) => [...rows, { marks, outOf, optional: true }]

/** A+ (80+), A (70), A− (60), B (50), C (40), D (33), F (32). */
const A_PLUS = 90
const A = 75
const A_MINUS = 65
const B = 55
const C = 45
const D = 35
const F = 20

console.log('\n=== GPA calculation verification ===\n')

// ── 1. The 4th-subject bonus: the rule that was wrong ────────────────────────
console.log('-- the 4th-subject bonus --')
{
  const allA = compulsory(A, 6)

  const noOptional = computeGpa(allA)
  check('six A grades give exactly 4.00', noOptional.gpa === 4, String(noOptional.gpa))
  check('and the band is A', noOptional.grade.label === 'A', noOptional.grade.label)
  check('and no bonus was applied', noOptional.bonus === 0, String(noOptional.bonus))

  const withAplus = computeGpa(withOptional(allA, A_PLUS))
  check(
    'an A+ 4th subject adds 3.00, NOT 2.00 (the bug)',
    withAplus.bonus === 3,
    `bonus ${withAplus.bonus}`,
  )
  check('so six A grades + A+ 4th give 4.50', withAplus.gpa === 4.5, String(withAplus.gpa))
  check(
    'the 4th subject is NOT in the divisor',
    withAplus.compulsoryCount === 6,
    `divisor ${withAplus.compulsoryCount}`,
  )

  // The threshold is a threshold, not a scale: below it the contribution is zero.
  check('a C (2.00) 4th subject contributes nothing', computeGpa(withOptional(allA, C)).bonus === 0)
  check(
    'a B (3.00) 4th subject contributes exactly 1.00',
    computeGpa(withOptional(allA, B)).bonus === 1,
    String(computeGpa(withOptional(allA, B)).bonus),
  )
  check(`the threshold constant is ${OPTIONAL_THRESHOLD.toFixed(2)}`, OPTIONAL_THRESHOLD === 2)

  // Rule 4: an F in the 4th subject is a no-op, not a fail. The sources call this
  // out as the most common misconception, so it is asserted explicitly.
  const optionalFail = computeGpa(withOptional(allA, F))
  check('an F in the 4th subject does NOT fail the result', optionalFail.failed === false)
  check('an F in the 4th subject earns no bonus', optionalFail.bonus === 0)
  check('and leaves the GPA at 4.00', optionalFail.gpa === 4, String(optionalFail.gpa))
}

// ── 2. The 5.00 cap is a real branch ─────────────────────────────────────────
console.log('\n-- the cap --')
{
  const perfect = computeGpa(withOptional(compulsory(A_PLUS, 6), A_PLUS))
  check('all A+ with an A+ 4th computes 5.50 raw', perfect.rawGpa === 5.5, String(perfect.rawGpa))
  check('and is capped at 5.00', perfect.gpa === GPA_CAP, String(perfect.gpa))
  check('the band is A+', perfect.grade.label === 'A+', perfect.grade.label)
}

// ── 3. An F in a compulsory subject zeroes everything ────────────────────────
console.log('\n-- failure --')
{
  const oneFail = computeGpa([...compulsory(A_PLUS, 5), { marks: F, outOf: 100, optional: false }])
  check('one F among five A+ gives 0.00, not 4.17', oneFail.gpa === 0, String(oneFail.gpa))
  check('and is flagged as a failure', oneFail.failed === true)
  check('and the band is F', oneFail.grade.label === 'F', oneFail.grade.label)
  check(
    'a 4th-subject bonus cannot rescue it',
    computeGpa([
      ...compulsory(A_PLUS, 5),
      { marks: F, outOf: 100, optional: false },
      { marks: A_PLUS, outOf: 100, optional: true },
    ]).gpa === 0,
  )
  check(
    'the compulsory points are still reported for the breakdown',
    oneFail.compulsoryPoints === 25,
    String(oneFail.compulsoryPoints),
  )
}

// ── 4. The letter grade for a GPA is the point scale, not the marks scale ────
console.log('\n-- the band lookup --')
{
  /*
   * The old code ran `GRADES.find(g => gpa >= g.min)` where `min` is a *marks*
   * boundary, so 5.00 matched nothing until the 0 boundary and every result was
   * labelled F. These two lookups must stay distinct.
   */
  check('gradeForGpa(5.00) is A+', gradeForGpa(5).label === 'A+', gradeForGpa(5).label)
  check('gradeForGpa(4.00) is A', gradeForGpa(4).label === 'A', gradeForGpa(4).label)
  check('gradeForGpa(3.50) is A-', gradeForGpa(3.5).label === 'A-', gradeForGpa(3.5).label)
  check('gradeForGpa(3.00) is B', gradeForGpa(3).label === 'B', gradeForGpa(3).label)
  check('gradeForGpa(2.00) is C', gradeForGpa(2).label === 'C', gradeForGpa(2).label)
  check('gradeForGpa(1.00) is D', gradeForGpa(1).label === 'D', gradeForGpa(1).label)
  check('gradeForGpa(0.00) is F', gradeForGpa(0).label === 'F', gradeForGpa(0).label)
  check('gradeForGpa(4.67) is A (falls to the 4.00 band)', gradeForGpa(4.67).label === 'A')

  // The counter-proof for bug 3: the two lookups are genuinely different, so
  // swapping them cannot pass unnoticed.
  check(
    'the GPA lookup is NOT the marks lookup',
    gradeForGpa(5).label !== gradeForPercent(5).label,
    `gpa→${gradeForGpa(5).label}, marks→${gradeForPercent(5).label}`,
  )
}

// ── 5. Marks boundaries ──────────────────────────────────────────────────────
console.log('\n-- marks boundaries --')
{
  const at = (marks) => gradeForPercent(marks).label
  check('80 is A+', at(80) === 'A+', at(80))
  check('79 is A', at(79) === 'A', at(79))
  check('70 is A', at(70) === 'A', at(70))
  check('69 is A-', at(69) === 'A-', at(69))
  check('60 is A-', at(60) === 'A-', at(60))
  check('50 is B', at(50) === 'B', at(50))
  check('40 is C', at(40) === 'C', at(40))
  check('33 is D — the pass mark', at(33) === 'D', at(33))
  check('32 is F', at(32) === 'F', at(32))
  check('0 is F', at(0) === 'F', at(0))
}

// ── 6. 200-mark subjects (Bangla and English are examined as two papers) ─────
console.log('\n-- combined 200-mark subjects --')
{
  const combined = (marks) => ({ marks, outOf: 200, optional: false })
  check('160/200 is 80% → A+', gradeForPercent((160 / 200) * 100).label === 'A+')
  check('140/200 is 70% → A', gradeForPercent((140 / 200) * 100).label === 'A')
  check('66/200 is 33% → D, the pass mark', gradeForPercent((66 / 200) * 100).label === 'D')
  check('65/200 is 32.5% → F', gradeForPercent((65 / 200) * 100).label === 'F')

  // A set mixing both scales must average the same as the equivalent all-100 set —
  // that is the whole point of grading on percentage.
  const mixed = computeGpa([
    combined(160), // A+ 5.00
    combined(140), // A  4.00
    { marks: 80, outOf: 100, optional: false }, // A+ 5.00
    { marks: 70, outOf: 100, optional: false }, // A  4.00
  ])
  check('mixed 200- and 100-mark rows average by percentage', mixed.gpa === 4.5, String(mixed.gpa))
}

// ── 7. The divisor follows the compulsory count, not the row count ───────────
console.log('\n-- the divisor --')
{
  const five = computeGpa(withOptional(compulsory(A_PLUS, 5), A_PLUS))
  check('five compulsory + one optional divides by five', five.compulsoryCount === 5)
  check('  → (25 + 3) / 5 = 5.60 raw, capped to 5.00', five.gpa === 5, String(five.gpa))

  const nine = computeGpa(withOptional(compulsory(A, 9), A_PLUS))
  check('nine compulsory divides by nine', nine.compulsoryCount === 9)
  check('  → (36 + 3) / 9 = 4.3333 raw', Math.abs((nine.rawGpa ?? 0) - 4.333333333333333) < 1e-9)
  check('  → reported as 4.33', nine.gpa?.toFixed(2) === '4.33', nine.gpa?.toFixed(2))
}

// ── 8. A published worked example, reproduced from real marks ────────────────
console.log('\n-- the documented worked example --')
{
  /*
   * A source's worked example: compulsory subjects totalling 38.50 grade points
   * with an A+ 4th subject → (38.50 + 3.00) ÷ 11 = 3.7727…, reported 3.77.
   * Reproduced through real marks so the whole path is exercised, not just the
   * arithmetic.
   */
  const rows = [
    ...compulsory(A, 6), // 6 × 4.00 = 24.00
    ...compulsory(A_MINUS, 3), // 3 × 3.50 = 10.50
    ...compulsory(B, 1), // 1 × 3.00 =  3.00
    ...compulsory(D, 1), // 1 × 1.00 =  1.00  → total 38.50
  ]
  const result = computeGpa(withOptional(rows, A_PLUS))
  check('eleven compulsory rows are counted', result.compulsoryCount === 11)
  check(
    'the compulsory points add up',
    Math.abs(result.compulsoryPoints - 38.5) < 1e-9,
    String(result.compulsoryPoints),
  )
  check('the bonus is 3.00', result.bonus === 3, String(result.bonus))
  check(
    'the raw GPA is (38.50 + 3.00) / 11',
    Math.abs((result.rawGpa ?? 0) - 41.5 / 11) < 1e-9,
    String(result.rawGpa),
  )
  check('reported to two decimals', result.gpa?.toFixed(2) === '3.77', result.gpa?.toFixed(2))
}

// ── 9. Unusable input is skipped, never guessed ──────────────────────────────
console.log('\n-- unusable input --')
{
  const blank = computeGpa([
    { marks: Number.NaN, outOf: 100, optional: false },
    { marks: A_PLUS, outOf: 100, optional: false },
  ])
  check('a blank row does not drag the average down', blank.gpa === 5, String(blank.gpa))
  check('and is not counted as a subject', blank.compulsoryCount === 1)

  const over = computeGpa([{ marks: 150, outOf: 100, optional: false }, ...compulsory(A_PLUS, 2)])
  check('marks above the row total are refused', over.compulsoryCount === 2)
  check('  and do not zero the result', over.gpa === 5, String(over.gpa))

  const negative = computeGpa([{ marks: -5, outOf: 100, optional: false }])
  check('a negative mark is refused', negative.compulsoryCount === 0)

  const nothing = computeGpa([])
  check('no rows at all yields no GPA', nothing.gpa === null)
  check('  and no failure flag', nothing.failed === false)

  const zeroOutOf = computeGpa([{ marks: 50, outOf: 0, optional: false }])
  check(
    'a zero total falls back to 100 rather than dividing by zero',
    zeroOutOf.gpa === 3,
    String(zeroOutOf.gpa),
  )
}

// ── 10. More than one optional row ───────────────────────────────────────────
console.log('\n-- multiple optional rows --')
{
  const two = computeGpa([
    ...compulsory(A, 6),
    { marks: B, outOf: 100, optional: true }, // 3.00
    { marks: A_PLUS, outOf: 100, optional: true }, // 5.00
  ])
  check('the highest optional row is used', two.bonus === 3, String(two.bonus))
  check('and neither joins the divisor', two.compulsoryCount === 6)
}

console.log(failures === 0 ? '\nAll GPA checks passed.\n' : `\n${failures} GPA check(s) FAILED.\n`)
process.exit(failures === 0 ? 0 : 1)
