import type { CollectionConfig } from 'payload'

import { isOwnReaderRowOrSuperAdmin, isSuperAdmin, noOne } from '../access/roles'

/**
 * Reader bookmarks — one row per saved item, owned by the reader who saved it.
 *
 * ## Browser-local first, CMS second
 *
 * The reader-facing rule from S8 carries over: a feature whose dependency is
 * missing must be **absent**, not a control that appears to work and then fails.
 * A reader with no account still gets working bookmarks — they live in
 * `localStorage` and are merged into this collection the moment they sign in.
 * So a row here always has a `reader`; a bookmark with no account never reaches
 * the database at all.
 *
 * ## Why one collection for two kinds of thing
 *
 * An article and a deadline are both "something a reader wants to come back to",
 * and the listing UI shows them in one place. Two collections would mean two
 * fetch paths, two sync paths and two sets of access rules for one reader
 * concept. The `kind` discriminator below keeps the queries honest.
 *
 * `SavedDeadlines` stays separate because it carries reminder state
 * (`remindAt`, `notified`) that a bookmark has no use for — merging them would
 * put four always-null columns on every saved article.
 */
export const Bookmarks: CollectionConfig = {
  slug: 'bookmarks',
  labels: {
    singular: { en: 'Bookmark', bn: 'বুকমার্ক' },
    plural: { en: 'Bookmarks', bn: 'বুকমার্ক' },
  },
  admin: {
    useAsTitle: 'id',
    group: 'পাঠক',
    defaultColumns: ['reader', 'kind', 'createdAt'],
    description: 'পাঠকের সেভ করা সংবাদ ও সময়সীমা।',
  },
  access: {
    /*
     * ⚠️ The generated create route is closed. Ownership lives in the `reader`
     * relation, and a `create` rule **cannot express "set this field to me"** — a
     * `Where` returned from `create` is simply truthy, so it would authorise the
     * write while doing nothing to constrain the `reader` value. A reader could
     * then file bookmarks into someone else's list.
     *
     * When the CMS sync is built it will be an endpoint that writes through the
     * local API with `overrideAccess` and sets `reader` from the session — the
     * same shape as `/api/comments/submit` and `/api/push/*`. That is the
     * project's established pattern for a public write, not this route.
     */
    create: noOne,
    // A reader sees and manages only their own bookmarks — matched on the
    // `reader` relation, NOT on the row id. See `isOwnReaderRowOrSuperAdmin`.
    read: isOwnReaderRowOrSuperAdmin,
    update: isOwnReaderRowOrSuperAdmin,
    delete: isSuperAdmin,
  },
  fields: [
    {
      name: 'reader',
      type: 'relationship',
      relationTo: 'readers',
      required: true,
      index: true,
      label: { en: 'Reader', bn: 'পাঠক' },
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      index: true,
      label: { en: 'Kind', bn: 'ধরন' },
      options: [
        { value: 'article', label: { en: 'Article', bn: 'সংবাদ' } },
        { value: 'deadline', label: { en: 'Deadline', bn: 'সময়সীমা' } },
      ],
    },
    {
      name: 'article',
      type: 'relationship',
      relationTo: 'articles',
      index: true,
      label: { en: 'Article', bn: 'সংবাদ' },
      admin: { condition: (_data, siblingData) => siblingData?.kind === 'article' },
    },
    {
      name: 'deadline',
      type: 'relationship',
      relationTo: 'deadlines',
      index: true,
      label: { en: 'Deadline', bn: 'সময়সীমা' },
      admin: { condition: (_data, siblingData) => siblingData?.kind === 'deadline' },
    },
  ],
  timestamps: true,
}
