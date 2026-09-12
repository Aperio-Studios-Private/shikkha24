import type { Block } from 'payload'

/**
 * Before/after comparison block.
 *
 * `docs/education-feature-inventory.md` §2 retains the "before/after comparison
 * slider" from the original feature set. Its education use is concrete rather
 * than decorative: a syllabus revision, an admission-policy change, a grading
 * table before and after — all are easier to see than to read.
 *
 * ## Two images, two labels, no state
 *
 * The block stores both images and both labels and nothing else. The comparison
 * position is a reader control, never saved — a stored position would make one
 * reader's choice another reader's starting point.
 */
export const BeforeAfterBlock: Block = {
  slug: 'beforeAfter',
  labels: {
    singular: { en: 'Before / after', bn: 'আগে / পরে' },
    plural: { en: 'Before / after', bn: 'আগে / পরে' },
  },
  fields: [
    {
      name: 'beforeImage',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: { en: 'Before image', bn: 'আগের ছবি' },
    },
    {
      name: 'afterImage',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: { en: 'After image', bn: 'পরের ছবি' },
    },
    {
      name: 'beforeAlt',
      type: 'text',
      required: true,
      label: { en: 'Before alt text', bn: 'আগের ছবির বিকল্প টেক্সট' },
    },
    {
      name: 'afterAlt',
      type: 'text',
      required: true,
      label: { en: 'After alt text', bn: 'পরের ছবির বিকল্প টেক্সট' },
    },
    {
      name: 'beforeLabel',
      type: 'text',
      defaultValue: 'আগে',
      label: { en: 'Before label', bn: 'আগের লেবেল' },
    },
    {
      name: 'afterLabel',
      type: 'text',
      defaultValue: 'পরে',
      label: { en: 'After label', bn: 'পরের লেবেল' },
    },
    {
      name: 'caption',
      type: 'textarea',
      label: { en: 'Caption', bn: 'ক্যাপশন' },
    },
  ],
}
