/**
 * Verify the `_headers` CSP route rules cover the pages that need the relaxed
 * profile — and nothing else.
 *
 * ## Why this exists
 *
 * The S11 URL change moved articles from `/article/:slug` to
 * `/:category/:id/:slug`. The `_headers` rule for articles was still
 * `/article/*`, which no longer matched a single article page. A CSP rule that
 * fails to match fails **silently**: the page returns 200 under the stricter
 * policy and AdSense is blocked with no error anywhere. Nothing local shows it
 * — the policy is applied by Cloudflare, not by the build.
 *
 * So this harness reimplements the documented `_headers` matching semantics and
 * asserts the rule set against the real paths the build emits.
 *
 * ## Matching semantics (Cloudflare Pages docs, verified 2026-09-13)
 *
 *   - `*` (splat) matches greedily and MAY CROSS `/`. Only ONE splat per rule.
 *   - `:name` (placeholder) matches all characters EXCEPT `/` — i.e. exactly
 *     one path segment.
 *
 * Run: node scripts/verify-csp-routes.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const HEADERS = 'frontend/public/_headers'
const DIST = 'frontend/dist'

let failures = 0
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

/**
 * Compile a `_headers` path pattern into a RegExp.
 *
 * Splat → `.*` (crosses `/`). Placeholder → `[^/]+` (one segment).
 * A rule must match the WHOLE path, so it is anchored.
 */
function compile(pattern) {
  const source = pattern
    .split('/')
    .map((segment) => {
      if (segment === '*') return '.*'
      if (segment.startsWith(':')) return '[^/]+'
      // Escape regex metacharacters in literal segments.
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('/')
  return new RegExp(`^${source}$`)
}

/** Parse the rule blocks (path line + indented header lines) out of `_headers`. */
function parseRules(text) {
  const rules = []
  let current = null
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    if (line.startsWith('#') || line.trim() === '') continue
    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      current = { pattern: line.trim(), headers: [] }
      rules.push(current)
      continue
    }
    if (current) current.headers.push(line.trim())
  }
  return rules
}

const text = readFileSync(HEADERS, 'utf8')
const rules = parseRules(text)

/** Does any rule matching `path` set a relaxed (AdSense-bearing) CSP? */
function relaxedFor(path) {
  for (const rule of rules) {
    if (!compile(rule.pattern).test(path)) continue
    for (const h of rule.headers) {
      if (!h.startsWith('Content-Security-Policy:')) continue
      if (h.includes('pagead2.googlesyndication.com')) return rule.pattern
    }
  }
  return null
}

// ── 1. The rule set is what we expect ────────────────────────────────────────
const articleRule = rules.find((r) => r.pattern === '/:category/:id/:slug')
check('article rule uses the placeholder pattern', Boolean(articleRule))
check(
  'the stale /article/* rule is gone from the relaxed set',
  !rules.some((r) => r.pattern === '/article/*'),
)
check(
  'no rule uses more than one splat (invalid in _headers)',
  rules.every((r) => (r.pattern.match(/\*/g) ?? []).length <= 1),
)

// ── 2. Every real article path resolves to the relaxed profile ───────────────
const articlePaths = []
;(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full)
    else if (name === 'index.html') {
      const rel = full.slice(DIST.length).replace(/\/index\.html$/, '')
      // Article pages are exactly three segments: /{category}/{id}/{slug}
      if (rel.split('/').filter(Boolean).length === 3) articlePaths.push(rel)
    }
  }
})(DIST)

check('found article pages in the build', articlePaths.length > 0, `${articlePaths.length} found`)

const uncovered = articlePaths.filter((p) => !relaxedFor(p))
check(
  'every built article path gets the relaxed CSP',
  uncovered.length === 0,
  uncovered.slice(0, 3).join(', '),
)

// ── 3. Pages that must NOT be relaxed are not ────────────────────────────────
const strictOnly = [
  '/',
  '/latest',
  '/search',
  '/bookmarks',
  '/gallery',
  '/gpa',
  '/page/privacy',
  '/institutions/dhaka-university',
  '/study-abroad/canada',
  '/author/someone',
]
for (const path of strictOnly) {
  const matched = relaxedFor(path)
  // `/` is deliberately relaxed (homepage carries 4 ad slots).
  if (path === '/') continue
  check(`strict profile kept for ${path}`, matched === null, matched ? `matched ${matched}` : '')
}

// ── 4. The placeholder does not over-match ───────────────────────────────────
const articleRe = compile('/:category/:id/:slug')
check('matches /admission/10/some-slug', articleRe.test('/admission/10/some-slug'))
check('rejects /admission (one segment)', !articleRe.test('/admission'))
check('rejects /category/admission (two segments)', !articleRe.test('/category/admission'))
check('rejects /category/admission/page/2 (four segments)', !articleRe.test('/category/admission/page/2'))

console.log(failures === 0 ? '\nAll CSP route checks passed.' : `\n${failures} check(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
