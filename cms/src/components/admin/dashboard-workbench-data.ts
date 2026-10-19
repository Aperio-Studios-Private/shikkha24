export interface WorkItem {
  href: string
  label: string
  meta: string
}

export interface WorkbenchCard {
  count: number | null
  description: string
  href: string
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
  if (doc._status === 'published') return 'Published'
  return REVIEW_LABELS[doc.reviewStatus ?? ''] ?? 'Draft'
}
