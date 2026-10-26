/**
 * T-89 Chunk C — presentation helpers for the reporter workspace.
 *
 * Dates are compared on **Asia/Dhaka calendar days**: the newsroom's day is
 * UTC+6 year-round, so "due today" must mean the reporter's today, not the
 * server's or UTC's. Both sides are normalised through the same day-key
 * before the diff, so there is no timezone drift to explain later.
 */

export type ChipTone = 'info' | 'success' | 'warning' | 'danger'

export interface StatusChip {
  label: string
  tone: ChipTone
}

/** Active states are quiet info; decided states carry the outcome colour.
 * R5a — the approved chip carries ✅ to match the dashboard's Approved chip
 * (same state, same emoji, one vocabulary across the admin). */
export const STATUS_CHIPS: Record<string, StatusChip> = {
  assigned: { label: 'Assigned', tone: 'info' },
  accepted: { label: 'Accepted', tone: 'info' },
  inProgress: { label: 'In progress', tone: 'info' },
  filed: { label: 'Filed', tone: 'warning' },
  approved: { label: '✅ Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
}

/** Normal priority gets no chip — it adds noise, never signal. */
export const PRIORITY_CHIPS: Record<string, StatusChip> = {
  high: { label: 'High ⚠', tone: 'warning' },
  urgent: { label: 'Urgent 🔥', tone: 'danger' },
}

const ACTIVE_STATUSES = new Set(['assigned', 'accepted', 'inProgress'])

/** YYYY-MM-DD in Dhaka time — the same basis the public site uses. */
function dhakaDayKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** YYYY-MM-DD in Dhaka time, or null for missing/invalid input. */
export function dhakaDate(value: string | null | undefined): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return dhakaDayKey(parsed)
}

/** Whole days from Dhaka-today to Dhaka-due-day; negative when overdue. */
export function dhakaDayDiff(
  dueAt: string | null | undefined,
  now: Date = new Date(),
): number | null {
  const dueKey = dhakaDate(dueAt)
  if (!dueKey) return null
  const due = new Date(dueKey)
  const today = new Date(dhakaDayKey(now))
  if (Number.isNaN(due.getTime()) || Number.isNaN(today.getTime())) return null
  return Math.round((due.getTime() - today.getTime()) / 86_400_000)
}

export interface DeadlineInfo {
  text: string
  tone: 'muted' | 'warning' | 'danger'
}

/** Relative deadline copy; beyond two weeks the exact date reads better. */
export function deadlineInfo(diff: number | null, exact: string | null): DeadlineInfo {
  if (diff === null && exact === null) return { text: 'No deadline (সময়সীমা নেই)', tone: 'muted' }
  if (diff === null) return { text: `Deadline ${exact ?? ''} (সময়সীমা)`, tone: 'muted' }
  if (diff < 0) {
    const days = -diff
    return {
      text: `Overdue by ${days}d (সময়সীমা ${days} দিন পেরিয়ে গেছে)`,
      tone: 'danger',
    }
  }
  if (diff === 0) return { text: 'Due today (আজই জমা)', tone: 'warning' }
  if (diff === 1) return { text: 'Due tomorrow (আগামীকাল)', tone: 'warning' }
  if (diff <= 14) return { text: `In ${diff} days (আর ${diff} দিন)`, tone: 'muted' }
  return { text: `Deadline ${exact ?? ''} (সময়সীমা)`, tone: 'muted' }
}

/**
 * C6 — "decided when" in words: today / yesterday / Nd ago. Absolute dates in a
 * five-row strip read as noise; the relative form is the useful part.
 */
export function relativeDays(value: string | null | undefined, now: Date = new Date()): string {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  const days = Math.round(
    (new Date(dhakaDayKey(now)).getTime() - new Date(dhakaDayKey(parsed)).getTime()) / 86_400_000,
  )
  if (days <= 0) return 'Today (আজ)'
  if (days === 1) return 'Yesterday (গতকাল)'
  return `${days}d ago (${days} দিন আগে)`
}

export interface AssignableDoc {
  status?: string | null
  dueAt?: string | null
}

/** Split the board into what needs work now and what the desk has ruled on. */
export function summarize<T extends AssignableDoc>(assignments: T[], now: Date = new Date()) {
  const active: T[] = []
  const decided: T[] = []
  for (const a of assignments) {
    if (ACTIVE_STATUSES.has(a.status ?? '')) active.push(a)
    else decided.push(a)
  }
  let overdue = 0
  let dueSoon = 0
  for (const a of active) {
    const diff = dhakaDayDiff(a.dueAt, now)
    if (diff === null) continue
    if (diff < 0) overdue += 1
    else if (diff <= 2) dueSoon += 1
  }
  return { active, decided, overdue, dueSoon }
}
