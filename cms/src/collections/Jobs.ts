import type { CollectionConfig } from 'payload'

import { anyone, isEditorial, isSuperAdminOrEditorInChief } from '../access/roles'

/**
 * Jobs — re-scoped to education-sector jobs + BCS/government recruitment.
 *
 * `docs/education-feature-inventory.md` §3 and §0: the owner confirmed BCS and
 * job-circular content is **in scope**, matching the direct competitor's own
 * positioning.
 */
export const Jobs: CollectionConfig = {
  slug: 'jobs',
  labels: {
    singular: { en: 'Job', bn: 'চাকরি' },
    plural: { en: 'Jobs', bn: 'চাকরিসমূহ' },
  },
  admin: {
    useAsTitle: 'title',
    group: 'শিক্ষা',
    defaultColumns: ['title', 'organization', 'category', 'deadline'],
    description: 'শিক্ষা খাতের চাকরি ও সরকারি নিয়োগ।',
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
      name: 'organization',
      type: 'text',
      required: true,
      index: true,
      label: { en: 'Organization', bn: 'প্রতিষ্ঠান' },
    },
    {
      name: 'deadline',
      type: 'date',
      index: true,
      label: { en: 'Application deadline', bn: 'আবেদনের শেষ তারিখ' },
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      index: true,
      label: { en: 'Category', bn: 'ধরন' },
      options: [
        { value: 'teaching', label: 'শিক্ষকতা' },
        { value: 'bcs', label: 'বিসিএস' },
        { value: 'government', label: 'সরকারি' },
        { value: 'private', label: 'বেসরকারি' },
        { value: 'research', label: 'গবেষণা' },
      ],
    },
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
