import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'

import { isEditorUser } from '../access/roles'

/**
 * Keep the assignment workflow honest.
 *
 * ## Two different questions
 *
 * Field-level access answers *"may this person touch the field at all?"* — it
 * cannot answer *"may they set it to **this** value?"*, because a `FieldAccess`
 * function returns a boolean, not a predicate over the incoming value. So the
 * field access on `Assignments.status` lets the whole newsroom send a status,
 * and this hook decides which statuses each role may actually reach.
 *
 * ## Why this must exist
 *
 * Collection-level `update` has to allow a reporter to touch their own row (they
 * are the one who accepts a job and files it). Without this guard that same
 * permission would also let them send `status: 'approved'` — signing off their
 * own work, which is precisely the control the review step exists to provide.
 * A hidden button in the admin UI would not prevent it (`docs/security.md` §3).
 *
 * ## The permitted transitions
 *
 *   reporter  : assigned → accepted → inProgress → filed
 *   editors   : anything, including approved / rejected, and reassignment
 *
 * A reporter may also move backwards (accepted → assigned) if they are handing a
 * job back; that is a normal newsroom action and is not a privilege escalation.
 */

/** The statuses a reporter may set. `approved` and `rejected` are deliberately absent. */
const REPORTER_STATUSES = new Set(['assigned', 'accepted', 'inProgress', 'filed'])

export const guardAssignmentStatus: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
}) => {
  if (!data || operation !== 'update') return data

  // Editors are unconstrained — approving and rejecting is their job.
  if (isEditorUser(req.user)) return data

  const next = (data as { status?: string }).status
  if (next === undefined) return data

  if (!REPORTER_STATUSES.has(next)) {
    throw new APIError(
      'শুধু সম্পাদক কাজটি অনুমোদন বা বাতিল করতে পারেন। প্রতিবেদক accepted, inProgress বা filed অবস্থায় নিতে পারেন।',
      403,
    )
  }

  return data
}

/**
 * Stamp who created the assignment.
 *
 * Same reasoning as `stampVerification`: "assigned by" is an audit fact, and an
 * editable audit field is not an audit field.
 */
export const stampAssignedBy: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (!data || operation !== 'create') return data

  const actor = (req.user as { id?: string | number } | null)?.id
  if (actor !== undefined && !(data as { assignedBy?: unknown }).assignedBy) {
    ;(data as { assignedBy?: unknown }).assignedBy = actor
  }

  return data
}
