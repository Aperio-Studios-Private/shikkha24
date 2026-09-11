import type { CollectionConfig } from 'payload'

import { anyone, isSuperAdminOrEditorInChief } from '../access/roles'

/**
 * Categories — the 8 approved top-level education categories.
 *
 * শিক্ষা সংবাদ · বৃত্তি ও স্কলারশিপ · ভর্তি · বিশ্ববিদ্যালয় · উচ্চশিক্ষা ·
 * বিদেশে পড়াশোনা · পরীক্ষা ও ফলাফল · চাকরি ও ক্যারিয়ার
 *
 * ## Why subcategories are a self-relation, not a second collection
 *
 * `.sps/task.md` and `.sps/content-model.md` list `Subcategories` as a separate
 * collection, but the **approved** tree
 * (`docs/education-feature-inventory.md` §1) is **flat** — 8 top-level categories
 * with no subcategories defined, because স্কুল-কলেজ was deliberately rejected as
 * a category and replaced by the level filter.
 *
 * Those two positions conflict, so this models the **mechanism** (an optional
 * `parent`) while the **seed is the approved flat tree**. Editors can add
 * subcategories later — "dynamic and admin-editable" is an approved decision.
 * A parallel `Subcategories` collection would duplicate the hierarchy, split
 * internal linking, and give two ways to express the same thing.
 *
 * The URL architecture is `/:category/:subcategory/:id/:slug`
 * (`.sps/plan.md`), so a subcategory is simply a category that has a `parent`.
 */
export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: {
    singular: { en: 'Category', bn: 'বিভাগ' },
    plural: { en: 'Categories', bn: 'বিভাগসমূহ' },
  },
  admin: {
    useAsTitle: 'nameBn',
    group: 'ট্যাক্সোনমি',
    defaultColumns: ['nameBn', 'slug', 'parent', 'sortOrder', 'isActive'],
    description: 'আটটি মূল বিভাগ। উপবিভাগ যোগ করা যায় — একটি বিভাগকে অন্যটির অধীনে রাখুন।',
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
      index: true,
      label: { en: 'Name (Bengali)', bn: 'নাম (বাংলা)' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'URL-এর প্রথম অংশ। ASCII, lowercase। যেমন: scholarship।',
      },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
      label: { en: 'Parent category', bn: 'মূল বিভাগ' },
      admin: {
        description: 'খালি রাখলে এটি একটি মূল বিভাগ। উপবিভাগ তৈরি করতে একটি মূল বিভাগ নির্বাচন করুন।',
      },
      // Prevents a category from being its own parent.
      filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
    },
    {
      name: 'description',
      type: 'textarea',
      label: { en: 'Description', bn: 'বিবরণ' },
      admin: { description: 'বিভাগ পাতায় ও SEO-তে ব্যবহৃত সংক্ষিপ্ত বিবরণ।' },
    },
    {
      name: 'icon',
      type: 'text',
      label: { en: 'Icon', bn: 'আইকন' },
      admin: { description: 'ঐচ্ছিক আইকন শনাক্তকারী।' },
    },
    {
      name: 'colorAccent',
      type: 'text',
      label: { en: 'Accent colour', bn: 'রঙ' },
      admin: { description: 'হেক্স কোড। যেমন: #DA1C25।' },
      validate: (value: unknown) => {
        if (value && typeof value === 'string' && !/^#[0-9a-fA-F]{6}$/.test(value)) {
          return 'হেক্স রঙ হতে হবে, যেমন #DA1C25'
        }
        return true
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      required: true,
      defaultValue: 0,
      index: true,
      label: { en: 'Sort order', bn: 'ক্রম' },
      admin: { description: 'ছোট সংখ্যা আগে। মেনু ও গ্রিডের ক্রম নির্ধারণ করে।' },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      label: { en: 'Active', bn: 'সক্রিয়' },
      admin: { description: 'নিষ্ক্রিয় বিভাগ মেনুতে দেখানো হয় না।' },
    },
  ],
  timestamps: true,
}
