import type { Endpoint, PayloadRequest, Where } from 'payload'

import { isHoneypotFilled, json, readJsonBody, requireClientIp, tooManyRequests } from '../lib/http'
import { rateLimit } from '../lib/rate-limit'
import { readerIdFromRequest, readerSessionClearCookie } from '../lib/reader-session'

/**
 * `POST /api/readers/delete-account` — the reader's own erasure.
 *
 * ## Why this exists
 *
 * The privacy policy promised that a reader could have their data deleted, and the
 * only route to it was emailing the newsroom. A promise a reader cannot exercise
 * without writing an email is weaker than it reads, and on a site about
 * scholarships and admissions the data in question — what someone is applying for
 * — is exactly what they might want gone.
 *
 * ⚠️ **Mounted on the `readers` collection, not at the API root.** `/readers/…` at
 * the root would be claimed by the collection's generated route and this handler
 * would never be reached (the `/api/comments/submit` lesson).
 *
 * ## What is deleted, and what is only anonymised
 *
 * | Data | What happens | Why |
 * |---|---|---|
 * | the reader row (display name, avatar, provider id, email, push subscriptions) | **deleted** | it is the identity |
 * | `bookmarks`, `saved-deadlines`, `push-subscriptions` | **deleted** | they are the reader's own rows, and a bookmark list is a readable signal of what someone is applying for |
 * | `reactions` rows carrying the reader | **deleted** | the row is theirs; the anonymous fingerprint rows are untouched |
 * | their `comments` | **anonymised** | a published comment is part of the public record. The row survives; the byline and any email are replaced, and the `reader` link is cleared |
 * | their `newsletter-subscribers` row | **deleted** | if the reader had an email on file and it matches a subscription |
 *
 * ⚠️ **What cannot be deleted, and why that is not a gap.** Poll votes and
 * anonymous reactions are keyed by a **one-way HMAC of IP + user agent**, with no
 * reader link — that is deliberate, so the rows cannot be joined back to a person
 * even by us. There is nothing to erase because nothing identifies them.
 *
 * ## Guards
 *
 * 1. **A reader session is required.** There is no way to delete someone else's
 *    account: the id comes from the signed cookie, never from the body.
 * 2. **A confirmation string in the body.** The action is irreversible and there
 *    is no undo, so a stray request must not be enough. Payload's `csrf` allow-list
 *    already blocks a cross-origin form post; this makes an accidental one harmless
 *    too.
 * 3. **Rate limit** — a handful per hour, which no honest reader reaches.
 */

/** Deletions per IP per window. Irreversible, so this is deliberately small. */
const DELETIONS_PER_WINDOW = 3
const WINDOW_MS = 60 * 60 * 1000

/** The exact string the client must send. Not a secret — a speed bump. */
const CONFIRMATION = 'DELETE'

/** Every collection whose rows belong to one reader. */
const READER_OWNED = ['bookmarks', 'saved-deadlines', 'reactions', 'push-subscriptions'] as const

/** Collections this endpoint erases, keyed by the slugs Payload's local API takes. */
type ErasableCollection = (typeof READER_OWNED)[number] | 'comments' | 'newsletter-subscribers'

/**
 * A step of the erasure failed. Carries the step and the underlying reason so the
 * handler can answer 500 with something an operator can act on, and so the reader
 * can safely run the whole request again.
 */
class ErasureFailed extends Error {
  constructor(
    readonly step: string,
    cause: unknown,
  ) {
    super(cause instanceof Error ? cause.message : String(cause))
    this.name = 'ErasureFailed'
  }
}

/**
 * Run one erasure step, converting any failure into `ErasureFailed`.
 *
 * ⚠️ **Nothing in this file may `.catch(() => null)` an erasure step.** That was
 * the defect: every lookup, anonymisation, delete and the final reader delete
 * suppressed its own error, so a partial erasure answered HTTP 200 and the reader
 * was told their data was gone while identifying rows survived. Worse, if the
 * reader row went while an anonymisation had failed, the failure became
 * *unretryable* — the old reader id no longer resolves, so the remaining rows can
 * no longer be found by the session that owned them (T-64).
 *
 * @param step Human-readable step name, echoed in the failure and the response.
 */
async function required<T>(step: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (error) {
    throw new ErasureFailed(step, error)
  }
}

/**
 * Delete every row one reader owns in one collection. Returns how many went.
 *
 * The find and the delete are both mandatory: a find that silently returns
 * nothing is indistinguishable from "there was nothing to delete", and a delete
 * that silently does nothing leaves a row carrying the reader's link. Either one
 * aborts the whole erasure with `ErasureFailed` so the reader row stays and the
 * request can be retried.
 */
async function deleteOwned(
  req: PayloadRequest,
  collection: ErasableCollection,
  where: Where,
): Promise<number> {
  const found = await required(`find ${collection}`, () =>
    req.payload.find({
      collection,
      where,
      pagination: false,
      depth: 0,
      overrideAccess: true,
      req,
    }),
  )

  let removed = 0
  for (const doc of found.docs) {
    await required(`delete ${collection}`, () =>
      req.payload.delete({ collection, id: doc.id, overrideAccess: true, req }),
    )
    removed += 1
  }
  return removed
}

export const deleteAccountEndpoint: Endpoint = {
  // Relative to the Readers collection slug → `/api/readers/delete-account`.
  path: '/delete-account',
  method: 'post',
  handler: async (req: PayloadRequest): Promise<Response> => {
    const readerId = readerIdFromRequest(req)
    if (!readerId) return json({ error: 'সাইন ইন করা নেই।' }, 401)

    const caller = requireClientIp(req)
    if ('error' in caller) return caller.error
    const limit = rateLimit(`delete-account:${caller.ip}`, DELETIONS_PER_WINDOW, WINDOW_MS)
    if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds)

    const body = await readJsonBody(req)
    if (isHoneypotFilled(body)) return json({ ok: true })

    if (body.confirm !== CONFIRMATION) {
      return json({ error: 'নিশ্চিতকরণটি মেলেনি।' }, 400)
    }

    const reader = await req.payload
      .findByID({ collection: 'readers', id: readerId, depth: 0, overrideAccess: true, req })
      .catch(() => null)
    if (!reader) return json({ error: 'সাইন ইন করা নেই।' }, 401)

    /*
     * ⚠️ **Everything below is atomic-or-explicit, and the reader row goes last.**
     *
     * The reader row is the only key that can find the rest: comments,
     * bookmarks, saved deadlines, reactions and push subscriptions are all
     * looked up by `reader: readerId`. Deleting it first (or deleting it anyway
     * after a failed step) would strand every remaining row with no usable
     * identity to retry from — data that is still identifying, and now
     * unreachable through the reader's own session. So a failure at any step
     * aborts before the identity is touched and answers a non-2xx the client can
     * act on (T-64).
     */
    const deleted: Record<string, number> = {}
    let commentsAnonymised = 0

    try {
      /*
       * Comments are anonymised rather than deleted: the comment is public content,
       * the attribution is personal data. Clearing the `reader` link as well stops a
       * later re-registration from inheriting them.
       */
      const comments = await required('find comments', () =>
        req.payload.find({
          collection: 'comments',
          where: { reader: { equals: readerId } },
          pagination: false,
          depth: 0,
          overrideAccess: true,
          req,
        }),
      )

      for (const comment of comments.docs) {
        await required('anonymise comment', () =>
          req.payload.update({
            collection: 'comments',
            id: comment.id,
            data: { reader: null, userName: 'একজন পাঠক', userEmail: null, userAvatar: null },
            overrideAccess: true,
            req,
          }),
        )
        commentsAnonymised += 1
      }

      // Everything the reader owns outright.
      for (const collection of READER_OWNED) {
        deleted[collection] = await deleteOwned(req, collection, {
          reader: { equals: readerId },
        })
      }

      /*
       * The newsletter is a separate list keyed by address, not by account. It is
       * only touched when the reader actually had an email on file — otherwise there
       * is nothing to match, and guessing would unsubscribe someone else.
       */
      const email = typeof reader.email === 'string' ? reader.email.trim().toLowerCase() : ''
      if (email) {
        deleted['newsletter-subscribers'] = await deleteOwned(req, 'newsletter-subscribers', {
          email: { equals: email },
        })
      }

      /*
       * The identity last — the one irreversible step. Reaching it proves every
       * dependent row above is confirmed gone, including the comment bylines that
       * would otherwise survive without a reader to find them by.
       */
      await required('delete reader', () =>
        req.payload.delete({ collection: 'readers', id: readerId, overrideAccess: true, req }),
      )
    } catch (error) {
      // The failure is named, not generalised: `step` says which part of the
      // erasure did not complete, and the reader is told plainly that their data
      // was NOT deleted, so a repeat of the same request is the correct action.
      const step = error instanceof ErasureFailed ? error.step : 'unknown'
      const reason = error instanceof ErasureFailed ? error.message : String(error)
      return json(
        {
          error: 'অ্যাকাউন্ট মুছে ফেলা যায়নি। আপনার তথ্য এখনো মুছে ফেলা হয়নি — আবার চেষ্টা করুন।',
          step,
          detail: reason.slice(0, 300),
        },
        500,
      )
    }

    const headers = new Headers({ 'Content-Type': 'application/json' })
    headers.append('Set-Cookie', readerSessionClearCookie())
    return new Response(
      JSON.stringify({ ok: true, deleted, commentsAnonymised: commentsAnonymised }),
      {
        status: 200,
        headers,
      },
    )
  },
}
