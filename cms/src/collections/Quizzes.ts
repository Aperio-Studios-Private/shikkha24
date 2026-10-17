import type { CollectionConfig } from 'payload'

import { activeOrEditor, isEditorial, isSuperAdminOrEditorInChief } from '../access/roles'

/**
 * Quizzes — the **daily admission + BCS current-affairs quiz**.
 *
 * `docs/education-feature-inventory.md` §3: the general-news "daily current
 * affairs quiz" becomes an admission + BCS quiz, which "targets the
 * exam-candidate habit loop directly" — the retention engine behind the portal's
 * repeat-visit strategy.
 */
export const Quizzes: CollectionConfig = {
  slug: 'quizzes',
  labels: {
    singular: { en: 'Quiz', bn: 'কুইজ' },
    plural: { en: 'Quizzes', bn: 'কুইজসমূহ' },
  },
  admin: {
    useAsTitle: 'title',
    group: { en: 'Interactive (ইন্টারঅ্যাকটিভ)' },
    defaultColumns: ['title', 'date', 'isActive'],
    description: 'ভর্তি ও বিসিএস প্রস্তুতির দৈনিক কুইজ।',
  },
  access: {
    /*
     * ⚠️ Was `anyone`, which served deactivated rows to anonymous API callers
     * — fixed 2026-10-16 (T-20). `isActive` defaults to true and an editor turns
     * it OFF to withdraw a row, so the CMS was returning withdrawn content and
     * every consumer had to remember to filter. Same shape as the `ResultLinks`
     * fix. Editors keep an unfiltered view so the admin list can show a row in
     * order to switch it back on.
     */
    read: activeOrEditor,
    create: isEditorial,
    update: isEditorial,
    delete: isSuperAdminOrEditorInChief,
  },
  fields: [
    { name: 'title', type: 'text', required: true, label: { en: 'Title', bn: 'শিরোনাম' } },
    {
      name: 'date',
      type: 'date',
      required: true,
      index: true,
      label: { en: 'Quiz date', bn: 'কুইজের তারিখ' },
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'questions',
      type: 'array',
      minRows: 1,
      label: { en: 'Questions', bn: 'প্রশ্নসমূহ' },
      fields: [
        { name: 'question', type: 'text', required: true, label: { en: 'Question', bn: 'প্রশ্ন' } },
        {
          name: 'options',
          type: 'array',
          minRows: 2,
          label: { en: 'Options', bn: 'বিকল্পসমূহ' },
          fields: [
            { name: 'label', type: 'text', required: true, label: { en: 'Option', bn: 'বিকল্প' } },
          ],
        },
        {
          name: 'correctAnswer',
          type: 'text',
          required: true,
          label: { en: 'Correct answer', bn: 'সঠিক উত্তর' },
          admin: { description: 'বিকল্পের হুবহু লেখাটি লিখুন।' },
        },
        { name: 'explanation', type: 'textarea', label: { en: 'Explanation', bn: 'ব্যাখ্যা' } },
      ],
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      label: { en: 'Active', bn: 'সক্রিয়' },
      admin: { position: 'sidebar' },
    },
  ],
  timestamps: true,
}
