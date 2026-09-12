import type { Block } from 'payload'

/**
 * Infographic block — a designed graphic placed inside an article body.
 *
 * `docs/education-feature-inventory.md` §2 lists infographics among the retained
 * reader-experience features. They earn their place on this portal specifically
 * because admission procedures, merit-list layouts and grading systems are
 * **visual** subjects: a diagram of how the XI admission system works explains in
 * one image what a thousand words of prose does badly.
 *
 * ## Alt text is not optional in practice
 *
 * The image's `alt` is the infographic's only content for a screen-reader user —
 * there is no surrounding text to fall back on. It is a required field rather
 * than an optional override, because an optional accessibility field is one that
 * gets left empty.
 */
export const InfographicBlock: Block = {
  slug: 'infographic',
  labels: {
    singular: { en: 'Infographic', bn: 'ইনফোগ্রাফিক' },
    plural: { en: 'Infographics', bn: 'ইনফোগ্রাফিক' },
  },
  fields: [
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: { en: 'Image', bn: 'ছবি' },
    },
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: { en: 'Alt text', bn: 'বিকল্প টেক্সট' },
      admin: {
        description:
          'ছবিটি কী দেখাচ্ছে তা সংক্ষেপে লিখুন — স্ক্রিন রিডার ব্যবহারকারীর কাছে এটিই ছবির একমাত্র বিষয়বস্তু।',
      },
    },
    {
      name: 'caption',
      type: 'textarea',
      label: { en: 'Caption', bn: 'ক্যাপশন' },
    },
    {
      name: 'source',
      type: 'text',
      label: { en: 'Source', bn: 'সূত্র' },
      admin: { description: 'তথ্যের সূত্র — E-E-A-T-এর জন্য গুরুত্বপূর্ণ।' },
    },
  ],
}
