import type { Endpoint, PayloadRequest } from 'payload'

import { isEditorialUser } from '../access/roles'
import { json } from '../lib/http'

/**
 * `GET /api/admin-search?q=…` — the topbar's global search.
 *
 * ## Why this is not three client-side REST calls
 *
 * The generated list routes answer the same question, but each would need its
 * own response-shaping rules in the browser, and a client that can ask for
 * *anything* tends to get asked for everything. A custom endpoint names the
 * three surfaces it searches (articles, assignments, authors), caps each at
 * five rows, and returns only the four fields the overlay renders. The
 * response is a whitelist, not a shape the caller negotiates.
 *
 * ## Where authorisation lives
 *
 * Every `find` runs with the requester's session (`user: req.user`,
 * `overrideAccess: false`), so each collection's own `read` rule decides
 * what a given role sees — a reporter's search simply cannot surface a
 * colleague's draft. The 403 gate in front only matches who may use the
 * search box at all; it is not the filter that protects data.
 */
export const adminSearchEndpoint: Endpoint = {
  path: '/admin-search',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    if (!req.user) {
      return json({ error: 'লগইন করা নেই।' }, { status: 401 })
    }
    if (!isEditorialUser(req.user)) {
      return json({ error: 'এই কাজের অনুমতি নেই।' }, { status: 403 })
    }

    // Bound the query before it reaches the database: a 60-char cap keeps a
    // deliberately huge `q` from turning into an expensive LIKE scan.
    const raw = req.query?.q
    const q = (typeof raw === 'string' ? raw : '').trim().slice(0, 60)
    if (q.length < 2) {
      return json({ groups: [] as AdminSearchGroup[] })
    }

    // The find options shared by all three searches — session-scoped access,
    // no relation expansion, identical page size and sort.
    const scoped = {
      user: req.user,
      overrideAccess: false as const,
      depth: 0 as const,
      limit: 5,
      sort: '-updatedAt',
    }

    const [articles, assignments, authors] = await Promise.all([
      req.payload.find({ collection: 'articles', where: { title: { like: q } }, ...scoped }),
      req.payload.find({ collection: 'assignments', where: { title: { like: q } }, ...scoped }),
      req.payload.find({
        collection: 'authors',
        where: { or: [{ nameBn: { like: q } }, { nameEn: { like: q } }] },
        ...scoped,
      }),
    ])

    const groups: AdminSearchGroup[] = [
      {
        slug: 'articles',
        label: 'Articles',
        items: articles.docs.map((doc) => ({
          id: doc.id,
          title: displayTitle(doc.title),
          status: doc._status ?? null,
          href: editHref('articles', doc.id),
        })),
      },
      {
        slug: 'assignments',
        label: 'Assignments',
        items: assignments.docs.map((doc) => ({
          id: doc.id,
          title: displayTitle(doc.title),
          status: doc.status ?? null,
          href: editHref('assignments', doc.id),
        })),
      },
      {
        slug: 'authors',
        label: 'Authors',
        items: authors.docs.map((doc) => ({
          id: doc.id,
          title: authorTitle(doc),
          status: null,
          href: editHref('authors', doc.id),
        })),
      },
    ]

    // A group with zero hits is noise in a five-row overlay — omit it.
    return json({ groups: groups.filter((group) => group.items.length > 0) })
  },
}

/** One result row. These four fields are the whole response contract. */
interface AdminSearchItem {
  id: string | number
  title: string
  status: string | null
  href: string
}

/** A named set of hits, one per searched collection. */
interface AdminSearchGroup {
  slug: string
  label: string
  items: AdminSearchItem[]
}

/** Shown in place of an empty title — an editor still needs a row to click. */
const UNTITLED = 'Untitled (শিরোনামহীন)'

/** Deep-link into the document editor for one search hit. */
function editHref(slug: string, id: string | number): string {
  return `/admin/collections/${slug}/${id}`
}

/** Title with the empty-string fallback applied. */
function displayTitle(value: unknown): string {
  const title = typeof value === 'string' ? value.trim() : ''
  return title === '' ? UNTITLED : title
}

/**
 * An author's display name: Bengali first (`Authors.useAsTitle`), then the
 * English transliteration, then the shared fallback.
 */
function authorTitle(doc: { nameBn?: string | null; nameEn?: string | null }): string {
  return (
    [doc.nameBn, doc.nameEn]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .find((value) => value !== '') ?? UNTITLED
  )
}
