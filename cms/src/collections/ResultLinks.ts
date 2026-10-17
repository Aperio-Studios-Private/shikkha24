import type { Access, CollectionConfig } from 'payload'
import { isEditorial, isEditorialUser, isSuperAdminOrEditorInChief } from '../access/roles'

/**
 * Result Links — backs N3, the results & merit-lists hub.
 *
 * This is the "explain the official system" layer around the government portals
 * (`docs/education-competitors.md`): the boards publish results on their own
 * sites and expose **no API**, so the value Shikkha24 adds is the *how to use
 * this* content, not the data itself. `docs/data-sources.md` §2 reaches the same
 * conclusion — editorially curated, not API-fed.
 */
/**
 * Readers see only published result links; the newsroom sees everything.
 *
 * @param args the Payload access arguments.
 * @returns a `Where` clause rather than `false`, so the database filters rather
 *   than the API returning everything and discarding most of it.
 */
const publishedResultLink: Access = ({ req }) => {
  if (isEditorialUser(req.user)) return true
  return { isPublished: { equals: true } }
}

export const ResultLinks: CollectionConfig = {
  slug: 'result-links',
  labels: {
    singular: { en: 'Result link', bn: 'ফলাফলের লিংক' },
    plural: { en: 'Result links', bn: 'ফলাফলের লিংকসমূহ' },
  },
  admin: {
    useAsTitle: 'title',
    group: { en: 'Education (শিক্ষা)' },
    defaultColumns: ['title', 'examName', 'level', 'publicationDate', 'isPublished'],
    description: 'ফলাফল ও মেধাতালিকার লিংক এবং ব্যবহারের নিয়ম।',
  },
  access: {
    // ⚠️ Not `anyone`. `isPublished` defaults to `false`, so every draft and
    // unreviewed row was readable by anyone who queried the endpoint — the
    // publish-state filter existed but was applied only by the consumer
    // (`frontend/src/lib/education.ts`), which means the CMS was the thing
    // leaking. Filtering in the database rather than after the fetch, which is
    // what `publishedOrEditor` is for, though `result-links` has no drafts.
    //
    // Safe to apply: no other collection holds a relationship to `result-links`
    // (the only `relationTo: 'result-links'` sits inside `PayloadLockedDocument`),
    // so nothing internal depended on reading unpublished rows.
    read: publishedResultLink,
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
    {
      name: 'examName',
      type: 'text',
      required: true,
      index: true,
      label: { en: 'Exam name', bn: 'পরীক্ষার নাম' },
    },
    {
      name: 'boardOrInstitution',
      type: 'text',
      label: { en: 'Board / institution', bn: 'বোর্ড / প্রতিষ্ঠান' },
    },
    {
      name: 'level',
      type: 'relationship',
      relationTo: 'levels',
      index: true,
      label: { en: 'Level', bn: 'শ্রেণি' },
    },
    {
      name: 'publicationDate',
      type: 'date',
      index: true,
      label: { en: 'Publication date', bn: 'প্রকাশের তারিখ' },
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'officialUrl',
      type: 'text',
      required: true,
      label: { en: 'Official URL', bn: 'সরকারি লিংক' },
    },
    {
      name: 'howToSteps',
      type: 'richText',
      label: { en: 'How to check', bn: 'যেভাবে দেখবেন' },
      admin: { description: 'সরকারি সাইটে ফলাফল দেখার ধাপে ধাপে নির্দেশনা।' },
    },
    { name: 'meritListUrl', type: 'text', label: { en: 'Merit list URL', bn: 'মেধাতালিকার লিংক' } },
    {
      name: 'isPublished',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      label: { en: 'Published', bn: 'প্রকাশিত' },
      admin: { position: 'sidebar', description: 'ফলাফল প্রকাশিত হয়েছে কিনা।' },
    },
  ],
  timestamps: true,
}
