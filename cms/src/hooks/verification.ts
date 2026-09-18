import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Stamp **who** verified a reporter and **when** — never trust the form to send it.
 *
 * ## Why this is a hook and not two editable fields
 *
 * `verifiedAt` and `verifiedBy` are the audit trail behind a public trust badge.
 * If they were ordinary editable fields, an editor could backdate a verification
 * or attribute it to a colleague, and the badge would still render — the site
 * would be asserting a fact it cannot support. Deriving both from the request
 * means the record says what actually happened.
 *
 * ## Only on the transition into `verified`
 *
 * A save that leaves an already-verified reporter verified does not re-stamp:
 * re-saving an unrelated field (a new phone number, a bio tweak) must not move
 * the verification date. Moving `suspended → verified` **does** re-stamp, which
 * is correct — that is a new decision by a new person.
 *
 * ## The stamp is not erased when verification is withdrawn
 *
 * `suspended` keeps `verifiedAt`/`verifiedBy` so the history survives. The
 * current state is read from `verificationStatus`, which is the single source of
 * truth; the stamp answers "who last vouched, and when", not "is it valid now".
 */

export const stampVerification: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  if (!data) return data

  const next = data.verificationStatus
  const previous = (originalDoc as { verificationStatus?: string } | undefined)?.verificationStatus

  // `previous === 'verified'` covers both "unchanged" and "still verified".
  if (next !== 'verified' || previous === 'verified') return data

  data.verifiedAt = new Date().toISOString()

  const actor = (req.user as { id?: string | number } | null)?.id
  if (actor !== undefined) data.verifiedBy = actor

  return data
}
