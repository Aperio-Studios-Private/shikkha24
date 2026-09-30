import type { CollectionConfig } from 'payload'

import {
  anyone,
  authenticatedField,
  editorField,
  editorialField,
  isOwnAuthorProfileOrEditor,
  isSuperAdminOrEditorInChief,
} from '../access/roles'
import { assignReporterId } from '../hooks/reporterId'
import { stampVerification } from '../hooks/verification'

/**
 * Authors — public bylines, and the backbone of the E-E-A-T pages.
 *
 * Every article carries an author, and `docs/seo-plan.md` requires an editorial
 * team page with real credentials. Author profiles are therefore public content,
 * not internal staff records — which is why `read` is open.
 *
 * Re-scoped from the legacy general-news model
 * (`.sps/content-model.md` → "Open items for S1"): `pressCardNo` is **kept** but
 * is now explicitly optional, because a press card is a genuine credential for
 * the E-E-A-T editorial-team page. Fields that served general news with no
 * education equivalent were dropped.
 */
export const Authors: CollectionConfig = {
  slug: 'authors',
  labels: {
    singular: { en: 'Author', bn: 'লেখক' },
    plural: { en: 'Authors', bn: 'লেখকবৃন্দ' },
  },
  admin: {
    useAsTitle: 'nameBn',
    group: 'সম্পাদকীয়',
    defaultColumns: ['nameBn', 'designation', 'slug'],
    description: 'লেখক প্রোফাইল — প্রতিবেদকের বাইলাইন ও সম্পাদকীয় দলের পাতা।',
  },
  access: {
    read: anyone,
    // Reporters may maintain their own profile; editors manage everyone's.
    // ⚠️ `isOwnAuthorProfileOrEditor`, NOT `isSelfOrAdmin` — see that helper for
    // why the obvious choice silently 403s a reporter on their own record.
    create: isSuperAdminOrEditorInChief,
    update: isOwnAuthorProfileOrEditor,
    delete: isSuperAdminOrEditorInChief,
  },
  fields: [
    {
      name: 'nameBn',
      type: 'text',
      required: true,
      index: true,
      label: { en: 'Name (Bengali)', bn: 'নাম (বাংলা)' },
    },
    {
      name: 'nameEn',
      type: 'text',
      label: { en: 'Name (English)', bn: 'নাম (ইংরেজি)' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'URL-এ ব্যবহৃত ASCII শনাক্তকারী।' },
    },
    {
      name: 'designation',
      type: 'text',
      label: { en: 'Designation', bn: 'পদবি' },
      admin: { description: 'যেমন: শিক্ষা প্রতিবেদক।' },
    },
    {
      name: 'bio',
      type: 'textarea',
      label: { en: 'Biography', bn: 'পরিচিতি' },
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Photo', bn: 'ছবি' },
    },
    {
      name: 'email',
      type: 'email',
      label: { en: 'Email', bn: 'ইমেইল' },
      // Never expose a staff email to anonymous readers.
      access: { read: ({ req }) => Boolean(req.user) },
    },
    {
      name: 'pressCardNo',
      type: 'text',
      label: { en: 'Press card number', bn: 'প্রেস কার্ড নম্বর' },
      admin: {
        description: 'ঐচ্ছিক। E-E-A-T সম্পাদকীয় দলের পাতায় যাচাইযোগ্য পরিচয় হিসেবে দেখানো হয়।',
      },
    },
    {
      name: 'bloodGroup',
      type: 'select',
      label: { en: 'Blood group', bn: 'রক্তের গ্রুপ' },
      /*
       * ⚠️ Not public. `authors.read` is `anyone`, so without this the blood group
       * of every reporter was readable by an anonymous caller — medical data with
       * no public consumer. The frontend never renders it (checked: `bloodGroup`
       * appears nowhere in `frontend/src`), and the press card, which *does* print
       * it, is composed server-side by `/api/idcard/:id.png` with
       * `overrideAccess: true`, so hiding it here cannot blank the card.
       *
       * `editorialField`, not `authenticatedField`: the newsroom needs it on the
       * staff record, a reader account has no business with it.
       */
      access: { read: editorialField },
      options: [
        { label: 'A+', value: 'A+' },
        { label: 'A−', value: 'A-' },
        { label: 'B+', value: 'B+' },
        { label: 'B−', value: 'B-' },
        { label: 'AB+', value: 'AB+' },
        { label: 'AB−', value: 'AB-' },
        { label: 'O+', value: 'O+' },
        { label: 'O−', value: 'O-' },
      ],
      admin: {
        description:
          'ঐচ্ছিক। প্রতিবেদকের পরিচয়পত্রে ছাপা হয় — বাংলাদেশের প্রেস কার্ডের প্রচলিত অংশ, জরুরি প্রয়োজনে।',
      },
    },

    /*
     * ── S13: verification ────────────────────────────────────────────────────
     *
     * ⚠️ **The five credential fields below are `editorField` — Section Editor
     * and above.** A reporter maintains their own bio, photo and beat, but must
     * not be able to mark *themselves* verified, extend their own card's
     * validity, or rewrite who vouched for them. Field access is enforced
     * server-side: `PATCH /api/authors/<own-id>` with a crafted body is refused
     * by the same rule the admin UI obeys (`docs/security.md` §3).
     *
     * The fields are flat rather than nested in a `group` so that access rules,
     * `where` queries and the frontend can address `verificationStatus` directly
     * instead of reaching through `verification.status`.
     */
    {
      name: 'reporterId',
      type: 'text',
      unique: true,
      index: true,
      label: { en: 'Reporter ID', bn: 'প্রতিবেদক আইডি' },
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'স্বয়ংক্রিয়ভাবে তৈরি (SHK-R-বর্ষ-ক্রম)। QR কার্ড ও যাচাইয়ের পাতায় ব্যবহৃত হয়।',
      },
      // Generated by `assignReporterId`. Not editable afterwards — the ID is a
      // credential and must stay stable once a card has been printed.
      access: { update: editorField },
    },
    {
      name: 'verificationStatus',
      type: 'select',
      defaultValue: 'unverified',
      required: true,
      index: true,
      label: { en: 'Verification status', bn: 'যাচাইয়ের অবস্থা' },
      options: [
        { value: 'unverified', label: { en: 'Unverified', bn: 'অযাচাইকৃত' } },
        { value: 'pending', label: { en: 'Pending', bn: 'যাচাই চলছে' } },
        { value: 'verified', label: { en: 'Verified', bn: 'যাচাইকৃত' } },
        { value: 'suspended', label: { en: 'Suspended', bn: 'স্থগিত' } },
      ],
      admin: {
        position: 'sidebar',
        description: 'শুধু সম্পাদক পরিবর্তন করতে পারেন। প্রতিবেদক নিজে নিজেকে যাচাই করতে পারেন না।',
      },
      access: { update: editorField },
    },
    {
      name: 'verifiedAt',
      type: 'date',
      label: { en: 'Verified on', bn: 'যাচাইয়ের তারিখ' },
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'যাচাইকৃত অবস্থায় যাওয়ার সময় স্বয়ংক্রিয়ভাবে বসে।',
      },
      access: { update: editorField },
    },
    {
      name: 'verifiedBy',
      type: 'relationship',
      relationTo: 'users',
      label: { en: 'Verified by', bn: 'যাচাই করেছেন' },
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'কোন সম্পাদক যাচাই করেছেন — নিরীক্ষার জন্য।',
      },
      // Internal: never exposed to anonymous readers.
      access: { read: authenticatedField, update: editorField },
    },
    {
      name: 'validUntil',
      type: 'date',
      label: { en: 'Valid until', bn: 'মেয়াদ শেষ' },
      admin: {
        position: 'sidebar',
        description: 'প্রেস কার্ডের মেয়াদ। মেয়াদোত্তীর্ণ কার্ড প্রকাশ্যে "মেয়াদোত্তীর্ণ" দেখায়।',
      },
      access: { update: editorField },
    },
    {
      name: 'verificationNote',
      type: 'textarea',
      label: { en: 'Verification note', bn: 'যাচাইয়ের নোট' },
      admin: {
        position: 'sidebar',
        description: 'অভ্যন্তরীণ নোট — কখনোই প্রকাশ্যে দেখানো হয় না।',
      },
      access: { read: authenticatedField, update: editorField },
    },

    /*
     * ── S13: coverage ────────────────────────────────────────────────────────
     *
     * `editorialField`, not `editorField`: a reporter may keep their own beat and
     * district current (they are the one who knows), but the collection-level
     * `update: isOwnAuthorProfileOrEditor` still confines them to their own
     * document.
     */
    {
      name: 'joiningDate',
      type: 'date',
      label: { en: 'Joining date', bn: 'যোগদানের তারিখ' },
      access: { update: editorialField },
    },
    {
      name: 'beat',
      type: 'select',
      hasMany: true,
      label: { en: 'Beat', bn: 'বিট' },
      options: [
        { value: 'school', label: { en: 'School', bn: 'স্কুল' } },
        { value: 'college', label: { en: 'College', bn: 'কলেজ' } },
        { value: 'university', label: { en: 'University', bn: 'বিশ্ববিদ্যালয়' } },
        { value: 'madrasa', label: { en: 'Madrasa', bn: 'মাদ্রাসা' } },
        { value: 'exam', label: { en: 'Exams', bn: 'পরীক্ষা' } },
        { value: 'scholarship', label: { en: 'Scholarship', bn: 'বৃত্তি' } },
        { value: 'admission', label: { en: 'Admission', bn: 'ভর্তি' } },
        { value: 'job', label: { en: 'Jobs & career', bn: 'চাকরি' } },
      ],
      admin: { description: 'প্রতিবেদক কোন বিষয়ে রিপোর্ট করেন।' },
      access: { update: editorialField },
    },
    {
      name: 'district',
      type: 'relationship',
      relationTo: 'districts',
      label: { en: 'Coverage district', bn: 'কভারেজ জেলা' },
      admin: { description: 'প্রতিবেদকের কার্যক্ষেত্র।' },
      access: { update: editorialField },
    },

    {
      name: 'social',
      type: 'group',
      label: { en: 'Social links', bn: 'সোশ্যাল লিংক' },
      fields: [
        { name: 'facebook', type: 'text', label: { en: 'Facebook', bn: 'ফেসবুক' } },
        { name: 'twitter', type: 'text', label: { en: 'X / Twitter', bn: 'এক্স / টুইটার' } },
        { name: 'linkedin', type: 'text', label: { en: 'LinkedIn', bn: 'লিংকডইন' } },
      ],
    },
  ],
  hooks: {
    // Order matters: the ID is assigned first so `stampVerification` (and any
    // later hook) sees a complete document.
    beforeValidate: [assignReporterId],
    beforeChange: [stampVerification],
  },
  timestamps: true,
}
