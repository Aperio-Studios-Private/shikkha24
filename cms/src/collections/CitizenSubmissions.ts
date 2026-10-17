import type { CollectionConfig } from 'payload'

import { authenticatedField, isEditorial, isSuperAdminOrEditorInChief } from '../access/roles'

/**
 * Citizen-journalism submissions — a reader reports something, an editor decides.
 *
 * ## Nothing is published from here
 *
 * This collection is a **queue, not a publishing surface**. A submission carries
 * no publish action and no route of its own; a story only becomes public when an
 * editor writes it as an Article. That is deliberate: `docs/security.md` §6 names
 * reader input as the primary XSS and defamation vector, and the moderation gate
 * is the control. An unmoderated submission pipeline on a public site is an open
 * door.
 *
 * ## Why the reporter's contact details are field-level restricted
 *
 * A tip often contains the reporter's real name, phone and address, and the
 * whole value of the channel depends on that staying private. The fields are
 * readable only by an authenticated user, so an anonymous API read cannot
 * enumerate them even if an access rule is later loosened by mistake — the same
 * defence used for `Comments.userEmail`.
 *
 * ## Rate limiting
 *
 * Submission goes through a custom endpoint (`src/endpoints/citizen.ts`), not the
 * generated create route, because it needs a per-IP throttle and a honeypot.
 * `docs/security.md` §7 requires both for "contact / citizen-journalism forms".
 */
export const CitizenSubmissions: CollectionConfig = {
  slug: 'citizen-submissions',
  labels: {
    singular: { en: 'Citizen submission', bn: 'নাগরিক সংবাদ' },
    plural: { en: 'Citizen submissions', bn: 'নাগরিক সংবাদ জমা' },
  },
  admin: {
    useAsTitle: 'title',
    group: { en: 'Readers (পাঠক)' },
    defaultColumns: ['title', 'reporterName', 'status', 'createdAt'],
    description: 'পাঠকের পাঠানো সংবাদ। এখান থেকে সরাসরি প্রকাশ হয় না — সম্পাদক যাচাই করে সংবাদ লেখেন।',
  },
  access: {
    create: isEditorial,
    read: isEditorial,
    update: isEditorial,
    delete: isSuperAdminOrEditorInChief,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: { en: 'Headline', bn: 'শিরোনাম' },
    },
    {
      name: 'body',
      type: 'textarea',
      required: true,
      maxLength: 5000,
      label: { en: 'Details', bn: 'বিবরণ' },
      admin: { description: 'কী ঘটেছে, কোথায়, কখন — বিস্তারিত লিখুন।' },
    },
    {
      name: 'district',
      type: 'relationship',
      relationTo: 'districts',
      label: { en: 'District', bn: 'জেলা' },
    },
    {
      name: 'media',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Photo', bn: 'ছবি' },
      admin: { description: 'সম্পর্কিত ছবি (ঐচ্ছিক)।' },
    },
    {
      name: 'reporterName',
      type: 'text',
      required: true,
      label: { en: 'Your name', bn: 'আপনার নাম' },
    },
    {
      name: 'reporterEmail',
      type: 'email',
      required: true,
      label: { en: 'Email', bn: 'ইমেইল' },
      // PII — never exposed publicly (docs/security.md §8, data minimisation).
      // ⚠️ `authenticatedField`, not `Boolean(req.user)`: a reader session sets
      // `req.user` too, so the looser check handed a citizen's email and phone to
      // any logged-in reader. See `access/roles.ts`.
      access: { read: authenticatedField },
    },
    {
      name: 'reporterPhone',
      type: 'text',
      label: { en: 'Phone', bn: 'ফোন' },
      access: { read: authenticatedField },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      required: true,
      index: true,
      label: { en: 'Status', bn: 'অবস্থা' },
      options: [
        { value: 'new', label: { en: 'New', bn: 'নতুন' } },
        { value: 'reviewing', label: { en: 'Reviewing', bn: 'যাচাই চলছে' } },
        { value: 'published', label: { en: 'Used', bn: 'ব্যবহার হয়েছে' } },
        { value: 'rejected', label: { en: 'Rejected', bn: 'বাতিল' } },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'editorNote',
      type: 'textarea',
      label: { en: 'Editor note', bn: 'সম্পাদকের নোট' },
      admin: { position: 'sidebar', description: 'যাচাইয়ের ফলাফল বা কারণ।' },
    },
  ],
  timestamps: true,
}
