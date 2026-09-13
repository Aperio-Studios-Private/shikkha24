import type { CollectionConfig } from 'payload'

import { isSelfOrAdmin, isSuperAdmin } from '../access/roles'
import { readerSessionStrategy } from '../auth/reader-strategy'

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
 * The auth config below makes that structural rather than a convention — see the
 * note on `disableLocalStrategy`.
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
  auth: {
    /**
     * Readers have no password, so the local strategy is turned off.
     *
     * This is not cosmetic. `create` validates the password as **required**
     * whenever `disableLocalStrategy` is falsy, so leaving it on would make the
     * OAuth callback unable to create a reader at all.
     *
     * `enableFields: true` keeps the auth columns (`email`, `salt`, `hash`, …) in
     * place even though nothing writes to them. That is deliberate: the schema
     * then does not depend on this choice, so turning the strategy back on would
     * be a config change rather than a migration.
     */
    disableLocalStrategy: { enableFields: true },
    /**
     * The only way in. Reads the signed session cookie that the OAuth callback
     * sets, and resolves it to a reader — see `auth/reader-strategy.ts`.
     */
    strategies: [readerSessionStrategy],
  },
  access: {
    create: () => true, // signup via a social provider
    read: isSelfOrAdmin,
    update: isSelfOrAdmin,
    delete: isSuperAdmin,
  },
  fields: [
    /**
     * Overrides Payload's base auth `email` field, which is `required: true` and
     * `unique: true`.
     *
     * Neither holds for readers. Email is an **attribute** here, never an
     * identity — the identity is `provider` + `providerId`. Facebook does not
     * return an address for an account registered with a phone number, and one
     * person may legitimately sign in with Google and Facebook using the same
     * address. A unique constraint would turn both of those into a failed login
     * for no benefit, since nothing ever logs in by email.
     *
     * ⚠️ **Account linking is deliberately not implemented.** Two provider
     * identities that share an address stay two readers. Merging them
     * automatically would be an account-takeover vector: a provider that does not
     * verify email could be used to claim someone else's account. Linking is an
     * OWNER decision, recorded in `.sps/task.md`.
     */
    {
      name: 'email',
      type: 'email',
      required: false,
      unique: false,
      label: { en: 'Email', bn: 'ইমেইল' },
      admin: {
        description:
          'প্রোভাইডার থেকে পাওয়া ইমেইল (থাকলে)। এটি পরিচয় নয় — পরিচয় প্রোভাইডার আইডি। Facebook অনেক সময় ইমেইল দেয় না।',
      },
    },
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
