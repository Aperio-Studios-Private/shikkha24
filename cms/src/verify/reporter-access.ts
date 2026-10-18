/**
 * Reporter authorization contract (T-60).
 *
 * ## What this guards
 *
 * A previous audit found that `articles.update` was `isEditorial`, which
 * includes reporters: any reporter could edit a colleague's — including
 * already-published — article, and the `author` byline had no field-level
 * restriction, so a draft could be filed under someone else's name. The rules
 * that fix it live in `access/articles.ts`, and this file is what stops them
 * being "simplified" back.
 *
 * ## Why roles are fed in as literals instead of logging in
 *
 * The alternative is creating real users for every role combination, which
 * writes to the database and needs credentials in CI. The rules under test are
 * pure functions of `req.user`, so constructing the user object is both
 * sufficient and exactly the contract: *given a session shaped like this, the
 * rule must answer that*. `payload.config` is imported only to read the rules
 * actually wired to the `articles` collection — not a copy of them — so a rule
 * that is correct in isolation but never attached will fail here.
 *
 * ## Reading the expectations
 *
 * A `true`/`false` expectation is exact. `{ author: { equals: N } }` means the
 * rule must scope the query to that byline; the assertion compares the returned
 * `Where` structurally. Field rules are fed `siblingData` — the incoming
 * document — because `authorField` is a value predicate; each author row prints
 * the submitted byline it was judged against. Anything unexpected fails loudly
 * rather than printing a matrix a human has to eyeball — an earlier throwaway
 * probe did exactly that, and a printed matrix passes review forever without
 * failing a build.
 *
 * ## The two policies this pins, and why they differ
 *
 * `update` **is** scoped to the reporter's own rows (that was the hole).
 * `delete` is **not** scoped and must stay that way: it was never loose —
 * already superAdmin/Editor-in-Chief only — so widening it to reporters would
 * let them erase their own correction history. The older committed contract
 * `verify/access.ts` asserts the same flat denial, so the two agree.
 *
 * Run: `pnpm --filter cms verify:reporter-access`.
 */
import type { Access, CollectionConfig, FieldAccess } from 'payload'
import { getPayload } from 'payload'

import config from '../payload.config'

const payload = await getPayload({ config })

/** Synthetic sessions, one per role shape the rules branch on. */
const ACTORS = {
  reporterOwn: { id: 2, collection: 'users', roles: ['reporter'], authorProfile: 5 },
  reporterOther: { id: 3, collection: 'users', roles: ['reporter'], authorProfile: 6 },
  reporterNoProfile: { id: 7, collection: 'users', roles: ['reporter'] },
  sectionEditor: { id: 4, collection: 'users', roles: ['sectionEditor'], authorProfile: 7 },
  editorInChief: { id: 5, collection: 'users', roles: ['editorInChief'], authorProfile: 8 },
  adManager: { id: 8, collection: 'users', roles: ['adManager'] },
  superAdmin: { id: 9, collection: 'users', roles: ['superAdmin'], authorProfile: 10 },
  reader: { id: 1, collection: 'readers' },
  anonymous: null,
} as const

type ActorName = keyof typeof ACTORS

/** The signature Payload calls these rules with, narrowed to what we supply. */
type RuleFn = (args: { req: { user: unknown }; siblingData?: unknown }) => unknown

const failures: string[] = []

function ruleOf(kind: 'collection' | 'field', name: string): RuleFn {
  const articles = payload.config.collections.find((c) => c.slug === 'articles') as CollectionConfig
  if (!articles) throw new Error('articles collection is not registered in payload.config')

  if (kind === 'collection') {
    const rule = articles.access?.[name as keyof typeof articles.access] as Access | undefined
    if (!rule) throw new Error(`articles.access.${name} is not defined`)
    return rule as unknown as RuleFn
  }

  const field = (articles.fields as { name?: string; access?: Record<string, FieldAccess> }[]).find(
    (f) => f.name === 'author',
  )
  const rule = field?.access?.[name]
  if (!rule) throw new Error(`articles.author.access.${name} is not defined`)
  return rule as unknown as RuleFn
}

/**
 * Run one rule for one actor and compare against the expectation.
 *
 * `siblingData` is the incoming document's fields, which is what Payload hands a
 * `FieldAccess` rule — `authorField` reads it to compare the submitted byline
 * against the session's own profile. Collection rules ignore it.
 */
function expect(
  label: string,
  fn: RuleFn,
  actor: ActorName,
  expected: unknown,
  siblingData?: unknown,
): void {
  let actual: unknown
  try {
    actual = fn({ req: { user: ACTORS[actor] }, siblingData })
  } catch (error) {
    failures.push(`${label} / ${actor} threw: ${(error as Error).message}`)
    return
  }
  const same = JSON.stringify(actual) === JSON.stringify(expected)
  if (!same) {
    failures.push(
      `${label} / ${actor}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    )
  }
  const detail =
    siblingData === undefined
      ? ''
      : ` [author=${JSON.stringify((siblingData as { author?: unknown }).author)}]`
  console.log(
    `${same ? 'ok  ' : 'FAIL'} ${label.padEnd(34)} ${actor.padEnd(18)} ${JSON.stringify(actual)}${detail}`,
  )
}

const update = ruleOf('collection', 'update')
const del = ruleOf('collection', 'delete')
const authorCreate = ruleOf('field', 'create')
const authorUpdate = ruleOf('field', 'update')

console.log('\n=== articles.update — reporters are scoped to their own byline ===')
// The finding itself: a reporter must never get an unscoped `true`.
expect('update', update, 'reporterOwn', { author: { equals: 5 } })
expect('update', update, 'reporterOther', { author: { equals: 6 } })
expect('update', update, 'reporterNoProfile', false)
// Editors and above are unchanged (T-60 requirement: no behaviour change).
expect('update', update, 'sectionEditor', true)
expect('update', update, 'editorInChief', true)
expect('update', update, 'superAdmin', true)
// Non-editorial roles must not slip through the reporter fallback.
expect('update', update, 'adManager', false)
expect('update', update, 'reader', false)
expect('update', update, 'anonymous', false)

console.log("\n=== articles.delete — unchanged: the desk's top two roles only ===")
/*
 * T-60 did **not** loosen delete. The finding was scoped to `create`/`update`,
 * and delete was already `isSuperAdminOrEditorInChief` — there was no ownership
 * hole to close. Scoping reporters into delete would have been a *widening*:
 * a reporter could then erase their own correction history. The older committed
 * contract `verify/access.ts` asserts this same flat denial, so both harnesses
 * agree here.
 */
expect('delete', del, 'reporterOwn', false)
expect('delete', del, 'reporterOther', false)
expect('delete', del, 'reporterNoProfile', false)
expect('delete', del, 'sectionEditor', false)
expect('delete', del, 'editorInChief', true)
expect('delete', del, 'superAdmin', true)
expect('delete', del, 'adManager', false)
expect('delete', del, 'reader', false)
expect('delete', del, 'anonymous', false)

console.log('\n=== articles.author — a reporter may write only their OWN byline ===')
/*
 * Value-based, not a flat `editorField`. Denying a `required` relationship
 * strips the value rather than refusing the request, so a flat denial makes the
 * reporter's own `POST /api/reporter/quick-draft` fail validation with
 * "Author is invalid" (400 instead of 201) — measured by the T-60 agent, and the
 * reason this rule reads `siblingData` and compares against the session's own
 * `authorProfile`. The cases below assert both halves: forging a colleague's
 * byline is refused, writing your own is allowed.
 */
for (const [op, fn] of [
  ['author.create', authorCreate],
  ['author.update', authorUpdate],
] as const) {
  expect(op, fn, 'reporterOwn', true, { author: 5 }) // own profile: allowed
  expect(op, fn, 'reporterOwn', false, { author: 6 }) // a colleague's: denied
  expect(op, fn, 'reporterNoProfile', false, { author: 5 }) // nothing to compare
  expect(op, fn, 'sectionEditor', true, { author: 5 }) // editors assign any
  expect(op, fn, 'sectionEditor', true, { author: 99 })
  expect(op, fn, 'editorInChief', true, { author: 99 })
  expect(op, fn, 'superAdmin', true, { author: 99 })
  expect(op, fn, 'reader', false, { author: 5 })
  expect(op, fn, 'anonymous', false, { author: 5 })
}

if (failures.length > 0) {
  console.error(`\n${failures.length} authorization contract failure(s):`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log('\nreporter authorization contract: PASS')
process.exit(0)
