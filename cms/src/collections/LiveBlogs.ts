import type { CollectionConfig } from 'payload'

import { activeOrEditor, isEditorial, isSuperAdminOrEditorInChief } from '../access/roles'

/**
 * Live blogs — re-scoped to **result-day and admission-day coverage**.
 *
 * `docs/education-feature-inventory.md` §3: the general-news "elections, crises"
 * use case becomes result publication days and admission lottery day — the two
 * moments when Bangladeshi education traffic spikes hardest.
 *
 * `docs/performance-budget.md` §4 requires the live blog to be lazy-loaded and
 * isolated in an Astro island; this collection only supplies the data.
 */
export const LiveBlogs: CollectionConfig = {
  slug: 'live-blogs',
  labels: {
    singular: { en: 'Live blog', bn: 'লাইভ ব্লগ' },
    plural: { en: 'Live blogs', bn: 'লাইভ ব্লগসমূহ' },
  },
  admin: {
    useAsTitle: 'title',
    group: 'ইন্টারঅ্যাকটিভ',
    defaultColumns: ['title', 'slug', 'isActive', 'updatedAt'],
    description: 'ফলাফল প্রকাশ বা ভর্তি লটারির দিনের লাইভ কভারেজ।',
  },
  access: {
    /*
     * ⚠️ Was `anyone`, which served deactivated rows to anonymous API callers
     * — fixed 2026-10-16 (T-20). `isActive` defaults to true and an editor turns
     * it OFF to withdraw a row, so the CMS was returning withdrawn content and
     * every consumer had to remember to filter. Same shape as the `ResultLinks`
     * fix. Editors keep an unfiltered view so the admin list can show a row in
     * order to switch it back on.
     */
    read: activeOrEditor,
    create: isEditorial,
    update: isEditorial,
    delete: isSuperAdminOrEditorInChief,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      index: true,
      label: { en: 'Title', bn: 'শিরোনাম' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: { en: 'Slug', bn: 'স্লাগ' },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      label: { en: 'Live', bn: 'চলমান' },
      admin: { position: 'sidebar', description: 'বন্ধ করলে লাইভ আপডেট বন্ধ হবে।' },
    },
    {
      name: 'entries',
      type: 'array',
      label: { en: 'Entries', bn: 'এন্ট্রিসমূহ' },
      admin: { description: 'নতুন এন্ট্রি উপরে যোগ করুন।' },
      fields: [
        {
          name: 'timestamp',
          type: 'date',
          required: true,
          label: { en: 'Time', bn: 'সময়' },
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
        { name: 'content', type: 'richText', required: true, label: { en: 'Update', bn: 'আপডেট' } },
        {
          name: 'isKeyEvent',
          type: 'checkbox',
          defaultValue: false,
          label: { en: 'Key event', bn: 'মূল ঘটনা' },
          admin: { description: 'মূল ঘটনাগুলো বিশেষভাবে হাইলাইট করা হয়।' },
        },
      ],
    },
  ],
  timestamps: true,
}
