import type { Block } from 'payload'

/**
 * Video embed block — a click-to-load YouTube player.
 *
 * ## Why the poster is an upload and not the YouTube thumbnail
 *
 * The obvious shortcut is to point the poster at `i.ytimg.com/vi/<id>/…`, which
 * YouTube serves for free. That would make a **third-party request on every
 * article view**, for every reader, before anyone has decided to watch anything.
 * The whole point of this block is that a video costs nothing until it is
 * played, so the poster is a self-hosted upload that goes through the normal
 * media pipeline (WebP, dimension cap, EXIF stripped).
 *
 * A video with no poster still renders — as a text-only trigger. Reaching for
 * YouTube's thumbnail instead would quietly undo the privacy property.
 *
 * ## Why this block is offered only on the article body
 *
 * The click-to-load player needs `frame-src` for `youtube-nocookie.com`, and
 * only the article route in `frontend/public/.htaccess` allows it. That rule is
 * the regex `^/[^/]+/[^/]+/[^/]+$` — it was `/article/*` before
 * the S11 URL change, so do not restore the old prefix. The
 * article body therefore gets its own editor instance (see `blocks/editors.ts`)
 * that includes this block, while static pages and live-blog updates keep the
 * S8 three. Offering a block on a page whose CSP will refuse to render it would
 * produce exactly the dead control this project keeps designing out.
 *
 * ## No `VideoObject` schema
 *
 * Decided in `docs/seo-plan.md` §3: a third-party embed fails Rich Results more
 * often than it passes, so claiming `VideoObject` would add noise without adding
 * a rich result. The frontend deliberately emits no structured data for this.
 */
export const VideoEmbedBlock: Block = {
  slug: 'videoEmbed',
  labels: {
    singular: { en: 'Video embed', bn: 'ভিডিও এমবেড' },
    plural: { en: 'Video embeds', bn: 'ভিডিও এমবেড' },
  },
  fields: [
    {
      name: 'url',
      type: 'text',
      required: true,
      label: { en: 'YouTube link or video ID', bn: 'ইউটিউব লিংক বা ভিডিও আইডি' },
      admin: {
        description:
          'লিংক পেস্ট করুন (youtu.be/… বা youtube.com/watch?v=…) অথবা শুধু ১১ অক্ষরের আইডি। অন্য কোনো লিংক গ্রহণ করা হবে না।',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: { en: 'Video title', bn: 'ভিডিওর শিরোনাম' },
      admin: {
        description: 'ভিডিওতে কী আছে তা এক লাইনে। প্লে বাটনের লেবেল হিসেবে ও স্ক্রিন রিডারে এটিই পড়া হয়।',
      },
    },
    {
      name: 'poster',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Poster image', bn: 'পোস্টার ছবি' },
      admin: {
        description:
          'নিজের আপলোড করা ছবি — ইউটিউবের থাম্বনেইল ব্যবহার করা হয় না, কারণ তাতে পাঠকের ব্রাউজার প্লে করার আগেই ইউটিউবে সংযোগ করে। না দিলে শুধু লেখাসহ বাটন দেখাবে।',
      },
    },
    {
      name: 'caption',
      type: 'text',
      label: { en: 'Caption', bn: 'ক্যাপশন' },
    },
  ],
}
