import type { Access, FieldAccess } from 'payload'

import { hasRole, isEditorUser, relationId } from './roles'

/**
 * Ownership rules for the `articles` collection (T-60).
 *
 * ## Why this is its own file
 *
 * `roles.ts` answers *"what role is this session?"* and every collection imports
 * it. These two rules answer a narrower question — *"does this newsroom session
 * own **this** article?"* — and they are the only pair in the codebase that ask
 * it through the `author` relationship. Keeping them here means `Articles.ts`
 * imports two named rules instead of growing three inline closures, and the
 * reasoning below has somewhere to live that is not the middle of a 472-line
 * collection config.
 *
 * ## What "owns" means on an article
 *
 * **The `author` relationship, never `createdBy`.** The two disagree the moment
 * an editor corrects a misfiled byline, and on this site the byline is the
 * published attribution — the reporter whose name appears under the story. An
 * editor who reassigns a byline is correcting who the story belongs to, so the
 * new author is the owner; a `createdBy` stamp would leave the previous reporter
 * with write access to a story now published under someone else's name.
 *
 * The link from a session to an author record is `Users.authorProfile` — the
 * same link `isOwnAuthorProfileOrEditor` and `Assignments` read. It is **not** a
 * comparison of the session id to the document id: a reporter's user id and
 * their author id are different numbers, and comparing them (the `isSelfOrAdmin`
 * mistake, fixed 2026-09-30) matches nothing.
 */

/**
 * Update access for `articles` — editors keep the whole collection, a reporter
 * gets only the rows carrying their own byline.
 *
 * ## Why a `Where` rather than `false`
 *
 * Returning a `Where` makes Payload filter the row in the **query**, so a
 * reporter asking for `PATCH /api/articles/<a-colleague's-id>` is refused because
 * the row is not found, and the generated REST list route shows them their own
 * work rather than everyone's. `false` would deny the write but leave the read
 * surface as it is, and the admin panel's edit view loads the document before it
 * saves — an outright denial there is a dead editor, not a guarded one.
 *
 * ## Which roles this actually restricts
 *
 * Editors (`sectionEditor` and above) are allowed first and unconditionally, so
 * requirement 6 of T-60 holds: nothing about their behaviour changes. The fallback
 * is deliberately *not* "not a reporter" — `adManager` is editorial-adjacent and
 * could reach the generated routes, and it must not inherit a reporter's scoping
 * and land in "matches no rows". Anything that reaches the fallback must hold
 * `reporter`, or it is denied outright.
 *
 * A reporter with **no linked author profile** is denied rather than left
 * unfiltered — `relationId()` returns null and we fall through to `false`. A
 * reporter with no byline has nothing of their own to edit, and the direction of
 * that failure is the safe one (see `isOwnAuthorProfileOrEditor`).
 */
export const updateOwnArticlesOrEditor: Access = ({ req }) => {
  if (!req.user) return false
  if (isEditorUser(req.user)) return true

  const authorId = relationId((req.user as { authorProfile?: unknown }).authorProfile)
  if (authorId === null) return false
  if (!hasRole(req.user, 'reporter')) return false

  return { author: { equals: authorId } }
}

/**
 * Delete access for `articles` — Super Admin and Editor-in-Chief only.
 *
 * ## Why this is a flat denial and not the ownership scope `update` uses
 *
 * T-60 said delete should "follow the same ownership rule", on the assumption
 * that `delete` was as loose as `update`. It was not: this was already
 * `isSuperAdminOrEditorInChief`, so a reporter could never delete anything. The
 * defect the audit found is an **ownership** hole, and there is no ownership hole
 * in a rule that hands the collection's most destructive operation to two roles.
 *
 * `docs/task-checklist-original.md` states the reporter's remit as *"own articles
 * only, draft + submit"* — authoring, not destruction — and `verify:access`
 * asserts `articles: reporter denied delete` as a contract. Scoping delete to
 * ownership would have widened the reporter's authority (letting them erase their
 * own history, including the record of a correction) while simultaneously
 * breaking a check that guards the narrower rule. A reporter who files something
 * by mistake asks the desk to remove it; the version history stays intact.
 *
 * Kept as a named export rather than deleted outright so the collection's access
 * block states all four rules, which `verify:access` requires of every collection.
 *
 * ⚠️ **Open conflict, flagged 2026-10-19:** an uncommitted harness added during
 * T-60, `verify/reporter-access.ts`, expects a reporter to be **scoped** here
 * (`{ author: { equals: N } }`) rather than denied. The two cannot both hold. This
 * rule follows `verify:access` — the older, committed contract — and leaves the
 * harness's delete row as the one that must move. Whoever owns that file should
 * either relax it to `false` or record the policy decision to widen delete, and
 * `verify/access.ts:266` must change in the same commit if it is widened.
 */
export const deleteArticleOrEditorInChief: Access = ({ req }) =>
  hasRole(req.user, 'superAdmin', 'editorInChief')

/**
 * Who may **set** the `author` byline — an editor, anyone, or a reporter writing
 * **their own** profile.
 *
 * ## Why the rule is value-based rather than a flat `editorField`
 *
 * `editorField` (Section Editor and above) is the obvious answer and it is
 * wrong, because of a Payload detail: denying field access on a `required`
 * relationship **strips the value** rather than refusing the request, and the
 * create then fails validation with `Author is invalid`. That was measured, not
 * assumed — with a flat `editorField` the reporter's own legitimate
 * `POST /api/reporter/quick-draft` (which sets the byline from the session, see
 * `endpoints/reporter.ts`) returned a 400 instead of a 201. Closing T-60 by
 * breaking the one endpoint a reporter actually uses would be a worse bug than
 * the one being fixed.
 *
 * So a reporter is allowed to write this field **only when the value is their own
 * `authorProfile`**. Payload passes the incoming document as **`siblingData`**,
 * not as `data` — verified in `payload@3.90.2`
 * (`fields/hooks/beforeValidate/promise.js:221` calls
 * `field.access[operation]({ id, blockData, data, doc, req, siblingData })`, where
 * `data` is the whole request payload and `siblingData` is the parent document's
 * fields). Reading `data` here would have compared the reporter's own id against
 * the entire body and denied every write — which is exactly the failure this rule
 * was first written with, and why it is named here.
 *
 * ## What this closes
 *
 * A reporter can no longer file a brand-new story under a colleague's byline —
 * the first half of T-60 — while `updateOwnArticlesOrEditor` keeps them inside
 * their own rows for everything after. A byline is an attribution of
 * responsibility; the person being attributed must not be able to forge it.
 *
 * ## Why the editor branch is first
 *
 * `isEditorUser` short-circuits, so editors (including a reporter who also holds
 * `sectionEditor` — a role set is a list, not a rank) are unaffected by the
 * value check and can assign any byline, which is the desk's job. This mirrors
 * `reviewStatus`, which is also a value-predicate `FieldAccess` on this
 * collection; the difference is that a stripped `author` fails loudly on
 * validation while a stripped `reviewStatus` was silent, which is why the publish
 * guard needs a hook instead.
 */
export const authorField: FieldAccess = ({ req, siblingData }) => {
  if (isEditorUser(req.user)) return true

  // No session, or a session with no byline to compare against: nothing to allow.
  const ownAuthorId = relationId((req.user as { authorProfile?: unknown } | null)?.authorProfile)
  if (ownAuthorId === null) return false

  return relationId((siblingData as { author?: unknown } | undefined)?.author) === ownAuthorId
}
