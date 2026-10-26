import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import config from '../../payload.config'
import type { ReviewStatus } from '../../collections/Articles'

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
    return 'Published. The live site updates shortly (সাইট শীঘ্রই হালনাগাদ হবে)।'
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
  description?: string
}) {
  // The create view has no document yet — show the strip with Write highlighted
  // and the generic first step.
  let status: ReviewStatus | undefined
  let isPublished = false

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
   */
  if (!id) {
    return description ? (
      <div className="custom-view-description">{description}</div>
    ) : null
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
    </div>
  )
}
