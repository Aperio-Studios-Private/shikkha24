import type { CollectionConfig } from 'payload'

import { isSuperAdminOrEditorInChief, publishedOrEditor } from '../access/roles'

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
    group: { en: 'Editorial (সম্পাদকীয়)' },
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
    description: 'স্থায়ী পাতা — পরিচিতি, সম্পাদকীয় নীতি, গোপনীয়তা ও শর্তাবলি।',
  },
  access: {
    /*
     * ⚠️ **Was `anyone`, which leaked unpublished drafts — fixed 2026-10-16 (T-20).**
     *
     * `drafts: true` below is what made this a leak rather than a curiosity.
     * `anyone` is `() => true`, and Payload combines the access result with the
     * query as `combineQueries(where, accessResult)`; `hasWhereAccessResult(true)`
     * is false, so **nothing** is ANDed in. Payload then routes `?draft=true`
     * through `queryDrafts`, which reads the versions table — so an anonymous
     * `GET /api/pages?draft=true` returned the latest *unpublished* revision of
     * every page, including a half-written privacy policy or a staged correction.
     *
     * This was the only drafts-enabled collection left on `anyone`. `Articles` uses
     * `publishedOrEditor` and `ResultLinks` was fixed for the same shape with the
     * note that "the publish filter existed but was applied only by the consumer,
     * which means the CMS was the thing leaking". `Pages` had no consumer filter
     * and no verify gate, which is why it survived.
     *
     * `publishedOrEditor` keeps the published pages public — `/about`,
     * `/privacy-policy` and the footer links are unaffected — and returns
     * `{ _status: { equals: 'published' } }` to everyone else.
     */
    read: publishedOrEditor,
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
