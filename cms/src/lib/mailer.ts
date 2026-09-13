/**
 * Newsletter transport — deliberately thin, deliberately swappable.
 *
 * ## The decision this implements
 *
 * The owner accepted the **cPanel SMTP** low-volume fallback on 2026-09-12
 * (`.sps/plan.md` §"Scope amendment (2026-09-12)") rather than opening an ESP
 * account. The gate closed as *explicitly accepted*, not *confirmed working*,
 * because the risks are real (`docs/security.md` §7):
 *
 * - cPanel enforces **per-domain hourly send caps** — an over-long campaign is
 *   silently truncated
 * - bulk sending from a **shared IP risks blacklisting the domain**, which would
 *   also break password resets and contact forms
 * - no delivery reporting, no bounce handling, no unsubscribe automation
 *
 * So this module knows **nothing about the newsletter**: no subscriber, no
 * campaign, no template. It takes an envelope and sends it, or refuses to. The
 * subscriber list, the double opt-in and the composer all live in Payload and
 * would survive swapping this file for an ESP client unchanged.
 *
 * ## The one thing it does enforce
 *
 * `NEWSLETTER_MAX_SENDS_PER_HOUR` is a **hard ceiling checked in code**, not a
 * note in a runbook. The whole point of accepting the cPanel fallback is that the
 * limit is knowable; letting an editor trip it would truncate a campaign without
 * anyone noticing and damage the domain's sending reputation. Deferred messages
 * are reported back rather than dropped.
 *
 * ## When it is not configured
 *
 * `isMailConfigured()` returns false and `sendMail` throws. Callers must check
 * first. This mirrors the frontend's `PUBLIC_CMS_ORIGIN` rule from S8: a feature
 * whose dependency is missing should be **absent**, never a control that appears
 * to work and then fails.
 */

/** Sends counted so far in the current rolling hour. */
interface HourWindow {
  count: number
  resetAt: number
}

let window: HourWindow = { count: 0, resetAt: 0 }

const ONE_HOUR_MS = 60 * 60 * 1000

/** Default ceiling. Deliberately far below a typical cPanel cap. */
const DEFAULT_MAX_PER_HOUR = 100

/** Read the configured hourly ceiling. `0` disables the check. */
export function maxSendsPerHour(): number {
  const raw = process.env.NEWSLETTER_MAX_SENDS_PER_HOUR
  if (raw === undefined || raw.trim() === '') return DEFAULT_MAX_PER_HOUR
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_MAX_PER_HOUR
}

/** Is a real transport configured? Without this, nothing should be offered. */
export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM_EMAIL)
}

/** Sends remaining in the current hour. */
export function remainingSendBudget(): number {
  const max = maxSendsPerHour()
  if (max === 0) return Number.POSITIVE_INFINITY
  const now = Date.now()
  if (window.resetAt <= now) return max
  return Math.max(0, max - window.count)
}

/** How many of `wanted` may be sent right now. */
export function allowedNow(wanted: number): number {
  const remaining = remainingSendBudget()
  return remaining === Number.POSITIVE_INFINITY ? wanted : Math.min(wanted, remaining)
}

/** Count one successful send against the hour. */
function consume(): void {
  const now = Date.now()
  if (window.resetAt <= now) {
    window = { count: 1, resetAt: now + ONE_HOUR_MS }
    return
  }
  window.count += 1
}

/** Reset the counter — used by the verification harness. */
export function resetSendBudget(): void {
  window = { count: 0, resetAt: 0 }
}

export interface MailMessage {
  to: string
  subject: string
  /** Plain text. Always send one — an HTML-only mail is a spam signal. */
  text: string
  html?: string
}

/**
 * Send one message through Payload's configured email adapter.
 *
 * Throws when the transport is unconfigured or the hourly budget is exhausted —
 * both are conditions the caller must handle rather than paper over.
 */
export async function sendMail(
  payload: {
    sendEmail: (args: {
      to: string
      subject: string
      text: string
      html?: string
    }) => Promise<unknown>
  },
  message: MailMessage,
): Promise<void> {
  if (!isMailConfigured()) {
    throw new Error('মেইল পাঠানোর সেটিংস এখনো কনফিগার করা হয়নি।')
  }
  if (remainingSendBudget() <= 0) {
    throw new Error('এই ঘণ্টার পাঠানোর সীমা শেষ। পরের ঘণ্টায় আবার চেষ্টা করুন।')
  }

  await payload.sendEmail({
    to: message.to,
    subject: message.subject,
    text: message.text,
    ...(message.html ? { html: message.html } : {}),
  })

  consume()
}

/**
 * Wrap campaign HTML in the shell every mail needs.
 *
 * Kept here rather than in the composer because an unsubscribe link is a legal
 * requirement, not a design choice — it must not be possible to build a campaign
 * body without one.
 */
export function renderCampaignHtml(args: {
  siteName: string
  preheader?: string | null
  body: string
  unsubscribeUrl: string
}): string {
  return `<!doctype html>
<html lang="bn">
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,'SolaimanLipi',sans-serif">
    ${args.preheader ? `<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(args.preheader)}</div>` : ''}
    <div style="max-width:600px;margin:0 auto;padding:24px 16px">
      <div style="background:#ffffff;border-radius:8px;padding:24px;color:#1f1f1f;line-height:1.7">
        ${args.body}
      </div>
      <p style="margin:16px 0 0;font-size:12px;color:#6b7280;text-align:center">
        ${escapeHtml(args.siteName)} · <a href="${args.unsubscribeUrl}" style="color:#6b7280">সাবস্ক্রিপশন বাতিল করুন</a>
      </p>
    </div>
  </body>
</html>`
}

/** Escape text destined for HTML. Campaign bodies are editor input, not markup. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
