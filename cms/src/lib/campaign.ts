import { randomBytes } from 'node:crypto'
import type { Payload } from 'payload'

import { lexicalToHtml, lexicalToText } from './lexical-to-html'
import { isMailConfigured, remainingSendBudget, renderCampaignHtml, sendMail } from './mailer'

/**
 * Campaign sending sweep.
 *
 * ## Why a sweep and not a loop
 *
 * `docs/security.md` §7 records that cPanel enforces **per-domain hourly send
 * caps and silently truncates past them**. A campaign to 500 subscribers at a
 * 100/hour ceiling therefore *cannot* be sent in one pass — and pretending
 * otherwise would either trip cPanel's cap (truncating the campaign with no
 * error) or, worse, damage the domain's sending reputation, which would also
 * break password resets.
 *
 * So a send is a **resumable batch**: it sends as much as the hour allows,
 * records how far it got, and returns. The next invocation continues. The caller
 * is whatever the operator has — a cPanel cron job hitting the send endpoint, or
 * a manual trigger.
 *
 * ## The cursor is a subscriber id, not an offset
 *
 * `sentThroughId` records the id of the last subscriber mailed. Ids are
 * monotonic in SQLite, so paging with `id > cursor` is exact: a subscriber
 * confirmed *during* a long send is picked up at the end rather than shifting
 * everyone else's offset and causing a duplicate or a skip. An `offset`-based
 * cursor would do exactly that, silently.
 *
 * ## What it will not do
 *
 * - **It will not send without a transport.** `isMailConfigured()` gates it.
 * - **It will not send a mail without an unsubscribe link.** A subscriber row
 *   with no `unsubscribeToken` gets one issued before the send — the link is a
 *   legal requirement, not a nicety, so it is never omitted.
 * - **It will not retry forever.** A transport error stops the sweep and is
 *   recorded in `lastError`; the campaign stays `sending` so it can resume, and
 *   an operator decides whether to retry rather than the code hammering a broken
 *   SMTP server once per cron tick.
 */

/** What one sweep did. */
export interface SweepResult {
  /** Messages actually handed to the transport in this pass. */
  sent: number
  /** Subscribers still waiting — the campaign is not finished while this is > 0. */
  remaining: number
  /** `true` when every active subscriber has been mailed. */
  done: boolean
  /** Set when the sweep stopped early. */
  error?: string
}

/** The subset of a campaign row this module reads. */
interface CampaignRow {
  id: number | string
  subject?: string | null
  preheader?: string | null
  body?: unknown
  status?: string | null
  recipientCount?: number | null
  sentCount?: number | null
  sentThroughId?: number | null
}

/** The subset of a subscriber row this module reads. */
interface SubscriberRow {
  id: number | string
  email?: string | null
  unsubscribeToken?: string | null
}

/** Read the site name for the mail shell, falling back to the configured sender. */
async function siteName(payload: Payload): Promise<string> {
  try {
    const settings = (await payload.findGlobal({
      slug: 'site-settings',
      depth: 0,
      overrideAccess: true,
    })) as { siteName?: string | null } | null
    if (settings?.siteName) return settings.siteName
  } catch {
    // A settings read must never be the reason a campaign cannot go out.
  }
  return process.env.SMTP_FROM_NAME || 'শিক্ষা২৪'
}

/** Absolute unsubscribe URL for one subscriber. */
function unsubscribeUrl(token: string): string {
  const base = (process.env.NEWSLETTER_SITE_URL || 'https://shikkha24.com').replace(/\/$/, '')
  return `${base}/newsletter/unsubscribe?token=${token}`
}

/**
 * Send as much of a campaign as the current hour allows.
 *
 * @returns what happened, so the caller can report it. Never throws for an
 *          expected condition (unconfigured transport, exhausted budget, a
 *          transport error) — those are all reported in the result instead,
 *          because a cron job has nowhere useful to put an exception.
 */
export async function sendCampaignBatch(
  payload: Payload,
  campaignId: number | string,
): Promise<SweepResult> {
  if (!isMailConfigured()) {
    return { sent: 0, remaining: 0, done: false, error: 'মেইল পাঠানোর সেটিংস কনফিগার করা হয়নি।' }
  }

  const campaign = (await payload
    .findByID({
      collection: 'newsletter-campaigns',
      id: campaignId,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => null)) as CampaignRow | null

  if (!campaign) {
    return { sent: 0, remaining: 0, done: false, error: 'ক্যাম্পেইনটি খুঁজে পাওয়া যায়নি।' }
  }

  // Already finished. Re-running must be a no-op, not a second send.
  if (campaign.status === 'sent') {
    return { sent: 0, remaining: 0, done: true }
  }

  const budget = remainingSendBudget()
  const cursor = campaign.sentThroughId ?? 0

  const totalActive = await payload
    .count({
      collection: 'newsletter-subscribers',
      where: { isActive: { equals: true } },
      overrideAccess: true,
    })
    .catch(() => null)

  if (budget <= 0) {
    // Nothing may go out this hour. Report honestly rather than pretending.
    return {
      sent: 0,
      remaining: Math.max(0, (totalActive?.totalDocs ?? 0) - (campaign.sentCount ?? 0)),
      done: false,
    }
  }

  const batch = await payload
    .find({
      collection: 'newsletter-subscribers',
      where: {
        and: [{ isActive: { equals: true } }, { id: { greater_than: cursor } }],
      },
      sort: 'id',
      limit: budget,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => null)

  const recipients = (batch?.docs ?? []) as SubscriberRow[]

  if (recipients.length === 0) {
    await payload.update({
      collection: 'newsletter-campaigns',
      id: campaign.id,
      data: {
        status: 'sent',
        sentAt: new Date().toISOString(),
        recipientCount: campaign.recipientCount || (totalActive?.totalDocs ?? 0),
        deferredCount: 0,
      },
      overrideAccess: true,
    })
    return { sent: 0, remaining: 0, done: true }
  }

  const name = await siteName(payload)
  const html = lexicalToHtml(campaign.body)
  const plain = lexicalToText(campaign.body)
  const subject = campaign.subject ?? ''

  let sent = 0
  let lastId = cursor

  for (const recipient of recipients) {
    const email = recipient.email?.trim()
    if (!email) continue

    // Issue a token rather than skipping: every mail must carry a working
    // unsubscribe link, so a row without one is repaired, not ignored.
    let token = recipient.unsubscribeToken ?? null
    if (!token) {
      token = randomBytes(32).toString('hex')
      await payload
        .update({
          collection: 'newsletter-subscribers',
          id: recipient.id,
          data: { unsubscribeToken: token },
          overrideAccess: true,
        })
        .catch(() => null)
    }

    try {
      await sendMail(payload, {
        to: email,
        subject,
        text: `${plain}\n\n---\nসাবস্ক্রিপশন বাতিল করুন: ${unsubscribeUrl(token)}`,
        html: renderCampaignHtml({
          siteName: name,
          preheader: campaign.preheader,
          body: html,
          unsubscribeUrl: unsubscribeUrl(token),
        }),
      })
    } catch (error) {
      // Stop the sweep and record why. The cursor is not advanced past this
      // recipient, so a retry resumes here rather than skipping anyone.
      const message = error instanceof Error ? error.message : String(error)
      await payload
        .update({
          collection: 'newsletter-campaigns',
          id: campaign.id,
          data: {
            status: 'sending',
            sentCount: (campaign.sentCount ?? 0) + sent,
            sentThroughId: lastId,
            lastError: message.slice(0, 500),
            recipientCount: campaign.recipientCount || (totalActive?.totalDocs ?? 0),
            deferredCount: Math.max(
              0,
              (totalActive?.totalDocs ?? 0) - (campaign.sentCount ?? 0) - sent,
            ),
          },
          overrideAccess: true,
        })
        .catch(() => null)
      return { sent, remaining: recipients.length - sent, done: false, error: message }
    }

    sent += 1
    lastId = Number(recipient.id)
  }

  const totalSent = (campaign.sentCount ?? 0) + sent
  const audience = totalActive?.totalDocs ?? 0
  const done = totalSent >= audience

  await payload.update({
    collection: 'newsletter-campaigns',
    id: campaign.id,
    data: {
      status: done ? 'sent' : 'sending',
      ...(done ? { sentAt: new Date().toISOString() } : {}),
      sentCount: totalSent,
      sentThroughId: lastId,
      recipientCount: campaign.recipientCount || audience,
      deferredCount: Math.max(0, audience - totalSent),
      lastError: null,
    },
    overrideAccess: true,
  })

  return { sent, remaining: Math.max(0, audience - totalSent), done }
}
