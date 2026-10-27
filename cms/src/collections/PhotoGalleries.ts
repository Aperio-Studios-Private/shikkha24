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
    /**
     * Card grid (owner request, 2026-10-27). The gallery card shows its
     * cover; the grid reuses the same media card view as the media library.
     */
    components: {
      views: {
        list: { Component: '/components/admin/MediaListServerView#MediaListServerView' },
      },
    },
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
      admin: { description: 'গ্যালারির নাম — যা ছবিগুলোর বিষয় বলে দেয়।' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: { en: 'Slug', bn: 'স্লাগ' },
      admin: { description: 'URL-এর শেষাংশ — ইংরেজি ছোট হাতের অক্ষর, হাইফেন।' },
    },
    {
      name: 'images',
      type: 'array',
      minRows: 1,
      label: { en: 'Images', bn: 'ছবিসমূহ' },
      admin: { description: 'ক্রম অনুযায়ী দেখানো হবে — প্রতিটি ছবিতে ক্যাপশন দিন।' },
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
    {
      name: 'description',
      type: 'textarea',
      label: { en: 'Description', bn: 'বিবরণ' },
      admin: { description: 'গ্যালারির উপরে ছোট ভূমিকা।' },
    },
  ],
  timestamps: true,
}
