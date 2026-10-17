import type { CollectionConfig } from 'payload'

import { anyone, isEditorial, isSuperAdminOrEditorInChief } from '../access/roles'

/**
 * Photo galleries — restored by the audit as a required collection
 * (`.sps/content-model.md`), because the retained feature set includes galleries.
 */
export const PhotoGalleries: CollectionConfig = {
  slug: 'photo-galleries',
  labels: {
    singular: { en: 'Photo gallery', bn: 'ছবির গ্যালারি' },
    plural: { en: 'Photo galleries', bn: 'ছবির গ্যালারিসমূহ' },
  },
  admin: {
    useAsTitle: 'title',
    group: { en: 'Media (মিডিয়া)' },
    defaultColumns: ['title', 'slug', 'updatedAt'],
    description: 'ছবির গ্যালারি — প্রতিটি ছবির ক্যাপশনসহ।',
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
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: { en: 'Slug', bn: 'স্লাগ' },
    },
    {
      name: 'images',
      type: 'array',
      minRows: 1,
      label: { en: 'Images', bn: 'ছবিসমূহ' },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
          label: { en: 'Image', bn: 'ছবি' },
        },
        { name: 'caption', type: 'text', label: { en: 'Caption', bn: 'ক্যাপশন' } },
      ],
    },
    { name: 'description', type: 'textarea', label: { en: 'Description', bn: 'বিবরণ' } },
  ],
  timestamps: true,
}
