import type { CollectionConfig } from 'payload'

import { anyone, isEditorial, isSuperAdminOrEditorInChief } from '../access/roles'

/**
 * Tags — free-form topical labels, separate from the category tree.
 *
 * Categories answer "what does the reader want"; tags are cross-cutting labels
 * that cut across categories (e.g. একটি নির্দিষ্ট বৃত্তির নাম, or an exam name).
 * Reporters may create tags inline while writing, which is why `create` is open
 * to any editorial role rather than restricted to editors.
 */
export const Tags: CollectionConfig = {
  slug: 'tags',
  labels: {
    singular: { en: 'Tag', bn: 'ট্যাগ' },
    plural: { en: 'Tags', bn: 'ট্যাগসমূহ' },
  },
  admin: {
    useAsTitle: 'nameBn',
    group: { en: 'Taxonomy (ট্যাক্সোনমি)' },
    defaultColumns: ['nameBn', 'slug', 'updatedAt'],
    description: 'বিভাগের বাইরে বিষয়ভিত্তিক লেবেল। লেখার সময়েই তৈরি করা যায়।',
  },
  access: {
    read: anyone,
    create: isEditorial,
    update: isEditorial,
    delete: isSuperAdminOrEditorInChief,
  },
  fields: [
    {
      name: 'nameBn',
      type: 'text',
      required: true,
      index: true,
      label: { en: 'Name (Bengali)', bn: 'নাম (বাংলা)' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'URL-এ ব্যবহৃত ASCII শনাক্তকারী।' },
    },
  ],
  timestamps: true,
}
