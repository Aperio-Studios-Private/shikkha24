import type { CollectionConfig } from 'payload'

import { isSuperAdmin, noOne } from '../access/roles'

/**
 * Push subscriptions — one row per browser that opted in.
 *
 * ## A subscription is a capability, so it is admin-read only
 *
 * `endpoint` plus the two keys is enough for anyone holding them to push a
 * notification to that browser. That is a capability, not a preference, so
 * `read`, `update` and `delete` are super-admin only. Readers manage their own
 * subscription through the endpoint (`/api/push/*`), which acts on the endpoint
 * string the browser presents — never on a row id, which would be enumerable.
 *
 * ## No reader account is required
 *
 * `reader` is optional on purpose. N7 (deadline reminders) is meant to convert
 * one-off search traffic into a returning audience, and that audience has not
 * signed in. A subscription is per **browser**, and the reminders live on it.
 *
 * ## Reminders are an array, not a second collection
 *
 * A reminder is meaningless without its subscription, and it is always read as
 * "the due reminders for this subscription". A separate collection would add a
 * join and an access rule for no benefit. The sweep queries the array directly.
 *
 * ## What is not stored
 *
 * No IP address, no user agent, no page the reader was on when they opted in.
 * The endpoint string identifies the browser well enough for the feature to
 * work, and storing more would make this a tracking table
 * (`docs/security.md` §8, data minimisation).
 */
export const PushSubscriptions: CollectionConfig = {
  slug: 'push-subscriptions',
  labels: {
    singular: { en: 'Push subscription', bn: 'পুশ সাবস্ক্রিপশন' },
    plural: { en: 'Push subscriptions', bn: 'পুশ সাবস্ক্রিপশন' },
  },
  admin: {
    useAsTitle: 'endpoint',
    group: 'পাঠক',
    defaultColumns: ['endpoint', 'reader', 'updatedAt'],
    description: 'ব্রাউজারভিত্তিক পুশ সাবস্ক্রিপশন ও সময়সীমার রিমাইন্ডার।',
  },
  access: {
    /*
     * ⚠️ The generated create route is closed. A subscription is written by
     * `/api/push/*`, which acts on the endpoint string the browser presents and
     * writes through the local API with `overrideAccess` — so this route is not
     * the way in, and leaving it open only widened the surface.
     *
     * It previously used `isSelfOrAdmin`, which was wrong twice over: a `Where`
     * returned from `create` is merely truthy (so it authorised everyone
     * authenticated), and it filtered on the row id rather than the `reader`
     * relation. `reader` is optional here by design — a subscription is per
     * browser and needs no account — so "the owner" is not even always a reader.
     */
    create: noOne,
    // A capability URL: seeing it is enough to send to that browser.
    read: isSuperAdmin,
    update: isSuperAdmin,
    delete: isSuperAdmin,
  },
  fields: [
    {
      name: 'endpoint',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: { en: 'Push endpoint', bn: 'পুশ এন্ডপয়েন্ট' },
      admin: { description: 'ব্রাউজার যে ঠিকানায় নোটিফিকেশন নেয়।' },
    },
    {
      name: 'p256dh',
      type: 'text',
      required: true,
      label: { en: 'p256dh key', bn: 'p256dh কী' },
    },
    { name: 'auth', type: 'text', required: true, label: { en: 'Auth secret', bn: 'অথ সিক্রেট' } },
    {
      name: 'reader',
      type: 'relationship',
      relationTo: 'readers',
      index: true,
      label: { en: 'Reader account', bn: 'পাঠক অ্যাকাউন্ট' },
      admin: { description: 'সোশ্যাল লগইন করা পাঠক (যদি থাকে) — না থাকলেও কাজ করে।' },
    },
    {
      name: 'reminders',
      type: 'array',
      label: { en: 'Reminders', bn: 'রিমাইন্ডার' },
      admin: {
        description: 'যে সময়সীমাগুলোর জন্য আগে জানতে চেয়েছেন।',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'deadline',
          type: 'relationship',
          relationTo: 'deadlines',
          required: true,
          index: true,
          label: { en: 'Deadline', bn: 'সময়সীমা' },
        },
        {
          name: 'remindAt',
          type: 'date',
          required: true,
          index: true,
          label: { en: 'Remind at', bn: 'মনে করানোর সময়' },
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
        {
          name: 'notified',
          type: 'checkbox',
          defaultValue: false,
          index: true,
          label: { en: 'Notified', bn: 'জানানো হয়েছে' },
        },
      ],
    },
  ],
  timestamps: true,
}
