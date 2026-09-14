/**
 * Verify the `.htaccess` CSP route rules cover the pages that need the relaxed
 * profile — and nothing else.
 *
 * ## Why this exists
 *
 * The S11 URL change moved articles from `/article/:slug` to
 * `/:category/:id/:slug`. The CSP rule for articles was still at the old
 * `/article/*` pattern, which no longer matched a single article page. A CSP
 * rule that fails to match fails **silently**: the page returns 200 under the
 * stricter policy and AdSense is blocked with no error anywhere. Nothing local
 * shows it — the policy is applied by Apache, not by the build.
 *
 * So this harness reimplements the `.htaccess` `<LocationMatch>` regex matching
 * semantics and asserts the rule set against the real paths the build emits.
 *
 * ## Matching semantics (Apache mod_location LocationMatch, verified 2026-09-14)
 *
 *   - `<LocationMatch "^/pattern$">` matches the URL path against the regex.
 *   - `[^/]+` matches one path segment (no crossing `/`).
 *   - `.+` matches one or more characters (crosses `/`).
 *   - The regex must match the WHOLE path (anchored with ^ and $).
 *
 * Run: node scripts/verify-csp-routes.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const HTACCESS = 'frontend/public/.htaccess'
const DIST = 'frontend/dist'

let failures = 0
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

/**
 * Parse `<LocationMatch>` blocks out of `.htaccess`.
 *
 * Returns an array of { pattern: RegExp, raw: string, csp: string }.
 */
function parseLocationMatchBlocks(text) {
  const rules = []
  const blockRe = /<LocationMatch\s+"([^"]+)">\s*([\s\S]*?)<\/LocationMatch>/g
  let match
  while ((match = blockRe.exec(text)) !== null) {
    const regexStr = match[1]
    const body = match[2]
    // Extract the Content-Security-Policy header value if present.
    const cspMatch = body.match(/Content-Security-Policy\s+"([^"]+)"/)
    const csp = cspMatch ? cspMatch[1] : null
    // Compile the LocationMatch regex.
    let pattern
    try {
      pattern = new RegExp(regexStr)
    } catch {
      pattern = null
    }
    rules.push({ regexStr, pattern, csp, raw: regexStr })
  }
  return rules
}

const text = readFileSync(HTACCESS, 'utf8')
const rules = parseLocationMatchBlocks(text)

/** Does any <LocationMatch> rule matching `path` set a relaxed (AdSense-bearing) CSP? */
function relaxedFor(path) {
  for (const rule of rules) {
    if (!rule.pattern || !rule.pattern.test(path)) continue
    if (rule.csp && rule.csp.includes('pagead2.googlesyndication.com')) return rule.raw
  }
  return null
}

// ── 1. The rule set is what we expect ────────────────────────────────────────
const articleRule = rules.find((r) => r.raw === '^/[^/]+/[^/]+/[^/]+$')
check('article rule uses the 3-segment pattern', Boolean(articleRule))
check(
  'the stale /article/* pattern is gone',
  !rules.some((r) => r.raw.includes('/article/')),
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
  check(`strict profile kept for ${path}`, matched === null, matched ? `matched ${matched}` : '')
}

// ── 4. The article regex does not over-match ─────────────────────────────────
const articleRe = new RegExp('^/[^/]+/[^/]+/[^/]+$')
check('matches /admission/10/some-slug', articleRe.test('/admission/10/some-slug'))
check('rejects /admission (one segment)', !articleRe.test('/admission'))
check('rejects /category/admission (two segments)', !articleRe.test('/category/admission'))
check(
  'rejects /category/admission/page/2 (four segments)',
  !articleRe.test('/category/admission/page/2'),
)

console.log(failures === 0 ? '\nAll CSP route checks passed.' : `\n${failures} check(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
