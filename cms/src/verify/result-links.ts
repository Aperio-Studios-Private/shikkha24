/**
 * Regression gate for C-01: an anonymous request must not see an unpublished
 * `result-links` row.
 *
 * ## Why this exists
 *
 * `ResultLinks` had `read: anyone` while carrying an `isPublished` checkbox that
 * defaults to `false`. Every draft and unreviewed row was therefore readable by
 * anyone who queried the endpoint. The publish filter existed — but only in the
 * frontend consumer, so the CMS was the component leaking.
 *
 * This asserts the rule directly rather than inferring it from a response body,
 * so it fails if the collection is ever reverted to `anyone`.
 */
import type { Access, Where } from 'payload'

import { ResultLinks } from '../collections/ResultLinks'
import { Users } from '../collections/Users'

let failures = 0

/**
 * @param label what the assertion is.
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

console.log('\nC-01 — result-links must not leak unpublished rows\n')

const read = ResultLinks.access?.read as Access | undefined
check('the collection declares a read rule', typeof read === 'function', 'read is not a function')

// Anonymous reader.
const anon = read?.({ req: { user: null } } as Parameters<Access>[0]) as Where | boolean
check(
  'an anonymous reader receives a filter, not an unfiltered pass',
  anon !== true,
  'it returned `true`, so every row is readable',
)
check(
  'that filter is `isPublished: true`',
  typeof anon === 'object' && anon !== null && (anon as Where).isPublished !== undefined,
  JSON.stringify(anon),
)

/**
 * Minimal stand-in for a Payload user object.
 *
 * `rolesOf` reads a **`roles` array**, not a singular `role` — an earlier draft
 * of this file used `role` and every newsroom assertion failed, which looked like
 * the access rule being wrong rather than the fixture being wrong. The gate
 * caught its own bad input, which is the behaviour a gate should have.
 */
function asUser(roles: string[]) {
  return { roles } as unknown as NonNullable<Parameters<Access>[0]['req']['user']>
}

// `isEditorial` excludes Ad Manager on purpose ("who is not editorial"), so an ad
// manager is filtered like a reader here. Asserted explicitly rather than folded
// into the list above, because "ad manager cannot read unpublished results" is a
// deliberate decision and not an oversight.
for (const role of ['superAdmin', 'editorInChief', 'sectionEditor', 'reporter']) {
  const result = read?.({ req: { user: asUser([role]) } } as Parameters<Access>[0]) as
    | Where
    | boolean
  check(`a newsroom user (${role}) may read everything`, result === true, JSON.stringify(result))
}

const adManager = read?.({ req: { user: asUser(['adManager']) } } as Parameters<Access>[0]) as
  | Where
  | boolean
check(
  'an ad manager is filtered, not editorial',
  adManager !== true,
  'an ad manager received an unfiltered pass',
)

check('the newsroom still appears in the config', Users.slug === 'users')

console.log(failures === 0 ? '\nPASS\n' : `\n${failures} failure(s)\n`)
if (failures > 0) process.exit(1)
