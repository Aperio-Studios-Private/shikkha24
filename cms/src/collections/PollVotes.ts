import type { CollectionConfig } from 'payload'

import { isSuperAdmin, noOne } from '../access/roles'

/**
 * Poll vote guard — one row per voter per poll.
 *
 * ## Why this collection exists
 *
 * A poll that anyone can stuff is not a poll, it is a scoreboard for whoever
 * cares most. Counting votes server-side needs a way to recognise a repeat
 * voter, and that means storing *something* about the reader.
 *
 * ## What is deliberately NOT stored
 *
 * No IP address, no user agent, no timestamp, and **not which option was
 * chosen**. The row exists only to answer "has this voter already voted in this
 * poll?" — so it holds a poll reference and a one-way hash, and nothing that
 * could be turned into a voting history or a reader profile.
 *
 * The hash is `HMAC-SHA256(ip + userAgent, PAYLOAD_SECRET)`. It is salted with
 * the server secret, so the same reader hashes differently on any other site and
 * the value cannot be reversed or brute-forced from a leaked database.
 *
 * ⚠️ **Retention:** rows are meaningless once a poll closes and should be deleted
 * with it. Payload does not cascade, so closing a poll means deleting its guard
 * rows — noted in `.sps/section-todos/S8.md` as a manual step until there is an
 * editorial action for it.
 *
 * ## Access
 *
 * Never readable by the public, and not writable through the REST API at all —
 * only the vote endpoint writes here, using the local API. That keeps the guard
 * out of reach of anyone who can reach the endpoint.
 */
export const PollVotes: CollectionConfig = {
  slug: 'poll-votes',
  labels: {
    singular: { en: 'Poll vote guard', bn: 'জরিপ ভোট গার্ড' },
    plural: { en: 'Poll vote guards', bn: 'জরিপ ভোট গার্ড' },
  },
  admin: {
    useAsTitle: 'voterHash',
    group: 'পাঠক',
    defaultColumns: ['poll', 'voterHash', 'createdAt'],
    description: 'ডুপ্লিকেট ভোট ঠেকানোর জন্য সংরক্ষিত ওয়ান-ওয়ে হ্যাশ। কোন বিকল্পে ভোট পড়েছে তা এখানে রাখা হয় না।',
  },
  access: {
    read: isSuperAdmin,
    // Only the vote endpoint writes here, via the local API with overrideAccess.
    create: noOne,
    update: noOne,
    delete: isSuperAdmin,
  },
  fields: [
    {
      name: 'poll',
      type: 'relationship',
      relationTo: 'polls',
      required: true,
      index: true,
      label: { en: 'Poll', bn: 'জরিপ' },
    },
    {
      name: 'voterHash',
      type: 'text',
      required: true,
      index: true,
      label: { en: 'Voter hash', bn: 'ভোটারের হ্যাশ' },
      admin: { description: 'HMAC-SHA256(ip + user agent, server secret) — ফেরানো যায় না।' },
    },
  ],
  /**
   * The unique index is what actually prevents a double vote under concurrency:
   * a lookup-then-insert can race, a unique constraint cannot.
   */
  indexes: [{ fields: ['poll', 'voterHash'], unique: true }],
  timestamps: true,
}
