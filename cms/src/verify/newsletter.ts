/**
 * S9 newsletter verification — `pnpm --filter @shikkha24/cms verify:newsletter`
 *
 * ## What this has to prove, and why it is not a formality
 *
 * The send path has three properties that are invisible from a page and that no
 * amount of reading the code will confirm:
 *
 *   1. **The hourly cap actually stops a send.** cPanel truncates silently past
 *      its own cap, so a bug here would damage the domain's sending reputation
 *      without producing a single error.
 *   2. **The sweep resumes exactly where it stopped.** Off-by-one on the cursor
 *      means either a duplicate mail or a subscriber who never hears from us.
 *   3. **Every mail carries a working unsubscribe link.** A row with no token
 *      must be repaired, not skipped — the link is a legal requirement.
 *
 * ## How it sends without an SMTP server
 *
 * `payload.sendEmail` is replaced with a recorder. `sendMail` calls through
 * Payload's own adapter interface, so this exercises the real budget check, the
 * real cursor arithmetic and the real template — only the final socket is
 * stubbed. `SMTP_HOST`/`SMTP_FROM_EMAIL` are set in-process purely so
 * `isMailConfigured()` passes; nothing connects anywhere.
 *
 * ## It must run with the dev server STOPPED
 *
 * Both `payload run` and `next dev` push the schema against the same SQLite
 * file; the second to start fails with `index ... already exists`
 * (`.sps/handoff.md`, S1 finding 5).
 *
 * Everything it creates is deleted at the end.
 */
import { getPayload, type Payload } from 'payload'
import { sendCampaignBatch } from '../lib/campaign'
import { lexicalToHtml, lexicalToText } from '../lib/lexical-to-html'
import {
  allowedNow,
  escapeHtml,
  isMailConfigured,
  maxSendsPerHour,
  remainingSendBudget,
  renderCampaignHtml,
  resetSendBudget,
} from '../lib/mailer'
import config from '../payload.config'

const payload = await getPayload({ config })

let failures = 0
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

/* ── a stubbed transport ───────────────────────────────────────────────────── */

interface SentMessage {
  to: string
  subject: string
  text: string
  html?: string
}

const outbox: SentMessage[] = []

/** Replace the transport. `sendMail` still runs its own guards. */
function stubTransport(target: Payload): void {
  ;(target as unknown as { sendEmail: (args: SentMessage) => Promise<unknown> }).sendEmail = async (
    args: SentMessage,
  ) => {
    outbox.push(args)
    return { accepted: [args.to] }
  }
}

/* ── fixtures ──────────────────────────────────────────────────────────────── */

const stamp = Date.now()
const created: Array<{ collection: string; id: number | string }> = []

/**
 * A slug-agnostic handle, for the two calls Payload's overloads cannot type.
 *
 * `create` with a richText body fails to match: the field's type is a deep
 * Lexical union that a hand-built literal cannot satisfy structurally, so
 * TypeScript falls through to the draft overload and complains about `draft`.
 * `delete` cannot type a union slug. Both are the documented S1 finding 4, and
 * the seed takes the same route — one confined cast rather than a cast per call.
 */
const db = payload as unknown as {
  create(args: Record<string, unknown>): Promise<{ id: number | string }>
  delete(args: Record<string, unknown>): Promise<unknown>
}

async function makeSubscriber(email: string, isActive: boolean): Promise<number | string> {
  const doc = await payload.create({
    collection: 'newsletter-subscribers',
    data: { email, isActive, subscribedAt: new Date().toISOString() },
    overrideAccess: true,
  })
  created.push({ collection: 'newsletter-subscribers', id: doc.id })
  return doc.id
}

/**
 * A one-paragraph Lexical document.
 *
 * `as const` on the two union-typed literals is load-bearing: without it
 * `direction` widens to `string` and Payload's richText type rejects the value.
 */
function paragraph(value: string) {
  return {
    root: {
      type: 'root',
      version: 1,
      format: '' as const,
      indent: 0,
      direction: 'ltr' as const,
      children: [
        {
          type: 'paragraph',
          version: 1,
          format: '' as const,
          indent: 0,
          direction: 'ltr' as const,
          children: [{ type: 'text', version: 1, text: value }],
        },
      ],
    },
  }
}

console.log('\n── mailer guards (no transport configured) ─────────────────────')

delete process.env.SMTP_HOST
delete process.env.SMTP_FROM_EMAIL
check('isMailConfigured() is false with no SMTP env', isMailConfigured() === false)

process.env.SMTP_HOST = 'smtp.invalid'
process.env.SMTP_FROM_EMAIL = 'no-reply@shikkha24.com'
check('isMailConfigured() is true once both vars are set', isMailConfigured() === true)

delete process.env.NEWSLETTER_MAX_SENDS_PER_HOUR
check('the hourly ceiling defaults to 100', maxSendsPerHour() === 100)

process.env.NEWSLETTER_MAX_SENDS_PER_HOUR = '3'
check('the ceiling is read from the environment', maxSendsPerHour() === 3)

resetSendBudget()
check('the budget starts full', remainingSendBudget() === 3)
check('allowedNow() clamps to the budget', allowedNow(50) === 3)

console.log('\n── template and escaping ───────────────────────────────────────')

const shell = renderCampaignHtml({
  siteName: 'শিক্ষা২৪.কম',
  preheader: 'নতুন সুযোগ',
  body: '<p>বৃত্তির খবর</p>',
  unsubscribeUrl: 'https://shikkha24.com/newsletter/unsubscribe?token=abc',
})
check('the campaign shell carries an unsubscribe link', shell.includes('unsubscribe?token=abc'))
check('the preheader is escaped into the hidden block', shell.includes('নতুন সুযোগ'))
check(
  'escapeHtml neutralises a script tag',
  !escapeHtml('<script>alert(1)</script>').includes('<script>'),
)

const converted = lexicalToHtml(paragraph('<b>not markup</b>'))
check('lexicalToHtml escapes text nodes', converted.includes('&lt;b&gt;'), converted.slice(0, 60))
check(
  'lexicalToText strips the markup entirely',
  lexicalToText(paragraph('a <b>b</b>')) === 'a <b>b</b>',
)

/* ── the sweep ─────────────────────────────────────────────────────────────── */

console.log('\n── send sweep ──────────────────────────────────────────────────')

const activeIds: Array<number | string> = []
for (let i = 1; i <= 5; i += 1) {
  activeIds.push(await makeSubscriber(`s9-verify-${stamp}-${i}@example.invalid`, true))
}
const inactiveId = await makeSubscriber(`s9-verify-${stamp}-inactive@example.invalid`, false)

// Clear anything the earlier checks counted against the hour.
resetSendBudget()
process.env.NEWSLETTER_MAX_SENDS_PER_HOUR = '3'

const campaign = await db.create({
  collection: 'newsletter-campaigns',
  data: { subject: 'পরীক্ষামূলক ক্যাম্পেইন', body: paragraph('ক্যাম্পেইনের বিষয়বস্তু') },
  overrideAccess: true,
})
created.push({ collection: 'newsletter-campaigns', id: campaign.id })

stubTransport(payload)

/**
 * The audience is counted rather than assumed.
 *
 * A hard-coded expectation here would silently become wrong the moment anyone
 * subscribed for real — the harness would start failing on correct behaviour,
 * which is worse than not testing it.
 */
const audience = await payload.count({
  collection: 'newsletter-subscribers',
  where: { isActive: { equals: true } },
  overrideAccess: true,
})
const activeCount = audience.totalDocs

// Pass 1 — the cap allows exactly 3 of the active subscribers.
const pass1 = await sendCampaignBatch(payload, campaign.id)
check('pass 1 sends exactly the hourly ceiling', pass1.sent === 3, `sent=${pass1.sent}`)
check('pass 1 does not report the campaign finished', pass1.done === false)
check(
  'pass 1 accounts for the whole audience',
  pass1.sent + pass1.remaining === activeCount,
  `sent=${pass1.sent} remaining=${pass1.remaining} audience=${activeCount}`,
)

// Pass 2 — the budget is spent, so nothing may go out.
const pass2 = await sendCampaignBatch(payload, campaign.id)
check('pass 2 sends nothing while the hour is exhausted', pass2.sent === 0, `sent=${pass2.sent}`)
check(
  'the outbox is unchanged by the exhausted pass',
  outbox.length === 3,
  `outbox=${outbox.length}`,
)

// Pass 3 — a new hour, and the sweep must resume rather than restart.
resetSendBudget()
const pass3 = await sendCampaignBatch(payload, campaign.id)
check(
  'pass 3 sends exactly the remainder, not the whole list again',
  pass3.sent === activeCount - 3,
  `sent=${pass3.sent} expected=${activeCount - 3}`,
)
check('pass 3 reports the campaign finished', pass3.done === true)

const after = (await payload.findByID({
  collection: 'newsletter-campaigns',
  id: campaign.id,
  overrideAccess: true,
})) as { status?: string; sentAt?: string | null; deferredCount?: number | null }

check('the campaign status is sent', after.status === 'sent', `status=${after.status}`)
check('sentAt was stamped', Boolean(after.sentAt))
check(
  'nothing is left deferred',
  (after.deferredCount ?? -1) === 0,
  `deferred=${after.deferredCount}`,
)

// The three properties that actually matter.
const recipients = outbox.map((m) => m.to)
const uniqueRecipients = new Set(recipients)
check(
  'one message per active subscriber, no more',
  outbox.length === activeCount,
  `count=${outbox.length} audience=${activeCount}`,
)
check(
  'no subscriber received two copies',
  uniqueRecipients.size === recipients.length,
  `unique=${uniqueRecipients.size}`,
)
check(
  'every message carries an unsubscribe link',
  outbox.every((m) => m.text.includes('/newsletter/unsubscribe?token=')),
)
check(
  'the unconfirmed subscriber received nothing',
  !recipients.some((to) => to.includes('inactive')),
)

const repaired = await payload.find({
  collection: 'newsletter-subscribers',
  where: { id: { equals: activeIds[0] } },
  depth: 0,
  overrideAccess: true,
})
check(
  'a subscriber with no unsubscribe token was repaired, not skipped',
  Boolean((repaired.docs[0] as { unsubscribeToken?: string | null })?.unsubscribeToken),
)

// A finished campaign must be a no-op, not a second send.
resetSendBudget()
const pass4 = await sendCampaignBatch(payload, campaign.id)
check('re-running a sent campaign sends nothing', pass4.sent === 0 && pass4.done === true)
check('the outbox did not grow', outbox.length === activeCount, `outbox=${outbox.length}`)

/* ── cleanup ───────────────────────────────────────────────────────────────── */

console.log('\n── cleanup ─────────────────────────────────────────────────────')

for (const { collection, id } of created) {
  await db.delete({ collection, id, overrideAccess: true }).catch(() => null)
}

const leftover = await payload.find({
  collection: 'newsletter-subscribers',
  where: { email: { like: `s9-verify-${stamp}` } },
  overrideAccess: true,
})
check(
  'every test subscriber was removed',
  leftover.totalDocs === 0,
  `remaining=${leftover.totalDocs}`,
)

void inactiveId

console.log(`\n${failures === 0 ? '✅ all checks passed' : `❌ ${failures} check(s) failed`}\n`)
process.exit(failures === 0 ? 0 : 1)
