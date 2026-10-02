import type { CollectionConfig } from 'payload'

import { isSelfIn, isSuperAdmin, noOne } from '../access/roles'
import { readerSessionStrategy } from '../auth/reader-strategy'
import { deleteAccountEndpoint } from '../endpoints/account'

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
    /*
     * ⚠️ **Closed.** This was `() => true` — "signup via a social provider" — but a
     * permissive `create` on a collection does not mean "the signup flow may write
     * here"; it means **anyone may write here, unauthenticated and unthrottled**,
     * through the generated `POST /api/readers`. Proven 2026-09-30:
     *
     *   POST /api/readers {"displayName":"x"} → 201
     *   …five more → 201, 201, 201, 201, 201 in 222 ms
     *
     * That was the entry point for the whole audit: a reader account is enough to
     * satisfy Payload's `Boolean(user)` default, which is how an anonymous stranger
     * could reach Media (T1) and the colliding `users` row (T2).
     *
     * The only legitimate creator is the OAuth callback, and it already writes with
     * `overrideAccess: true` (`endpoints/oauth.ts` → `upsertReader`), so it is
     * unaffected by this rule. A future account-linking flow would do the same.
     */
    create: noOne,
    // A reader session may read and edit its OWN row — and only a reader session,
    // because `isSelfIn('readers')` requires the session to belong to this
    // collection. A staff account is denied here rather than matching a reader row
    // by a coincidentally equal id.
    read: isSelfIn('readers'),
    update: isSelfIn('readers'),
    delete: isSuperAdmin,
  },
  /*
   * `/api/readers/delete-account` — the reader's own erasure, so the privacy
   * policy's promise is something a reader can exercise without writing an email.
   *
   * ⚠️ A **collection** endpoint, so the path is relative and is matched before
   * the generated routes. At the API root, `/readers/delete-account` would be read
   * as "collection `readers`, document id `delete-account`" and never reach the
   * handler (the `/api/comments/submit` lesson).
   */
  endpoints: [deleteAccountEndpoint],
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
    {
      name: 'bookmarksSyncedAt',
      type: 'date',
      label: { en: 'Bookmarks synced on', bn: 'বুকমার্ক সিঙ্কের তারিখ' },
      admin: {
        readOnly: true,
        description:
          'প্রথম সিঙ্কের সময় স্বয়ংক্রিয়ভাবে বসে। খালি থাকলে সার্ভার জানে না — তখন লোকাল তালিকা যোগ করা হয়; একবার বসলে সার্ভারই চূড়ান্ত।',
      },
      /*
       * ⚠️ **The merge-policy marker, and it must not be writable by the reader.**
       *
       * A reader who could set this could flip their own account back to
       * "never synced", and the next sync would union a stale local list into the
       * server's — resurrecting bookmarks they had deleted on another device,
       * which is the exact failure the policy exists to prevent. Only the sync
       * endpoint sets it, through the local API with `overrideAccess`.
       */
      access: { update: () => false },
    },
  ],
  timestamps: true,
}
