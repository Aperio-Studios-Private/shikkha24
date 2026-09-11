import type { CollectionConfig } from 'payload'

import { anyone, isSuperAdminOrEditorInChief } from '../access/roles'

/**
 * District — the "আমার জেলা" (my district) filter axis.
 *
 * 64 districts grouped into 8 divisions. Seeded from
 * `cms/src/seed/districts.ts`; admin-editable afterwards.
 *
 * Like `Levels`, this is a **cross-cutting filter, not a category**
 * (`docs/education-feature-inventory.md` §1). It powers district-first
 * opportunities (N9): local scholarships, admission news and exam centres.
 */
export const Districts: CollectionConfig = {
  slug: 'districts',
  labels: {
    singular: { en: 'District', bn: 'জেলা' },
    plural: { en: 'Districts', bn: 'জেলাসমূহ' },
  },
  admin: {
    useAsTitle: 'nameBn',
    group: 'ট্যাক্সোনমি',
    defaultColumns: ['nameBn', 'divisionBn', 'slug'],
    description: '৬৪টি জেলা — "আমার জেলা" ফিল্টারে ব্যবহৃত।',
  },
  access: {
    read: anyone,
    create: isSuperAdminOrEditorInChief,
    update: isSuperAdminOrEditorInChief,
    delete: isSuperAdminOrEditorInChief,
  },
  fields: [
    {
      name: 'nameBn',
      type: 'text',
      required: true,
      label: { en: 'Name (Bengali)', bn: 'নাম (বাংলা)' },
    },
    {
      name: 'nameEn',
      type: 'text',
      required: true,
      label: { en: 'Name (English)', bn: 'নাম (ইংরেজি)' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'URL-এ ব্যবহৃত ASCII শনাক্তকারী। যেমন: dhaka।' },
    },
    {
      name: 'divisionBn',
      type: 'text',
      required: true,
      index: true,
      label: { en: 'Division (Bengali)', bn: 'বিভাগ' },
      admin: { description: 'যেমন: ঢাকা।' },
    },
    {
      name: 'divisionEn',
      type: 'text',
      required: true,
      label: { en: 'Division (English)', bn: 'বিভাগ (ইংরেজি)' },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      label: { en: 'Sort order', bn: 'ক্রম' },
    },
  ],
  timestamps: true,
}
