import { headers as getHeaders } from 'next/headers.js'
import Link from 'next/link'
import { getPayload } from 'payload'

import { isEditorUser, relationId } from '../../access/roles'
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
 */
export async function DashboardWorkbench() {
  const headers = await getHeaders()
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth({ headers })

  if (!user) return null

  const editor = isEditorUser(user)
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
  const ownArticles = authorId === null ? null : { author: { equals: authorId } }

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
        where: {
          and: [{ reviewStatus: { equals: 'approved' } }, { _status: { equals: 'draft' } }],
        },
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

  const attentionCount =
    (changesRequested ?? 0) +
    (rejectedAssignments ?? 0) +
    (editor ? (unapprovedComments ?? 0) + (newSubmissions ?? 0) : 0)

  const attentionSources = [
    {
      count: changesRequested ?? 0,
      href: collectionPath('articles', {
        'where[reviewStatus][in]': 'changesRequested',
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
  const attentionTarget = attentionSources.reduce((current, candidate) =>
    candidate.count > current.count ? candidate : current,
  )

  const readyToPublishHref = collectionPath('articles', {
    'where[and][0][reviewStatus][equals]': 'approved',
    'where[and][1][_status][equals]': 'draft',
  })
  const openAssignmentsHref = collectionPath('assignments', {
    'where[status][in]': 'assigned,accepted,inProgress',
  })
  const attentionHref =
    attentionCount === 0
      ? editor
        ? collectionPath('articles', {
            'where[reviewStatus][in]': 'pendingReview',
          })
        : '/admin/reporter'
      : attentionTarget.href

  const cards: WorkbenchCard[] = [
    {
      count: openAssignments,
      actionLabel: 'Open queue',
      emptyDescription: 'No active assignments right now.',
      description: editor ? 'The newsroom work queue.' : 'Work assigned to you.',
      href: openAssignmentsHref,
      title: '📋 Open assignments',
    },
    {
      count: readyToPublish,
      actionLabel: 'Review drafts',
      emptyDescription: 'No approved drafts are waiting to publish.',
      description: editor ? 'Approved drafts ready to go live.' : 'Your approved drafts.',
      href: readyToPublishHref,
      title: '🟢 Ready to publish',
    },
    {
      count: attentionCount,
      actionLabel: editor ? 'Open priority' : 'Open My Work',
      emptyDescription: 'No blockers or moderation items right now.',
      description:
        attentionCount === 0
          ? editor
            ? 'Review, moderation, and rejected work are clear.'
            : 'No rejected or returned work.'
          : `Highest priority: ${attentionTarget.label}.`,
      href: attentionHref,
      title: '⚠️ Needs attention',
    },
  ]
  const articlesPath = collectionPath('articles')
  const recent: WorkItem[] = recentDocs.map((doc) => ({
    href: `/admin/collections/articles/${doc.id}`,
    label: doc.title ?? `Article ${doc.id}`,
    status: reviewLabel(doc),
    statusTone: reviewTone(doc),
    timestamp: relativeTime(doc.updatedAt),
    timestampTitle: exactTime(doc.updatedAt),
  }))

  return (
    <section aria-labelledby="dashboard-workbench-title" className="dashboard-workbench">
      <h2 id="dashboard-workbench-title">Start here</h2>
      <div className="dashboard-workbench__cards">
        {cards.map((card) => (
          <Link className="dashboard-workbench__card" href={card.href} key={card.title}>
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
      <div className="dashboard-workbench__recent">
        <div className="dashboard-workbench__recent-header">
          <h3>Recent work</h3>
          <Link className="dashboard-workbench__browse" href={articlesPath}>
            Browse all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p>No recent articles yet. Create a draft to see it here.</p>
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
                    <time dateTime={item.timestampTitle}>{item.timestamp}</time>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
