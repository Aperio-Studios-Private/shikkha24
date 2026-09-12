import type { CollectionConfig } from 'payload'

import { anyone, canManageAds, isSuperAdminOrEditorInChief } from '../access/roles'

/**
 * Where an ad may be placed.
 *
 * ## Why this is an enum, and why it matches the site exactly
 *
 * `docs/performance-budget.md` §1: ads must load **after LCP**, never above the
 * fold in the initial payload, and every container must be **reserved** so CLS
 * stays at zero. A free-form position would let an editor place a slot that the
 * layout does not reserve — which is exactly the layout shift the budget forbids.
 *
 * So every value here has **one and only one** corresponding `AdSlot` in the
 * frontend, and each of those reserves its box before any ad loads. An editor can
 * only choose a position that the layout already accounts for.
 *
 * ⚠️ **These names are a contract with the frontend.** Adding a value without a
 * matching slot produces an ad unit that silently never renders. The reverse —
 * a slot with no position value — renders the placeholder forever.
 *
 * (S1 shipped a placeholder vocabulary — `headerBanner`, `footerBanner`,
 * `inArticleTop`… — written before the layout existed. None of it matched a real
 * slot, so no ad unit could target any page. Reconciled in S7; the collection
 * held no data, so the change was free.)
 */
export const AD_POSITIONS = [
  'homepageLeaderboard',
  'homepageFooter',
  'sidebarTop',
  'sidebarSticky',
  'categoryLeaderboard',
  'articleTop',
  'articleMiddle',
  'articleBottom',
] as const

export type AdPosition = (typeof AD_POSITIONS)[number]

const POSITION_LABELS: Record<AdPosition, string> = {
  homepageLeaderboard: 'হোমপেজ — লিডারবোর্ড (৭২৮×৯০)',
  homepageFooter: 'হোমপেজ — ফুটারের উপরে (৭২৮×৯০)',
  sidebarTop: 'সাইডবার — উপরে (৩০০×২৫০)',
  sidebarSticky: 'সাইডবার — স্টিকি (৩০০×২৫০)',
  categoryLeaderboard: 'বিভাগ পাতা — লিডারবোর্ড (৭২৮×৯০)',
  articleTop: 'সংবাদ — উপরের অংশ (৭২৮×৯০)',
  articleMiddle: 'সংবাদ — মাঝের অংশ (৭২৮×৯০)',
  articleBottom: 'সংবাদ — নিচের অংশ (৭২৮×৯০)',
}

/**
 * Ad units — managed by the Ad Manager role.
 *
 * ## No raw HTML field, deliberately
 *
 * An earlier draft carried a `codeSnippet` textarea for pasting AdSense code.
 * That was removed: rendering CMS-authored HTML into a public page is a
 * script-injection vector, and a compromised Ad Manager account would become
 * stored XSS on every page carrying the unit. `docs/security.md` §4 requires
 * input to be structured and escaped, never executed.
 *
 * Instead the markup is generated from structured fields — `adsenseSlotId` for
 * AdSense, `image` + `targetUrl` for direct inventory — so there is no path from
 * the admin to arbitrary markup.
 */
export const AdUnits: CollectionConfig = {
  slug: 'ad-units',
  labels: {
    singular: { en: 'Ad unit', bn: 'বিজ্ঞাপন ইউনিট' },
    plural: { en: 'Ad units', bn: 'বিজ্ঞাপন ইউনিটসমূহ' },
  },
  admin: {
    useAsTitle: 'name',
    group: 'বিজ্ঞাপন',
    defaultColumns: ['name', 'position', 'adType', 'isActive', 'campaignEnd'],
    description:
      'বিজ্ঞাপনের অবস্থান ও ক্যাম্পেইন। CLS শূন্য রাখতে নির্দিষ্ট অবস্থান ব্যবহার করুন — নতুন অবস্থান যোগ করার আগে ফ্রন্টএন্ডে সেই স্লট থাকতে হবে।',
  },
  access: {
    read: anyone,
    create: canManageAds,
    update: canManageAds,
    delete: isSuperAdminOrEditorInChief,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: { en: 'Name', bn: 'নাম' },
      admin: { description: 'শুধু অভ্যন্তরীণ — পাঠক এটি দেখবেন না।' },
    },
    {
      name: 'position',
      type: 'select',
      required: true,
      index: true,
      label: { en: 'Position', bn: 'অবস্থান' },
      options: AD_POSITIONS.map((value) => ({ value, label: POSITION_LABELS[value] })),
      admin: { description: 'সাইটে যে স্লটটি আছে, শুধু সেটিই বেছে নিন।' },
    },
    {
      name: 'adType',
      type: 'select',
      required: true,
      defaultValue: 'adsense',
      label: { en: 'Type', bn: 'ধরন' },
      options: [
        { value: 'adsense', label: 'AdSense' },
        { value: 'sponsorBanner', label: 'স্পনসর ব্যানার' },
        { value: 'direct', label: 'সরাসরি বিজ্ঞাপন' },
      ],
    },
    {
      name: 'adsenseSlotId',
      type: 'text',
      label: { en: 'AdSense slot id', bn: 'AdSense স্লট আইডি' },
      admin: {
        condition: (data) => data?.adType === 'adsense',
        description:
          'AdSense ইউনিটের আইডি (ক্লায়েন্ট আইডি নয় — সেটি সাইট সেটিংসে একবার সেট করা)। খালি থাকলে স্লটটি প্লেসহোল্ডার দেখাবে।',
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Image', bn: 'ছবি' },
      admin: {
        condition: (data) => data?.adType !== 'adsense',
        description: 'প্রস্তাবিত মাপ ৭২৮×৯০ বা ৩০০×২৫০ — স্লটের মাপের সঙ্গে মিলতে হবে।',
      },
    },
    {
      name: 'targetUrl',
      type: 'text',
      label: { en: 'Target URL', bn: 'লক্ষ্য লিংক' },
      admin: {
        condition: (data) => data?.adType !== 'adsense',
        description: 'বিজ্ঞাপনদাতার ঠিকানা। লিংকটি স্বয়ংক্রিয়ভাবে rel="sponsored nofollow" পাবে।',
      },
    },
    {
      name: 'sponsorName',
      type: 'text',
      label: { en: 'Sponsor name', bn: 'স্পনসরের নাম' },
      admin: {
        condition: (data) => data?.adType !== 'adsense',
        description: 'লেবেলে দেখানো হবে — যেমন "বিজ্ঞাপন — পাঠক প্রকাশনী"।',
      },
    },
    {
      name: 'campaignStart',
      type: 'date',
      label: { en: 'Campaign start', bn: 'ক্যাম্পেইন শুরু' },
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'campaignEnd',
      type: 'date',
      index: true,
      label: { en: 'Campaign end', bn: 'ক্যাম্পেইন শেষ' },
      admin: {
        date: { pickerAppearance: 'dayOnly' },
        description: 'এই তারিখের পর ইউনিটটি স্বয়ংক্রিয়ভাবে বন্ধ হয়ে যাবে — ম্যানুয়াল কিছু করতে হবে না।',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      label: { en: 'Active', bn: 'সক্রিয়' },
    },
  ],
  timestamps: true,
}
