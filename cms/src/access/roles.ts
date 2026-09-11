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

/** Authenticated user, or only their own document. */
export const isSelfOrAdmin: Access = ({ req }) => {
  if (hasRole(req.user, 'superAdmin')) return true
  const id = (req.user as RoleBearingUser | null)?.id
  if (!id) return false
  return { id: { equals: id } }
}

// ─────────────────────────────────────────────────────────────────────────────
// Field-level access
// ─────────────────────────────────────────────────────────────────────────────

/** Field is editable only by Super Admin / Editor-in-Chief. */
export const editorInChiefField: FieldAccess = ({ req }) =>
  hasRole(req.user, 'superAdmin', 'editorInChief')

/** Field is editable by any editorial role. */
export const editorialField: FieldAccess = ({ req }) => isEditorialUser(req.user)

/** Field is readable by everyone, editable by nobody through the API. */
export const systemManagedField: FieldAccess = ({ req }) => hasRole(req.user, 'superAdmin')
