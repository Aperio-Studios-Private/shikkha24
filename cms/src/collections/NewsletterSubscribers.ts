import type { CollectionConfig } from 'payload'

import { hasRole, isSuperAdminOrEditorInChief } from '../access/roles'

/**
 * Newsletter subscribers — **self-hosted**, per the owner's decision.
 *
 * `.sps/profile.md`: "self-built subscriber list and campaign module inside
 * Payload (owner's data stays self-hosted) with delivery via a free-tier ESP
 * API". The list is therefore Shikkha24's own data, not a third party's —
 * which is also why `docs/security.md` §8 treats it as PII with a retention
 * policy and a deletion path.
 *
 * Public read is denied: the subscriber list is never exposed. Signup creates a
 * row; only editors can read or export it.
 */
export const NewsletterSubscribers: CollectionConfig = {
  slug: 'newsletter-subscribers',
  labels: {
    singular: { en: 'Subscriber', bn: 'গ্রাহক' },
    plural: { en: 'Newsletter subscribers', bn: 'নিউজলেটার গ্রাহক' },
  },
  admin: {
    useAsTitle: 'email',
    group: 'পাঠক',
    defaultColumns: ['email', 'isActive', 'subscribedAt', 'confirmedAt'],
    description: 'নিউজলেটার গ্রাহক তালিকা — সম্পূর্ণ নিজস্ব, তৃতীয় পক্ষের নয়।',
  },
  access: {
    create: () => true, // public signup
    read: ({ req }) => hasRole(req.user, 'superAdmin', 'editorInChief'),
    update: ({ req }) => hasRole(req.user, 'superAdmin', 'editorInChief'),
    delete: isSuperAdminOrEditorInChief,
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      index: true,
      label: { en: 'Email', bn: 'ইমেইল' },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      label: { en: 'Active', bn: 'সক্রিয়' },
      admin: { description: 'ডাবল অপ্ট-ইন নিশ্চিত হওয়ার পর সক্রিয় হয়।' },
    },
    {
      name: 'subscribedAt',
      type: 'date',
      label: { en: 'Subscribed at', bn: 'সাবস্ক্রাইবের সময়' },
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'confirmedAt',
      type: 'date',
      label: { en: 'Confirmed at', bn: 'নিশ্চিত করার সময়' },
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'confirmationToken',
      type: 'text',
      label: { en: 'Confirmation token', bn: 'নিশ্চিতকরণ টোকেন' },
      // A leaked token would let anyone confirm someone else's address.
      access: { read: ({ req }) => hasRole(req.user, 'superAdmin') },
    },
    {
      name: 'consentSource',
      type: 'text',
      label: { en: 'Consent source', bn: 'সম্মতির সূত্র' },
      admin: { description: 'কোথা থেকে সাবস্ক্রাইব করেছেন — প্রমাণের জন্য সংরক্ষিত।' },
    },
  ],
  timestamps: true,
}
