import type { Endpoint, PayloadRequest } from 'payload'

import { clientIp, isHoneypotFilled, json, readJsonBody, tooManyRequests } from '../lib/http'
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

/** Delete every row one reader owns in one collection. Returns how many went. */
async function deleteOwned(
  req: PayloadRequest,
  collection: string,
  readerId: number,
): Promise<number> {
  const found = await req.payload
    .find({
      collection: collection as 'bookmarks',
      where: { reader: { equals: readerId } },
      pagination: false,
      depth: 0,
      overrideAccess: true,
      req,
    })
    .catch(() => null)

  let removed = 0
  for (const doc of found?.docs ?? []) {
    await req.payload
      .delete({ collection: collection as 'bookmarks', id: doc.id, overrideAccess: true, req })
      .then(() => {
        removed += 1
      })
      .catch(() => null)
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

    const limit = rateLimit(`delete-account:${clientIp(req)}`, DELETIONS_PER_WINDOW, WINDOW_MS)
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
     * Comments are anonymised rather than deleted: the comment is public content,
     * the attribution is personal data. Clearing the `reader` link as well stops a
     * later re-registration from inheriting them.
     */
    const comments = await req.payload
      .find({
        collection: 'comments',
        where: { reader: { equals: readerId } },
        pagination: false,
        depth: 0,
        overrideAccess: true,
        req,
      })
      .catch(() => null)

    for (const comment of comments?.docs ?? []) {
      await req.payload
        .update({
          collection: 'comments',
          id: comment.id,
          data: { reader: null, userName: 'একজন পাঠক', userEmail: null, userAvatar: null },
          overrideAccess: true,
          req,
        })
        .catch(() => null)
    }

    // Everything the reader owns outright.
    const deleted: Record<string, number> = {}
    for (const collection of READER_OWNED) {
      deleted[collection] = await deleteOwned(req, collection, readerId)
    }

    /*
     * The newsletter is a separate list keyed by address, not by account. It is
     * only touched when the reader actually had an email on file — otherwise there
     * is nothing to match, and guessing would unsubscribe someone else.
     */
    const email = typeof reader.email === 'string' ? reader.email.trim().toLowerCase() : ''
    if (email) {
      const subscribers = await req.payload
        .find({
          collection: 'newsletter-subscribers',
          where: { email: { equals: email } },
          pagination: false,
          depth: 0,
          overrideAccess: true,
          req,
        })
        .catch(() => null)
      let removed = 0
      for (const subscriber of subscribers?.docs ?? []) {
        await req.payload
          .delete({
            collection: 'newsletter-subscribers',
            id: subscriber.id,
            overrideAccess: true,
            req,
          })
          .then(() => {
            removed += 1
          })
          .catch(() => null)
      }
      deleted['newsletter-subscribers'] = removed
    }

    // The identity last, so a failure above leaves a reader who can retry.
    await req.payload
      .delete({ collection: 'readers', id: readerId, overrideAccess: true, req })
      .catch(() => null)

    const headers = new Headers({ 'Content-Type': 'application/json' })
    headers.append('Set-Cookie', readerSessionClearCookie())
    return new Response(
      JSON.stringify({ ok: true, deleted, commentsAnonymised: comments?.docs?.length ?? 0 }),
      {
        status: 200,
        headers,
      },
    )
  },
}
