import type { Access, FieldAccess } from 'payload'

/**
 * Role-based access control for the Shikkha24 newsroom.
 *
 * Five roles (`.sps/content-model.md`, `.sps/profile.md`):
 *   reporter → own articles only, draft + submit for review
 *   sectionEditor → own section's articles + the review queue
 *   editorInChief → all editorial, homepage control, breaking news
 *   adManager → ad units and campaigns only
 *   superAdmin → everything
 *
 * `docs/security.md` §3: **access control is enforced at the API layer, not the
 * UI.** "Hiding a button is not authorisation." Every helper here runs
 * server-side on every request, including REST and GraphQL.
 *
 * Field-level restrictions (reporters cannot change publish date, status or
 * `is_breaking`) are implemented with the `*Field` helpers below and attached to
 * the individual fields on `Articles`, not to the collection.
 */

/** Canonical role identifiers. Stored on the user document. */
export const ROLES = [
  'reporter',
  'sectionEditor',
  'editorInChief',
  'adManager',
  'superAdmin',
] as const

export type Role = (typeof ROLES)[number]

/** Bengali labels for the admin UI (`docs/profile.md` — Bengali-only UI). */
export const ROLE_LABELS: Record<Role, string> = {
  reporter: 'প্রতিবেদক',
  sectionEditor: 'বিভাগীয় সম্পাদক',
  editorInChief: 'প্রধান সম্পাদক',
  adManager: 'বিজ্ঞাপন ব্যবস্থাপক',
  superAdmin: 'সুপার অ্যাডমিন',
}

/**
 * The shape the access helpers rely on.
 *
 * Declared locally rather than imported from the generated `payload-types.ts` so
 * these helpers cannot break every time the schema is regenerated.
 */
export interface RoleBearingUser {
  id: string | number
  roles?: Role[] | null
  /** Set by Payload on auth-enabled collections. */
  collection?: string
}

/** Read a user's roles, tolerating a null/undefined user. */
export function rolesOf(user: unknown): Role[] {
  const roles = (user as RoleBearingUser | null)?.roles
  return Array.isArray(roles) ? roles.filter((r): r is Role => ROLES.includes(r)) : []
}

/** True when the user holds at least one of the given roles. */
export function hasRole(user: unknown, ...wanted: Role[]): boolean {
  if (wanted.length === 0) return false
  const held = rolesOf(user)
  return wanted.some((role) => held.includes(role))
}

/** True when the user is authenticated at all. */
export function isLoggedIn(user: unknown): boolean {
  return Boolean((user as RoleBearingUser | null)?.id)
}

/**
 * Read the ID out of a relationship value.
 *
 * A relationship comes back as a bare ID at depth 0 and as a populated document
 * at depth ≥ 1, and **the same field can be either** depending on how the
 * document was fetched. Code that assumes one shape silently returns `undefined`
 * for the other — which in an access rule means a reporter sees nothing, or
 * worse, an unfiltered set. Normalise here.
 */
export function relationId(value: unknown): string | number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'number') return value
  const id = (value as { id?: string | number }).id
  return id === undefined ? null : id
}

// ─────────────────────────────────────────────────────────────────────────────
// Collection-level access
// ─────────────────────────────────────────────────────────────────────────────

/** Super Admin or Editor-in-Chief. Use for destructive and structural actions. */
export const isSuperAdminOrEditorInChief: Access = ({ req }) =>
  hasRole(req.user, 'superAdmin', 'editorInChief')

/** Super Admin only. */
export const isSuperAdmin: Access = ({ req }) => hasRole(req.user, 'superAdmin')

/** The newsroom roles — everyone who may author or edit content. */
const EDITORIAL_ROLES = ['superAdmin', 'editorInChief', 'sectionEditor', 'reporter'] as const

/**
 * True when the user belongs to the newsroom.
 *
 * Separate from `isEditorial` below on purpose: `isEditorial` is an `Access`
 * function and takes `AccessArgs`, whereas this takes a bare user. Calling
 * `isEditorial(req.user)` would pass a user where Payload expects args — a
 * mistake TypeScript catches, but an easy one to make.
 */
export function isEditorialUser(user: unknown): boolean {
  return hasRole(user, ...EDITORIAL_ROLES)
}

/** Any authenticated editorial role (excludes Ad Manager, who is not editorial). */
export const isEditorial: Access = ({ req }) => isEditorialUser(req.user)

/**
 * The roles that may **vouch for** content or people — Section Editor and above.
 *
 * A reporter is editorial but is not an editor: they may write, but they may not
 * approve a story, verify a colleague, or sign off an assignment. S13's
 * verification fields and assignment approvals key on this list, so the
 * distinction is stated once here rather than re-derived at each call site.
 */
const EDITOR_ROLES = ['superAdmin', 'editorInChief', 'sectionEditor'] as const

/** True when the user may approve, verify or sign off. Takes a bare user. */
export function isEditorUser(user: unknown): boolean {
  return hasRole(user, ...EDITOR_ROLES)
}

/** Section Editor, Editor-in-Chief or Super Admin. */
export const isEditor: Access = ({ req }) => isEditorUser(req.user)

/** Ad Manager, Super Admin, or Editor-in-Chief — the people who touch ad units. */
export const canManageAds: Access = ({ req }) =>
  hasRole(req.user, 'superAdmin', 'editorInChief', 'adManager')

/**
 * Public read of published documents; editors additionally see drafts.
 *
 * Returns a `Where` clause for anonymous readers rather than `false`, so the
 * query is filtered in the database instead of leaking then filtering in memory.
 */
export const publishedOrEditor: Access = ({ req }) => {
  if (isEditorialUser(req.user)) return true
  return { _status: { equals: 'published' } }
}

/** Anyone, including anonymous readers. For genuinely public reference data. */
export const anyone: Access = () => true

/** Nobody except via override — used for collections written by server code. */
export const noOne: Access = () => false

/**
 * The session's id — but only when the session belongs to `collection`.
 *
 * `req.user.collection` is set by the auth strategy that resolved the session:
 * `'users'` for a staff account, `'readers'` for a social login. Checking it is
 * what stops one collection's ids being compared against another's, which is the
 * single mistake behind three separate defects in this codebase.
 */
function sessionIdIn(user: unknown, collection: string): string | number | null {
  const session = user as (RoleBearingUser & { collection?: string }) | null
  if (!session?.id) return null
  if (session.collection !== collection) return null
  return session.id
}

/**
 * The session's own document, or a Super Admin's view of everything.
 *
 * ## ⚠️ Why this takes a collection, and why it used to be wrong
 *
 * This was `isSelfOrAdmin`, a bare `Access` that returned
 * `{ id: { equals: req.user.id } }`. That reads as "my own row" and is only true
 * when the session's collection **is** the collection being accessed. It is not
 * true in general, and the difference is exploitable rather than cosmetic:
 *
 * `users` and `readers` both have integer primary keys starting at 1. A **reader**
 * with id 1 therefore matched **user** id 1 under the old rule, and because
 * `users.read`/`users.update` used it, a reader session could read a staff
 * account — including `email`, `phone` and `roles` — and **write** to it. Since
 * `email` is the login identity and password reset sends to it, changing a staff
 * email was a route to account takeover. Proven 2026-09-30 with a reader session:
 *
 *   GET   /api/users/1  → 200  {"nameBn":"Shahidul Islam","roles":["superAdmin"],…}
 *   PATCH /api/users/1  → 400  (validation — i.e. access had already been granted)
 *   PATCH /api/users/1  {email:"…"} → 400 naming the email field: the field is writable
 *
 * Requiring the collection makes the mistake unrepresentable: the caller must
 * state which collection's ids it is comparing, and a session from anywhere else
 * is denied before any id is looked at.
 *
 * The same root cause produced the `authors` defect (fixed 2026-09-18) and the
 * relation-owned defect in `bookmarks`/`saved-deadlines`/`push-subscriptions`
 * (fixed 2026-09-30) — see `isOwnReaderRowOrSuperAdmin`.
 */
export function isSelfIn(collection: 'users' | 'readers'): Access {
  return ({ req }) => {
    if (hasRole(req.user, 'superAdmin')) return true

    const id = sessionIdIn(req.user, collection)
    if (id === null) return false

    return { id: { equals: id } }
  }
}

/**
 * Update access for the `authors` collection — the reporter's own profile, or any
 * editor.
 *
 * ⚠️ **`isSelfOrAdmin` must not be used on `authors`.** It compares the document
 * id to the **user** id, which is right for `users` (a user editing their own
 * account, where the two ids are the same number) and wrong here: the link is
 * `Users.authorProfile → authors`, so a reporter's user id and their author id
 * are different values and the `where` clause matches nothing. The effect is a
 * flat **403 on a reporter editing their own profile**, while the comment above
 * the rule claimed the opposite. Found by `verify:reporter` on its first run.
 *
 * Resolve the relationship instead, and deny when there is no profile linked —
 * a reporter with no author record has nothing of their own to edit.
 */
export const isOwnAuthorProfileOrEditor: Access = ({ req }) => {
  if (!req.user) return false
  if (isEditorUser(req.user)) return true

  const authorId = relationId((req.user as { authorProfile?: unknown }).authorProfile)
  if (authorId === null) return false

  return { id: { equals: authorId } }
}

/**
 * Access for a collection whose ownership is a **relation to `readers`** — the
 * `reader` field — rather than the document id.
 *
 * ⚠️ **`isSelfOrAdmin` must not be used on these collections.** It returns
 * `{ id: { equals: <user id> } }`, which filters on the row's **primary key**. On
 * `bookmarks`, `saved-deadlines` and `push-subscriptions` the owner is the
 * `reader` column, so that rule asks "is this row's id the same number as my
 * reader id?" — a question with no relationship to ownership. The effect is that
 * a reader's **own rows are invisible** and any row that happens to share their
 * numeric id is returned instead.
 *
 * This is the third variant of one mistake, after `authors` (fixed 2026-09-18)
 * and `users` (fixed 2026-09-30): **an id comparison is only meaningful when the
 * session's collection is the collection being accessed.**
 *
 * Super Admin still sees everything, which is what the admin panel needs.
 */
export const isOwnReaderRowOrSuperAdmin: Access = ({ req }) => {
  if (hasRole(req.user, 'superAdmin')) return true

  const readerId = sessionIdIn(req.user, 'readers')
  if (readerId === null) return false

  return { reader: { equals: readerId } }
}

// ─────────────────────────────────────────────────────────────────────────────
// Field-level access
// ─────────────────────────────────────────────────────────────────────────────
/** Field is editable only by Super Admin / Editor-in-Chief. */
export const editorInChiefField: FieldAccess = ({ req }) =>
  hasRole(req.user, 'superAdmin', 'editorInChief')

/** Field is editable by any editorial role. */
export const editorialField: FieldAccess = ({ req }) => isEditorialUser(req.user)

/**
 * Field is editable only by Section Editor and above.
 *
 * ⚠️ This is the guard that stops a **reporter verifying themselves**. S13's
 * `verificationStatus`, `verifiedAt`, `verifiedBy` and `validUntil` all use it.
 * Hiding the control in the admin UI would not be authorisation — a reporter
 * could still send `PATCH /api/authors/<their-id>` with a crafted body
 * (`docs/security.md` §3).
 */
export const editorField: FieldAccess = ({ req }) => isEditorUser(req.user)

/**
 * Field is readable only by a signed-in **newsroom** user — for internal notes
 * and PII.
 *
 * ⚠️ **This was `Boolean(req.user)`, which does not mean "signed in" — it means
 * "anyone with a session", and on this site a reader has one.** `Readers`
 * authenticates through `readerSessionStrategy`, which sets `req.user` to the
 * reader document (`auth/reader-strategy.ts:63`), so a free Google or Facebook
 * login satisfied `Boolean(req.user)` exactly as a staff JWT did. Every field
 * guarded by this predicate was therefore readable by any logged-in **reader**:
 *
 *     GET /api/authors?limit=100   with a reader cookie → every reporter's
 *                                  staff email
 *     GET /api/comments?limit=250  with a reader cookie → every approved
 *                                  commenter's email address
 *
 * and the same for `verifiedBy` / `verificationNote`, whose own admin text says an
 * internal note is never shown publicly.
 *
 * `hasRole` is the correct discriminator because a reader document carries no
 * `roles` and so returns false — the same reason `isSelfIn` compares
 * `session.collection`. Ad Manager is excluded on purpose: ad units are not a
 * reason to read staff phone numbers or reader PII, and `docs/security.md` §8
 * asks for data minimisation.
 */
export const authenticatedField: FieldAccess = ({ req }) => isEditorialUser(req.user)

/** Field is readable by everyone, editable by nobody through the API. */
export const systemManagedField: FieldAccess = ({ req }) => hasRole(req.user, 'superAdmin')
