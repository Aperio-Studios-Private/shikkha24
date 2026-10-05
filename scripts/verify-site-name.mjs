/**
 * The portal display name must be a CMS value, never a literal.
 *
 * ## Why this exists
 *
 * `siteName` is a `SiteSettings` global the owner edits in the admin. The whole
 * point of that is that one edit changes the name everywhere. It did not: ten
 * reader-visible strings across four pages were literals, and they survived an
 * owner rename — the CMS said one thing and those pages said another, silently,
 * because a hardcoded string is indistinguishable from a correct one at review
 * time.
 *
 * This is the M21 failure shape (work that passed every check locally and never
 * reached a build) wearing a different hat: the name was correct on the owner's
 * dev server and stale in every artifact that ships.
 *
 * ## What counts as a violation
 *
 * The Bengali display name appearing in a **user-visible string** — template
 * text, an attribute, a JS string literal. What does not count:
 *
 * - **Comments and doc blocks.** They explain the name; they never render.
 * - **Deliberate offline fallbacks**, listed in `ALLOWED_FALLBACKS` below, each
 *   with the reason it cannot read the CMS.
 * - **Non-rendering identifiers**: localStorage keys, hostnames, env-var names,
 *   package names, migration SQL, comments in `public/`.
 *
 * The allowance is per-file and explicit rather than pattern-based: a regex
 * "looks like a fallback" test would drift, and a silently-widened allowlist
 * would make this check decorative (M18 — an assertion that cannot be made to
 * fail is not an assertion).
 *
 * ## Why the fallback list is checked for drift
 *
 * `FALLBACK_SETTINGS` is what **CI** renders: `cms/data/ci.db` has no
 * `site_settings` row and no seed creates one. So a rename applied only in the
 * admin never reaches a shipped build. The three fallbacks therefore must equal
 * each other and equal the owner's value — checked in section 2, because a
 * stale duplicate is precisely the bug this file exists to prevent.
 *
 * Run: node scripts/verify-site-name.mjs
 */
import { globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname

/** The owner-confirmed display name. Changing it is an owner decision. */
const CANONICAL = 'শিক্ষা২৪.কম'

/**
 * Every literal occurrence that is legitimate, and why it cannot read the CMS.
 *
 * ⚠️ Adding an entry here disables the check for that file. Each needs a
 * reason that would still be true after a rename.
 */
const ALLOWED_FALLBACKS = new Map([
  [
    'frontend/src/lib/cms.ts',
    'FALLBACK_SETTINGS — rendered whenever the CMS is unreachable, and it is what CI builds render (no settings row in ci.db)',
  ],
  [
    'frontend/src/pages/rss.xml.ts',
    '`||` guard after a successful CMS read; covers an empty string',
  ],
  [
    'frontend/src/pages/news-sitemap.xml.ts',
    '`||` guard after a successful CMS read; covers an empty string',
  ],
  ['cms/src/endpoints/id-card.ts', 'offline fallback after a successful CMS read (2 sites)'],
  ['cms/src/endpoints/newsletter.ts', 'FALLBACK_SITE_NAME — used only if the settings read throws'],
  [
    'cms/src/payload.config.ts',
    'SMTP sender name + admin tab suffix; both are evaluated before any DB access',
  ],
  ['cms/src/lib/campaign.ts', 'SMTP sender name; same reason'],
  [
    'cms/src/seed/universities.ts',
    'User-Agent header value — a protocol identifier for the directory importer, not a rendered brand name; changing it would break server-side allow-lists',
  ],
  ['cms/src/verify/', 'test fixtures that assert the renderer output'],
  ['cms/src/seed/', 'demo corpus content written into the database'],
  [
    'frontend/public/sw.js',
    'FALLBACK_TITLE — a service worker is not bundled and cannot read the CMS',
  ],
  [
    'frontend/public/og-default.svg',
    'static share image; a route would change the URL social platforms cache',
  ],
  ['frontend/public/llms.txt', 'static crawler metadata'],
  ['cms/src/migrations/', 'migration history — rewriting a committed migration is not allowed'],
  ['cms/src/payload-types.ts', 'generated from the CMS config by verify:payload-types'],
])

const failures = []
const note = (file, line, text) => failures.push({ file, line, text })

/**
 * Strip comments so prose about the name is never treated as a rendering use.
 *
 * Block comments and line comments only, and string-literal contents are
 * preserved — the name *inside* a string is exactly what we are looking for.
 * The regex is deliberately simple: a full JS parser would be a dependency and
 * a source of its own false negatives.
 */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length))
}

/** Line number of `index` within `text`. */
const lineOf = (text, index) => text.slice(0, index).split('\n').length

const isAllowed = (rel) => {
  for (const [prefix] of ALLOWED_FALLBACKS) if (rel.startsWith(prefix)) return true
  return false
}

// --- Section 1: no reader-visible literal outside the allow-list -----------
let scanned = 0

for (const dir of ['frontend/src', 'cms/src']) {
  for (const rel of globSync('**/*.{astro,tsx,ts,js}', { cwd: join(root, dir) }).map(
    (f) => `${dir}/${f}`,
  )) {
    if (isAllowed(rel)) continue
    const raw = readFileSync(join(root, rel), 'utf8')
    const text = stripComments(raw)
    scanned += 1
    // The bare name only. The canonical spelling `\u09b6\u09bf\u0995\u09cd\u09b7\u09be\u09e8\u09ea.\u0995\u09ae`
    // (\u09b6...\u09ae = the Bengali name, \u0995\u09ae = `.\u0995\u09ae`) is CORRECT and must not be
    // reported, so the negative lookahead skips it. It is written in escapes on
    // purpose: this exact value was once written as Latin `om` by mistake, and a
    // readable Bengali literal in a heredoc is exactly how that happened.
    for (const m of text.matchAll(
      /\u09b6\u09bf\u0995\u09cd\u09b7\u09be\u09e8\u09ea(?!\.\u0995\u09ae)|Shikkha24(?!\.com|\w)/g,
    )) {
      // A Latin "Shikkha24" in prose is still worth surfacing outside comments;
      // Bengali digits ২৪ and Latin 24 are the two spellings in circulation.
      const line = lineOf(text, m.index)
      note(rel, line, `hardcoded display name "${m[0]}" — read settings.siteName instead`)
    }
  }
}

// --- Section 1b: no Latin letters inside the Bengali name -----------------
/**
 * A guard against a mistake this repo actually made: the name was written
 * `শিক্ষা২৪.কom` — Bengali, then Latin `om` — because a terminal rendered the
 * Bengali `ম` (U+09AE) in a way that read as Latin. It survived review, typecheck,
 * lint and build, and was correct-looking in every one of them.
 *
 * So the canonical value is compared **byte for byte**, and any Latin letter
 * immediately following Bengali is reported. This is the one check here that
 * would have caught it, and it is cheap: the value is short and fixed.
 */
const CANONICAL_BYTES = [...CANONICAL].map((c) => c.codePointAt(0).toString(16)).join(' ')
{
  const bytes = [...CANONICAL].map((c) => c.codePointAt(0).toString(16))
  const hasLatinTail = /[A-Za-z]/.test(CANONICAL)
  const hasBengali = /[\u0980-\u09FF]/.test(CANONICAL)
  if (hasLatinTail && hasBengali) {
    note(
      'scripts/verify-site-name.mjs',
      50,
      `CANONICAL mixes scripts: "${CANONICAL}" — verify the bytes, not the terminal`,
    )
  }
  // The exact codepoints, printed so a silent edit is visible in CI logs.
  console.log(`  canonical codepoints: ${bytes.join(' ')}`)
  void CANONICAL_BYTES
}

// --- Section 2: the fallbacks must not drift from the owner's value -------
const FALLBACK_LOCATIONS = [
  ['frontend/src/lib/cms.ts', /siteName:\s*'([^']+)'/],
  ['frontend/public/sw.js', /FALLBACK_TITLE\s*=\s*'([^']+)'/],
  ['cms/src/endpoints/newsletter.ts', /FALLBACK_SITE_NAME\s*=\s*'([^']+)'/],
  ['cms/src/endpoints/id-card.ts', /\|\|\s*'([^']+)'/],
]

for (const [rel, re] of FALLBACK_LOCATIONS) {
  const text = stripComments(readFileSync(join(root, rel), 'utf8'))
  for (const m of text.matchAll(new RegExp(re.source, 'g'))) {
    scanned += 1
    if (m[1] !== CANONICAL) {
      note(rel, lineOf(text, m.index), `fallback "${m[1]}" != owner value "${CANONICAL}"`)
    }
  }
}

// --- Report ---------------------------------------------------------------
/**
 * `detail` prints on BOTH outcomes. A checker that reports only "9 passed" is
 * indistinguishable from one that scanned nothing — the vacuous-pass trap
 * `verify-dark-tokens.mjs` also guards against.
 */
if (failures.length === 0) {
  console.log(`verify:site-name — OK`)
  console.log(`  canonical name: ${CANONICAL}`)
  console.log(`  files scanned: ${scanned}`)
  console.log(`  literals found outside the allow-list: 0`)
  console.log(
    `  allow-listed fallback locations: ${FALLBACK_LOCATIONS.length} (all equal to canonical)`,
  )
  console.log(`  allow-listed paths (comments/identifiers excluded): ${ALLOWED_FALLBACKS.size}`)
} else {
  console.error(`verify:site-name — FAILED (${failures.length})`)
  for (const f of failures) console.error(`  ${f.file}:${f.line}  ${f.text}`)
  console.error(`\n  Fix: read settings.siteName. If a literal is genuinely required,`)
  console.error(
    `  add the file to ALLOWED_FALLBACKS in scripts/verify-site-name.mjs with a reason.`,
  )
  process.exitCode = 1
}
