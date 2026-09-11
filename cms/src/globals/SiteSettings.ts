import type { GlobalConfig } from 'payload'

import { anyone, hasRole } from '../access/roles'

/**
 * Site Settings — the 1-point global store.
 *
 * This is the `sps-cms` "Site-Wide Global Settings" principle implemented inside
 * Payload (see the reconciliation note in `.sps/section-todos/S0.md`): the site
 * name, logo, contact details and social links are edited **once** here and read
 * everywhere — header, footer, schema.org markup and OG tags.
 *
 * `.sps/profile.md`: the **logo is a CMS-managed field**, so the real asset
 * replaces the placeholder SVG without a code change. The display name is
 * likewise editable because it is still unconfirmed.
 */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: { en: 'Site settings', bn: 'সাইট সেটিংস' },
  admin: {
    group: 'প্রশাসন',
    description: 'সাইটের নাম, লোগো, যোগাযোগ ও সোশ্যাল লিংক — একবার বদলালেই সব জায়গায় বদলাবে।',
  },
  access: {
    read: anyone,
    update: ({ req }) => hasRole(req.user, 'superAdmin', 'editorInChief'),
  },
  fields: [
    {
      name: 'siteName',
      type: 'text',
      required: true,
      defaultValue: 'শিক্ষা২৪',
      label: { en: 'Site name', bn: 'সাইটের নাম' },
      admin: {
        description:
          'প্রদর্শিত নাম এখনো চূড়ান্ত হয়নি — "শিক্ষা২৪" অনুমান করা হয়েছে ডোমেইন থেকে। নিশ্চিত হলে এখানে বদলান।',
      },
    },
    {
      name: 'siteNameEn',
      type: 'text',
      defaultValue: 'Shikkha24',
      label: { en: 'Site name (English)', bn: 'সাইটের নাম (ইংরেজি)' },
    },
    {
      name: 'tagline',
      type: 'text',
      defaultValue: 'দেশ-বিদেশের শিক্ষার সর্বশেষ খবর ও সুযোগ',
      label: { en: 'Tagline', bn: 'স্লোগান' },
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Logo', bn: 'লোগো' },
      admin: { description: 'খালি থাকলে প্লেসহোল্ডার SVG ব্যবহৃত হবে।' },
    },
    {
      name: 'favicon',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Favicon', bn: 'ফ্যাভিকন' },
    },
    {
      name: 'contact',
      type: 'group',
      label: { en: 'Contact', bn: 'যোগাযোগ' },
      fields: [
        { name: 'email', type: 'email', label: { en: 'Email', bn: 'ইমেইল' } },
        { name: 'phone', type: 'text', label: { en: 'Phone', bn: 'ফোন' } },
        { name: 'address', type: 'textarea', label: { en: 'Address', bn: 'ঠিকানা' } },
      ],
    },
    {
      name: 'social',
      type: 'group',
      label: { en: 'Social links', bn: 'সোশ্যাল লিংক' },
      fields: [
        { name: 'facebook', type: 'text', label: { en: 'Facebook', bn: 'ফেসবুক' } },
        { name: 'youtube', type: 'text', label: { en: 'YouTube', bn: 'ইউটিউব' } },
        { name: 'twitter', type: 'text', label: { en: 'X / Twitter', bn: 'এক্স / টুইটার' } },
        { name: 'instagram', type: 'text', label: { en: 'Instagram', bn: 'ইনস্টাগ্রাম' } },
      ],
    },
    {
      name: 'footerText',
      type: 'textarea',
      label: { en: 'Footer text', bn: 'ফুটারের লেখা' },
    },
    {
      name: 'legal',
      type: 'group',
      label: { en: 'Legal details', bn: 'আইনি তথ্য' },
      admin: {
        description: 'E-E-A-T পাতার জন্য প্রয়োজন। মালিক চূড়ান্ত ডিপ্লয়ের আগে সরবরাহ করবেন।',
      },
      fields: [
        { name: 'tradeLicense', type: 'text', label: { en: 'Trade licence', bn: 'ট্রেড লাইসেন্স' } },
        { name: 'tin', type: 'text', label: { en: 'TIN', bn: 'টিআইএন' } },
        {
          name: 'ministryRegistration',
          type: 'text',
          label: { en: 'Ministry of Information registration', bn: 'তথ্য মন্ত্রণালয় নিবন্ধন' },
        },
      ],
    },
    {
      name: 'tracking',
      type: 'group',
      label: { en: 'Tracking scripts', bn: 'ট্র্যাকিং স্ক্রিপ্ট' },
      admin: {
        description:
          'ঐচ্ছিক। AdSense ও Cloudflare Web Analytics ব্যবহৃত হবে; GA4 ইচ্ছাকৃতভাবে বাদ (docs/performance-budget.md §4)।',
      },
      fields: [
        {
          name: 'adsenseClientId',
          type: 'text',
          label: { en: 'AdSense client id', bn: 'AdSense ক্লায়েন্ট আইডি' },
        },
        {
          name: 'customHeadCode',
          type: 'textarea',
          label: { en: 'Custom head code', bn: 'কাস্টম হেড কোড' },
          access: { update: ({ req }) => hasRole(req.user, 'superAdmin') },
        },
      ],
    },
  ],
}
