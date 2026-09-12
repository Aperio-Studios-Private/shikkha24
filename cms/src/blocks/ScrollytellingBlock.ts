import type { Block } from 'payload'

/**
 * Scrollytelling block — a sequence of steps revealed as the reader scrolls.
 *
 * `docs/education-feature-inventory.md` §2 retains scrollytelling, and the
 * plan constrains it: "lazy-loaded islands only", with "richer motion only for
 * specific S8 interactive features".
 *
 * ## Why it is a block and not a page template
 *
 * The original checklist called it a "scrollytelling template". A block is
 * better here: the education stories that suit it — how a merit list is built,
 * how an admission lottery runs — are *sections* of a normal article, not
 * standalone pages. As a block it also inherits the article's metadata, schema
 * and internal linking for free.
 *
 * ## Motion is the enhancement, never the content
 *
 * Every step is real text in the HTML. With JavaScript off, or under
 * `prefers-reduced-motion`, the steps render as a plain ordered list — the story
 * is completely readable and nothing is hidden behind an animation that may
 * never run.
 */
export const ScrollytellingBlock: Block = {
  slug: 'scrollytelling',
  labels: {
    singular: { en: 'Scrollytelling', bn: 'স্ক্রলি টেলিং' },
    plural: { en: 'Scrollytelling', bn: 'স্ক্রলি টেলিং' },
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      label: { en: 'Heading', bn: 'শিরোনাম' },
      admin: { description: 'ঐচ্ছিক — ধাপগুলো কী ব্যাখ্যা করছে।' },
    },
    {
      name: 'steps',
      type: 'array',
      minRows: 2,
      maxRows: 8,
      label: { en: 'Steps', bn: 'ধাপসমূহ' },
      admin: { description: 'সর্বোচ্চ ৮টি ধাপ — এর বেশি হলে পাঠক আগ্রহ হারান।' },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          label: { en: 'Step title', bn: 'ধাপের শিরোনাম' },
        },
        {
          name: 'body',
          type: 'textarea',
          label: { en: 'Step text', bn: 'ধাপের বিবরণ' },
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: { en: 'Step image', bn: 'ধাপের ছবি' },
        },
        {
          name: 'imageAlt',
          type: 'text',
          label: { en: 'Image alt text', bn: 'ছবির বিকল্প টেক্সট' },
          admin: { condition: (_, siblingData) => Boolean(siblingData?.image) },
        },
      ],
    },
  ],
}
