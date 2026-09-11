import type { CollectionConfig } from 'payload'

import { hasRole, isSuperAdminOrEditorInChief } from '../access/roles'

/**
 * Comments — reader discussion, moderated before publication.
 *
 * `docs/security.md` §6: "**Comments are the primary XSS vector.** Never render
 * reader input as raw HTML. Escape on output, store sanitised, moderate before
 * publish." The moderation gate below is that control, not a nicety — an
 * unmoderated comment field on a public site is an open door.
 *
 * Public read returns **only approved** comments, filtered in the database.
 */
export const Comments: CollectionConfig = {
  slug: 'comments',
  labels: {
    singular: { en: 'Comment', bn: 'মন্তব্য' },
    plural: { en: 'Comments', bn: 'মন্তব্যসমূহ' },
  },
  admin: {
    useAsTitle: 'body',
    group: 'পাঠক',
    defaultColumns: ['article', 'userName', 'isApproved', 'createdAt'],
    description: 'পাঠকের মন্তব্য — অনুমোদনের পর প্রকাশিত হয়।',
  },
  access: {
    // Anonymous readers see only approved comments.
    read: ({ req }) => {
      if (hasRole(req.user, 'superAdmin', 'editorInChief', 'sectionEditor')) return true
      return { isApproved: { equals: true } }
    },
    create: () => true, // readers submit
    update: isSuperAdminOrEditorInChief, // only moderators change state
    delete: isSuperAdminOrEditorInChief,
  },
  fields: [
    {
      name: 'article',
      type: 'relationship',
      relationTo: 'articles',
      required: true,
      index: true,
      label: { en: 'Article', bn: 'সংবাদ' },
    },
    {
      name: 'reader',
      type: 'relationship',
      relationTo: 'readers',
      index: true,
      label: { en: 'Reader account', bn: 'পাঠক অ্যাকাউন্ট' },
      admin: { description: 'সোশ্যাল লগইন করা পাঠকের অ্যাকাউন্ট (যদি থাকে)।' },
    },
    { name: 'userName', type: 'text', required: true, label: { en: 'Display name', bn: 'নাম' } },
    {
      name: 'userEmail',
      type: 'email',
      label: { en: 'Email', bn: 'ইমেইল' },
      // PII — never exposed publicly (docs/security.md §8, data minimisation).
      access: { read: ({ req }) => Boolean(req.user) },
    },
    { name: 'userAvatar', type: 'text', label: { en: 'Avatar URL', bn: 'প্রোফাইল ছবি' } },
    {
      name: 'body',
      type: 'textarea',
      required: true,
      maxLength: 2000,
      label: { en: 'Comment', bn: 'মন্তব্য' },
    },
    {
      name: 'isApproved',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      label: { en: 'Approved', bn: 'অনুমোদিত' },
      admin: { position: 'sidebar', description: 'অনুমোদনের আগে মন্তব্য সাইটে দেখা যায় না।' },
      // Only moderators may flip this.
      access: {
        create: ({ req }) => hasRole(req.user, 'superAdmin', 'editorInChief', 'sectionEditor'),
        update: ({ req }) => hasRole(req.user, 'superAdmin', 'editorInChief', 'sectionEditor'),
      },
    },
    {
      name: 'socialProvider',
      type: 'select',
      label: { en: 'Social provider', bn: 'সোশ্যাল প্রোভাইডার' },
      options: [
        { value: 'facebook', label: 'Facebook' },
        { value: 'google', label: 'Google' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
  timestamps: true,
}
