#!/usr/bin/env node
/**
 * Counter-proof: every dark-mode utility in the frontend resolves to a real token.
 *
 * ## The defect this prevents
 *
 * Three files used `dark:bg-dark-surface-raised`, which resolves to
 * `--color-dark-surface-raised` — **a custom property that does not exist**. The
 * real one is `--color-dark-raised`.
 *
 * A `var()` naming an undefined custom property, with no fallback, makes the
 * whole declaration invalid at computed-value time. So `background-color`
 * silently became `transparent` and those panels rendered with no fill in dark
 * mode. **Nothing failed**: the build succeeded, Biome reported nothing, and
 * TypeScript had no opinion — the class is real and the utility is generated
 * from the palette; only the *value* was missing, and no tool inspects values.
 *
 * See `.sps/mistakes.md` **M23**.
 *
 * ## Why this can catch it
 *
 * The tailwind palette in `global.css` defines `--color-*` tokens, and the
 * `dark:` utilities resolve through them by name. So a utility whose suffix has
 * no matching token is checkable — it is exactly the M23 signature.
 *
 * ## What would make this vacuous
 *
 * "All tokens resolve" is equally consistent with "this harness cannot detect
 * an unresolved token". So section 3 feeds a copy with a deliberately misspelled
 * token **and** the original broken class, and requires the check to fail.
 *
 * Run: node scripts/verify-dark-tokens.mjs
 */
import { globSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const stylesheet = join(repoRoot, 'frontend', 'src', 'styles', 'global.css')
const srcDir = join(repoRoot, 'frontend', 'src')

let passed = 0
const failures = []

/**
 * Assert one thing, recording the outcome rather than throwing.
 *
 * `detail` is printed on **both** outcomes on purpose. A checker that only ever
 * says "9 passed" cannot be told apart from one that scanned four occurrences and
 * found them all fine, which is exactly the M18 shape — the reader cannot see
 * the coverage, so they cannot judge the result.
 *
 * @param {string} name
 * @param {boolean} condition
 * @param {string} [detail]
 */
function check(name, condition, detail = '') {
  const suffix = detail ? ` — ${detail}` : ''
  if (condition) {
    passed += 1
    console.log(`  ok   ${name}${suffix}`)
  } else {
    failures.push(`${name}${suffix}`)
    console.log(`  FAIL ${name}${suffix}`)
  }
}

/** Custom properties actually defined in the palette. */
function definedTokens() {
  const css = readFileSync(stylesheet, 'utf8')
  return new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]))
}

/**
 * Colours Tailwind ships itself. These are real utilities with real values —
 * `dark:bg-blue-400` works fine — so they are NOT project tokens and must not be
 * reported as undefined.
 *
 * ⚠️ The first version of this check missed that distinction and flagged 19
 * built-in palette colours (`blue-400`, `white`, `amber-100`, …) as broken.
 * A check that cries wolf on correct code gets deleted, and the real finding it
 * *did* make — `dark-ink-soft`, genuinely undefined in both modes — would have
 * gone with it. The same lesson as M17, inverted: a check must fire on real
 * defects, or it will be removed rather than trusted.
 */
const BUILTIN = new Set(['white', 'black', 'transparent', 'current', 'inherit', 'none'])

/**
 * True when a colour name is one of Tailwind's own scale (`blue-400`) or a
 * bare ink/rule/surface family token this project defines.
 *
 * @param {string} suffix The utility's colour name.
 * @returns {boolean}
 */
function isBuiltIn(suffix) {
  if (BUILTIN.has(suffix)) return true
  // `blue-400`, `amber-100`, `red-900` … the numeric Tailwind scale.
  return /^(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}$/.test(
    suffix,
  )
}

/**
 * Every dark-mode utility used in the frontend that names a **project token**,
 * as `{ suffix, file }`.
 *
 * `dark:bg-dark-raised` → suffix `dark-raised`, which must exist as
 * `--color-dark-raised`. The `dark:` prefix is stripped because it selects the
 * variant, not the token. Tailwind's built-in scale is filtered out — see
 * `isBuiltIn`.
 *
 * @returns {Array<{suffix: string, file: string}>}
 */
function darkUtilities() {
  const found = []
  for (const file of globSync('**/*.{astro,ts,tsx,css}', { cwd: srcDir })) {
    const text = readFileSync(join(srcDir, file), 'utf8')
    // Tailwind emits `dark:bg-x` inside a class string; also catch
    // `dark:bg-x` appearing in a template literal or a CSS selector.
    for (const match of text.matchAll(/\bdark:(?:bg|border|text|from|to|via)-([a-z0-9-]+)/g)) {
      if (isBuiltIn(match[1])) continue
      found.push({ suffix: match[1], file })
    }
  }
  return found
}

const tokens = definedTokens()

console.log('\n1. The palette is readable')
{
  check('tokens were parsed out of global.css', tokens.size > 0, `${tokens.size} found`)
  check('--color-dark-raised exists (the M23 correct name)', tokens.has('dark-raised'))
  check(
    '--color-dark-surface-raised does NOT exist (the M23 wrong name)',
    !tokens.has('dark-surface-raised'),
    'it would mean the bug is not what we think it is',
  )
}

console.log('\n2. Every dark-mode utility resolves to a defined token')
{
  const used = darkUtilities()
  check('dark utilities were found to check', used.length > 0, `${used.length} occurrences`)

  const unresolved = used.filter((u) => !tokens.has(u.suffix))
  const unique = [...new Set(unresolved.map((u) => `${u.suffix} (${u.file})`))]
  for (const item of unique) {
    check(`"${item}" has no --color-* definition — renders transparent`, false)
  }
  check('no dark utility references an undefined token', unresolved.length === 0, unique.join(', '))
}

console.log('\n2b. Light mode is checked too — the same bug hides there')
{
  // `text-ink-soft` was undefined in BOTH modes, so a `dark:`-only check would
  // have missed half of it.
  //
  // ⚠️ Scan **class attribute values only**, never raw file text. The first
  // version matched anywhere in the file and reported ~400 false positives —
  // `text-sm`, `pb-2`, `border-b`, `items-center` — because those fragments end
  // in a hyphenated word that looks like a colour. A check that drowns a real
  // signal in noise gets switched off, and `dark-ink-soft` would have gone with
  // it. Colour utilities only ever appear inside `class="…"`.
  const COLOR_UTIL =
    /(?<![\w-])(?:bg|border|text|from|to|via|ring|fill|stroke|shadow|accent|caret|divide|outline|decoration)-(dark-)?([a-z][a-z0-9-]*)/g
  const found = []
  for (const file of globSync('**/*.{astro,tsx}', { cwd: srcDir })) {
    const text = readFileSync(join(srcDir, file), 'utf8')
    for (const attr of text.matchAll(/class\s*=\s*(?:"([^"]*)"|\{`([^`]*)`\}|\{'([^']*)'\})/g)) {
      const value = attr[1] ?? attr[2] ?? attr[3] ?? ''
      for (const m of value.matchAll(COLOR_UTIL)) {
        const name = m[2]
        // Skip any colour preceded by a variant prefix — those belong to the
        // `dark:` walk in section 2, and a bare `hover:bg-x` is still `bg-x`.
        const prefix = value.slice(0, m.index).match(/([\w-]+)-$/)
        if (prefix && /^(dark|hover|focus|active|group|peer|sm|md|lg|xl|2xl)$/.test(prefix[1])) {
          if (prefix[1] === 'dark') continue // covered by section 2
        }
        if (isBuiltIn(name)) continue
        if (/^(sm|xs|base|lg|xl|2xl|current|inherit|transparent)$/.test(name)) continue
        if (/-\d/.test(name)) continue // spacing/size, e.g. `pb-2`
        if (
          /^(t|b|l|r|bt|bl|br|tl|x|y|start|end|inline|inset|all|collapse|cover|contain|dashed|dotted|double|none|auto|wrap|balance|pretty|center|left|right|top|bottom|only|scale|charcoal|align|color|decoration|radius|width|style|shadow|resizer)/.test(
            name,
          )
        )
          continue
        found.push({ suffix: name, file })
      }
    }
  }
  const unresolved = found.filter((u) => !tokens.has(u.suffix))
  const unique = [...new Set(unresolved.map((u) => `${u.suffix} (${u.file})`))]
  check('light-mode utilities were found to check', found.length > 0, `${found.length} occurrences`)
  for (const item of unique) {
    check(`light: "${item}" has no --color-* definition`, false)
  }
  check(
    'no light utility references an undefined token',
    unresolved.length === 0,
    unique.join(', '),
  )
}

console.log('\n3. ⚠️ COUNTER-PROOF: this check fails when a token is misspelled')
{
  // Without this, "all tokens resolve" would be equally consistent with
  // "the harness cannot see an unresolved token" — M18, in a new place.
  const broken = darkUtilities().concat([
    { suffix: 'dark-surface-raised', file: 'counter-proof/ReactionBar.astro' },
  ])
  const unresolved = broken.filter((u) => !tokens.has(u.suffix))
  check(
    'the counter-proof token IS reported unresolved',
    unresolved.some((u) => u.suffix === 'dark-surface-raised'),
    'a check that cannot fail is not a check',
  )
  check(
    'and the exact M23 name is caught',
    unresolved.some((u) => u.file === 'counter-proof/ReactionBar.astro'),
  )
}

console.log(`\n${failures.length === 0 ? '✅' : '❌'} ${passed} passed, ${failures.length} failed`)
if (failures.length > 0) {
  for (const failure of failures) console.error(`   - ${failure}`)
  process.exit(1)
}
