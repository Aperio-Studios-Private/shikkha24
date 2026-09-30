import type { AdminViewServerProps } from 'payload'

import { isEditorUser, relationId } from '../../access/roles'
import { QuickDraftForm } from './QuickDraftForm'

/**
 * প্রতিবেদকের কাজ — the reporter workspace, at `/admin/reporter`.
 *
 * ## Why a purpose-built view rather than "just use the collections"
 *
 * A reporter's actual question is *"what do I owe, and by when?"* The default
 * admin answers *"here are 31 collections"*. The two collections that matter to
 * a reporter are `assignments` (what was asked of them) and `articles` (what
 * they wrote), and both are buried.
 *
 * ## Why the portal is the CMS and not a second frontend login
 *
 * Owner decision, 2026-09-18 (delegated). The CMS already has account lockout,
 * token expiry, field-level guards and an audit trail; a parallel reporter login
 * on the public site would be a **second attack surface with none of that
 * hardening**, and it would need a third identity concept alongside `Users`
 * (staff) and `Readers` (public). This view is the mobile-first part, not a new
 * auth surface.
 *
 * ## ⚠️ The assignment query runs with the user's own session
 *
 * `overrideAccess` is left at its default `false` and `user` is the signed-in
 * reporter, so `Assignments.read` — the rule that scopes a reporter to their own
 * rows — is what filters this list. Passing `overrideAccess: true` here would
 * show every reporter every other reporter's queue, which is exactly the leak
 * that collection rule exists to prevent. **Do not add it.**
 *
 * ## Mobile-first
 *
 * Single column, 48px controls, no horizontal scroll at 375px. Reporters file
 * from phones.
 */

interface AssignmentDoc {
  id: number | string
  title?: string | null
  status?: string | null
  priority?: string | null
  dueAt?: string | null
  brief?: string | null
}

/** Bengali labels for the assignment statuses, mirroring the CMS options. */
const STATUS_LABELS: Record<string, string> = {
  assigned: 'দেওয়া হয়েছে',
  accepted: 'নেওয়া হয়েছে',
  inProgress: 'কাজ চলছে',
  filed: 'জমা দেওয়া হয়েছে',
  approved: 'অনুমোদিত',
  rejected: 'বাতিল',
}

const PRIORITY_LABELS: Record<string, string> = {
  normal: 'সাধারণ',
  high: 'জরুরি',
  urgent: 'অতি জরুরি',
}

/** `YYYY-MM-DD` in Dhaka time — the same basis the public site uses. */
function dhakaDate(value: string | null | undefined): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed)
}

export async function ReporterWorkspace(props: AdminViewServerProps) {
  const req = props.initPageResult?.req
  const user = req?.user

  if (!req) {
    return <p>অ্যাডমিন অনুরোধ লোড করা যায়নি।</p>
  }

  /*
   * ⚠️ Read the user document back rather than trusting `req.user`.
   *
   * `req.user` — and `/api/users/me` — do **not** carry `authorProfile`, even
   * though the column is set and a depth-0 read returns it. So
   * `relationId(req.user.authorProfile)` was always `null`, and the workspace
   * told a reporter with a perfectly good profile that they had none: the form
   * was unreachable, and the failure looked like a data problem rather than a
   * code one.
   *
   * `overrideAccess: false` with `user` keeps the real rule in play —
   * `Users.read` is `isSelfIn('users')`, so reading one's own record is allowed
   * and nothing else is.
   */
  const userDoc = user?.id
    ? await req.payload
        .findByID({ collection: 'users', id: user.id, depth: 0, user, overrideAccess: false })
        .catch(() => null)
    : null

  /*
   * The desk gets the whole board; a reporter gets their own queue. The same
   * `Assignments.read` rule decides, because the query carries the session.
   */
  const [assignmentsResult, categoriesResult] = await Promise.all([
    req.payload
      .find({
        collection: 'assignments',
        user,
        overrideAccess: false,
        sort: 'dueAt',
        limit: 50,
        depth: 0,
      })
      .catch(() => ({ docs: [] as AssignmentDoc[] })),
    req.payload
      .find({ collection: 'categories', sort: 'nameBn', limit: 100, depth: 0 })
      .catch(() => ({ docs: [] as Array<{ id: number | string; nameBn?: string }> })),
  ])

  const assignments = (assignmentsResult.docs ?? []) as AssignmentDoc[]
  const categories = (categoriesResult.docs ?? []).map((c) => ({
    id: c.id,
    nameBn: c.nameBn ?? String(c.id),
  }))

  const isEditor = isEditorUser(user)
  const hasProfile =
    relationId((userDoc as { authorProfile?: unknown } | null)?.authorProfile) !== null

  return (
    <div style={{ maxWidth: '46rem', margin: '0 auto', padding: '1rem' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>প্রতিবেদকের কাজ</h1>
        <p style={{ marginTop: '0.25rem', opacity: 0.75, fontSize: '0.875rem' }}>
          {isEditor ? 'ডেস্ক হিসেবে আপনি সব কাজ দেখছেন।' : 'আপনার নিজের কাজ ও দ্রুত সংবাদ জমা দেওয়ার জায়গা।'}
        </p>
      </header>

      {/* ── আমার কাজ ─────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          আমার কাজ {assignments.length > 0 && `(${assignments.length})`}
        </h2>

        {assignments.length === 0 ? (
          <p style={{ fontSize: '0.875rem', opacity: 0.75 }}>
            এখন কোনো কাজ নেই। সম্পাদক কাজ দিলে এখানে দেখা যাবে।
          </p>
        ) : (
          <ul style={{ display: 'grid', gap: '0.75rem', listStyle: 'none', padding: 0, margin: 0 }}>
            {assignments.map((assignment) => {
              const due = dhakaDate(assignment.dueAt)
              return (
                <li
                  key={assignment.id}
                  style={{
                    border: '1px solid var(--theme-elevation-100, #e4e4e4)',
                    borderRadius: '0.5rem',
                    padding: '0.875rem',
                  }}
                >
                  <a
                    href={`/admin/collections/assignments/${assignment.id}`}
                    style={{ fontWeight: 600, display: 'block', minHeight: '1.5rem' }}
                  >
                    {assignment.title ?? '(শিরোনামহীন)'}
                  </a>

                  <p
                    style={{
                      marginTop: '0.375rem',
                      fontSize: '0.8125rem',
                      opacity: 0.8,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <span>অবস্থা: {STATUS_LABELS[assignment.status ?? ''] ?? assignment.status}</span>
                    <span>·</span>
                    <span>
                      গুরুত্ব: {PRIORITY_LABELS[assignment.priority ?? ''] ?? assignment.priority}
                    </span>
                    {due && (
                      <>
                        <span>·</span>
                        <span>সময়সীমা: {due}</span>
                      </>
                    )}
                  </p>

                  {assignment.brief && (
                    <p style={{ marginTop: '0.375rem', fontSize: '0.8125rem', opacity: 0.7 }}>
                      {assignment.brief}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ── দ্রুত সংবাদ ───────────────────────────────────────────────────── */}
      <section>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>দ্রুত সংবাদ</h2>

        {hasProfile ? (
          <QuickDraftForm categories={categories} />
        ) : (
          /*
           * Refusing here is the honest answer: an Article requires an author,
           * and the endpoint will not guess one. Better to say so than to show a
           * form that fails on submit.
           */
          <p style={{ fontSize: '0.875rem', opacity: 0.75 }}>
            আপনার অ্যাকাউন্টের সাথে কোনো লেখক প্রোফাইল যুক্ত নেই, তাই সংবাদ জমা দেওয়া যাবে না। সম্পাদকের সাথে যোগাযোগ
            করুন।
          </p>
        )}
      </section>
    </div>
  )
}
