import type { CollectionConfig } from 'payload'

import { isSelfOrAdmin, isSuperAdmin } from '../access/roles'

/**
 * Readers — reader accounts, kept strictly separate from `Users`.
 *
 * ⚠️ **This collection is an addition to the original content model**, and the
 * reason is structural: the retained feature set includes comments with
 * Facebook/Google login, reader bookmarks, saved deadlines and push
 * notifications. All four need a persistent reader identity, and
 * `.sps/content-model.md` models `SavedDeadlines.reader` as a relation — which
 * requires a collection to relate to.
 *
 * Why not reuse `Users`: `Users` is the newsroom's staff collection with
 * publishing power. Mixing readers into it would mean every reader account sits
 * one field-level mistake away from editorial access. Separate collections make
 * that impossible by construction.
 *
 * No passwords: readers authenticate through a social provider
 * (`.sps/plan.md` — "Custom Payload comments (Facebook/Google social login)").
 */
export const Readers: CollectionConfig = {
  slug: 'readers',
  labels: {
    singular: { en: 'Reader', bn: 'পাঠক' },
    plural: { en: 'Readers', bn: 'পাঠকগণ' },
  },
  admin: {
    useAsTitle: 'displayName',
    group: 'প্রশাসন',
    defaultColumns: ['displayName', 'email', 'provider', 'createdAt'],
    description: 'পাঠকের অ্যাকাউন্ট — মন্তব্য, বুকমার্ক ও সময়সীমা সেভের জন্য। সম্পাদকীয় অ্যাকাউন্ট থেকে সম্পূর্ণ আলাদা।',
  },
  auth: true,
  access: {
    create: () => true, // signup via a social provider
    read: isSelfOrAdmin,
    update: isSelfOrAdmin,
    delete: isSuperAdmin,
  },
  fields: [
    { name: 'displayName', type: 'text', required: true, label: { en: 'Display name', bn: 'নাম' } },
    {
      name: 'avatarUrl',
      type: 'text',
      label: { en: 'Avatar URL', bn: 'প্রোফাইল ছবি' },
      admin: { description: 'সোশ্যাল প্রোভাইডার থেকে পাওয়া ছবির লিংক।' },
    },
    {
      name: 'provider',
      type: 'select',
      label: { en: 'Social provider', bn: 'সোশ্যাল প্রোভাইডার' },
      options: [
        { value: 'facebook', label: 'Facebook' },
        { value: 'google', label: 'Google' },
      ],
    },
    {
      name: 'providerId',
      type: 'text',
      index: true,
      label: { en: 'Provider user id', bn: 'প্রোভাইডার আইডি' },
    },
    {
      name: 'pushSubscriptions',
      type: 'array',
      label: { en: 'Push subscriptions', bn: 'পুশ সাবস্ক্রিপশন' },
      admin: { description: 'ডেডলাইন রিমাইন্ডারের জন্য Web Push সাবস্ক্রিপশন (S9)।' },
      fields: [
        {
          name: 'endpoint',
          type: 'text',
          required: true,
          label: { en: 'Endpoint', bn: 'এন্ডপয়েন্ট' },
        },
        { name: 'keys', type: 'json', label: { en: 'Keys', bn: 'কী' } },
      ],
    },
  ],
  timestamps: true,
}
