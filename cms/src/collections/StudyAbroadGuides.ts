import type { CollectionConfig } from 'payload'

import { anyone, isEditorial, isSuperAdminOrEditorInChief } from '../access/roles'

/**
 * Study-abroad guides — backs N10, the *দেশ-বিদেশের* half of the positioning.
 *
 * Day 1 ships a **starter set of 8 destinations** — UK, USA, Canada, Australia,
 * Malaysia, Japan, South Korea, Germany — per
 * `docs/education-feature-inventory.md` §4. Strong long-tail SEO surface.
 */
export const StudyAbroadGuides: CollectionConfig = {
  slug: 'study-abroad-guides',
  labels: {
    singular: { en: 'Study-abroad guide', bn: 'বিদেশে পড়াশোনার গাইড' },
    plural: { en: 'Study-abroad guides', bn: 'বিদেশে পড়াশোনার গাইডসমূহ' },
  },
  admin: {
    useAsTitle: 'country',
    group: 'শিক্ষা',
    defaultColumns: ['country', 'slug', 'isFeatured'],
    description: 'প্রতিটি দেশের জন্য ভিসা, খরচ, ইনটেক ও আবেদনের ধাপ।',
  },
  access: {
    read: anyone,
    create: isEditorial,
    update: isEditorial,
    delete: isSuperAdminOrEditorInChief,
  },
  fields: [
    {
      name: 'country',
      type: 'text',
      required: true,
      index: true,
      label: { en: 'Country', bn: 'দেশ' },
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
      name: 'visaRequirements',
      type: 'richText',
      label: { en: 'Visa requirements', bn: 'ভিসার শর্ত' },
    },
    { name: 'tuitionRange', type: 'text', label: { en: 'Tuition range', bn: 'টিউশন ফি' } },
    {
      name: 'livingCostRange',
      type: 'text',
      label: { en: 'Living cost range', bn: 'জীবনযাত্রার খরচ' },
    },
    { name: 'intakes', type: 'text', label: { en: 'Intakes', bn: 'ভর্তির সময়' } },
    {
      name: 'applicationSteps',
      type: 'richText',
      label: { en: 'Application steps', bn: 'আবেদনের ধাপ' },
    },
    {
      name: 'scholarshipNotes',
      type: 'richText',
      label: { en: 'Scholarship notes', bn: 'বৃত্তির তথ্য' },
    },
    {
      name: 'isFeatured',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      label: { en: 'Featured', bn: 'বিশেষ' },
      admin: { position: 'sidebar' },
    },
  ],
  timestamps: true,
}
