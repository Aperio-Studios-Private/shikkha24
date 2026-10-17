import type { CollectionConfig } from 'payload'

import { anyone, isEditorial, isSuperAdminOrEditorInChief } from '../access/roles'
import { facebookVideoUrlValidator, youtubeVideoIdValidator } from '../lib/live-stream'

/**
 * Live streams — the data behind `/live-tv` (S15, requested feature #5).
 *
 * ## Why this is an embed and not a stream
 *
 * The owner asked for Live TV. **Self-hosted streaming is not possible on this
 * stack**: it needs a VPS running RTMP/nginx, and DianaHost is 2 GB of shared
 * hosting under a zero-recurring-cost constraint. So the CMS stores *where* the
 * stream is and the page embeds the provider's player. That is the only feasible
 * path, and it is recorded rather than assumed.
 *
 * ## Why the provider is a stored field
 *
 * The owner's decision (2026-09-18) was **both YouTube and Facebook**. The two
 * providers need different fields and different embed URLs, so the provider is
 * the discriminator and the per-provider fields are required conditionally —
 * enforced here, not by the frontend failing quietly on an empty id.
 *
 * ## ⚠️ This collection forces a third CSP profile
 *
 * `/live-tv` frames YouTube *and* Facebook. The strict profile forbids all frames
 * and the relaxed profile allows no video at all, so a third profile
 * (`SHIKKHA24_CSP_MEDIA`) is scoped to that route alone — widening the relaxed
 * profile would give the homepage and every category listing iframe permission
 * they do not need. See `frontend/public/.htaccess` and `docs/security.md` §5.1.
 */
export const LiveStreams: CollectionConfig = {
  slug: 'live-streams',
  labels: {
    singular: { en: 'Live stream', bn: 'লাইভ স্ট্রিম' },
    plural: { en: 'Live streams', bn: 'লাইভ স্ট্রিমসমূহ' },
  },
  admin: {
    useAsTitle: 'title',
    group: { en: 'Media (মিডিয়া)' },
    defaultColumns: ['title', 'provider', 'isLive', 'scheduledStart', 'updatedAt'],
    description:
      'লাইভ টিভি — ইউটিউব বা ফেসবুকের লাইভ সম্প্রচার। /live-tv পাতায় দেখানো হয়। স্ট্রিম শেষ হলে isLive বন্ধ করুন।',
  },
  access: {
    read: anyone,
    create: isEditorial,
    update: isEditorial,
    delete: isSuperAdminOrEditorInChief,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      index: true,
      label: { en: 'Title', bn: 'শিরোনাম' },
      admin: { description: 'যেমন: বাজেট ২০২৬ সরাসরি সম্প্রচার।' },
    },
    {
      name: 'provider',
      type: 'select',
      required: true,
      defaultValue: 'youtube',
      index: true,
      label: { en: 'Provider', bn: 'সেবাদাতা' },
      options: [
        { label: 'YouTube (ইউটিউব)', value: 'youtube' },
        { label: 'Facebook (ফেসবুক)', value: 'facebook' },
      ],
      admin: { description: 'কোন প্লেয়ার ব্যবহার হবে তা ঠিক করে।' },
    },

    /*
     * The two provider fields are required **conditionally**. A `validate` that
     * reads `siblingData` is the only place Payload can express that, and it is
     * worth doing here: an empty `videoId` on a YouTube row renders a player with
     * no source, which looks like a broken page rather than a missing field.
     */
    {
      name: 'videoId',
      type: 'text',
      label: { en: 'YouTube video ID', bn: 'ইউটিউব ভিডিও আইডি' },
      validate: (value: unknown, { siblingData }: { siblingData?: Record<string, unknown> }) => {
        const shape = youtubeVideoIdValidator(value)
        if (shape !== true) return shape
        if (siblingData?.provider === 'youtube' && !String(value ?? '').trim()) {
          return 'ইউটিউব বেছে নিলে ভিডিও আইডি অবশ্যই দিতে হবে।'
        }
        return true
      },
      admin: {
        description: '১১ অক্ষরের আইডি, যেমন aqz-KE-bpKQ। সম্পূর্ণ লিংক নয়।',
        condition: (data: Record<string, unknown>) => data?.provider !== 'facebook',
      },
    },
    {
      name: 'pageUrl',
      type: 'text',
      label: { en: 'Facebook video URL', bn: 'ফেসবুক ভিডিও ঠিকানা' },
      validate: (value: unknown, { siblingData }: { siblingData?: Record<string, unknown> }) => {
        const shape = facebookVideoUrlValidator(value)
        if (shape !== true) return shape
        if (siblingData?.provider === 'facebook' && !String(value ?? '').trim()) {
          return 'ফেসবুক বেছে নিলে ভিডিওর ঠিকানা অবশ্যই দিতে হবে।'
        }
        return true
      },
      admin: {
        description: 'ফেসবুক ভিডিও বা লাইভ সম্প্রচারের সম্পূর্ণ ঠিকানা (https://www.facebook.com/…)।',
        condition: (data: Record<string, unknown>) => data?.provider === 'facebook',
      },
    },

    {
      name: 'isLive',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      label: { en: 'Currently live', bn: 'এখন সম্প্রচার হচ্ছে' },
      admin: {
        description: 'শুধু এই বোতাম চালু থাকলে পাতা সরাসরি সম্প্রচার দেখায়। সম্প্রচার শেষ হলে বন্ধ করে দিন।',
      },
    },
    {
      name: 'scheduledStart',
      type: 'date',
      label: { en: 'Scheduled start', bn: 'নির্ধারিত শুরু' },
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        description: 'সম্প্রচার না থাকলে এই সময় দেখানো হয়।',
      },
    },
    {
      name: 'scheduledEnd',
      type: 'date',
      label: { en: 'Scheduled end', bn: 'নির্ধারিত শেষ' },
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'description',
      type: 'textarea',
      label: { en: 'Description', bn: 'বিবরণ' },
    },
    {
      name: 'poster',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Poster image', bn: 'পোস্টার ছবি' },
      admin: {
        description:
          'প্লে করার আগে এই ছবিটি দেখানো হয়। নিজের ছবি দিন — ইউটিউবের থাম্বনেইল সরাসরি ব্যবহার করলে পাঠকের ব্রাউজার থেকে ইউটিউবে অনুরোধ যায়।',
      },
    },
  ],
  timestamps: true,
}
