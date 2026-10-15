import type { CollectionConfig } from 'payload'

import { anyone, isEditorial, isSuperAdminOrEditorInChief } from '../access/roles'

/**
 * FAQs — editable question-and-answer pairs rendered on the public /faq page
 * with automatic FAQPage JSON-LD (research 2026-10-16: NO competitor in the
 * Bengali education vertical emits FAQPage — docs/seo/keyword-competitor-research.md).
 *
 * Editors add/refine/delete questions freely; the storefront groups them by
 * `group` and ships the schema from the same records, so the CMS stays the
 * single source of truth. `priority` orders within a group — lower shows first.
 *
 * ⚠️ The collection ships to production with the P4 CMS deploy (DianaHost
 * cannot take schema changes right now — see tasks.md T-18/P4). Until then the
 * storefront renders `frontend/src/data/faqs.seed.json` (getFaqs fallback).
 */
export const Faqs: CollectionConfig = {
  slug: 'faqs',
  labels: {
    singular: { en: 'FAQ', bn: 'সাধারণ জিজ্ঞাসা' },
    plural: { en: 'FAQs', bn: 'সাধারণ জিজ্ঞাসা' },
  },
  admin: {
    useAsTitle: 'question',
    group: 'শিক্ষা',
    defaultColumns: ['question', 'group', 'priority', 'updatedAt'],
    description: 'সাইটের সাধারণ প্রশ্নোত্তর — /faq পাতার জন্য। Google-এ FAQ schema হিসেবেও পৌঁছায়।',
  },
  access: {
    read: anyone,
    create: isEditorial,
    update: isEditorial,
    delete: isSuperAdminOrEditorInChief,
  },
  fields: [
    {
      name: 'question',
      type: 'text',
      required: true,
      label: { en: 'Question', bn: 'প্রশ্ন' },
      admin: { description: 'পাঠক যেভাবে জিজ্ঞেস করবে, সেভাবেই লিখুন (সার্চেও ওটাই আসে)।' },
    },
    {
      name: 'answer',
      type: 'textarea',
      required: true,
      label: { en: 'Answer', bn: 'উত্তর' },
      maxLength: 1200,
      admin: { description: 'সংক্ষিপ্ত ও নির্ভুল উত্তর; প্রয়োজনে সংযোগ (লিঙ্ক) টেক্সটে দিন।' },
    },
    {
      name: 'group',
      type: 'select',
      required: true,
      defaultValue: 'general',
      label: { en: 'Section', bn: 'বিভাগ' },
      options: [
        { label: { en: 'General', bn: 'সাধারণ' }, value: 'general' },
        { label: { en: 'Results', bn: 'ফলাফল' }, value: 'results' },
        { label: { en: 'Admission', bn: 'ভর্তি' }, value: 'admission' },
        { label: { en: 'Scholarships', bn: 'বৃত্তি' }, value: 'scholarship' },
        { label: { en: 'Circulars', bn: 'বিজ্ঞপ্তি' }, value: 'circulars' },
      ],
    },
    {
      name: 'priority',
      type: 'number',
      defaultValue: 100,
      label: { en: 'Order', bn: 'ক্রম' },
      admin: { description: 'ছোট সংখ্যা আগে দেখায়।' },
    },
  ],
  timestamps: true,
}
