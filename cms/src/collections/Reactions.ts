import type { CollectionConfig } from 'payload'

import { hasRole, isSuperAdminOrEditorInChief } from '../access/roles'
import { reactionEndpoints } from '../endpoints/reactions'
import { REACTION_TYPES, type ReactionType } from '../lib/reactions'

/** Bengali labels for the five reactions. The admin UI is Bengali (`docs/profile.md`). */
const TYPE_LABELS: Record<ReactionType, string> = {
  like: 'পছন্দ',
  love: 'ভালোবাসা',
  wow: 'অবাক',
  sad: 'দুঃখ',
  angry: 'ক্ষোভ',
}

/**
 * Reader reactions — S16, the reaction half of requested feature #7.
 *
 * Comments are already built (S4/S9); this is the other half. See
 * `docs/feature-batch-2.md` §5.
 *
 * ## ⚠️ `read` is NOT public
 *
 * A row holds a `fingerprint` — a salted hash of the reader's IP and user agent.
 * Making the collection publicly readable would let anyone page through every
 * fingerprint on an article, and would ship the entire row set to every reader
 * just to add up five numbers. The aggregate is computed server-side by
 * `GET /api/reactions/counts` instead, which returns five counts and the caller's
 * own choice and nothing else.
 *
 * ## ⚠️ Dedupe is a database constraint, not a UI rule
 *
 * Two compound unique indexes, per the approved spec:
 *
 *   `(article, type, reader)`      — a signed-in reader is the same reader on
 *                                    every device, so the account is the key.
 *   `(article, type, fingerprint)` — an anonymous reader is recognised by the
 *                                    hashed IP + UA.
 *
 * Both are needed. SQLite treats `NULL` as distinct in a unique index, so the
 * `reader` index cannot constrain an anonymous row at all — the fingerprint index
 * is what carries that case, and the reader index is what survives a reader
 * clearing their cookies or switching devices.
 *
 * The harness (`verify:reactions`) writes the same reaction twice **directly
 * through the local API**, bypassing the endpoint, and asserts the database
 * refuses the second — a UI-only guard would pass that test while proving nothing.
 *
 * ## ⚠️ Never wrapped in `withRebuildTrigger`
 *
 * Like comments and poll votes, these rows are written by the public, not
 * published by editors. A reader tapping a reaction must never cost a CI rebuild
 * — the counts are read at runtime precisely so that no rebuild is needed.
 */
export const Reactions: CollectionConfig = {
  slug: 'reactions',
  labels: {
    singular: { en: 'Reaction', bn: 'প্রতিক্রিয়া' },
    plural: { en: 'Reactions', bn: 'প্রতিক্রিয়াসমূহ' },
  },
  admin: {
    useAsTitle: 'type',
    group: 'পাঠক',
    defaultColumns: ['article', 'type', 'reader', 'createdAt'],
    description: 'পাঠকের প্রতিক্রিয়া — সংখ্যা রানটাইমে পড়া হয়, তাই সংবাদ বদলালে রিবিল্ড লাগে না।',
  },
  access: {
    // See the header: the public aggregate goes through the counts endpoint.
    read: ({ req }) => hasRole(req.user, 'superAdmin', 'editorInChief', 'sectionEditor'),
    // The generated create route stays closed to the public; readers write
    // through the toggle endpoint, which is the only thing that can rate limit,
    // honeypot, and refuse a caller-supplied fingerprint.
    create: isSuperAdminOrEditorInChief,
    update: isSuperAdminOrEditorInChief,
    delete: isSuperAdminOrEditorInChief,
  },
  /**
   * ⚠️ Mounted on the collection, not at the API root — a root path whose first
   * segment equals a collection slug is shadowed by that collection's generated
   * REST route, and every request 404s. This is the `/comments/submit` lesson.
   */
  endpoints: reactionEndpoints,
  indexes: [
    { fields: ['article', 'type', 'reader'], unique: true },
    { fields: ['article', 'type', 'fingerprint'], unique: true },
  ],
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
      name: 'type',
      type: 'select',
      required: true,
      index: true,
      label: { en: 'Reaction', bn: 'প্রতিক্রিয়া' },
      options: REACTION_TYPES.map((value) => ({ value, label: TYPE_LABELS[value] })),
    },
    {
      name: 'reader',
      type: 'relationship',
      relationTo: 'readers',
      index: true,
      label: { en: 'Reader account', bn: 'পাঠক অ্যাকাউন্ট' },
      admin: { description: 'সোশ্যাল লগইন করা পাঠক (যদি থাকে)। কুকি মুছলেও অ্যাকাউন্ট একই থাকে।' },
    },
    {
      name: 'fingerprint',
      type: 'text',
      required: true,
      index: true,
      label: { en: 'Fingerprint', bn: 'ফিঙ্গারপ্রিন্ট' },
      /**
       * ⚠️ **A raw IP is never stored.** This is a salted HMAC-SHA256 of IP + user
       * agent (`lib/reactions.ts`), keyed with `PAYLOAD_SECRET` so a leaked
       * database does not yield a reversible value (`docs/security.md` §8).
       *
       * Hidden from every reader of the API except a signed-in CMS user, so the
       * dedupe key cannot be enumerated.
       */
      access: { read: ({ req }) => Boolean(req.user) },
      admin: {
        readOnly: true,
        description:
          'স্বয়ংক্রিয়ভাবে তৈরি — আইপি ও ব্রাউজার তথ্যের সল্টেড ওয়ান-ওয়ে হ্যাশ। কাঁচা আইপি কোথাও সংরক্ষণ করা হয় না।',
      },
    },
  ],
  timestamps: true,
}
