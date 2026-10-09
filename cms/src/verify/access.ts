import type { Access, CollectionConfig } from 'payload'
import { getPayload } from 'payload'

import config from '../payload.config'

/**
 * The access matrix — every collection, every operation, every role.
 *
 * ## Why this harness exists
 *
 * A CMS audit on 2026-09-30 found six authorisation holes — four of them critical
 * — with **every existing gate green**. `403` and `Forbidden` appeared **zero
 * times** across `src/verify/*.ts`: the suite tested the custom endpoints
 * thoroughly and never once asserted that a *generated* REST route refuses the
 * wrong caller. The holes were:
 *
 *   Media            create/update/delete undefined → Payload's `Boolean(user)`
 *                    default let ANY account rewrite or delete the image library
 *   users            `isSelfOrAdmin` matched a reader id against a user id
 *   newsletter-subs  `create: () => true` → double opt-in bypassed
 *   readers          `create: () => true` → anonymous account creation
 *   comments         `create: () => true` → unthrottled insertion
 *   bookmarks etc.   ownership matched on `id`, not on the `reader` relation
 *
 * Each is now an assertion below, so none can return silently.
 *
 * ## Why it runs against the config, not over HTTP
 *
 * The rules are what decide access; Payload's wiring around them is its own
 * tested concern. Calling them directly keeps this hermetic — no dev server, no
 * fixtures, no rows written, nothing to clean up — so it runs in CI on every
 * push. `scripts/verify-cms-access.mjs` drives the same rules over real HTTP as
 * an integration check; the two are complementary, not duplicates.
 */

const payload = await getPayload({ config })

/** A synthetic session for each role. `collection` is what Payload sets on auth. */
const ACTORS = {
  anonymous: null,
  reader: { id: 1, collection: 'readers', displayName: 'reader' },
  reporter: { id: 2, collection: 'users', roles: ['reporter'], authorProfile: 5 },
  sectionEditor: { id: 3, collection: 'users', roles: ['sectionEditor'], authorProfile: 6 },
  editorInChief: { id: 4, collection: 'users', roles: ['editorInChief'], authorProfile: 7 },
  adManager: { id: 8, collection: 'users', roles: ['adManager'] },
  superAdmin: { id: 9, collection: 'users', roles: ['superAdmin'], authorProfile: 10 },
} as const

type ActorName = keyof typeof ACTORS
type Operation = 'read' | 'create' | 'update' | 'delete'

const OPERATIONS: Operation[] = ['read', 'create', 'update', 'delete']

/** Run one access rule for one actor. */
function evaluate(collection: CollectionConfig, operation: Operation, actor: ActorName) {
  const rule = collection.access?.[operation] as Access | undefined
  if (!rule) return undefined
  return rule({ req: { user: ACTORS[actor] } } as never)
}

let failures = 0
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

/** `denied` means the rule returns a falsy value; `allowed` means it returns truthy. */
const denied = (value: unknown) => !value
const allowed = (value: unknown) => Boolean(value)

/**
 * The collections this project owns.
 *
 * `payload-locked-documents`, `payload-preferences` and `payload-migrations` are
 * Payload's own bookkeeping, configured by the framework rather than by us.
 * Asserting our access conventions on them would be asserting someone else's
 * design — they are excluded from the structural and per-role rules below. They
 * are still covered by the anonymous-write rule, which holds for every collection
 * and costs nothing to check.
 */
const PROJECT_COLLECTIONS = payload.config.collections.filter((c) => !c.slug.startsWith('payload-'))

/**
 * Where a reader session legitimately writes, and the field its rule must scope on.
 *
 * These are `update`-only: a reader may edit their own profile, bookmark or saved
 * deadline, and the rule expresses that as a `Where` — so the assertion is that the
 * scope names the **owning column**, not that the rule denies outright.
 */
const READER_SELF_SCOPED: Record<string, string> = {
  readers: 'id',
  bookmarks: 'reader',
  'saved-deadlines': 'reader',
}

console.log('\n=== CMS access matrix ===\n')

// ── 1. Structural: no collection may rely on Payload's default ───────────────
/*
 * This is the assertion that would have caught Media immediately. Payload's
 * default for an undefined rule is `Boolean(user)` — "any authenticated account"
 * — which is never what a newsroom collection means.
 */
console.log('-- every collection states all four rules explicitly --')
for (const collection of PROJECT_COLLECTIONS) {
  const missing = OPERATIONS.filter((op) => !collection.access?.[op])
  check(
    `${collection.slug} defines read/create/update/delete`,
    missing.length === 0,
    missing.join(', '),
  )
}

// ── 2. Structural: `create` must be a boolean, never a Where ────────────────
/*
 * A `Where` returned from `create` is meaningless — Payload only checks truthiness
 * — so it authorises the write while doing nothing to constrain the new document.
 * That is how `create: isSelfOrAdmin` and `create: isEditorialUser`-style mistakes
 * become "anyone authenticated may create".
 */
console.log('\n-- every create rule returns a boolean for every actor --')
for (const collection of PROJECT_COLLECTIONS) {
  const offenders: string[] = []
  for (const actor of Object.keys(ACTORS) as ActorName[]) {
    const result = evaluate(collection, 'create', actor)
    if (result !== undefined && typeof result !== 'boolean') offenders.push(`${actor}→object`)
  }
  check(`${collection.slug}.create is a boolean`, offenders.length === 0, offenders.join(', '))
}

// ── 3. Anonymous may never write, anywhere ──────────────────────────────────
console.log('\n-- anonymous is denied every write, on every collection --')
for (const collection of payload.config.collections) {
  for (const operation of ['create', 'update', 'delete'] as Operation[]) {
    check(
      `anonymous denied ${collection.slug}.${operation}`,
      denied(evaluate(collection, operation, 'anonymous')),
    )
  }
}

// ── 4. A reader session may never write, except its own rows ────────────────
/*
 * Three `update` rules are legitimately self-scoped rather than denied: a reader
 * editing their own profile, bookmark or saved deadline. Those are asserted to
 * scope on the **owning column** — `id` for their own `readers` row, `reader` for
 * the relation-owned collections. Everything else must be a flat denial.
 *
 * ⚠️ This is the assertion that would have caught the relation-owned defect: the
 * old rule returned `{ id: { equals: … } }` on `bookmarks`, which is a Where, so a
 * naive "is it truthy" check would have passed it. Naming the column is the point.
 */
console.log('\n-- a reader session is denied every write, except self-scoped rows --')
for (const collection of PROJECT_COLLECTIONS) {
  for (const operation of ['create', 'update', 'delete'] as Operation[]) {
    const result = evaluate(collection, operation, 'reader')
    const scopeField = operation === 'update' ? READER_SELF_SCOPED[collection.slug] : undefined

    if (scopeField) {
      const keys = result && typeof result === 'object' ? Object.keys(result as object) : []
      check(
        `reader update on ${collection.slug} is scoped to its own rows via '${scopeField}'`,
        keys.includes(scopeField),
        keys.join(',') || String(result),
      )
      continue
    }

    check(`reader denied ${collection.slug}.${operation}`, denied(result), String(result))
  }
}

// ── 5. A reader session may not read staff or reader-private collections ────
console.log('\n-- a reader session cannot read privileged collections --')
for (const slug of [
  'users',
  'readers',
  'newsletter-subscribers',
  'newsletter-campaigns',
  'poll-votes',
  'reactions',
  'citizen-submissions',
  'push-subscriptions',
  'assignments',
]) {
  const collection = payload.config.collections.find((c) => c.slug === slug)
  if (!collection) {
    check(`collection ${slug} exists`, false)
    continue
  }
  const result = evaluate(collection, 'read', 'reader')
  // `readers.read` is `isSelfIn('readers')` → a Where scoped to the reader's own
  // id, which is correct. Everything else must be a flat denial.
  const scopedToSelf = slug === 'readers' && typeof result === 'object' && result !== null
  check(
    `reader denied or self-scoped on ${slug}.read`,
    denied(result) || scopedToSelf,
    String(result),
  )
}

// ── 6. The targeted behaviours each fix depends on ─────────────────────────
console.log('\n-- the specific behaviours the fixes rest on --')
const get = (slug: string) =>
  payload.config.collections.find((c) => c.slug === slug) as CollectionConfig

check('media: anonymous denied create', denied(evaluate(get('media'), 'create', 'anonymous')))
check('media: reader denied create', denied(evaluate(get('media'), 'create', 'reader')))
check('media: reporter ALLOWED create', allowed(evaluate(get('media'), 'create', 'reporter')))
check('media: reporter denied delete', denied(evaluate(get('media'), 'delete', 'reporter')))
check(
  'media: editorInChief ALLOWED delete',
  allowed(evaluate(get('media'), 'delete', 'editorInChief')),
)
check('media: read stays public', allowed(evaluate(get('media'), 'read', 'anonymous')))

check('users: reader denied read', denied(evaluate(get('users'), 'read', 'reader')))
check('users: reader denied update', denied(evaluate(get('users'), 'update', 'reader')))
check('users: reporter allowed own read', allowed(evaluate(get('users'), 'read', 'reporter')))
check('users: superAdmin allowed read', allowed(evaluate(get('users'), 'read', 'superAdmin')))

check('readers: anonymous denied create', denied(evaluate(get('readers'), 'create', 'anonymous')))
check(
  'readers: a staff session is denied on readers.read',
  denied(evaluate(get('readers'), 'read', 'reporter')),
)
check(
  'readers: a reader session is self-scoped on readers.read',
  typeof evaluate(get('readers'), 'read', 'reader') === 'object',
)

check(
  'newsletter-subscribers: anonymous denied create',
  denied(evaluate(get('newsletter-subscribers'), 'create', 'anonymous')),
)
check('comments: anonymous denied create', denied(evaluate(get('comments'), 'create', 'anonymous')))
check(
  'comments: read is filtered for anonymous',
  typeof evaluate(get('comments'), 'read', 'anonymous') === 'object',
)

/*
 * The relation-owned collections: the read rule must scope on `reader`, not on
 * `id`. Checking the shape of the Where is what distinguishes a correct rule from
 * the id-comparison that returned the wrong rows.
 */
for (const slug of ['bookmarks', 'saved-deadlines']) {
  const result = evaluate(get(slug), 'read', 'reader') as Record<string, unknown> | undefined
  const keys = result ? Object.keys(result) : []
  check(
    `${slug}: reader scope is on 'reader', not 'id'`,
    keys.includes('reader'),
    keys.join(',') || 'no keys',
  )
}
check(
  'push-subscriptions: anonymous denied create',
  denied(evaluate(get('push-subscriptions'), 'create', 'anonymous')),
)

check(
  'articles: anonymous read is filtered to published',
  JSON.stringify(evaluate(get('articles'), 'read', 'anonymous')).includes('published'),
)
check('articles: reporter allowed create', allowed(evaluate(get('articles'), 'create', 'reporter')))
check('articles: reporter denied delete', denied(evaluate(get('articles'), 'delete', 'reporter')))
check(
  'assignments: anonymous denied read',
  denied(evaluate(get('assignments'), 'read', 'anonymous')),
)

// ── 7. S18 — the institution directory model ────────────────────────────────
/*
 * The directory is a **public** surface with **editorial** writes, so the access
 * rules are the same shape as any other content collection — asserted anyway,
 * because `verify:access` exists precisely because "the shape looks fine" was
 * wrong six times.
 *
 * The rest of this section asserts **model contracts** rather than access: the
 * two axes must stay two fields, and a fee row must not be saveable without the
 * date it was checked. Those are invisible to an access rule and would otherwise
 * be unverified — `docs/university-directory.md` §6 makes the fee date
 * mandatory, so it is asserted as a config fact, not left to discipline.
 */
console.log('\n-- S18: the institution directory model --')

type AnyField = Record<string, unknown> & { name?: string; fields?: AnyField[] }

/**
 * The fields at the collection's own level.
 *
 * ⚠️ **Tabs are presentational, so a field inside one is still a top-level
 * field.** `institutions` moved its ~25 fields into tabs at S21 to make the admin
 * usable; a lookup that did not descend into them would report every S18 field as
 * missing and the harness would fail for the wrong reason.
 */
function ownFields(fields: unknown): AnyField[] {
  if (!Array.isArray(fields)) return []
  const out: AnyField[] = []
  for (const entry of fields as AnyField[]) {
    if (entry.type === 'tabs') {
      for (const tab of (entry.tabs as AnyField[] | undefined) ?? []) {
        out.push(...ownFields(tab.fields))
      }
    } else {
      out.push(entry)
    }
  }
  return out
}

/** Top-level lookup — `contact.address` must NOT satisfy a search for `address`. */
const topField = (collection: CollectionConfig, name: string): AnyField | undefined =>
  ownFields(collection.fields).find((f) => f.name === name)

/** Recursive lookup, for the group and array sub-fields S18 added. */
const findField = (fields: unknown, name: string): AnyField | undefined => {
  for (const entry of ownFields(fields)) {
    if (entry.name === name) return entry
    const hit = findField(entry.fields, name)
    if (hit) return hit
  }
  return undefined
}

const institutions = get('institutions')
check('institutions: read stays public', allowed(evaluate(institutions, 'read', 'anonymous')))
check(
  'institutions: anonymous denied create',
  denied(evaluate(institutions, 'create', 'anonymous')),
)
check(
  'institutions: reporter ALLOWED create',
  allowed(evaluate(institutions, 'create', 'reporter')),
)
check('institutions: reporter denied delete', denied(evaluate(institutions, 'delete', 'reporter')))
check(
  'institutions: editorInChief ALLOWED delete',
  allowed(evaluate(institutions, 'delete', 'editorInChief')),
)

/*
 * ⚠️ The two axes must stay TWO fields. Collapsing them into one exclusive
 * category would hide BUET from "Public Universities" — the browse path students
 * use most (`docs/university-directory.md` §2.1).
 */
const typeField = topField(institutions, 'type')
const typeValues =
  (typeField?.options as Array<{ value: string }> | undefined)?.map((o) => o.value) ?? []
check(
  'institutions.type is the ownership axis',
  JSON.stringify(typeValues) === JSON.stringify(['public', 'private', 'nu-college', 'madrasa']),
  typeValues.join(',') || 'no options',
)
check('institutions.discipline is a SEPARATE field', Boolean(topField(institutions, 'discipline')))
check('the removed `college` value is gone', !typeValues.includes('college'))

/*
 * ⚠️ The fee guard. The owner chose an exact figure per programme over a range;
 * a stale figure *looks* authoritative in a way a missing one does not, so a fee
 * row cannot be saved without the date it was checked. `required: true` is the
 * whole safeguard — a UI hint would not be one.
 */
const fees = topField(institutions, 'tuitionFees')
const verifiedAt = findField(fees?.fields, 'verifiedAt')
check('tuitionFees[].verifiedAt exists', Boolean(verifiedAt))
check('tuitionFees[].verifiedAt is REQUIRED', verifiedAt?.required === true)

/*
 * `address` moved into the `contact` group. A page still reading
 * `institution.address` renders **nothing** rather than erroring, because
 * `.astro` frontmatter is not typechecked — so the shape is asserted here.
 */
check('top-level `address` is gone', !topField(institutions, 'address'))
check(
  'contact.address exists',
  Boolean(findField(topField(institutions, 'contact')?.fields, 'address')),
)

/*
 * The news linkage is the **only** entry point for the article↔institution
 * relationship, and it must not widen article access — `articles` keeps its own
 * `publishedOrEditor` read rule, which is asserted above.
 */
const university = topField(get('articles'), 'university')
check('articles.university → institutions', university?.relationTo === 'institutions')
check('articles.university is optional', university?.required !== true)
check('articles.university is indexed', university?.index === true)

// ── 8. CORS — the other access boundary ─────────────────────────────────────
/*
 * `cors`/`csrf` decide which browser origins may call this API at all. The
 * production allow-list must be exactly the site origin: a localhost entry there
 * means a page served from the reader's own machine can call the API with their
 * cookies attached.
 */
console.log('\n-- CORS / CSRF allow-list --')
const cors = (payload.config.cors ?? []) as string[]
const localhostEntries = cors.filter((origin) => /localhost|127\.0\.0\.1/.test(origin))
const isProduction = process.env.NODE_ENV === 'production'

check(
  'the site origin is always allowed',
  cors.some((origin) => origin.includes('shikkha24.com')),
  cors.join(', '),
)
check(
  isProduction
    ? 'production allows NO localhost origin'
    : 'development allows the Astro dev server (so `astro dev` can call the API)',
  isProduction ? localhostEntries.length === 0 : cors.some((o) => o.includes('4321')),
  `NODE_ENV=${process.env.NODE_ENV ?? 'unset'} · localhost: ${localhostEntries.join(', ') || 'none'}`,
)

/*
 * ── 8. A reader session may not read staff or reader PII ─────────────────────
 *
 * ## Why this section exists
 *
 * Eight fields were guarded by `Boolean(req.user)` under the belief that it meant
 * "signed in". On this site it does not: `readerSessionStrategy` sets `req.user`
 * to the reader document, so a free Google or Facebook login satisfied it exactly
 * as a staff JWT did. The effect was that any logged-in **reader** could read
 * every reporter's staff email, every approved commenter's email, citizen email
 * and phone numbers, staff phone numbers, and the reactions dedupe key — each of
 * which carries its own comment saying it is never exposed publicly.
 *
 * The five holes the 2026-09-30 audit found were invisible for the same reason
 * this one was: no assertion covered a **reader** session at **field** level.
 * Sections 4 and 5 cover collection-level rules; nothing here covered a field's
 * `access.read`.
 *
 * ⚠️ The positive assertions are the point. Denying a reader is the easy half; a
 * rule that denied *everyone* would pass it. Each field below is therefore also
 * asserted ALLOWED for a reporter and a super admin, so a future edit cannot buy
 * the fix by locking the newsroom out of the newsroom's own data.
 */
console.log('\n-- a reader session cannot read PII fields, and the newsroom still can --')

/** Fields guarded by `authenticatedField`, as `collection:field`. */
const PII_FIELDS: ReadonlyArray<[collection: string, field: string]> = [
  ['authors', 'email'],
  ['authors', 'verifiedBy'],
  ['authors', 'verificationNote'],
  ['comments', 'userEmail'],
  ['citizen-submissions', 'reporterEmail'],
  ['citizen-submissions', 'reporterPhone'],
  ['reactions', 'fingerprint'],
  ['users', 'phone'],
]

/**
 * Evaluate one field's `access.read` rule for one actor.
 *
 * Searches nested `group`/`array`/`tabs`/`row`/`collapsible` children too, so a
 * field that later moves into a layout panel is still asserted rather than
 * silently reported as "declares no rule" — which, because `denied(undefined)` is
 * true, is a **vacuous pass**. That is exactly what happened when this section
 * first named `reactions.ipHash`, which is really `reactions.fingerprint`: four
 * denials "passed" against a field that was never found. The
 * `declares a read rule` assertion is what made that visible, and it is why it
 * stays.
 *
 * Returns `undefined` when the field declares no rule at all — which is itself a
 * finding, because an unguarded field is readable by anyone who can read the row.
 */
function evaluateFieldRead(collection: CollectionConfig, fieldName: string, actor: ActorName) {
  // Payload nests fields inside layout blocks; walk them all rather than only the
  // top level.
  const flatten = (fields: unknown): Array<{ name?: string; access?: { read?: unknown } }> => {
    const out: Array<{ name?: string; access?: { read?: unknown } }> = []
    for (const entry of (fields ?? []) as Array<Record<string, unknown>>) {
      if (!entry || typeof entry !== 'object') continue
      out.push(entry as { name?: string; access?: { read?: unknown } })
      for (const key of ['fields', 'tabs', 'groups', 'rows', 'collapsibles']) {
        if (Array.isArray(entry[key])) out.push(...flatten(entry[key]))
      }
    }
    return out
  }

  const field = flatten(collection.fields).find((f) => f.name === fieldName)
  const rule = field?.access?.read as Access | undefined
  if (!rule) return undefined
  return rule({ req: { user: ACTORS[actor] } } as never)
}

for (const [slug, fieldName] of PII_FIELDS) {
  const collection = get(slug)
  const label = `${slug}.${fieldName}`

  check(
    `${label}: the field declares a read rule`,
    typeof evaluateFieldRead(collection, fieldName, 'reader') !== 'undefined',
  )

  check(`${label}: reader denied`, denied(evaluateFieldRead(collection, fieldName, 'reader')))
  check(`${label}: anonymous denied`, denied(evaluateFieldRead(collection, fieldName, 'anonymous')))
  // Ad Manager runs ad units, not the newsroom's contacts or reader PII.
  check(`${label}: adManager denied`, denied(evaluateFieldRead(collection, fieldName, 'adManager')))

  // The counterweight to the four denials above. Without these, "deny everyone"
  // would satisfy the whole section.
  check(
    `${label}: reporter ALLOWED (the newsroom must keep access)`,
    allowed(evaluateFieldRead(collection, fieldName, 'reporter')),
  )
  check(
    `${label}: superAdmin ALLOWED`,
    allowed(evaluateFieldRead(collection, fieldName, 'superAdmin')),
  )
}

console.log(
  failures === 0
    ? `\nAll access checks passed (${payload.config.collections.length} collections).\n`
    : `\n${failures} access check(s) FAILED.\n`,
)
process.exit(failures === 0 ? 0 : 1)
