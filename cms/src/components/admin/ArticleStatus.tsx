import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import config from '../../payload.config'
import { isAutoRebuildConfigured } from '../../lib/rebuild-trigger'
import type { ReviewStatus } from '../../collections/Articles'

/**
 * R4 — the editor's publish summary, rendered through Payload's Edit-view
 * `Status` slot (replaces the default draft/published status block).
 *
 * One small panel answering the editor's three questions at a glance:
 * 1. Where does this article stand? (review state + published state)
 * 2. What is on the live site right now? (published version vs unsaved work)
 * 3. What happens if I act? (publish → site updates per rebuild state;
 *    delete → the article leaves the live site)
 *
 * Server component: reads the real document with the session user and
 * `overrideAccess: false`, failing soft like the pipeline strip.
 */
export async function ArticleStatus({
  id,
  collectionSlug,
}: {
  id?: number | string
  collectionSlug?: string
}) {
  if (!id || collectionSlug !== 'articles') return null

  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })
  if (!user) return null

  const doc = await payload
    .findByID({
      collection: 'articles',
      id,
      depth: 0,
      user,
      overrideAccess: false,
    })
    .catch(() => null)
  if (!doc) return null

  const status = doc.reviewStatus as ReviewStatus | undefined
  const isPublished = doc._status === 'published'

  const stateChip =
    status === 'approved'
      ? { label: 'Approved (অনুমোদিত)', tone: 'success' }
      : status === 'pendingReview'
        ? { label: 'In review (পর্যালোচনায়)', tone: 'info' }
        : status === 'changesRequested'
          ? { label: 'Changes requested (পরিবর্তন প্রয়োজন)', tone: 'warning' }
          : { label: 'Draft (খসড়া)', tone: 'muted' }

  const liveLine = isPublished
    ? 'This version is on the live site (এই সংস্করণ সাইটে আছে)।'
    : 'Not on the live site yet (এখনো সাইটে নেই)।'

  const deleteLine = isPublished
    ? 'Deleting removes it from the live site (মুছলে সাইট থেকে সরে যাবে)।'
    : 'Deleting removes the draft and its history (মুছলে খসড়া ও তার ইতিহাস মুছে যাবে)।'

  const rebuildLine = isAutoRebuildConfigured
    ? 'Saving keeps the site updated automatically (সংরক্ষণ করলেই সাইট হালনাগাদ হয়)।'
    : 'Auto-rebuild is off — the site needs a manual rebuild (অটো rebuild বন্ধ — ম্যানুয়ালি চালাতে হবে)।'

  return (
    <div className="article-status" data-tone={stateChip.tone}>
      <span className={`article-status__chip article-status__chip--${stateChip.tone}`}>
        {stateChip.label}
      </span>
      <ul className="article-status__lines">
        <li>{liveLine}</li>
        <li>{rebuildLine}</li>
        <li className="article-status__danger">{deleteLine}</li>
      </ul>
    </div>
  )
}
