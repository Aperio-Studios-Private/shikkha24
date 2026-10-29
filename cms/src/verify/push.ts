/**
 * S9 push verification — `pnpm --filter @shikkha24/cms verify:push`
 *
 * ## What can and cannot be verified here
 *
 * The owner has not generated a VAPID key pair yet, so **a real notification
 * cannot be delivered** and this harness does not pretend otherwise. What it
 * does verify is everything that decides whether a notification *would* go out,
 * which is where the bugs live:
 *
 *   - the feature is inert until all three VAPID values are present
 *   - `subscribe` refuses an incomplete subscription and deduplicates a reminder
 *     the reader already has (otherwise tapping twice queues two notifications)
 *   - the sweep is **closed** without its token, and closed again with a wrong
 *     one — an endpoint that can push to every subscriber must not be reachable
 *     by accident
 *   - a delivered reminder is marked notified, so the next sweep does not resend
 *   - a **410/404 subscription is deleted**, which is the behaviour that keeps
 *     the table from filling with browsers that revoked permission
 *
 * `webpush.sendNotification` is replaced for the sweep cases. Everything else —
 * the real handler, the real rate limiter, the real database — runs.
 *
 * ## It must run with the dev server STOPPED (schema-push collision).
 */

import { getPayload, type PayloadRequest } from 'payload'
import webpush from 'web-push'
import { pushEndpoints } from '../endpoints/push'
import { isPushConfigured, resetPushConfig, sendPush } from '../lib/push'
import config from '../payload.config'

const payload = await getPayload({ config })

let failures = 0
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

const created: Array<{ collection: string; id: number | string }> = []

/** Slug-agnostic handle — Payload's overloads cannot type a union slug. */
const db = payload as unknown as {
  delete(args: Record<string, unknown>): Promise<unknown>
}

function req(body: unknown, ip: string, headers: Record<string, string> = {}): PayloadRequest {
  return {
    payload,
    headers: new Headers({ 'x-forwarded-for': ip, 'content-type': 'application/json', ...headers }),
    json: async () => body,
  } as unknown as PayloadRequest
}

async function post(
  endpoint: { handler: (r: PayloadRequest) => Promise<Response> | Response },
  body: unknown,
  ip: string,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await endpoint.handler(req(body, ip, headers))
  const parsed = (await response.json().catch(() => ({}))) as Record<string, unknown>
  return { status: response.status, body: parsed }
}

const key = pushEndpoints.find((e) => e.path === '/push/key')
const subscribe = pushEndpoints.find((e) => e.path === '/push/subscribe')
const unsubscribe = pushEndpoints.find((e) => e.path === '/push/unsubscribe')
const sweep = pushEndpoints.find((e) => e.path === '/push/sweep')

if (!key || !subscribe || !unsubscribe || !sweep) {
  console.error('Push endpoints are not registered — check payload.config.ts.')
  process.exit(1)
}

/* ── unconfigured ──────────────────────────────────────────────────────────── */

console.log('\n── inert until configured ──────────────────────────────────────')

delete process.env.VAPID_PUBLIC_KEY
delete process.env.VAPID_PRIVATE_KEY
delete process.env.VAPID_SUBJECT
resetPushConfig()

check('isPushConfigured() is false with no VAPID env', isPushConfigured() === false)

const keyResponse = await key.handler(req({}, '10.3.0.1') as PayloadRequest)
const keyBody = (await keyResponse.json()) as { enabled?: boolean; publicKey?: string | null }
check('the key endpoint reports disabled', keyBody.enabled === false)
check('the key endpoint exposes no key', keyBody.publicKey === null)

const inertSubscribe = await post(
  subscribe,
  { endpoint: 'https://fcm.googleapis.com/fcm/send/verify-1', keys: { p256dh: 'a', auth: 'b' } },
  '10.3.0.2',
)
check(
  'subscribe is refused with 503 while unconfigured',
  inertSubscribe.status === 503,
  `status=${inertSubscribe.status}`,
)

const inertSend = await sendPush(
  { endpoint: 'https://fcm.googleapis.com/fcm/send/verify-1', keys: { p256dh: 'a', auth: 'b' } },
  { title: 'x' },
)
check('sendPush reports failure rather than throwing', inertSend.status === 'failed')

/* ── configured ────────────────────────────────────────────────────────────── */

console.log('\n── subscribe ───────────────────────────────────────────────────')

// A real, well-formed key pair, generated locally. Nothing leaves this process:
// the transport is stubbed below and no push service is contacted.
const vapid = webpush.generateVAPIDKeys()
process.env.VAPID_PUBLIC_KEY = vapid.publicKey
process.env.VAPID_PRIVATE_KEY = vapid.privateKey
process.env.VAPID_SUBJECT = 'mailto:verify@shikkha24.com'
resetPushConfig()

check('isPushConfigured() is true with a generated pair', isPushConfigured() === true)

const stamp = Date.now()
// Allowlisted host (pentest L3): subscribe rejects non-provider URLs. The
// sweep is not invoked here, so nothing is actually dialled.
const endpoint = `https://fcm.googleapis.com/fcm/send/s9-verify-${stamp}`

const incomplete = await post(subscribe, { endpoint, keys: { p256dh: 'a' } }, '10.3.1.1')
check(
  'an incomplete subscription is refused',
  incomplete.status === 400,
  `status=${incomplete.status}`,
)

const deadline = await payload.find({ collection: 'deadlines', limit: 2, overrideAccess: true })
const deadlineId = deadline.docs[0]?.id
const otherDeadlineId = deadline.docs[1]?.id
if (!deadlineId || !otherDeadlineId) {
  console.error('Need at least two deadlines — run `pnpm seed && pnpm seed:demo` first.')
  process.exit(1)
}

const past = new Date(Date.now() - 60_000).toISOString()

const first = await post(
  subscribe,
  {
    endpoint,
    keys: { p256dh: 'verify-p256dh', auth: 'verify-auth' },
    reminder: { deadlineId, remindAt: past },
  },
  '10.3.1.2',
)
check('a valid subscription is accepted', first.status === 200, `status=${first.status}`)
check(
  'the first reminder is stored',
  first.body.reminders === 1,
  `reminders=${first.body.reminders}`,
)

const again = await post(
  subscribe,
  {
    endpoint,
    keys: { p256dh: 'verify-p256dh', auth: 'verify-auth' },
    reminder: { deadlineId, remindAt: past },
  },
  '10.3.1.3',
)
check(
  'the same reminder is not queued twice',
  again.body.reminders === 1,
  `reminders=${again.body.reminders}`,
)

const rows = await payload.find({
  collection: 'push-subscriptions',
  where: { endpoint: { equals: endpoint } },
  depth: 0,
  overrideAccess: true,
})
const row = rows.docs[0] as { id: number | string } | undefined
if (row) created.push({ collection: 'push-subscriptions', id: row.id })
check('re-subscribing updates one row rather than adding another', rows.totalDocs === 1)

/* ── the sweep ─────────────────────────────────────────────────────────────── */

console.log('\n── sweep ──────────────────────────────────────────────────────')

delete process.env.PUSH_SEND_TOKEN
const noToken = await post(sweep, {}, '10.3.2.1')
check(
  'the sweep refuses an unauthenticated call',
  noToken.status === 403,
  `status=${noToken.status}`,
)

process.env.PUSH_SEND_TOKEN = 'verify-push-token'
const wrongToken = await post(sweep, {}, '10.3.2.2', { 'x-push-token': 'nope' })
check('the sweep refuses a wrong token', wrongToken.status === 403, `status=${wrongToken.status}`)

// Replace the transport. `sendNotification` is the only thing stubbed.
type SendArgs = [unknown, string, unknown]
const calls: string[] = []
let simulateGone = false

;(
  webpush as unknown as { sendNotification: (...args: SendArgs) => Promise<unknown> }
).sendNotification = async (_subscription, payloadText) => {
  calls.push(payloadText)
  if (simulateGone) {
    throw Object.assign(new Error('subscription gone'), { statusCode: 410 })
  }
  return { statusCode: 201 }
}

const delivered = await post(sweep, {}, '10.3.2.3', { 'x-push-token': 'verify-push-token' })
check('the sweep runs with the right token', delivered.status === 200, `status=${delivered.status}`)
check('a due reminder was sent', delivered.body.sent === 1, `sent=${delivered.body.sent}`)

const afterSweep = await payload.findByID({
  collection: 'push-subscriptions',
  id: row?.id ?? 0,
  depth: 0,
  overrideAccess: true,
})
const reminders = (afterSweep as { reminders?: Array<{ notified?: boolean }> }).reminders ?? []
check(
  'the reminder is marked notified',
  reminders.every((r) => r.notified === true),
)

const resent = await post(sweep, {}, '10.3.2.4', { 'x-push-token': 'verify-push-token' })
check(
  'a second sweep does not resend a notified reminder',
  resent.body.sent === 0,
  `sent=${resent.body.sent}`,
)

/**
 * Re-tapping after the reminder has fired is still deduplicated.
 *
 * This is a product decision, not an accident: one reminder per deadline per
 * subscription. A reader who taps again has not asked for a second notification
 * — they have probably just forgotten they already asked. Verified explicitly
 * because it was the one behaviour the first draft of this harness got wrong.
 */
const retap = await post(
  subscribe,
  {
    endpoint,
    keys: { p256dh: 'verify-p256dh', auth: 'verify-auth' },
    reminder: { deadlineId, remindAt: past },
  },
  '10.3.2.7',
)
check(
  're-tapping a fired reminder does not queue a duplicate',
  retap.body.reminders === 1,
  `reminders=${retap.body.reminders}`,
)

// A browser that revoked permission answers 410 forever.
simulateGone = true

/**
 * A **second, different** deadline is used here on purpose.
 *
 * Re-tapping the same deadline is deduplicated above — one reminder per deadline
 * per subscription, whether or not it has already fired. That is the intended
 * product behaviour, so reaching the dead-subscription path needs a reminder
 * that is genuinely new.
 */
const second = await post(
  subscribe,
  {
    endpoint,
    keys: { p256dh: 'verify-p256dh', auth: 'verify-auth' },
    reminder: { deadlineId: otherDeadlineId, remindAt: past },
  },
  '10.3.2.5',
)
check(
  'a reminder for a different deadline is queued',
  second.body.reminders === 2,
  `reminders=${second.body.reminders}`,
)

const goneSweep = await post(sweep, {}, '10.3.2.6', { 'x-push-token': 'verify-push-token' })
check(
  'the sweep reports the dead subscription',
  goneSweep.body.removed === 1,
  `removed=${goneSweep.body.removed}`,
)

const goneRows = await payload.find({
  collection: 'push-subscriptions',
  where: { endpoint: { equals: endpoint } },
  overrideAccess: true,
})
check(
  'the revoked subscription row was deleted',
  goneRows.totalDocs === 0,
  `rows=${goneRows.totalDocs}`,
)

/* ── cleanup ───────────────────────────────────────────────────────────────── */

console.log('\n── cleanup ─────────────────────────────────────────────────────')

for (const { collection, id } of created) {
  await db.delete({ collection, id, overrideAccess: true }).catch(() => null)
}

const leftover = await payload.find({
  collection: 'push-subscriptions',
  where: { endpoint: { like: `s9-verify-${stamp}` } },
  overrideAccess: true,
})
check(
  'every test subscription was removed',
  leftover.totalDocs === 0,
  `remaining=${leftover.totalDocs}`,
)

void unsubscribe

console.log(`\n${failures === 0 ? '✅ all checks passed' : `❌ ${failures} check(s) failed`}\n`)
process.exit(failures === 0 ? 0 : 1)
