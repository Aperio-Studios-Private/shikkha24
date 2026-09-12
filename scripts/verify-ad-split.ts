/**
 * Ad-hoc verification of the mid-article ad split.
 *
 * Run: node --experimental-strip-types scripts/verify-ad-split.ts
 *
 * Not part of the build. It exists because the demo articles are all four
 * paragraphs long, so the mid-article ad correctly never renders — which means
 * the split logic would otherwise ship unexercised.
 */
import { countParagraphs, splitHtmlAtParagraph } from '../frontend/src/lib/richtext.ts'

const body = (n: number): string =>
  Array.from({ length: n }, (_, i) => `<p>অনুচ্ছেদ ${i + 1}</p>`).join('\n')

let failures = 0

function check(label: string, actual: unknown, expected: unknown): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
  if (!ok)
    console.log(
      `      expected ${JSON.stringify(expected)}\n      actual   ${JSON.stringify(actual)}`,
    )
}

check('counts 4 paragraphs', countParagraphs(body(4)), 4)
check('counts 0 on empty body', countParagraphs(''), 0)

// The realistic case: a long article split at its midpoint.
const long = body(8)
const [before, after] = splitHtmlAtParagraph(long, 4)
check('split lands after the 4th paragraph', countParagraphs(before), 4)
check('remainder holds the other 4', countParagraphs(after), 4)
check('halves rejoin to the original', before + after, long)
check('no tag is sliced', /<\/p>$/.test(before), true)

// Shorter than requested → whole body first, nothing second, so the caller skips the ad.
const short = body(3)
const [shortBefore, shortAfter] = splitHtmlAtParagraph(short, 5)
check('short body returns whole first part', shortBefore, short)
check('short body returns empty second part', shortAfter, '')

// The guard the article page actually uses.
check('4-paragraph article is below the mid-ad floor', countParagraphs(body(4)) >= 6, false)
check('6-paragraph article is at the floor', countParagraphs(body(6)) >= 6, true)

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
