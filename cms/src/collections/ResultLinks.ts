import type { CollectionConfig } from 'payload'

import { anyone, isEditorial, isSuperAdminOrEditorInChief } from '../access/roles'

/**
 * Result Links — backs N3, the results & merit-lists hub.
 *
 * This is the "explain the official system" layer around the government portals
 * (`docs/education-competitors.md`): the boards publish results on their own
 * sites and expose **no API**, so the value Shikkha24 adds is the *how to use
 * this* content, not the data itself. `docs/data-sources.md` §2 reaches the same
 * conclusion — editorially curated, not API-fed.
 */
export const ResultLinks: CollectionConfig = {
  slug: 'result-links',
  labels: {
    singular: { en: 'Result link', bn: 'ফলাফলের লিংক' },
    plural: { en: 'Result links', bn: 'ফলাফলের লিংকসমূহ' },
  },
  admin: {
    useAsTitle: 'title',
    group: 'শিক্ষা',
    defaultColumns: ['title', 'examName', 'level', 'publicationDate', 'isPublished'],
    description: 'ফলাফল ও মেধাতালিকার লিংক এবং ব্যবহারের নিয়ম।',
  },
  access: {
    read: anyone,
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
      name: 'examName',
      type: 'text',
      required: true,
      index: true,
      label: { en: 'Exam name', bn: 'পরীক্ষার নাম' },
    },
    {
      name: 'boardOrInstitution',
      type: 'text',
      label: { en: 'Board / institution', bn: 'বোর্ড / প্রতিষ্ঠান' },
    },
    {
      name: 'level',
      type: 'relationship',
      relationTo: 'levels',
      index: true,
      label: { en: 'Level', bn: 'শ্রেণি' },
    },
    {
      name: 'publicationDate',
      type: 'date',
      index: true,
      label: { en: 'Publication date', bn: 'প্রকাশের তারিখ' },
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'officialUrl',
      type: 'text',
      required: true,
      label: { en: 'Official URL', bn: 'সরকারি লিংক' },
    },
    {
      name: 'howToSteps',
      type: 'richText',
      label: { en: 'How to check', bn: 'যেভাবে দেখবেন' },
      admin: { description: 'সরকারি সাইটে ফলাফল দেখার ধাপে ধাপে নির্দেশনা।' },
    },
    { name: 'meritListUrl', type: 'text', label: { en: 'Merit list URL', bn: 'মেধাতালিকার লিংক' } },
    {
      name: 'isPublished',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      label: { en: 'Published', bn: 'প্রকাশিত' },
      admin: { position: 'sidebar', description: 'ফলাফল প্রকাশিত হয়েছে কিনা।' },
    },
  ],
  timestamps: true,
}
