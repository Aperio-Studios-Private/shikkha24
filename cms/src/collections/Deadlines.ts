import type { CollectionConfig } from 'payload'

import { anyone, isEditorial, isSuperAdminOrEditorInChief } from '../access/roles'

/** Dated-event types. Shared by the academic calendar and the exam-routine hub. */
export const DEADLINE_TYPES = [
  'admission',
  'result',
  'examRoutine',
  'scholarshipDeadline',
  'holiday',
  'circular',
] as const

export type DeadlineType = (typeof DEADLINE_TYPES)[number]

const TYPE_LABELS: Record<DeadlineType, string> = {
  admission: 'ভর্তি',
  result: 'ফলাফল',
  examRoutine: 'পরীক্ষার রুটিন',
  scholarshipDeadline: 'বৃত্তির সময়সীমা',
  holiday: 'ছুটি',
  circular: 'বিজ্ঞপ্তি',
}

/**
 * Deadlines / Academic Calendar — backs **both N2 and N5**.
 *
 * `docs/education-feature-inventory.md` §4: the proposed N2 (academic calendar)
 * and N9 were merged, and N5 (exam routine & syllabus hub) "shares the dated-events
 * model with N2". This one collection is that shared model — admission windows,
 * result dates, exam routines and holidays are all dated events, and splitting
 * them would create two near-identical collections that drift.
 */
export const Deadlines: CollectionConfig = {
  slug: 'deadlines',
  labels: {
    singular: { en: 'Deadline / Event', bn: 'সময়সীমা / ঘটনা' },
    plural: { en: 'Deadlines & Events', bn: 'সময়সীমা ও ঘটনাসমূহ' },
  },
  admin: {
    useAsTitle: 'title',
    group: { en: 'Education (শিক্ষা)' },
    defaultColumns: ['title', 'type', 'dateStart', 'level'],
    description: 'ভর্তি, ফলাফল, রুটিন ও ছুটির তারিখ — একাডেমিক ক্যালেন্ডার।',
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
      admin: { description: 'ক্যালেন্ডারে যে লেখাটি দেখা যাবে — ছোট ও নির্দিষ্ট রাখুন।' },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      index: true,
      label: { en: 'Type', bn: 'ধরন' },
      options: DEADLINE_TYPES.map((value) => ({ value, label: TYPE_LABELS[value] })),
      admin: { description: 'ধরন দিয়েই সাইটে রঙ ও ফিল্টার ঠিক হয়।' },
    },
    {
      name: 'dateStart',
      type: 'date',
      required: true,
      index: true,
      label: { en: 'Start date', bn: 'শুরুর তারিখ' },
      admin: {
        date: { pickerAppearance: 'dayOnly' },
        description: 'একদিনের ঘটনা হলে এটিই একমাত্র তারিখ।',
      },
    },
    {
      name: 'dateEnd',
      type: 'date',
      label: { en: 'End date', bn: 'শেষের তারিখ' },
      admin: {
        date: { pickerAppearance: 'dayOnly' },
        description: 'ঐচ্ছিক। একাধিক দিনের ঘটনার জন্য (যেমন ভর্তি সময়কাল)।',
      },
    },
    {
      name: 'level',
      type: 'relationship',
      relationTo: 'levels',
      hasMany: true,
      index: true,
      label: { en: 'Level', bn: 'শ্রেণি' },
      admin: { description: 'কোন শ্রেণির জন্য — একাধিক বাছা যায়।' },
    },
    {
      name: 'district',
      type: 'relationship',
      relationTo: 'districts',
      hasMany: true,
      index: true,
      label: { en: 'District', bn: 'জেলা' },
      admin: { description: 'ঐচ্ছিক। পরীক্ষাকেন্দ্র বা স্থানীয় সময়সীমার জন্য।' },
    },
    {
      name: 'description',
      type: 'textarea',
      label: { en: 'Description', bn: 'বিবরণ' },
      admin: { description: 'ক্যালেন্ডারে তারিখের নিচে ছোট ব্যাখ্যা।' },
    },
    {
      name: 'relatedArticle',
      type: 'relationship',
      relationTo: 'articles',
      label: { en: 'Related article', bn: 'সম্পর্কিত সংবাদ' },
    },
  ],
  timestamps: true,
}
