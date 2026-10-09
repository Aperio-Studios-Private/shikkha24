import type { CollectionConfig } from 'payload'

import { authenticatedField, hasRole, isSuperAdminOrEditorInChief, noOne } from '../access/roles'
import { commentSubmitEndpoint } from '../endpoints/comments'

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
    /*
     * ⚠️ **Closed.** This was `() => true` — "readers submit" — but readers do not
     * submit *here*. They submit to `/api/comments/submit`, which is the whole
     * point of that endpoint: it rate-limits, runs the honeypot, whitelists the
     * fields key by key, and forces `isApproved: false`. The endpoint writes with
     * **`overrideAccess: true`**, so the permissive collection rule was never
     * needed by it.
     *
     * What it did instead was leave `POST /api/comments` open to anyone, with none
     * of those protections: unthrottled insertion and a floodable moderation queue.
     * Proven 2026-09-30 — an anonymous POST reached validation (400) rather than
     * being refused (403).
     *
     * The damage was bounded by `isApproved` being field-protected, so a forged
     * comment could not self-publish; that is a second, independent control, and
     * this route should not have been relying on it.
     */
    create: noOne,
    update: isSuperAdminOrEditorInChief, // only moderators change state
    delete: isSuperAdminOrEditorInChief,
  },
  /**
   * The reader submission route, mounted at `/api/comments/submit`.
   *
   * ⚠️ It MUST live on the collection, not in the root `endpoints` array.
   * A root endpoint whose first path segment equals a collection slug is
   * shadowed by that collection's generated REST route: `/api/comments/submit`
   * was parsed as "collection `comments`, document id `submit`", so the custom
   * handler was never reached and every reader comment 404'd. Collection
   * endpoints are matched before the collection's generated routes, which is
   * why this position works and the root position did not.
   *
   * The full public URL is unchanged (`/api/comments/submit`), so the frontend
   * contract is identical — only the mounting point moved.
   */
  endpoints: [commentSubmitEndpoint],
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
      // ⚠️ `authenticatedField`, not `Boolean(req.user)`: a reader session sets
      // `req.user` too, so the looser check handed every commenter's email to any
      // logged-in reader. See `access/roles.ts`.
      access: { read: authenticatedField },
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
