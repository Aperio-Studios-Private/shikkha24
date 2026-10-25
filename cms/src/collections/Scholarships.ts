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
    group: { en: 'Education (শিক্ষা)' },
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
      admin: { description: 'বৃত্তির নাম — প্রদানকারীর নাম আলাদা ঘরে।' },
    },
    {
      name: 'provider',
      type: 'text',
      required: true,
      label: { en: 'Provider', bn: 'প্রদানকারী' },
      admin: { description: 'যে প্রতিষ্ঠান বৃত্তি দিচ্ছে — বিশ্ববিদ্যালয়, দূতাবাস, ফাউন্ডেশন।' },
    },
    {
      name: 'level',
      type: 'relationship',
      relationTo: 'levels',
      hasMany: true,
      index: true,
      label: { en: 'Level', bn: 'শ্রেণি' },
      admin: { description: 'কোন স্তরের শিক্ষার্থীরা আবেদন করতে পারবে।' },
    },
    {
      name: 'country',
      type: 'text',
      index: true,
      label: { en: 'Country', bn: 'দেশ' },
      admin: { description: 'বৃত্তিটি যে দেশে — বাংলাদেশ হলে "বাংলাদেশ" লিখুন।' },
    },
    {
      name: 'fundingType',
      type: 'select',
      required: true,
      defaultValue: 'partial',
      index: true,
      label: { en: 'Funding type', bn: 'অর্থায়নের ধরন' },
      options: [
        { value: 'full', label: 'Full Scholarship (সম্পূর্ণ বৃত্তি)' },
        { value: 'partial', label: 'Partial Scholarship (আংশিক বৃত্তি)' },
        { value: 'tuition', label: 'Tuition Only (শুধু টিউশন)' },
      ],
      admin: { description: 'বৃত্তিটি কী কী খরচ বহন করে — শিক্ষার্থীর খরচ নয়, বৃত্তির ধরন।' },
    },
    {
      name: 'amount',
      type: 'text',
      label: { en: 'Amount', bn: 'পরিমাণ' },
      admin: { description: 'টাকা/পরিমাণ থাকলে লিখুন, না থাকলে খালি — অঙ্ক না জানা থাকলে নয়।' },
    },
    {
      name: 'deadline',
      type: 'date',
      required: true,
      index: true,
      label: { en: 'Deadline', bn: 'আবেদনের শেষ তারিখ' },
      admin: { date: { pickerAppearance: 'dayOnly' }, description: 'ট্র্যাকার এই তারিখ অনুযায়ী সাজানো হয়।' },
    },
    {
      name: 'eligibility',
      type: 'textarea',
      label: { en: 'Eligibility', bn: 'যোগ্যতা' },
      admin: { description: 'শিক্ষার্থীরা যে শর্তগুলো পূরণ করলে আবেদন করতে পারবে।' },
    },
    {
      name: 'applyUrl',
      type: 'text',
      label: { en: 'Apply URL', bn: 'আবেদনের লিংক' },
      admin: { description: 'অফিসিয়াল আবেদন পৃষ্ঠার ঠিকানা — অফিসিয়ালই দিন।' },
    },
    {
      name: 'description',
      type: 'richText',
      label: { en: 'Description', bn: 'বিবরণ' },
      admin: { description: 'বিস্তারিত তথ্য — বৃত্তির সারসংক্ষেপ ও শর্তাবলি।' },
    },
    {
      name: 'isInternational',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      label: { en: 'International', bn: 'আন্তর্জাতিক' },
      admin: { description: 'বিদেশে পড়ার বৃত্তি হলে টিক দিন — সাইটে আলাদা করে দেখানো হবে।' },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      label: { en: 'Active', bn: 'সক্রিয়' },
      admin: { position: 'sidebar', description: 'বন্ধ করলে বৃত্তিটি সাইটে আর দেখাবে না।' },
    },
  ],
  timestamps: true,
}
