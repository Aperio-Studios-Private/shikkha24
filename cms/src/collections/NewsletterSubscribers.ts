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
 *
 * ## Double opt-in, and why the tokens are separate
 *
 * `docs/security.md` §7 requires "per-IP throttle + double opt-in" for signup.
 * Two distinct tokens exist because they do two different jobs:
 *
 * - `confirmationToken` proves the person who typed the address can read mail
 *   sent to it. Without it, anyone could subscribe anyone — the classic way a
 *   newsletter becomes a spam cannon aimed at a third party.
 * - `unsubscribeToken` must work **from a link in an email, with no session**,
 *   for the life of the subscription. It is therefore long-lived, and it is
 *   deliberately *not* the confirmation token: rotating the confirmation token
 *   must never break an unsubscribe link already sitting in someone's inbox.
 *
 * Neither is readable except by a super admin, so a leaked editor session cannot
 * be used to enumerate addresses and unsubscribe them.
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
    defaultColumns: ['email', 'isActive', 'subscribedAt', 'confirmedAt', 'unsubscribedAt'],
    description:
      'নিউজলেটার গ্রাহক তালিকা — সম্পূর্ণ নিজস্ব, তৃতীয় পক্ষের নয়। ডাবল অপ্ট-ইন নিশ্চিত হওয়ার পর সক্রিয় হয়।',
  },
  access: {
    // Signup goes through `/api/newsletter/subscribe`, not this collection's
    // generated create route — see `src/endpoints/newsletter.ts`. The `create`
    // rule stays permissive only so that endpoint's local-API call can write.
    create: () => true,
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
      name: 'unsubscribedAt',
      type: 'date',
      label: { en: 'Unsubscribed at', bn: 'বাতিল করার সময়' },
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'confirmationToken',
      type: 'text',
      index: true,
      label: { en: 'Confirmation token', bn: 'নিশ্চিতকরণ টোকেন' },
      // A leaked token would let anyone confirm someone else's address.
      access: { read: ({ req }) => hasRole(req.user, 'superAdmin') },
    },
    {
      name: 'confirmationExpiresAt',
      type: 'date',
      label: { en: 'Confirmation expires at', bn: 'নিশ্চিতকরণের মেয়াদ' },
      admin: {
        description: 'মেয়াদ শেষ হলে লিংকটি আর কাজ করবে না — পুরোনো লিংকের অপব্যবহার ঠেকাতে।',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'unsubscribeToken',
      type: 'text',
      index: true,
      label: { en: 'Unsubscribe token', bn: 'বাতিল করার টোকেন' },
      // Long-lived by design — it lives in every sent mail. Never exposed.
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
