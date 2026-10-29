import { randomBytes, timingSafeEqual } from 'node:crypto'
import type { Endpoint, PayloadRequest } from 'payload'

import { sendCampaignBatch } from '../lib/campaign'
import {
  EMAIL_PATTERN,
  isHoneypotFilled,
  json,
  readJsonBody,
  requireClientIp,
  tooManyRequests,
} from '../lib/http'
import { isMailConfigured, sendMail } from '../lib/mailer'
import { rateLimit } from '../lib/rate-limit'

/**
 * Newsletter endpoints — `/api/newsletter/*`.
 *
 * ## Why custom endpoints rather than the generated REST API
 *
 * Every one of these is a **narrow operation on a public surface**, and the
 * generated routes are the opposite of narrow:
 *
 * - `POST /api/newsletter-subscribers` would let anyone write any field,
 *   including `isActive: true` — skipping double opt-in entirely.
 * - `GET /api/newsletter-subscribers` must never be reachable by a reader at all.
 *
 * So signup, confirm and unsubscribe each get exactly the one operation they
 * need, and nothing else is exposed.
 *
 * ## Three properties this file is careful about
 *
 * 1. **No address enumeration.** Subscribe answers identically whether the
 *    address is new, already pending, or already active. A form that says "this
 *    email is already subscribed" is an oracle for checking whether a given
 *    person reads this site.
 * 2. **A token, not an id.** Confirmation and unsubscribe both act on a random
 *    256-bit token, never on a subscriber id. Guessing is not a strategy, and a
 *    sequential id in a URL is an invitation.
 * 3. **Rate limited and honeypotted.** `docs/security.md` §7 requires
 *    "per-IP throttle + double opt-in" for signup; both are here. The honeypot
 *    returns a normal-looking success **without writing**, so a bot learns
 *    nothing.
 */

/** Attempts per IP per minute on signup. */
const SIGNUP_ATTEMPTS_PER_MINUTE = 5

/** Confirmation links expire after 3 days — long enough for a weekend inbox. */
const CONFIRMATION_TTL_MS = 3 * 24 * 60 * 60 * 1000

/**
 * Last-resort display name if the CMS settings read fails.
 *
 * ⚠️ A deliberate duplicate of `siteName` in `frontend/src/lib/cms.ts` and of
 * `const FALLBACK_TITLE` in `frontend/public/sw.js`. Three copies exist because
 * three runtimes read it — the frontend build, the Node CMS, and the service
 * worker — and none can import from another. `scripts/verify-site-name.mjs`
 * allow-lists all three and fails if they disagree, so they cannot rot apart.
 */
const FALLBACK_SITE_NAME = 'শিক্ষা২৪.কম'

function siteUrl(): string {
  return (process.env.NEWSLETTER_SITE_URL || 'https://shikkha24.com').replace(/\/$/, '')
}

/**
 * The portal's display name, for anything a **reader** receives.
 *
 * A confirmation email is as reader-visible as a web page: it lands in an inbox
 * the owner has no other way to update. Hardcoding the name here meant an admin
 * rename fixed the site and left every email saying the old one — and unlike a
 * stale web page, a stale email is already sitting in a subscriber's mailbox.
 *
 * Same CMS read as `endpoints/id-card.ts`. Falls back on any error because a
 * confirmation email must still be sent if the settings row is unreadable —
 * losing the double opt-in would silently break the consent record.
 */
async function siteNameFor(req: { payload: PayloadRequest['payload'] }): Promise<string> {
  try {
    const settings = await req.payload.findGlobal({
      slug: 'site-settings',
      depth: 0,
      overrideAccess: true,
    })
    const name = (settings.siteName as string | undefined)?.trim()
    return name || FALLBACK_SITE_NAME
  } catch {
    return FALLBACK_SITE_NAME
  }
}

/** A fresh, unguessable token. 32 bytes → 64 hex characters. */
function newToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * `POST /api/newsletter/subscribe`
 *
 * Body: `{ email: string, company?: string }` — `company` is the honeypot.
 */
const subscribe: Endpoint = {
  path: '/newsletter/subscribe',
  method: 'post',
  handler: async (req: PayloadRequest): Promise<Response> => {
    const body = await readJsonBody(req)

    // 1 — honeypot. Answer as though it worked; write nothing.
    if (isHoneypotFilled(body)) {
      return json({ ok: true })
    }

    // 2 — rate limit. Refuse header-less (direct-to-origin) callers outright.
    const caller = requireClientIp(req)
    if ('error' in caller) return caller.error
    const limit = rateLimit(`newsletter-subscribe:${caller.ip}`, SIGNUP_ATTEMPTS_PER_MINUTE, 60_000)
    if (!limit.ok) {
      return tooManyRequests(limit.retryAfterSeconds)
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!EMAIL_PATTERN.test(email)) {
      return json({ error: 'সঠিক ইমেইল ঠিকানা লিখুন।' }, 400)
    }

    // A configured transport is the feature's precondition. Without it, say so
    // rather than accepting an address that can never be mailed.
    if (!isMailConfigured()) {
      return json({ error: 'নিউজলেটার সেবা এখনো চালু হয়নি।' }, 503)
    }

    const existing = await req.payload
      .find({
        collection: 'newsletter-subscribers',
        where: { email: { equals: email } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
        req,
      })
      .catch(() => null)

    const current = existing?.docs?.[0] as
      | { id: number | string; isActive?: boolean | null }
      | undefined

    // Already confirmed — send nothing, and say the same thing as always.
    if (current?.isActive) return json({ ok: true })

    const token = newToken()
    const expiresAt = new Date(Date.now() + CONFIRMATION_TTL_MS).toISOString()

    try {
      if (current) {
        await req.payload.update({
          collection: 'newsletter-subscribers',
          id: current.id,
          data: { confirmationToken: token, confirmationExpiresAt: expiresAt },
          overrideAccess: true,
          req,
        })
      } else {
        await req.payload.create({
          collection: 'newsletter-subscribers',
          data: {
            email,
            isActive: false,
            subscribedAt: new Date().toISOString(),
            confirmationToken: token,
            confirmationExpiresAt: expiresAt,
            // Where the consent came from — kept as evidence of opt-in.
            consentSource: 'website-footer',
          },
          overrideAccess: true,
          req,
        })
      }
    } catch {
      // Never surface a database error to a public form. The reader can retry.
      return json({ error: 'সাবস্ক্রিপশন সম্পন্ন হয়নি। আবার চেষ্টা করুন।' }, 500)
    }

    const confirmUrl = `${siteUrl()}/newsletter/confirm?token=${token}`

    try {
      const siteName = await siteNameFor(req)

      await sendMail(req.payload, {
        to: email,
        subject: `${siteName} নিউজলেটার — সাবস্ক্রিপশন নিশ্চিত করুন`,
        text:
          `${siteName} নিউজলেটারে সাবস্ক্রাইব করার জন্য ধন্যবাদ।\n\n` +
          `নিচের লিংকে ক্লিক করে সাবস্ক্রিপশন নিশ্চিত করুন:\n${confirmUrl}\n\n` +
          `লিংকটি ৩ দিন পর্যন্ত কাজ করবে। আপনি যদি সাবস্ক্রাইব না করে থাকেন, এই ইমেইলটি উপেক্ষা করুন।`,
        html: `<p>${siteName} নিউজলেটারে সাবস্ক্রাইব করার জন্য ধন্যবাদ।</p>
<p><a href="${confirmUrl}" style="color:#DA1C25">সাবস্ক্রিপশন নিশ্চিত করুন</a></p>
<p style="color:#6b7280;font-size:13px">লিংকটি ৩ দিন পর্যন্ত কাজ করবে। আপনি যদি সাবস্ক্রাইব না করে থাকেন, এই ইমেইলটি উপেক্ষা করুন।</p>`,
      })
    } catch {
      // The row exists but the mail did not go out. Saying "check your inbox"
      // would be a lie, so report the failure and let the reader retry.
      return json({ error: 'নিশ্চিতকরণ ইমেইল পাঠানো যায়নি। আবার চেষ্টা করুন।' }, 502)
    }

    return json({ ok: true })
  },
}

/**
 * `POST /api/newsletter/confirm`
 *
 * Body: `{ token: string }`. Returns `{ ok: true }` or `{ ok: false }`.
 *
 * A `POST` rather than a `GET` so the token is not written into access logs,
 * referrer headers and browser history by the click itself.
 */
const confirm: Endpoint = {
  path: '/newsletter/confirm',
  method: 'post',
  handler: async (req: PayloadRequest): Promise<Response> => {
    const body = await readJsonBody(req)
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    if (!token) return json({ ok: false, error: 'লিংকটি সঠিক নয়।' }, 400)

    const found = await req.payload
      .find({
        collection: 'newsletter-subscribers',
        where: { confirmationToken: { equals: token } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
        req,
      })
      .catch(() => null)

    const subscriber = found?.docs?.[0] as
      | { id: number | string; confirmationExpiresAt?: string | null }
      | undefined

    if (!subscriber) return json({ ok: false, error: 'লিংকটি সঠিক নয়।' }, 404)

    const expires = subscriber.confirmationExpiresAt
      ? new Date(subscriber.confirmationExpiresAt).getTime()
      : 0
    if (!expires || expires < Date.now()) {
      return json({ ok: false, error: 'লিংকটির মেয়াদ শেষ হয়ে গেছে।' }, 410)
    }

    await req.payload.update({
      collection: 'newsletter-subscribers',
      id: subscriber.id,
      data: {
        isActive: true,
        confirmedAt: new Date().toISOString(),
        // The confirmation token is spent. The unsubscribe token is issued now
        // and is deliberately a different value — see the collection's comment.
        confirmationToken: null,
        confirmationExpiresAt: null,
        unsubscribeToken: newToken(),
      },
      overrideAccess: true,
      req,
    })

    return json({ ok: true })
  },
}

/**
 * `POST /api/newsletter/unsubscribe`
 *
 * Body: `{ token: string }`. Idempotent — a second click succeeds.
 */
const unsubscribe: Endpoint = {
  path: '/newsletter/unsubscribe',
  method: 'post',
  handler: async (req: PayloadRequest): Promise<Response> => {
    const body = await readJsonBody(req)
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    if (!token) return json({ ok: false, error: 'লিংকটি সঠিক নয়।' }, 400)

    const found = await req.payload
      .find({
        collection: 'newsletter-subscribers',
        where: { unsubscribeToken: { equals: token } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
        req,
      })
      .catch(() => null)

    const subscriber = found?.docs?.[0] as { id: number | string } | undefined
    if (!subscriber) return json({ ok: false, error: 'লিংকটি সঠিক নয়।' }, 404)

    await req.payload.update({
      collection: 'newsletter-subscribers',
      id: subscriber.id,
      data: { isActive: false, unsubscribedAt: new Date().toISOString() },
      overrideAccess: true,
      req,
    })

    return json({ ok: true })
  },
}

/**
 * `POST /api/newsletter/send`
 *
 * Body: `{ campaignId: number | string, token?: string }`.
 *
 * ## Why this endpoint exists at all
 *
 * A campaign cannot be sent in one pass — cPanel truncates silently past its
 * hourly cap, so the send is a **resumable batch** (`lib/campaign.ts`). Something
 * has to call it repeatedly, and the only scheduler the owner has is cPanel's own
 * cron. So the trigger is an HTTP call a cron job can make, not an admin button.
 *
 * ## Two ways to authorise it
 *
 * 1. **An authenticated super admin / editor-in-chief session** — `req.user`.
 * 2. **`NEWSLETTER_SEND_TOKEN`**, compared with a timing-safe equality.
 *
 * The token is a shared secret rather than a signed request because the caller is
 * a cron job on the same host, and because a signature scheme would need key
 * rotation the owner would have to operate by hand. With the token unset and no
 * session, the endpoint is **disabled** rather than open — an endpoint that can
 * mail the whole subscriber list must never be reachable by accident.
 *
 * The token may arrive in the body or in an `x-newsletter-token` header; the
 * header is preferred so it stays out of request-body logs.
 */
const send: Endpoint = {
  path: '/newsletter/send',
  method: 'post',
  handler: async (req: PayloadRequest): Promise<Response> => {
    const expected = process.env.NEWSLETTER_SEND_TOKEN ?? ''
    const body = await readJsonBody(req)
    const presented =
      req.headers.get('x-newsletter-token') ?? (typeof body.token === 'string' ? body.token : '')

    const isAdmin =
      req.user !== null &&
      req.user !== undefined &&
      Array.isArray((req.user as { roles?: unknown }).roles) &&
      ((req.user as { roles: string[] }).roles.includes('superAdmin') ||
        (req.user as { roles: string[] }).roles.includes('editorInChief'))

    const tokenMatches =
      expected.length > 0 &&
      presented.length === expected.length &&
      timingSafeEqual(Buffer.from(presented), Buffer.from(expected))

    if (!isAdmin && !tokenMatches) {
      return json({ error: 'অনুমতি নেই।' }, 403)
    }

    if (!isMailConfigured()) {
      return json({ error: 'নিউজলেটার সেবা এখনো চালু হয়নি।' }, 503)
    }

    const campaignId = body.campaignId
    if (typeof campaignId !== 'number' && typeof campaignId !== 'string') {
      return json({ error: 'ক্যাম্পেইন আইডি প্রয়োজন।' }, 400)
    }

    const result = await sendCampaignBatch(req.payload, campaignId)
    if (result.error && result.sent === 0) {
      return json({ error: result.error }, 502)
    }

    // 200 with the counts, so a cron log shows how far the campaign got.
    return json(result)
  },
}

/**
 * `GET /api/newsletter/status`
 *
 * A **diagnostic**, for the operator and the verification harness: it answers
 * "is this deployment actually able to send?" without attempting a real send.
 *
 * The site's signup form is gated on the build-time `PUBLIC_FLAG_NEWSLETTER`
 * flag rather than on this endpoint, deliberately. Fetching it on page load
 * would add a request to the CMS on every view of every page carrying the footer
 * form — and the form would pop in after paint, which is a layout shift against
 * the CLS budget. Enabling the flag is the operator's statement that SMTP is
 * configured; this endpoint is how that statement gets checked.
 */
const status: Endpoint = {
  path: '/newsletter/status',
  method: 'get',
  handler: async (): Promise<Response> =>
    json({
      enabled: isMailConfigured(),
      maxSendsPerHour: Number(process.env.NEWSLETTER_MAX_SENDS_PER_HOUR || 100),
      sendTriggerEnabled: Boolean(process.env.NEWSLETTER_SEND_TOKEN),
    }),
}

export const newsletterEndpoints: Endpoint[] = [subscribe, confirm, unsubscribe, send, status]
