import type { CollectionConfig } from 'payload'

import { anyone, isEditorial, isSuperAdminOrEditorInChief } from '../access/roles'
import { pollVoteEndpoint } from '../endpoints/poll-vote'

/**
 * Polls — re-scoped to education opinion.
 *
 * `docs/education-feature-inventory.md` §3: "Is the new admission policy fair?"
 * replaces political opinion polling.
 *
 * ## Voting
 *
 * Votes are cast through the custom endpoint below, never through the generated
 * REST API — `PATCH /api/polls/:id` would let anyone rewrite the question and
 * the tallies. The endpoint owns the abuse guards and is the only writer of
 * `voteCount`. See `src/endpoints/poll-vote.ts`.
 */
export const Polls: CollectionConfig = {
  slug: 'polls',
  labels: {
    singular: { en: 'Poll', bn: 'জরিপ' },
    plural: { en: 'Polls', bn: 'জরিপসমূহ' },
  },
  admin: {
    useAsTitle: 'questionBn',
    group: 'ইন্টারঅ্যাকটিভ',
    defaultColumns: ['questionBn', 'isActive', 'expiresAt'],
    description: 'পাঠক জরিপ — ভর্তি নীতি বা পরীক্ষা সংক্রান্ত মতামত।',
  },
  access: {
    read: anyone,
    create: isEditorial,
    update: isEditorial,
    delete: isSuperAdminOrEditorInChief,
  },
  endpoints: [pollVoteEndpoint],
  fields: [
    { name: 'questionBn', type: 'text', required: true, label: { en: 'Question', bn: 'প্রশ্ন' } },
    {
      name: 'options',
      type: 'array',
      minRows: 2,
      label: { en: 'Options', bn: 'বিকল্পসমূহ' },
      fields: [
        { name: 'label', type: 'text', required: true, label: { en: 'Option', bn: 'বিকল্প' } },
        {
          name: 'voteCount',
          type: 'number',
          defaultValue: 0,
          label: { en: 'Votes', bn: 'ভোট' },
          // Written only by the vote endpoint, never by hand — an editor typing
          // a number here would silently corrupt the result.
          admin: { readOnly: true },
        },
      ],
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      label: { en: 'Active', bn: 'সক্রিয়' },
      admin: {
        position: 'sidebar',
        description: 'বন্ধ করলে নতুন ভোট গ্রহণ করা হবে না — ফলাফল দেখানো চলবে।',
      },
    },
    {
      name: 'expiresAt',
      type: 'date',
      label: { en: 'Expires at', bn: 'শেষ সময়' },
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description: 'এই সময়ের পর স্বয়ংক্রিয়ভাবে ভোট বন্ধ হবে।',
      },
    },
  ],
  timestamps: true,
}
