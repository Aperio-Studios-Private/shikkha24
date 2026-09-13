import type { Endpoint, PayloadRequest } from 'payload'

import {
  clientIp,
  EMAIL_PATTERN,
  isHoneypotFilled,
  json,
  readJsonBody,
  text,
  tooManyRequests,
} from '../lib/http'
import { rateLimit } from '../lib/rate-limit'

/**
 * `POST /api/comments/submit` — reader comments on an article.
 *
 * ⚠️ **This endpoint is mounted on the Comments collection, not at the root.**
 * The `path` below is therefore relative to the collection slug, and the
 * resolved public URL is `/api/comments/submit` either way.
 *
 * It must stay on the collection. A root endpoint whose first path segment
 * equals a collection slug is shadowed by that collection's generated REST
 * route: as a root endpoint, `/comments/submit` made Payload parse the request
 * as "collection `comments`, document id `submit`" — so this handler was never
 * reached and every reader comment returned `404 Route not found`. Collection
 * endpoints are matched before the collection's generated routes. See
 * `collections/Comments.ts` and `docs/security.md` §7.
 *
 * ## Why not the generated `POST /api/comments`
 *
 * `Comments.access.create` is `() => true`, because readers have no session —
 * and a public create route cannot rate limit, cannot honeypot, and cannot
 * validate that the `article` it is pointed at exists. The generated route
 * would accept an unbounded stream of rows naming any article id.
 *
 * ## Moderation cannot be forged
 *
 * The collection restricts `isApproved` to moderators at the **field** level,
 * but this handler writes with `overrideAccess: true` (it must — there is no
 * user to run access control against), which would bypass that restriction.
 * The protection is therefore structural rather than declarative: **the data
 * object below is built key by key from a whitelist**, so `isApproved` is
 * hard-set to `false` and a caller-supplied `isApproved: true` never reaches
 * the create call. Do not change this to spread the request body.
 *
 * ## Guards, in order
 *
 * 1. **Honeypot** (`company`) — silent success, no write.
 * 2. **Rate limit** — 5 comments per IP per 10 minutes. Generous enough for a
 *    reader replying to replies, tight enough that a script cannot fill the
 *    moderation queue.
 * 3. **Validation** — non-empty name and body, both inside their column limits,
 *    and an `article` that actually exists.
 *
 * No CAPTCHA: see `citizen.ts` for why (a third-party script costs the
 * data-saver budget, and every free CAPTCHA needs an account).
 */

/** Comments per IP per window. */
const COMMENTS_PER_WINDOW = 5
const WINDOW_MS = 10 * 60 * 1000

/** Match the collection's column limits so a write can never exceed them. */
const MAX_NAME_LENGTH = 80
const MAX_BODY_LENGTH = 2000

export const commentSubmitEndpoint: Endpoint = {
  // Relative to the Comments collection slug → `/api/comments/submit`.
  path: '/submit',
  method: 'post',
  handler: async (req: PayloadRequest): Promise<Response> => {
    const body = await readJsonBody(req)

    // 1 — honeypot. Silent success, no write, no signal to the bot.
    if (isHoneypotFilled(body)) {
      return json({ ok: true })
    }

    // 2 — rate limit.
    const limit = rateLimit(`comment-submit:${clientIp(req)}`, COMMENTS_PER_WINDOW, WINDOW_MS)
    if (!limit.ok) {
      return tooManyRequests(limit.retryAfterSeconds)
    }

    // 3 — validation.
    const userName = text(body.userName, MAX_NAME_LENGTH)
    const comment = text(body.body, MAX_BODY_LENGTH)
    const userEmail = text(body.userEmail, 200)

    if (!userName || !comment) {
      return json({ error: 'নাম ও মন্তব্য দুটোই লিখুন।' }, 400)
    }
    if (userEmail && !EMAIL_PATTERN.test(userEmail)) {
      return json({ error: 'সঠিক ইমেইল ঠিকানা লিখুন।' }, 400)
    }

    const articleId = Number(body.article)
    if (!Number.isInteger(articleId) || articleId <= 0) {
      return json({ error: 'সংবাদটি খুঁজে পাওয়া যায়নি।' }, 400)
    }

    // The relationship is a real foreign key, but `overrideAccess` means Payload
    // will not verify it. A comment attached to a nonexistent article is an
    // orphan row an editor can never resolve, so it is refused here.
    const article = await req.payload
      .find({
        collection: 'articles',
        where: { id: { equals: articleId } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
        req,
      })
      .catch(() => null)

    if (!article?.docs?.length) {
      return json({ error: 'সংবাদটি খুঁজে পাওয়া যায়নি।' }, 404)
    }

    try {
      await req.payload.create({
        collection: 'comments',
        // Whitelisted key by key — never a spread of `body`. See the file header.
        data: {
          article: articleId,
          userName,
          body: comment,
          ...(userEmail ? { userEmail } : {}),
          isApproved: false,
        },
        overrideAccess: true,
        req,
      })
    } catch {
      return json({ error: 'মন্তব্য পাঠানো যায়নি। আবার চেষ্টা করুন।' }, 500)
    }

    // Moderation is stated up front in the UI, so the reader is not left
    // wondering why their comment is not on the page.
    return json({ ok: true })
  },
}
