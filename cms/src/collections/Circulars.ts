import type { CollectionConfig } from 'payload'

import { anyone, isEditorial, isSuperAdminOrEditorInChief } from '../access/roles'

/**
 * Circulars — backs N8, the circular tracker (education + BCS/job circulars).
 *
 * BCS and government-job circulars are **explicitly in scope** (owner decision,
 * `docs/education-feature-inventory.md` §0): they match Dainik Shiksha's own
 * positioning and are a proven Bangladesh traffic engine.
 */
export const Circulars: CollectionConfig = {
  slug: 'circulars',
  labels: {
    singular: { en: 'Circular', bn: 'বিজ্ঞপ্তি' },
    plural: { en: 'Circulars', bn: 'বিজ্ঞপ্তিসমূহ' },
  },
  admin: {
    useAsTitle: 'title',
    group: { en: 'Education (শিক্ষা)' },
    defaultColumns: ['title', 'organisation', 'type', 'deadline'],
    description: 'শিক্ষা ও চাকরির বিজ্ঞপ্তি — আবেদনের শেষ তারিখসহ।',
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
      name: 'organisation',
      type: 'text',
      required: true,
      index: true,
      label: { en: 'Organisation', bn: 'প্রতিষ্ঠান' },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      index: true,
      label: { en: 'Type', bn: 'ধরন' },
      options: [
        { value: 'education', label: 'Education (শিক্ষা)' },
        { value: 'bcs', label: 'BCS' },
        { value: 'governmentJob', label: 'Government Job (সরকারি চাকরি)' },
        { value: 'privateJob', label: 'Private Job (বেসরকারি চাকরি)' },
      ],
    },
    {
      name: 'level',
      type: 'relationship',
      relationTo: 'levels',
      hasMany: true,
      label: { en: 'Level', bn: 'শ্রেণি' },
    },
    {
      name: 'publishedDate',
      type: 'date',
      label: { en: 'Published date', bn: 'প্রকাশের তারিখ' },
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'deadline',
      type: 'date',
      index: true,
      label: { en: 'Application deadline', bn: 'আবেদনের শেষ তারিখ' },
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    { name: 'vacancyCount', type: 'number', label: { en: 'Vacancies', bn: 'পদসংখ্যা' } },
    {
      name: 'circularImage',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Circular image', bn: 'বিজ্ঞপ্তির ছবি' },
    },
    { name: 'applyUrl', type: 'text', label: { en: 'Apply URL', bn: 'আবেদনের লিংক' } },
    { name: 'description', type: 'richText', label: { en: 'Description', bn: 'বিবরণ' } },
  ],
  timestamps: true,
}
