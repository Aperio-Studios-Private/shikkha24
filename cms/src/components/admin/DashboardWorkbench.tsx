import { headers as getHeaders } from 'next/headers.js'
import Link from 'next/link'
import type { Where } from 'payload'
import { getPayload } from 'payload'

import { hasRole, isEditorUser, relationId } from '../../access/roles'
import config from '../../payload.config'
import {
  collectionPath,
  countRequest,
  exactTime,
  listRequest,
  relativeTime,
  reviewLabel,
  reviewTone,
  type WorkbenchCard,
  type WorkItem,
} from './dashboard-workbench-data'

/**
 * Task-first dashboard cards before Payload's collection overview.
 *
 * Reporters also get a "My Work" row inside this section (T-89 C1c7
 * consolidation): it carries the dashboard-body entry to /admin/reporter that
 * the retired standalone banner used to provide, now shown only to the role it
 * serves instead of every signed-in user.
 */
export async function DashboardWorkbench() {
  const headers = await getHeaders()
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth({ headers })

  if (!user) return null

  const editor = isEditorUser(user)
  if (hasRole(user, 'adManager')) return null

  const userDoc = editor
    ? null
    : await payload
        .findByID({
          collection: 'users',
          id: user.id,
          depth: 0,
          user,
          overrideAccess: false,
        })
        .catch(() => null)

  const authorId = relationId((userDoc as { authorProfile?: unknown } | null)?.authorProfile)
  const ownArticles: Where | null = editor
    ? null
    : authorId === null
      ? { id: { equals: '__unlinked__' } }
      : { author: { equals: authorId } }

  const [
    openAssignments,
    readyToPublish,
    changesRequested,
    rejectedAssignments,
    unapprovedComments,
    newSubmissions,
    recentDocs,
  ] = await Promise.all([
    countRequest(
      payload.count({
        collection: 'assignments',
        user,
        overrideAccess: false,
        where: { status: { in: ['assigned', 'accepted', 'inProgress'] } },
      }),
    ),
    countRequest(
      payload.count({
        collection: 'articles',
        user,
        overrideAccess: false,
        where: ownArticles
          ? { and: [ownArticles, { _status: { equals: 'draft' } }] }
          : { _status: { equals: 'draft' } },
      }),
    ),
    countRequest(
      payload.count({
        collection: 'articles',
        user,
        overrideAccess: false,
        where: ownArticles
          ? { and: [ownArticles, { reviewStatus: { equals: 'changesRequested' } }] }
          : { reviewStatus: { equals: 'changesRequested' } },
      }),
    ),
    countRequest(
      payload.count({
        collection: 'assignments',
        user,
        overrideAccess: false,
        where: { status: { equals: 'rejected' } },
      }),
    ),
    editor
      ? countRequest(
          payload.count({
            collection: 'comments',
            user,
            overrideAccess: false,
            where: { isApproved: { equals: false } },
          }),
        )
      : Promise.resolve(0),
    editor
      ? countRequest(
          payload.count({
            collection: 'citizen-submissions',
            user,
            overrideAccess: false,
            where: { status: { equals: 'new' } },
          }),
        )
      : Promise.resolve(0),
    listRequest(
      payload.find({
        collection: 'articles',
        depth: 0,
        limit: 3,
        overrideAccess: false,
        sort: '-updatedAt',
        user,
        ...(ownArticles ? { where: ownArticles } : {}),
      }),
    ),
  ])

  const attentionCount = [
    changesRequested,
    rejectedAssignments,
    ...(editor ? [unapprovedComments, newSubmissions] : []),
  ].some((count) => count === null)
    ? null
    : (changesRequested ?? 0) +
      (rejectedAssignments ?? 0) +
      (editor ? (unapprovedComments ?? 0) + (newSubmissions ?? 0) : 0)

  const attentionSources = [
    {
      count: changesRequested ?? 0,
      href: collectionPath('articles', {
        ...(editor
          ? { 'where[reviewStatus][in]': 'changesRequested' }
          : authorId === null
            ? { 'where[id][equals]': '__unlinked__' }
            : {
                'where[and][0][author][equals]': String(authorId),
                'where[and][1][reviewStatus][in]': 'changesRequested',
              }),
      }),
      label: 'returned articles',
    },
    {
      count: rejectedAssignments ?? 0,
      href: collectionPath('assignments', {
        'where[status][equals]': 'rejected',
      }),
      label: 'rejected assignments',
    },
    ...(editor
      ? [
          {
            count: unapprovedComments ?? 0,
            href: collectionPath('comments', {
              'where[isApproved][equals]': 'false',
            }),
            label: 'comments to approve',
          },
          {
            count: newSubmissions ?? 0,
            href: collectionPath('citizen-submissions', {
              'where[status][equals]': 'new',
            }),
            label: 'citizen submissions',
          },
        ]
      : []),
  ]
  const attentionTarget =
    attentionCount === null
      ? null
      : attentionSources.reduce((current, candidate) =>
          candidate.count > current.count ? candidate : current,
        )

  const readyToPublishHref = editor
    ? collectionPath('articles', {
        'where[_status][equals]': 'draft',
      })
    : authorId === null
      ? collectionPath('articles', {
          'where[id][equals]': '__unlinked__',
        })
      : collectionPath('articles', {
          'where[and][0][author][equals]': String(authorId),
          'where[and][1][_status][equals]': 'draft',
        })
  const openAssignmentsHref = collectionPath('assignments', {
    'where[status][in]': 'assigned,accepted,inProgress',
  })
  const articlesPath = collectionPath('articles')
  const attentionHref =
    attentionCount === null
      ? articlesPath
      : attentionCount === 0
        ? editor
          ? collectionPath('articles', {
              'where[reviewStatus][in]': 'pendingReview',
            })
          : '/admin/reporter'
        : (attentionTarget?.href ?? articlesPath)

  const cards: WorkbenchCard[] = [
    {
      count: openAssignments,
      actionLabel: 'Open queue',
      emptyDescription: 'No active assignments right now.',
      description: editor ? 'The newsroom work queue.' : 'Work assigned to you.',
      href: openAssignmentsHref,
      tone: 'info',
      title: '📋 Open assignments',
    },
    {
      count: readyToPublish,
      actionLabel: 'Review drafts',
      emptyDescription: 'No unpublished articles right now.',
      description: editor ? 'All unpublished articles.' : 'Your unpublished articles.',
      href: readyToPublishHref,
      tone: 'success',
      title: '🟢 Unpublished articles',
    },
    {
      count: attentionCount,
      actionLabel: editor ? 'Open priority' : 'Open My Work',
      emptyDescription: 'No blockers or moderation items right now.',
      description:
        attentionCount === null
          ? 'Some queues could not be loaded.'
          : attentionCount === 0
            ? editor
              ? 'Review, moderation, and rejected work are clear.'
              : 'No rejected or returned work.'
            : `Highest priority: ${attentionTarget?.label ?? 'unavailable'}.`,
      href: attentionHref,
      tone: 'warning',
      title: '⚠️ Needs attention',
    },
  ]
  const recent: WorkItem[] = recentDocs.map((doc) => ({
    href: `/admin/collections/articles/${doc.id}`,
    label: doc.title ?? `Article ${doc.id}`,
    status: reviewLabel(doc),
    statusTone: reviewTone(doc),
    timestamp: relativeTime(doc.updatedAt),
    timestampTitle: exactTime(doc.updatedAt),
    datetime: doc.updatedAt ?? null,
  }))

  return (
    <>
      <section className="dashboard-greeting" aria-label="Daily greeting">
        <div className="dashboard-greeting__content">
          <span className="dashboard-greeting__eyebrow">Today</span>
          <h2 className="dashboard-greeting__title">Welcome back to Shikkha24</h2>
          <p className="dashboard-greeting__description">
            Check your queues, continue recent work, and keep the newsroom moving.
          </p>
        </div>
        <Link className="dashboard-greeting__action" href="/admin/collections/articles?limit=10">
          Start writing
        </Link>
      </section>
      {/* D1 — publishing-flow explainer: one line, no new data, teaches the loop. */}
      <section className="dashboard-flow" aria-label="How publishing works (প্রকাশনার ধাপ)">
        <ol className="dashboard-flow__steps">
          <li>
            <span aria-hidden>✍️</span> Draft (খসড়া)
          </li>
          <li aria-hidden className="dashboard-flow__arrow">
            →
          </li>
          <li>
            <span aria-hidden>🔍</span> Review (পর্যালোচনা)
          </li>
          <li aria-hidden className="dashboard-flow__arrow">
            →
          </li>
          <li>
            <span aria-hidden>✅</span> Publish (প্রকাশ)
          </li>
          <li aria-hidden className="dashboard-flow__arrow">
            →
          </li>
          <li>
            <span aria-hidden>🌐</span> Site rebuild ≤5 min (সাইট হালনাগাদ)
          </li>
        </ol>
      </section>
      <section
        aria-labelledby="dashboard-workbench-title"
        className="dashboard-workbench dashboard-workbench--modern"
      >
        <h2 id="dashboard-workbench-title">Start here</h2>
        <div className="dashboard-workbench__cards">
          {cards.map((card) => (
            <Link
              className={`dashboard-workbench__card dashboard-workbench__card--${card.tone}`}
              href={card.href}
              key={card.title}
            >
              <span className="dashboard-workbench__title">{card.title}</span>
              <strong className="dashboard-workbench__count">
                {card.count === null ? '—' : card.count}
              </strong>
              <span className="dashboard-workbench__description">
                {card.count === 0 ? card.emptyDescription : card.description}
              </span>
              <span className="dashboard-workbench__action">{card.actionLabel}</span>
            </Link>
          ))}
        </div>
        {!editor && (
          <div className="dashboard-workbench__mywork">
            <div>
              <h3>🗂️ My Work (প্রতিবেদকের কাজ)</h3>
              <p>
                See your assignments and submit a quick draft (আপনার কাজের তালিকা দেখুন এবং দ্রুত সংবাদ জমা
                দিন)।
              </p>
            </div>
            <Link className="dashboard-workbench__mywork-action" href="/admin/reporter">
              Open My Work
            </Link>
          </div>
        )}
        <div className="dashboard-workbench__recent">
          <div className="dashboard-workbench__recent-header">
            <h3>Recent work</h3>
            <Link className="dashboard-workbench__browse" href={articlesPath}>
              Browse all
            </Link>
          </div>
          {recent.length === 0 ? (
            /* D2 — empty state as onboarding: why this surface exists + one action. */
            <div className="dashboard-empty">
              <strong>No work yet today (আজ এখনো কিছু নেই)।</strong>
              <span>
                Articles you write appear here, newest first — start with a draft and it shows up
                immediately (আপনার লেখা সংবাদ এখানে দেখা যাবে)।
              </span>
              <a className="dashboard-empty__action" href="/admin/collections/articles/create">
                ＋ Create first article (প্রথম সংবাদ লিখুন)
              </a>
            </div>
          ) : (
            <ul>
              {recent.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} title={item.timestampTitle}>
                    <span className="dashboard-workbench__item-label">{item.label}</span>
                    <span className="dashboard-workbench__item-meta">
                      <span
                        className={`dashboard-workbench__status dashboard-workbench__status--${item.statusTone}`}
                      >
                        {item.status}
                      </span>
                      <time dateTime={item.datetime ?? undefined}>{item.timestamp}</time>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  )
}
