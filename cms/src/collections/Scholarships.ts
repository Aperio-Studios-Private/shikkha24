import type { CollectionConfig } from 'payload'

import { activeOrEditor, isEditorial, isSuperAdminOrEditorInChief } from '../access/roles'

/**
 * Scholarships — backs N1, the scholarship tracker.
 *
 * The tracker is deadline-sorted and filterable by level, country and funding
 * type. This is the single highest-intent, evergreen feature in the inventory:
 * `docs/education-feature-inventory.md` §4 notes that no competitor does it well.
 *
 * Entirely **editorially curated** — no external API. `docs/data-sources.md` §2
 * records why: Bangladesh education data has no authoritative public API, and a
 * curated collection is both more accurate and free.
 */
export const Scholarships: CollectionConfig = {
  slug: 'scholarships',
  labels: {
    singular: { en: 'Scholarship', bn: 'বৃত্তি' },
    plural: { en: 'Scholarships', bn: 'বৃত্তিসমূহ' },
  },
  admin: {
    useAsTitle: 'title',
    group: 'শিক্ষা',
    defaultColumns: ['title', 'provider', 'level', 'deadline', 'isActive'],
    description: 'বৃত্তির তালিকা — সময়সীমা অনুযায়ী সাজানো।',
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
    {
      name: 'title',
      type: 'text',
      required: true,
      index: true,
      label: { en: 'Title', bn: 'শিরোনাম' },
    },
    { name: 'provider', type: 'text', required: true, label: { en: 'Provider', bn: 'প্রদানকারী' } },
    {
      name: 'level',
      type: 'relationship',
      relationTo: 'levels',
      hasMany: true,
      index: true,
      label: { en: 'Level', bn: 'শ্রেণি' },
    },
    { name: 'country', type: 'text', index: true, label: { en: 'Country', bn: 'দেশ' } },
    {
      name: 'fundingType',
      type: 'select',
      required: true,
      defaultValue: 'partial',
      index: true,
      label: { en: 'Funding type', bn: 'অর্থায়নের ধরন' },
      options: [
        { value: 'full', label: 'সম্পূর্ণ বৃত্তি' },
        { value: 'partial', label: 'আংশিক বৃত্তি' },
        { value: 'tuition', label: 'শুধু টিউশন' },
      ],
    },
    { name: 'amount', type: 'text', label: { en: 'Amount', bn: 'পরিমাণ' } },
    {
      name: 'deadline',
      type: 'date',
      required: true,
      index: true,
      label: { en: 'Deadline', bn: 'আবেদনের শেষ তারিখ' },
      admin: { date: { pickerAppearance: 'dayOnly' }, description: 'ট্র্যাকার এই তারিখ অনুযায়ী সাজানো হয়।' },
    },
    { name: 'eligibility', type: 'textarea', label: { en: 'Eligibility', bn: 'যোগ্যতা' } },
    { name: 'applyUrl', type: 'text', label: { en: 'Apply URL', bn: 'আবেদনের লিংক' } },
    { name: 'description', type: 'richText', label: { en: 'Description', bn: 'বিবরণ' } },
    {
      name: 'isInternational',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      label: { en: 'International', bn: 'আন্তর্জাতিক' },
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
