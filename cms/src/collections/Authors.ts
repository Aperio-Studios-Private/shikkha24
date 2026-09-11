import type { CollectionConfig } from 'payload'

import { anyone, isSelfOrAdmin, isSuperAdminOrEditorInChief } from '../access/roles'

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
    create: isSuperAdminOrEditorInChief,
    update: isSelfOrAdmin,
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
  timestamps: true,
}
