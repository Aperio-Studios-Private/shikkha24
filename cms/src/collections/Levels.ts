import type { CollectionConfig } from 'payload'

import { anyone, isSuperAdminOrEditorInChief } from '../access/roles'

/**
 * Level — the cross-cutting audience filter.
 *
 * Values: প্রাথমিক · মাধ্যমিক · উচ্চ মাধ্যমিক · স্নাতক · স্নাতকোত্তর
 *
 * This is deliberately **not** a category
 * (`docs/education-feature-inventory.md` §1). স্কুল-কলেজ is an audience segment,
 * not a topic: as a top-level category it would overlap শিক্ষা সংবাদ, ভর্তি and
 * পরীক্ষা ও ফলাফল simultaneously and split SEO authority. The level axis is
 * applied across the whole site instead — listings, search, calendar, trackers.
 *
 * Seeded with the 5 approved values; admin-editable thereafter.
 */
export const Levels: CollectionConfig = {
  slug: 'levels',
  labels: {
    singular: { en: 'Level', bn: 'শ্রেণি' },
    plural: { en: 'Levels', bn: 'শ্রেণিসমূহ' },
  },
  admin: {
    useAsTitle: 'nameBn',
    group: 'ট্যাক্সোনমি',
    defaultColumns: ['nameBn', 'slug', 'sortOrder'],
    description: 'প্রাথমিক থেকে স্নাতকোত্তর — সাইটজুড়ে ব্যবহৃত শ্রেণি ফিল্টার।',
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
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'URL-এ ব্যবহৃত ইংরেজি শনাক্তকারী। যেমন: secondary।',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      required: true,
      defaultValue: 0,
      label: { en: 'Sort order', bn: 'ক্রম' },
      admin: { description: 'ছোট সংখ্যা আগে দেখানো হবে।' },
    },
  ],
  timestamps: true,
}
