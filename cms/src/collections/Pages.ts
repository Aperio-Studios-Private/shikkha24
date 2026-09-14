import type { CollectionConfig } from 'payload'

import { anyone, isSuperAdminOrEditorInChief } from '../access/roles'

/**
 * Pages — standalone pages, restored by the audit as a required collection.
 *
 * These back the **E-E-A-T governance pages** required by `docs/seo-plan.md` and
 * Google's quality expectations: /about, /contact, /corrections-policy,
 * /fact-checking-policy, /editorial-team, /privacy-policy, /terms.
 *
 * `docs/security.md` §8 requires the privacy policy to state what is collected,
 * why, where it is stored (SQLite and media on DianaHost) and how to
 * request deletion — which is why these must be editor-managed rather than
 * hardcoded in the template.
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: {
    singular: { en: 'Page', bn: 'পাতা' },
    plural: { en: 'Pages', bn: 'পাতাসমূহ' },
  },
  admin: {
    useAsTitle: 'title',
    group: 'সম্পাদকীয়',
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
    description: 'স্থায়ী পাতা — পরিচিতি, সম্পাদকীয় নীতি, গোপনীয়তা ও শর্তাবলি।',
  },
  access: {
    read: anyone,
    create: isSuperAdminOrEditorInChief,
    update: isSuperAdminOrEditorInChief,
    delete: isSuperAdminOrEditorInChief,
  },
  versions: {
    drafts: true,
    maxPerDoc: 10,
  },
  fields: [
    { name: 'title', type: 'text', required: true, label: { en: 'Title', bn: 'শিরোনাম' } },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: { en: 'Slug', bn: 'স্লাগ' },
      admin: { description: 'যেমন: about, privacy-policy।' },
    },
    { name: 'body', type: 'richText', required: true, label: { en: 'Body', bn: 'বিষয়বস্তু' } },
    {
      name: 'showInFooter',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      label: { en: 'Show in footer', bn: 'ফুটারে দেখান' },
    },
  ],
  timestamps: true,
}
