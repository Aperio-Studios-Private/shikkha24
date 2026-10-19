import { headers as getHeaders } from 'next/headers.js'
import Link from 'next/link'
import { getPayload } from 'payload'

import { isEditorUser, relationId } from '../../access/roles'
import config from '../../payload.config'
import {
  countRequest,
  listRequest,
  reviewLabel,
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
  const cards: WorkbenchCard[] = [
    {
      count: openAssignments,
      description: editor ? 'The newsroom work queue.' : 'Work assigned to you.',
      href: '/admin/collections/assignments',
      title: '📋 Open assignments',
    },
    {
      count: readyToPublish,
      description: editor ? 'Approved drafts ready to go live.' : 'Your approved drafts.',
      href: '/admin/collections/articles',
      title: '🟢 Ready to publish',
    },
    {
      count: attentionCount,
      description: editor ? 'Review, moderation, and rejected work.' : 'Rejected or returned work.',
      href: editor ? '/admin/collections/articles' : '/admin/reporter',
      title: '⚠️ Needs attention',
    },
  ]
  const recent: WorkItem[] = recentDocs.map((doc) => ({
    href: `/admin/collections/articles/${doc.id}`,
    label: doc.title ?? `Article ${doc.id}`,
    meta: reviewLabel(doc),
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
            <span className="dashboard-workbench__description">{card.description}</span>
          </Link>
        ))}
      </div>
      <div className="dashboard-workbench__recent">
        <h3>Recent work</h3>
        {recent.length === 0 ? (
          <p>No recent articles yet. Create a draft to see it here.</p>
        ) : (
          <ul>
            {recent.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
                <span>{item.meta}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
