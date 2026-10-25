import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'

import { isEditorUser, relationId } from '../../access/roles'
import { QuickDraftForm } from './QuickDraftForm'
import {
  deadlineInfo,
  dhakaDate,
  dhakaDayDiff,
  PRIORITY_CHIPS,
  STATUS_CHIPS,
  summarize,
} from './reporter-workspace-data'

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

export async function ReporterWorkspace(props: AdminViewServerProps) {
  const req = props.initPageResult?.req
  const user = req?.user
  const visibleEntities = props.visibleEntities ?? { collections: [], globals: [] }

  if (!req) {
    return (
      <DefaultTemplate {...props} viewType="reporter" visibleEntities={visibleEntities}>
        <p>Could not load the request (অ্যাডমিন অনুরোধ লোড করা যায়নি)।</p>
      </DefaultTemplate>
    )
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
  const [assignmentsResult, categoriesResult, recentResult] = await Promise.all([
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
    /*
     * C4 — the reporter's own newest articles, so filing a draft is not a
     * fire-and-forget action. Same session-scoped pattern as the assignments
     * query: Articles.read filters to what this user may see.
     */
    req.payload
      .find({
        collection: 'articles',
        depth: 0,
        limit: 5,
        overrideAccess: false,
        sort: '-updatedAt',
        user,
      })
      .catch(() => ({ docs: [] as Array<Record<string, unknown>> })),
  ])

  const assignments = (assignmentsResult.docs ?? []) as AssignmentDoc[]
  const categories = (categoriesResult.docs ?? []).map((c) => ({
    id: c.id,
    nameBn: c.nameBn ?? String(c.id),
  }))

  const isEditor = isEditorUser(user)
  const hasProfile =
    relationId((userDoc as { authorProfile?: unknown } | null)?.authorProfile) !== null

  const recentArticles = (recentResult.docs ?? []) as Array<{
    id: number | string
    title?: string | null
    reviewStatus?: string | null
    _status?: string | null
  }>

  const now = new Date()
  const { active, decided, overdue, dueSoon } = summarize(assignments, now)

  return (
    <DefaultTemplate {...props} viewType="reporter" visibleEntities={visibleEntities}>
      <div className="reporter-page">
        <header className="reporter-page__header">
          <h1>My Work (প্রতিবেদকের কাজ)</h1>
          <p>
            {isEditor
              ? 'Viewing all assignments as desk (ডেস্ক হিসেবে সব কাজ দেখা হচ্ছে)।'
              : 'Your own assignments and quick-draft (আপনার নিজের কাজ ও দ্রুত সংবাদ জমা দেওয়ার জায়গা)।'}
          </p>
          {active.length > 0 && (
            <div className="reporter-summary">
              <span className="reporter-chip reporter-chip--info">
                In progress {active.length} (চলমান)
              </span>
              {dueSoon > 0 && (
                <span className="reporter-chip reporter-chip--warning">
                  Due soon {dueSoon} (শীঘ্রই)
                </span>
              )}
              {overdue > 0 && (
                <span className="reporter-chip reporter-chip--danger">
                  Overdue {overdue} (ওভারডিউ)
                </span>
              )}
              {overdue === 0 && dueSoon === 0 && (
                <span className="reporter-chip reporter-chip--success">
                  All on track (সব ঠিক আছে)
                </span>
              )}
            </div>
          )}
        </header>

        {overdue > 0 && (
          <p className="reporter-overdue" role="alert">
            ⚠️ {overdue === 1 ? 'One assignment is' : overdue + ' assignments are'} overdue — file it
            or tell your editor (সময়সীমা পেরিয়ে গেছে — জমা দিন অথবা সম্পাদককে জানান)।
          </p>
        )}

        <section className="reporter-section">
          <h2>
            Active assignments (চলমান অ্যাসাইনমেন্ট)
            {active.length > 0 ? ' (' + active.length + ')' : ''}
          </h2>

          {active.length === 0 ? (
            <div className="reporter-empty">
              <strong>✅ Nothing due right now (এখন কোনো কাজ বাকি নেই)।</strong>
              <span>
                New assignments from your editor will appear here (সম্পাদক কাজ দিলেই এখানে দেখা যাবে)।
              </span>
            </div>
          ) : (
            <ul className="reporter-assignments">
              {active.map((assignment) => {
                const statusChip = STATUS_CHIPS[assignment.status ?? ''] ?? {
                  label: assignment.status ?? '—',
                  tone: 'info' as const,
                }
                const priorityChip = PRIORITY_CHIPS[assignment.priority ?? '']
                const diff = dhakaDayDiff(assignment.dueAt, now)
                const due = deadlineInfo(diff, dhakaDate(assignment.dueAt))
                const late = diff !== null && diff < 0
                return (
                  <li
                    key={assignment.id}
                    className={
                      late
                        ? 'reporter-assignment reporter-assignment--overdue'
                        : 'reporter-assignment'
                    }
                  >
                    <div className="reporter-assignment__head">
                      <a
                        className="reporter-assignment__title"
                        href={'/admin/collections/assignments/' + assignment.id}
                      >
                        {assignment.title ?? 'Untitled (শিরোনামহীন)'}
                      </a>
                      <span className={'reporter-chip reporter-chip--' + statusChip.tone}>
                        {statusChip.label}
                      </span>
                    </div>
                    <div className="reporter-assignment__meta">
                      {priorityChip && (
                        <span className={'reporter-chip reporter-chip--' + priorityChip.tone}>
                          {priorityChip.label}
                        </span>
                      )}
                      {due.tone === 'muted' ? (
                        <span>{due.text}</span>
                      ) : (
                        <span className={'reporter-assignment__due--' + due.tone}>{due.text}</span>
                      )}
                    </div>
                    {assignment.brief && (
                      <p className="reporter-assignment__brief">{assignment.brief}</p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {decided.length > 0 && (
          <section className="reporter-section">
            <h2>Recently decided (সম্প্রতি সিদ্ধান্ত)</h2>
            <ul className="reporter-decided">
              {decided.slice(0, 5).map((assignment) => {
                const statusChip = STATUS_CHIPS[assignment.status ?? ''] ?? {
                  label: assignment.status ?? '—',
                  tone: 'info' as const,
                }
                return (
                  <li key={assignment.id}>
                    <a href={'/admin/collections/assignments/' + assignment.id}>
                      {assignment.title ?? 'Untitled (শিরোনামহীন)'}
                    </a>
                    <span className={'reporter-chip reporter-chip--' + statusChip.tone}>
                      {statusChip.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {recentArticles.length > 0 && (
          <section className="reporter-section">
            <h2>My recent work (সাম্প্রতিক সংবাদ)</h2>
            <ul className="reporter-decided">
              {recentArticles.map((article) => {
                const status = article.reviewStatus ?? article._status ?? ''
                const tone =
                  status === 'approved' || status === 'published'
                    ? 'success'
                    : status === 'changesRequested' || status === 'rejected'
                      ? 'danger'
                      : status === 'pendingReview'
                        ? 'warning'
                        : 'info'
                const label =
                  status === 'changesRequested'
                    ? 'Returned'
                    : status === 'pendingReview'
                      ? 'In review'
                      : status
                return (
                  <li key={article.id}>
                    <a href={'/admin/collections/articles/' + article.id}>
                      {article.title ?? 'Untitled (শিরোনামহীন)'}
                    </a>
                    <span className={'reporter-chip reporter-chip--' + tone}>
                      {label || 'draft'}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <section className="reporter-section">
          <h2>Quick Draft (দ্রুত সংবাদ)</h2>

          {hasProfile ? (
            <QuickDraftForm categories={categories} />
          ) : (
            /*
             * Refusing here is the honest answer: an Article requires an author,
             * and the endpoint will not guess one. Better to say so than to show a
             * form that fails on submit.
             */
            <p style={{ fontSize: 'var(--shikkha-text-body-sm)', opacity: 0.75 }}>
              No author profile is linked to your account, so drafts cannot be submitted. Contact an
              editor (আপনার অ্যাকাউন্টের সাথে কোনো লেখক প্রোফাইল যুক্ত নেই, তাই সংবাদ জমা দেওয়া যাবে না)।
            </p>
          )}
        </section>
      </div>
    </DefaultTemplate>
  )
}
