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
 * `POST /api/citizen/submit` — reader-submitted news tips.
 *
 * ## Why a custom endpoint
 *
 * `docs/security.md` §7 requires "per-IP throttle + a challenge" for the contact
 * and citizen-journalism forms, and the generated `POST /api/citizen-submissions`
 * route can do neither — it would also let a caller set `status: 'published'`,
 * which is an editorial decision, not a reader one.
 *
 * ## The guards, in order
 *
 * 1. **Honeypot** (`company`) — a filled one returns a normal-looking success
 *    **without writing**, so a bot gets no signal that it was caught.
 * 2. **Rate limit** — 3 submissions per IP per 10 minutes. Far tighter than the
 *    poll's 20/minute because each accepted submission costs an editor's time,
 *    and because a tip form is a far more attractive spam target than a poll.
 * 3. **Length and field validation** — a submission with no body, or a body
 *    beyond the column's limit, is refused before it reaches the database.
 *
 * ## What is deliberately NOT here
 *
 * No CAPTCHA. Every free CAPTCHA needs a third-party script on the page, which
 * costs the data-saver and initial-payload budgets, and reCAPTCHA needs an
 * account. The honeypot plus a tight per-IP limit is what the security plan
 * specifies, and it is what a small site actually needs.
 */

/** Submissions per IP per window. */
const SUBMISSIONS_PER_WINDOW = 3
const WINDOW_MS = 10 * 60 * 1000

/** Matches `CitizenSubmissions.body.maxLength`. */
const MAX_BODY_LENGTH = 5000

export const citizenSubmitEndpoint: Endpoint = {
  path: '/citizen/submit',
  method: 'post',
  handler: async (req: PayloadRequest): Promise<Response> => {
    const body = await readJsonBody(req)

    // 1 — honeypot. Silent success, no write.
    if (isHoneypotFilled(body)) {
      return json({ ok: true })
    }

    // 2 — rate limit.
    const limit = rateLimit(`citizen-submit:${clientIp(req)}`, SUBMISSIONS_PER_WINDOW, WINDOW_MS)
    if (!limit.ok) {
      return tooManyRequests(limit.retryAfterSeconds)
    }

    // 3 — validation.
    const title = text(body.title, 200)
    const details = text(body.body, MAX_BODY_LENGTH)
    const reporterName = text(body.reporterName, 120)
    const reporterEmail = text(body.reporterEmail, 200)
    const reporterPhone = text(body.reporterPhone, 40)

    if (!title || !details || !reporterName || !reporterEmail) {
      return json({ error: 'শিরোনাম, বিবরণ, নাম ও ইমেইল পূরণ করুন।' }, 400)
    }
    if (!EMAIL_PATTERN.test(reporterEmail)) {
      return json({ error: 'সঠিক ইমেইল ঠিকানা লিখুন।' }, 400)
    }

    const districtId = Number(body.district)
    const hasDistrict = Number.isInteger(districtId) && districtId > 0

    try {
      await req.payload.create({
        collection: 'citizen-submissions',
        data: {
          title,
          body: details,
          reporterName,
          reporterEmail,
          ...(reporterPhone ? { reporterPhone } : {}),
          ...(hasDistrict ? { district: districtId } : {}),
          status: 'new',
        },
        overrideAccess: true,
        req,
      })
    } catch {
      return json({ error: 'জমা দেওয়া যায়নি। আবার চেষ্টা করুন।' }, 500)
    }

    // A submission is a queue entry, never a publication — so the reader is told
    // exactly that, and is not promised a story.
    return json({ ok: true })
  },
}
