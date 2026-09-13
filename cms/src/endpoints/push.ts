import { timingSafeEqual } from 'node:crypto'
import type { Endpoint, PayloadRequest } from 'payload'

import { clientIp, json, readJsonBody, text, tooManyRequests } from '../lib/http'
import { isPushConfigured, sendPush, vapidPublicKey } from '../lib/push'
import { rateLimit } from '../lib/rate-limit'
import type { PushSubscription } from '../payload-types'

/**
 * One stored reminder, taken from the generated type rather than restated.
 *
 * Restating it by hand is how the `remindAt: string | null` mismatch happened:
 * the field is `required`, so the generated type has no `null`, while a
 * hand-written interface happily allowed one.
 */
type StoredReminder = NonNullable<PushSubscription['reminders']>[number]

/**
 * Push endpoints — `/api/push/*`.
 *
 * ## Four narrow operations, not the generated REST API
 *
 * `GET /api/push-subscriptions` must never be reader-reachable: a subscription
 * endpoint plus its two keys is enough to push to that browser. So the
 * collection is admin-read only and readers act through these routes, which key
 * on the **endpoint string the browser presents** rather than a row id — an id
 * would be enumerable and would let anyone unsubscribe anyone.
 *
 * ## The sweep is the N7 delivery mechanism
 *
 * A reminder is stored on the subscription with a `remindAt`, and the sweep
 * sends everything due and marks it notified. `docs/education-feature-inventory.md`
 * §4 makes N7 the mechanism that turns one-off result-day traffic into a
 * returning audience, so this is the part that has to be reliable.
 *
 * Like the newsletter send it is a **resumable batch** triggered by a token, not
 * a background timer: the owner's scheduler is cPanel cron, and there is no
 * in-process scheduler that would survive a restart.
 *
 * ## A dead subscription is deleted, not retried
 *
 * A browser that revoked permission answers 404/410 forever. Keeping the row
 * would mean every future sweep wastes a request on it and the counters drift,
 * so `gone` deletes.
 */

/** Subscription writes per IP per minute. */
const SUBSCRIBE_ATTEMPTS_PER_MINUTE = 10

/** Bounded so one sweep cannot run unbounded on a 2 GB host. */
const SWEEP_BATCH_SIZE = 200

/** Does the caller hold the cron token, or an editorial session? */
function isAuthorisedSweep(req: PayloadRequest): boolean {
  const expected = process.env.PUSH_SEND_TOKEN ?? ''
  if (expected.length === 0) return false

  const presented = req.headers.get('x-push-token') ?? ''
  if (presented.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(presented), Buffer.from(expected))
}

/**
 * `GET /api/push/key`
 *
 * The public VAPID key, for `pushManager.subscribe`. `enabled: false` when no
 * key pair is configured — the site reads this at **build** time, so the
 * reminder control is absent rather than broken.
 */
const key: Endpoint = {
  path: '/push/key',
  method: 'get',
  handler: async (): Promise<Response> =>
    json({ enabled: isPushConfigured(), publicKey: vapidPublicKey() }),
}

/**
 * `POST /api/push/subscribe`
 *
 * Body: `{ endpoint, keys: { p256dh, auth }, reminder?: { deadlineId, remindAt } }`.
 *
 * Idempotent on `endpoint`: a browser that reloads and re-subscribes updates its
 * own row rather than accumulating duplicates. An optional reminder is appended
 * on the same call, because a reader who taps "remind me" has just granted
 * permission and should not have to wait for a second round trip.
 */
const subscribe: Endpoint = {
  path: '/push/subscribe',
  method: 'post',
  handler: async (req: PayloadRequest): Promise<Response> => {
    const limit = rateLimit(
      `push-subscribe:${clientIp(req)}`,
      SUBSCRIBE_ATTEMPTS_PER_MINUTE,
      60_000,
    )
    if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds)

    if (!isPushConfigured()) {
      return json({ error: 'পুশ নোটিফিকেশন এখনো চালু হয়নি।' }, 503)
    }

    const body = await readJsonBody(req)
    const endpoint = text(body.endpoint, 2000)
    const keys = (body.keys ?? {}) as Record<string, unknown>
    const p256dh = text(keys.p256dh, 500)
    const auth = text(keys.auth, 500)

    if (!endpoint || !p256dh || !auth) {
      return json({ error: 'সাবস্ক্রিপশনের তথ্য অসম্পূর্ণ।' }, 400)
    }

    const reminderRaw = (body.reminder ?? null) as Record<string, unknown> | null
    const deadlineId = reminderRaw ? Number(reminderRaw.deadlineId) : Number.NaN
    const remindAt = reminderRaw ? text(reminderRaw.remindAt, 40) : null
    const hasReminder = Number.isInteger(deadlineId) && deadlineId > 0 && Boolean(remindAt)

    const existing = await req.payload
      .find({
        collection: 'push-subscriptions',
        where: { endpoint: { equals: endpoint } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
        req,
      })
      .catch(() => null)

    const current = existing?.docs?.[0] as
      | { id: number | string; reminders?: StoredReminder[] | null }
      | undefined

    // Only append a reminder the reader does not already have for that deadline,
    // so tapping twice cannot queue two identical notifications.
    const previous: StoredReminder[] = Array.isArray(current?.reminders) ? current.reminders : []

    const alreadyReminded = previous.some((item) => {
      const value = item.deadline
      const id = value !== null && typeof value === 'object' ? value.id : value
      return Number(id) === deadlineId
    })

    // `remindAt` is narrowed to a string here rather than asserted: the whole
    // `append` is empty unless both the id and the instant are usable.
    const append: StoredReminder[] =
      hasReminder && remindAt && !alreadyReminded
        ? [{ deadline: deadlineId, remindAt, notified: false }]
        : []

    const nextReminders: StoredReminder[] = [...previous, ...append]

    try {
      if (current) {
        await req.payload.update({
          collection: 'push-subscriptions',
          id: current.id,
          data: { p256dh, auth, reminders: nextReminders },
          overrideAccess: true,
          req,
        })
      } else {
        await req.payload.create({
          collection: 'push-subscriptions',
          data: { endpoint, p256dh, auth, reminders: nextReminders },
          overrideAccess: true,
          req,
        })
      }
    } catch {
      return json({ error: 'সাবস্ক্রিপশন সংরক্ষণ করা যায়নি।' }, 500)
    }

    return json({ ok: true, reminders: nextReminders.length })
  },
}

/**
 * `POST /api/push/unsubscribe`
 *
 * Body: `{ endpoint }`. Deletes the row outright rather than flagging it — a
 * revoked permission leaves nothing worth keeping, and retaining it would be
 * retaining a capability the reader asked us to drop.
 */
const unsubscribe: Endpoint = {
  path: '/push/unsubscribe',
  method: 'post',
  handler: async (req: PayloadRequest): Promise<Response> => {
    const body = await readJsonBody(req)
    const endpoint = text(body.endpoint, 2000)
    if (!endpoint) return json({ error: 'সাবস্ক্রিপশন শনাক্ত করা যায়নি।' }, 400)

    const found = await req.payload
      .find({
        collection: 'push-subscriptions',
        where: { endpoint: { equals: endpoint } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
        req,
      })
      .catch(() => null)

    const row = found?.docs?.[0] as { id: number | string } | undefined
    if (row) {
      await req.payload
        .delete({ collection: 'push-subscriptions', id: row.id, overrideAccess: true, req })
        .catch(() => null)
    }

    // Idempotent: a second call succeeds, because the reader's intent is met.
    return json({ ok: true })
  },
}

/**
 * `POST /api/push/sweep`
 *
 * Sends every reminder that is due, then marks it notified. Authorised by
 * `PUSH_SEND_TOKEN` via the `x-push-token` header — a shared secret rather than
 * a signed request because the caller is a cPanel cron job on the same host.
 * With no token configured the endpoint is **disabled**, not open.
 */
const sweep: Endpoint = {
  path: '/push/sweep',
  method: 'post',
  handler: async (req: PayloadRequest): Promise<Response> => {
    if (!isAuthorisedSweep(req)) return json({ error: 'অনুমতি নেই।' }, 403)
    if (!isPushConfigured()) return json({ error: 'পুশ নোটিফিকেশন চালু হয়নি।' }, 503)

    const now = Date.now()

    const found = await req.payload.find({
      collection: 'push-subscriptions',
      limit: SWEEP_BATCH_SIZE,
      depth: 1,
      overrideAccess: true,
      req,
    })

    const subscriptions = found.docs as Array<{
      id: number | string
      endpoint: string
      p256dh: string
      auth: string
      reminders?: Array<{
        id?: string
        deadline?: { id?: number; title?: string; dateEnd?: string } | number
        remindAt?: string
        notified?: boolean
      }> | null
    }>

    let sent = 0
    let due = 0
    let removed = 0
    const errors: string[] = []

    for (const subscription of subscriptions) {
      const reminders = Array.isArray(subscription.reminders) ? subscription.reminders : []

      // Only the reminders that are due and not yet sent.
      const pending = reminders.filter(
        (reminder) =>
          !reminder.notified && reminder.remindAt && new Date(reminder.remindAt).getTime() <= now,
      )
      if (pending.length === 0) continue
      due += pending.length

      let dead = false

      for (const reminder of pending) {
        const deadline =
          reminder.deadline && typeof reminder.deadline === 'object' ? reminder.deadline : null

        const outcome = await sendPush(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          {
            title: deadline?.title ?? 'সময়সীমা ঘনিয়ে এসেছে',
            body: 'আপনার সংরক্ষিত সময়সীমার তারিখ نزدিকটে। বিস্তারিত দেখুন।',
            // Opened from the notification; the service worker passes this on.
            url: '/deadlines',
          },
        )

        if (outcome.status === 'sent') {
          sent += 1
        } else if (outcome.status === 'gone') {
          // Permission revoked — the row is a capability nobody can use.
          await req.payload
            .delete({
              collection: 'push-subscriptions',
              id: subscription.id,
              overrideAccess: true,
              req,
            })
            .catch(() => null)
          removed += 1
          dead = true
          break
        } else {
          errors.push(outcome.error)
        }
      }

      // Mark what actually went out. `dead` skips the write entirely — the row
      // is already gone, and updating it would recreate nothing.
      if (dead) continue

      const sentIds = new Set(pending.map((reminder) => reminder.id))
      await req.payload
        .update({
          collection: 'push-subscriptions',
          id: subscription.id,
          data: {
            reminders: reminders.map((reminder) =>
              sentIds.has(reminder.id) ? { ...reminder, notified: true } : reminder,
            ),
          },
          overrideAccess: true,
          req,
        })
        .catch(() => null)
    }

    return json({
      due,
      sent,
      removed,
      subscriptions: subscriptions.length,
      ...(errors.length > 0 ? { error: errors[0] } : {}),
    })
  },
}

export const pushEndpoints: Endpoint[] = [key, subscribe, unsubscribe, sweep]
