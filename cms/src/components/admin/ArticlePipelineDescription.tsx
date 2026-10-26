import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import { hasRole } from '../../access/roles'
import type { ReviewStatus } from '../../collections/Articles'
import { isAutoRebuildConfigured } from '../../lib/rebuild-trigger'
import config from '../../payload.config'

/**
 * R3 — the editor's pipeline strip, rendered through Payload's Edit-view
 * `Description` slot (replaces the static `admin.description` on Articles).
 *
 * Shows the four newsroom stages — ✍️ Write → 👀 Review → 🚀 Publish →
 * 🔄 Rebuild — highlights the stage the document is at, and adds one line of
 * "what happens next" plus the rebuild expectation. English-first chrome with
 * Bengali helpers (T-38).
 *
 * Stage mapping from `reviewStatus` + `_status`:
 * - draft + draft          → Write (the desk has not seen it)
 * - draft + pendingReview  → Review (waiting for an editor)
 * - draft + changesRequested → Review (came back; the writer must fix)
 * - draft + approved       → Publish (approved, not yet published)
 * - published (any)        → Publish done → Rebuild pending/done
 *
 * The rebuild line is honest about batching: the trigger is debounced
 * (`lib/rebuild-trigger.ts`), so the copy says "shortly", not "instantly".
 */
const STAGES = [
  { key: 'write', emoji: '✍️', en: 'Write', bn: 'লেখা' },
  { key: 'review', emoji: '👀', en: 'Review', bn: 'পর্যালোচনা' },
  { key: 'publish', emoji: '🚀', en: 'Publish', bn: 'প্রকাশ' },
  { key: 'rebuild', emoji: '🌐', en: 'Live site', bn: 'সাইট হালনাগাদ' },
] as const

type StageKey = (typeof STAGES)[number]['key']

function currentStage(status: ReviewStatus | undefined, isPublished: boolean): StageKey {
  if (isPublished) return 'rebuild'
  switch (status) {
    case 'pendingReview':
    case 'changesRequested':
      return 'review'
    case 'approved':
      return 'publish'
    default:
      return 'write'
  }
}

function nextStep(status: ReviewStatus | undefined, isPublished: boolean): string {
  if (isPublished) {
    // Match REBUILD_NOTICE's two states (lib/rebuild-trigger.ts): with the
    // deploy webhook configured the site rebuilds on its own shortly; without
    // it a manual rebuild is required — saying "shortly" there would be a lie.
    return isAutoRebuildConfigured
      ? 'Published. The live site updates within a few minutes (কয়েক মিনিটের মধ্যে সাইট হালনাগাদ হবে)।'
      : 'Published. Auto-rebuild is off — run a rebuild to update the site (অটো rebuild বন্ধ — সাইট হালনাগাদ করতে rebuild চালান)।'
  }
  switch (status) {
    case 'pendingReview':
      return 'Waiting for an editor to review (সম্পাদকের অনুমোদনের অপেক্ষায়)।'
    case 'changesRequested':
      return 'An editor sent this back — fix it and resubmit (সংশোধন করে আবার পাঠান)।'
    case 'approved':
      return 'Approved — publish when ready (অনুমোদিত — প্রকাশ করুন)।'
    default:
      return 'Writing. Next: send it for review (পরবর্তী: পর্যালোচনার জন্য পাঠান)।'
  }
}

export async function ArticlePipelineDescription({
  id,
  collectionSlug,
  description,
}: {
  id?: number | string
  collectionSlug?: string
  description?: string | Record<string, string>
}) {
  // The create view has no document yet — show the strip with Write highlighted
  // and the generic first step.
  let status: ReviewStatus | undefined
  let isPublished = false
  let canDelete = false

  if (id && collectionSlug === 'articles') {
    const headers = await getHeaders()
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers })
    if (user) {
      // Fail soft like DashboardWorkbench: a deleted-while-open document or a
      // query error must degrade to the generic strip, never break the view.
      const doc = await payload
        .findByID({
          collection: 'articles',
          id,
          depth: 0,
          user,
          overrideAccess: false,
        })
        .catch(() => null)
      status = doc?.reviewStatus as ReviewStatus | undefined
      isPublished = doc?._status === 'published'
      // The delete-consequence line is only meaningful to roles that can
      // actually delete (superAdmin/editorInChief — the same rule as
      // `deleteArticleOrEditorInChief` in access/articles.ts). Showing a red
      // "deleting removes…" warning to a reporter with no delete button is
      // noise about an action they cannot take. (A dryRun delete is not
      // supported by the Local API, so this mirrors the access rule.)
      canDelete = hasRole(user, 'superAdmin', 'editorInChief')
    }
  }

  const stage = currentStage(status, isPublished)

  /*
   * The Description slot is shared by the LIST view and the EDIT view
   * (verified in @payloadcms/next 3.90.2: renderListViewSlots passes the same
   * component with `collectionSlug` but no document id). On the list there is
   * no document to be "writing", so render the collection's own static
   * description there (passed through by both views as the `description`
   * prop) instead of the strip. The create flow redirects to the saved
   * document's edit URL before rendering, so every strip rendering has an id.
   * The prop is typed loosely (Payload allows a localized Record) — anything
   * that is not a plain string renders through ViewDescription's own
   * translation path instead of being embedded raw.
   */
  if (!id) {
    if (!description) return null
    if (typeof description === 'string') {
      return <div className="custom-view-description">{description}</div>
    }
    return (
      <div className="custom-view-description">
        {Object.values(description).filter(Boolean).join(' — ')}
      </div>
    )
  }

  return (
    <div className="article-pipeline" data-stage={stage}>
      <ol className="article-pipeline__steps">
        {STAGES.map((s) => (
          <li
            key={s.key}
            className={
              'article-pipeline__step' + (s.key === stage ? ' article-pipeline__step--current' : '')
            }
            aria-current={s.key === stage ? 'step' : undefined}
          >
            <span aria-hidden className="article-pipeline__emoji">
              {s.emoji}
            </span>{' '}
            {s.en} <span className="article-pipeline__bn">({s.bn})</span>
          </li>
        ))}
      </ol>
      <p className="article-pipeline__next">{nextStep(status, isPublished)}</p>
      {/*
       * R4 summary lines, folded into the strip after the Status-slot
       * replacement was reverted (the default Status is a reactive client
       * component with the "Revert to published" action — a server component
       * must not displace it). These are the guardrail lines: what is live,
       * what saving does, and what deleting costs.
       */}
      <ul className="article-pipeline__facts">
        <li>
          {isPublished
            ? 'This version is on the live site (এই সংস্করণ সাইটে আছে)।'
            : 'Not on the live site yet (এখনো সাইটে নেই)।'}
        </li>
        <li>
          {isAutoRebuildConfigured
            ? 'Saving keeps the site updated automatically (সংরক্ষণ করলেই সাইট হালনাগাদ হয়)।'
            : 'Auto-rebuild is off — the site needs a manual rebuild (অটো rebuild বন্ধ — ম্যানুয়ালি চালাতে হবে)।'}
        </li>
        {canDelete && (
          <li className="article-pipeline__fact-danger">
            {isPublished
              ? 'Deleting removes it from the live site (মুছলে সাইট থেকে সরে যাবে)।'
              : 'Deleting removes the draft and its history (মুছলে খসড়া ও তার ইতিহাস মুছে যাবে)।'}
          </li>
        )}
      </ul>
    </div>
  )
}
