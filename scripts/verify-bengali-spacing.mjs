/**
 * Bengali text must not run into the next word.
 *
 * ## Why this exists
 *
 * Astro's HTML minifier collapses the whitespace-only text node between a line
 * of text and an inline element that follows it on the next source line:
 *
 *   ```
 *   আমাদের ঠিকানা, ফোন ও ইমেইল জানতে
 *   <a href="/contact">যোগাযোগ</a> পাতাটি দেখুন।
 *   ```
 *
 * renders as `জানতেযোগাযোগ` — the words fuse. **In English this reads as a
 * missing space; in Bengali it produces a different, meaningless word**, because
 * Bengali is written without word separators. The owner reported this on
 * `/about`, where it rendered `জানতেযোগাযোগ`, `চাইলেখবর` and `পাঠানপাতা`.
 *
 * Nothing else catches it: the source is valid, the HTML is valid, typecheck
 * passes, Biome passes, and the build passes. It is only wrong on screen.
 *
 * ## The fix
 *
 * Make the space explicit so it is part of a text node that has content on both
 * sides — `জানতে{' '}`. This is already the idiom at
 * `verify/[reporterId].astro` and `fact-check/[id].astro`.
 *
 * ## Why this scans source, not the build
 *
 * Scanning `dist/` would need a full build first and would report 850+
 * occurrences that are all fine (an element ending, a digit suffix, a tag that
 * legitimately abuts text). Scanning the source for the *pattern that causes*
 * it is both cheaper and unambiguous.
 *
 * Run: node scripts/verify-bengali-spacing.mjs
 */
import { globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname

/** Tags that sit inline, so whitespace between them and text is meaningful. */
const INLINE = 'a|button|span|strong|em|b|i'

/**
 * A Bengali text line whose last character is a word character, followed by
 * nothing but whitespace/newline and then an inline tag.
 *
 * The trailing `(?=\S)` on the Bengali run is what excludes the false
 * positives: a line ending in `">` or `}` or a Bengali *preceding* an
 * attribute is not a fused word.
 */
const FUSED = new RegExp(`([ঀ-৿][^\\n<>]*[^\\sঀ-৿<>])\\n\\s*(?=<(?:${INLINE})\\b)`, 'g')

/** `{' '}` already inserted — the fix. Matched against the tail of the run. */
const HAS_FIX = /\{\s*'\s'\s*\}|\{" "\}/

const failures = []
let filesScanned = 0
let sitesSeen = 0

for (const rel of globSync('**/*.astro', { cwd: join(root, 'frontend/src') })) {
  const path = `frontend/src/${rel}`
  const text = readFileSync(join(root, 'frontend/src', rel), 'utf8')
  filesScanned += 1

  for (const m of text.matchAll(FUSED)) {
    sitesSeen += 1
    // The explicit space lands INSIDE the captured run (`জানতে{' '}`), because
    // `{' '}` ends in `}`, which the run's last-char class accepts.
    if (HAS_FIX.test(m[1])) continue
    const line = text.slice(0, m.index).split('\n').length
    failures.push({
      file: path,
      line,
      text: `"…${m[1].slice(-40)}" runs into an inline tag — add {' '} before it`,
    })
  }
}

if (failures.length === 0) {
  console.log('verify:bengali-spacing — OK')
  console.log(`  .astro files scanned: ${filesScanned}`)
  console.log(`  fused-word sites found: 0 (of ${sitesSeen} inline-adjacency sites inspected)`)
} else {
  console.error(`verify:bengali-spacing — FAILED (${failures.length})`)
  for (const f of failures) console.error(`  ${f.file}:${f.line}  ${f.text}`)
  console.error(`\n  Fix: put an explicit space before the tag —  জানতে{' '}<a …>`)
  console.error(`  Without it the words fuse, which Bengali (no word separators) makes unmissable.`)
  process.exitCode = 1
}
