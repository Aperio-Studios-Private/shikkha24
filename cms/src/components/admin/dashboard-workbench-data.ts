export interface WorkItem {
  datetime?: string | null
  href: string
  label: string
  status: string
  statusTone: 'danger' | 'neutral' | 'success' | 'warning'
  timestamp: string
  timestampTitle: string
}

export interface WorkbenchCard {
  actionLabel: string
  emptyDescription: string
  count: number | null
  description: string
  href: string
  tone: 'info' | 'success' | 'warning' | 'danger'
  title: string
}

export interface WorkbenchDoc {
  id: number | string
  title?: string | null
  reviewStatus?: string | null
  _status?: string | null
  updatedAt?: string | null
}

const REVIEW_LABELS: Record<string, string> = {
  approved: 'Approved',
  changesRequested: 'Changes requested',
  draft: 'Draft',
  pendingReview: 'Pending review',
}

/**
 * R5a — emoji per review state so the dashboard chips read at a glance
 * (owner decision: emojis on chips, not just sidebar labels). The published
 * state uses 🌐 to match the pipeline strip's "Live site" stage. One state =
 * one emoji: changesRequested is ↩️ (sent back), distinct from ✏️ draft —
 * a reporter must tell "not started" from "the desk sent this back" without
 * reading the label.
 */
const REVIEW_EMOJIS: Record<string, string> = {
  approved: '✅',
  changesRequested: '↩️',
  draft: '✏️',
  pendingReview: '👀',
  published: '🌐',
}

export async function countRequest(
  request: Promise<{ totalDocs?: number }>,
): Promise<number | null> {
  try {
    const result = await request
    return result.totalDocs ?? 0
  } catch {
    return null
  }
}

export async function listRequest(
  request: Promise<{ docs?: WorkbenchDoc[] }>,
): Promise<WorkbenchDoc[]> {
  try {
    const result = await request
    return result.docs ?? []
  } catch {
    return []
  }
}

export function reviewLabel(doc: WorkbenchDoc): string {
  if (doc._status === 'published') return '🌐 Published'
  const emoji = REVIEW_EMOJIS[doc.reviewStatus ?? ''] ?? '✏️'
  return `${emoji} ${REVIEW_LABELS[doc.reviewStatus ?? ''] ?? 'Draft'}`
}

export function reviewTone(doc: WorkbenchDoc): WorkItem['statusTone'] {
  if (doc._status === 'published' || doc.reviewStatus === 'approved') return 'success'
  if (doc.reviewStatus === 'changesRequested') return 'danger'
  if (doc.reviewStatus === 'pendingReview') return 'warning'
  return 'neutral'
}

export function collectionPath(collection: string, query: Record<string, string> = {}): string {
  const searchParams = new URLSearchParams({ limit: '10', ...query })
  return `/admin/collections/${collection}?${searchParams.toString()}`
}

export function relativeTime(value: string | null | undefined): string {
  const timestamp = value ? new Date(value).getTime() : Number.NaN
  if (Number.isNaN(timestamp)) return 'Unknown time'

  const seconds = Math.round((timestamp - Date.now()) / 1000)
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 7],
    ['week', 4.345],
    ['month', 12],
    ['year', Number.POSITIVE_INFINITY],
  ]
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  let scale = 1

  for (const [unit, threshold] of units) {
    if (Math.abs(seconds) < threshold * scale) {
      return formatter.format(Math.round(seconds / scale), unit)
    }
    scale *= threshold
  }

  return formatter.format(Math.round(seconds / scale), 'year')
}

export function exactTime(value: string | null | undefined): string {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return 'Unknown time'
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
