import type { CollectionConfig } from 'payload'

import { isSelfOrAdmin, isSuperAdmin } from '../access/roles'

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
    // A reader sees and manages only their own bookmarks.
    create: isSelfOrAdmin,
    read: isSelfOrAdmin,
    update: isSelfOrAdmin,
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
