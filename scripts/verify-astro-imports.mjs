/**
 * Astro frontmatter import check — `pnpm verify:astro-imports`
 *
 * ## The gap this closes
 *
 * **`.astro` frontmatter is not typechecked in this project.** `tsc --noEmit`
 * only sees `.ts`/`.tsx`, and `@astrojs/check` is the tool that would check
 * `.astro` — but it rejects TypeScript 7, which is why Biome was adopted instead
 * (`.sps/handoff.md`, S0). The consequence is that an identifier used in a
 * component's frontmatter without an import is **not** a type error and **not** a
 * lint error. It is a `ReferenceError` at build time, thrown only if that
 * component actually renders.
 *
 * That is not hypothetical. The 2026-09-16 timezone fix changed `bnDate()` in
 * `CommentSection.astro` and `formatDate()` in `DeadlineStrip.astro` to call
 * `formatBnBd()`, and **both import edits silently failed** (the documented
 * same-file parallel-write trap). The thin build — 33 pages, no CMS — passed,
 * because `CommentSection` self-hides without a CMS origin and `DeadlineStrip`
 * renders nothing without deadlines. The defect surfaced only on a **full** build
 * against a live CMS, as `ReferenceError: formatBnBd is not defined`.
 *
 * ## What it checks
 *
 * For every `.astro` file, any name exported as a **runtime value** from
 * `src/lib/*.ts` that is *used* in the frontmatter must also be *imported* in
 * that file or declared locally. Types and interfaces are excluded — they are
 * erased and cannot throw.
 *
 * ## Deliberately not a general "undefined identifier" checker
 *
 * A real scope analysis would be a parser. This checks the one class that has
 * actually bitten, and it checks it exactly: the shared `lib/` surface, where a
 * missing import is always a defect and never a style choice.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const srcDir = join(root, 'frontend', 'src')
const libDir = join(srcDir, 'lib')

/** Every runtime value exported from `src/lib/*.ts`. */
function collectLibExports() {
  const names = new Set()
  for (const entry of readdirSync(libDir)) {
    if (!entry.endsWith('.ts')) continue
    const source = readFileSync(join(libDir, entry), 'utf8')
    for (const m of source.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) {
      names.add(m[1])
    }
    for (const m of source.matchAll(/^export\s+const\s+([A-Za-z_$][\w$]*)/gm)) {
      names.add(m[1])
    }
    // `export { a, b }` re-exports
    for (const m of source.matchAll(/^export\s*\{([^}]*)\}/gm)) {
      for (const part of m[1].split(',')) {
        const name = part
          .trim()
          .split(/\s+as\s+/)
          .pop()
          ?.trim()
        if (name && /^[A-Za-z_$][\w$]*$/.test(name)) names.add(name)
      }
    }
  }
  return names
}

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (entry.endsWith('.astro')) out.push(full)
  }
  return out
}

/**
 * Strip comments and string literals so a name mentioned in prose or in a
 * message does not read as a usage. Crude but sufficient: the alternative is a
 * parser, and the failure mode here is a false *pass* on a name that only
 * appears in a comment — which is harmless.
 */
function stripNonCode(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``')
}

/** The frontmatter — the text between the opening and closing `---`. */
function frontmatter(source) {
  const m = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  return m ? m[1] : ''
}

const libExports = collectLibExports()
const failures = []

for (const file of walk(srcDir)) {
  const source = readFileSync(file, 'utf8')
  const fm = frontmatter(source)
  if (!fm) continue

  const rel = relative(root, file)
  // The lib files themselves define these names.
  if (rel.startsWith('frontend/src/lib/')) continue

  /*
   * Extract import statements from the **raw** frontmatter, not the stripped
   * text — a module path is a string literal, so stripping would erase the very
   * `from '…'` this needs to anchor on.
   *
   * ⚠️ `[\s\S]*?` is required, not `.*`: imports are routinely multi-line here,
   * with every imported name on its own line between `import {` and `} from`.
   * An earlier version matched line-by-line and therefore saw only the first and
   * last lines of each block — so it reported every multi-line import as missing
   * and flagged 172 false positives across the site.
   */
  const importText = [...fm.matchAll(/^\s*import\s+[\s\S]*?\bfrom\s*['"][^'"]*['"]/gm)]
    .map((m) => m[0])
    .join('\n')

  const code = stripNonCode(fm)

  for (const name of libExports) {
    if (!new RegExp(`\\b${name}\\b`).test(code)) continue
    // Imported, or declared locally in this file.
    if (new RegExp(`\\b${name}\\b`).test(importText)) continue
    const declared = new RegExp(
      `(?:^|\\s)(?:const|let|var|function|class)\\s+${name}\\b`,
      'm',
    ).test(code)
    if (declared) continue

    failures.push(`${rel} uses \`${name}\` without importing it`)
  }
}

if (failures.length === 0) {
  console.log(
    `PASS  every lib export used in .astro frontmatter is imported — ${libExports.size} exports checked`,
  )
  process.exit(0)
}

console.log(
  `FAIL  ${failures.length} missing import(s) — these throw ReferenceError at build time,`,
)
console.log('      and only when the component actually renders:')
for (const f of failures) console.log(`  · ${f}`)
process.exit(1)
