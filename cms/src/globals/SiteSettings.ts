import type { GlobalConfig } from 'payload'

import { anyone, hasRole } from '../access/roles'

/**
 * Formats a browser tab icon actually accepts.
 *
 * SVG first — one small file that stays sharp at every size, which is what a
 * favicon wants. PNG and WebP next. **ICO is deliberately absent**: `Media` does
 * not accept it (`sharp` cannot process it), so offering it here would be a
 * validation rule the uploader could never satisfy.
 */
const FAVICON_MIME_TYPES = ['image/svg+xml', 'image/png', 'image/webp']

/**
 * A favicon is requested for every page a reader opens, so it gets a far tighter
 * cap than the 15 MB general media limit (`docs/security.md` §6). Half a
 * megabyte is already generous for an icon.
 */
const FAVICON_MAX_BYTES = 512 * 1024

/**
 * Pixels, per side.
 *
 * The byte cap alone is not enough: `Media` normalises every raster upload to
 * WebP at quality 82, so a 2000×2000 photograph compresses to well under 512 KB
 * and would have passed — while still being a 2000-pixel icon the browser
 * downscales to 16. Measured, not assumed: a 2000×2000 noise PNG stored as
 * **2766 KB** WebP (rejected on bytes), but a *flat* 2000×2000 image compresses
 * to a few KB and would have sailed through.
 *
 * Browsers render a tab icon at 16–64 px and a home-screen icon at up to 512.
 * Beyond that the extra pixels are pure waste on a file every page requests.
 */
const FAVICON_MAX_DIMENSION = 512

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
  /**
   * Validates the chosen favicon against the **referenced media record**, not the
   * upload.
   *
   * The distinction matters: `Media` already enforces "images only, ≤ 15 MB" on
   * upload, and it must stay that loose because article photographs go through
   * the same collection. A favicon needs tighter rules than a photograph, and the
   * only place that knows the asset is a favicon is here.
   *
   * Without this the field accepted anything in the library — including a 15 MB
   * JPEG — and the frontend emitted it as the tab icon on every page.
   */
  hooks: {
    beforeValidate: [
      async ({ data, req }) => {
        const faviconId = data?.favicon
        if (!faviconId) return data

        const media = await req.payload
          .findByID({ collection: 'media', id: faviconId, depth: 0 })
          .catch(() => null)
        if (!media) {
          throw new Error('নির্বাচিত ফ্যাভিকন ফাইলটি পাওয়া যায়নি। আবার আপলোড করুন।')
        }

        const mimeType = typeof media.mimeType === 'string' ? media.mimeType : ''
        if (!FAVICON_MIME_TYPES.includes(mimeType)) {
          throw new Error(
            `ফ্যাভিকনে এই ফাইল ধরন ব্যবহার করা যায় না (${mimeType || 'অজানা'})। শুধু SVG, PNG বা WebP ব্যবহার করুন।`,
          )
        }

        const filesize = typeof media.filesize === 'number' ? media.filesize : 0
        if (filesize > FAVICON_MAX_BYTES) {
          const kb = Math.round(filesize / 1024)
          throw new Error(
            `ফ্যাভিকন খুব বড় (${kb} KB)। সর্বোচ্চ ${FAVICON_MAX_BYTES / 1024} KB হতে হবে — আইকনটি প্রতিটি পাতায় লোড হয়।`,
          )
        }

        // `sharp` cannot read an SVG's intrinsic size, so both dimensions are
        // absent for a vector. SVG is resolution-independent by nature, so it is
        // exempt rather than rejected — an unreadable size is not a bad size.
        const width = typeof media.width === 'number' ? media.width : null
        const height = typeof media.height === 'number' ? media.height : null
        if (
          (width !== null && width > FAVICON_MAX_DIMENSION) ||
          (height !== null && height > FAVICON_MAX_DIMENSION)
        ) {
          throw new Error(
            `ফ্যাভিকনের মাপ খুব বড় (${width ?? '?'}×${height ?? '?'})। সর্বোচ্চ ${FAVICON_MAX_DIMENSION}×${FAVICON_MAX_DIMENSION} px — ব্রাউজার ১৬–৬৪ px-এ দেখায়।`,
          )
        }

        return data
      },
    ],
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
      admin: {
        description:
          'লোগোটি সাইটের নামের **পাশে** মার্ক হিসেবে বসে — নাম মুছে যায় না। খালি থাকলে প্লেসহোল্ডার ওয়ার্ডমার্ক ব্যবহৃত হবে।',
      },
    },
    {
      name: 'showNameWithLogo',
      type: 'checkbox',
      defaultValue: true,
      label: { en: 'Show site name beside the logo', bn: 'লোগোর পাশে সাইটের নাম দেখাও' },
      admin: {
        description: 'ডিফল্টভাবে চালু। লোগোর ভেতরেই যদি নাম লেখা থাকে, তাহলে বন্ধ করুন — নাম লুকাবে, লোগো থাকবে।',
      },
    },
    {
      name: 'favicon',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Favicon', bn: 'ফ্যাভিকন' },
      admin: {
        description:
          'ব্রাউজার ট্যাব, বুকমার্ক ও মোবাইলের হোম স্ক্রিনে যে আইকনটি দেখা যায়। **SVG, PNG বা WebP**, সর্বোচ্চ **512 KB** এবং **512×512 px**। খালি থাকলে সাইটের ডিফল্ট আইকন ব্যবহৃত হবে। লোগোর চেয়ে আলাদা — লোগো লম্বা ওয়ার্ডমার্ক হতে পারে, আইকনটি বর্গাকার হওয়া উচিত।',
      },
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
        description: 'ঐচ্ছিক। AdSense ব্যবহৃত হবে; GA4 ইচ্ছাকৃতভাবে বাদ (docs/performance-budget.md §4)।',
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
