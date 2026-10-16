/**
 * Regression gate for T-20: a public-read collection must return a `Where`
 * clause, not an unfiltered pass.
 *
 * ## Why this exists
 *
 * Two shapes of the same mistake were found in the T-20 security audit, both of
 * which had **no gate at all** — which is precisely why they survived the
 * hardening that closed their siblings.
 *
 * **1. Drafts read anonymously (`Pages`).** `Pages` had `read: anyone` while
 * `versions.drafts` was on. `anyone` is `() => true`, and Payload ANDs the access
 * result into the query via `combineQueries(where, accessResult)`;
 * `hasWhereAccessResult(true)` is false, so nothing was ANDed in and
 * `?draft=true` reached `queryDrafts`, returning the latest **unpublished**
 * revision of every page. `Articles` already used `publishedOrEditor`, and
 * `ResultLinks` had been fixed for the adjacent shape, so this was the last one
 * left.
 *
 * **2. Deactivated rows served (`Scholarships`, `LiveBlogs`, `Polls`, `Quizzes`,
 * `AdUnits`).** Each had `read: anyone` with an `isActive` toggle defaulting to
 * true, so withdrawing a row hid it from the site while the API kept serving it.
 * Every consumer filtered (`'where[isActive][equals]': 'true'`), which is exactly
 * what made it invisible in normal browsing.
 *
 * ## What this asserts
 *
 * For each collection, the anonymous access result must be a `Where` object —
 * `true` is the failure, because `true` means "no filter". It does not pin the
 * exact filter, so tightening one cannot break the gate, while reverting to
 * `anyone` fails it.
 *
 * Run: `pnpm run verify:public-read` (wired into CI beside the other gates).
 */
import type { Access } from 'payload'
import { AdUnits } from '../collections/AdUnits'
import { LiveBlogs } from '../collections/LiveBlogs'
import { Pages } from '../collections/Pages'
import { Polls } from '../collections/Polls'
import { Quizzes } from '../collections/Quizzes'
import { Scholarships } from '../collections/Scholarships'

let failures = 0

/**
 * @param label what is being asserted.
 * @param condition the result to assert.
 * @param detail shown on failure.
 */
function check(label: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`  ok    ${label}`)
  } else {
    failures++
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

/**
 * Resolves a collection's `read` rule as an anonymous request would.
 *
 * @param config any collection config carrying a `read` access rule.
 * @returns the access result: `true`, `false`, or a `Where` clause.
 */
async function anonymousRead(config: { access?: { read?: unknown } }): Promise<unknown> {
  const rule = config.access?.read as Access | undefined
  if (typeof rule !== 'function') {
    // A non-function `read` is a literal, and only `true`/`false` are legal.
    return rule
  }
  // `req.user` is absent for an anonymous caller; `isEditorialUser(undefined)` is
  // false, which is the branch every one of these rules guards.
  return rule({ req: { user: null } } as Parameters<Access>[0])
}

/**
 * The collections that must filter for anonymous readers, with the reason.
 *
 * The reason is carried so a future reader knows what breaks if the entry is
 * removed, rather than deleting a line to make a failure go away.
 */
const MUST_FILTER: Array<[string, { access?: { read?: unknown } }, string]> = [
  ['pages', Pages, 'unpublished drafts must not be readable via ?draft=true'],
  ['scholarships', Scholarships, 'withdrawn rows must not be served'],
  ['live-blogs', LiveBlogs, 'closed live blogs must not be served'],
  ['polls', Polls, 'closed polls must not be served'],
  ['quizzes', Quizzes, 'withdrawn quizzes must not be served'],
  ['ad-units', AdUnits, 'unlaunched campaign scheduling must not be served'],
]

for (const [slug, config, reason] of MUST_FILTER) {
  const result = await anonymousRead(config)
  check(
    `${slug}: anonymous read returns a filter, not an unfiltered pass`,
    result !== true && result !== false && typeof result === 'object' && result !== null,
    result === true
      ? `read is unfiltered (${reason})`
      : `expected a Where object, got ${JSON.stringify(result)}`,
  )
}

if (failures === 0) {
  console.log('verify:public-read — OK')
  console.log(`  ${MUST_FILTER.length} public-read collections filter for anonymous callers`)
} else {
  console.error(`verify:public-read — FAILED (${failures})`)
  console.error(
    '\n  A public-read collection is returning `true`, which Payload treats as "no\n' +
      '  filter". Use `publishedOrEditor` for drafts-enabled collections and\n' +
      '  `activeOrEditor` for an isActive toggle — both in access/roles.ts.',
  )
  process.exitCode = 1
}
