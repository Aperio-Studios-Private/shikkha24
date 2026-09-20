import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'

import { isEditorUser } from '../access/roles'

/**
 * Stop a reporter publishing their own story.
 *
 * ## The defect this closes
 *
 * `Articles` documents its rule as *"Publishing itself is `_status: published`,
 * and the collection `update` access below keeps that to editors."* That was
 * **false**. The collection's `update` is `isEditorial`, which includes
 * `reporter` — a reporter must be able to save their own draft, so it has to —
 * and Payload's built-in `_status` carried **no field-level restriction** at all.
 * A reporter could therefore `PATCH /api/articles/<their-id>` with
 * `{"_status": "published"}` and put an unreviewed story on the live site.
 *
 * Found by `verify:reporter`, which asserted the opposite and failed. No other
 * check in the project could see it: the admin UI hides the publish button from
 * reporters, and hiding a control is not authorisation (`docs/security.md` §3).
 *
 * ## Why a hook and not field access
 *
 * `reviewStatus` uses a value-predicate `FieldAccess` and that works — but it
 * fails **silently**: the field is stripped and the request returns 200 with the
 * value quietly unchanged. For the single most consequential action on the site,
 * a silent no-op is the wrong answer; an editor who is told "forbidden" learns
 * the rule, and a reporter cannot mistake a stripped write for a successful one.
 * So this throws, with a Bengali message.
 *
 * ## Only the transition INTO `published` is blocked
 *
 * `beforeChange` receives the incoming data **merged with the existing
 * document**, so `data._status` is `'published'` on *every* later save of an
 * already-published article — including a reporter fixing a typo. Comparing
 * against `originalDoc` means the guard fires only on the actual transition,
 * which is the action being forbidden. (Whether a reporter should be able to
 * edit a live article at all is a separate, pre-existing question.)
 */
/**
 * The `context` key that marks a write as **programmatic** — the seed, a cron
 * sweep, any server-side operation that publishes without a human session.
 *
 * Why `context` and not the `overrideAccess` flag: Payload forwards
 * `overrideAccess` to **field-level** `beforeChange` hooks but **not** to
 * collection-level ones (verified in `payload@3.89.0`,
 * `dist/collections/operations/create.js` builds the collection-hook args from
 * `{ collection, context, data, operation, originalDoc, req }` only). `context`
 * *is* forwarded — `createLocalReq` merges it onto `req.context`, which the
 * collection hook receives.
 *
 * This is not attacker-controllable: `req.context` for an HTTP request is
 * initialised by Payload's core and is never populated from a body, query or
 * header (verified: the express/REST layer never assigns it). Only our own
 * server-side code can set it.
 */
export const PROGRAMMATIC_CONTEXT = 'shikkhaProgrammaticWrite' as const

export const guardPublishStatus: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  if (!data) return data

  // A trusted programmatic write (the seeds). This gate exists to stop a
  // *reader session* skipping review; a write flagged as programmatic is the
  // server itself acting, not a user — and without it the demo seed could never
  // publish, so CI could never build a real site.
  if (req.context?.[PROGRAMMATIC_CONTEXT]) return data

  // Editors and above may publish; that is the review step.
  if (isEditorUser(req.user)) return data

  const next = (data as { _status?: string })._status
  const previous = (originalDoc as { _status?: string } | undefined)?._status

  if (next === 'published' && previous !== 'published') {
    throw new APIError('সংবাদ প্রকাশ করা যায় শুধু সম্পাদকের অনুমোদনের পর।', 403)
  }

  return data
}
