import type { CollectionConfig } from 'payload'

import { anyone, canManageAds, isSuperAdminOrEditorInChief } from '../access/roles'

/** Where an ad may be placed. Fixed positions keep CLS at zero. */
export const AD_POSITIONS = [
  'headerBanner',
  'inArticleTop',
  'inArticleMiddle',
  'inArticleBottom',
  'sidebarTop',
  'sidebarSticky',
  'footerBanner',
] as const

const POSITION_LABELS: Record<(typeof AD_POSITIONS)[number], string> = {
  headerBanner: 'হেডার ব্যানার',
  inArticleTop: 'সংবাদের উপরে',
  inArticleMiddle: 'সংবাদের মাঝে',
  inArticleBottom: 'সংবাদের নিচে',
  sidebarTop: 'সাইডবার উপরে',
  sidebarSticky: 'সাইডবার স্টিকি',
  footerBanner: 'ফুটার ব্যানার',
}

/**
 * Ad units — managed by the Ad Manager role.
 *
 * `docs/performance-budget.md` §1: ads must load **after LCP**, never above the
 * fold in the initial payload, and every container must be reserved so CLS stays
 * at zero. The fixed `position` enum exists for exactly that reason — a
 * free-form position would let an editor put an unreserved slot above the fold.
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
    description: 'বিজ্ঞাপনের অবস্থান ও ক্যাম্পেইন — CLS শূন্য রাখতে নির্দিষ্ট অবস্থান ব্যবহার করুন।',
  },
  access: {
    read: anyone,
    create: canManageAds,
    update: canManageAds,
    delete: isSuperAdminOrEditorInChief,
  },
  fields: [
    { name: 'name', type: 'text', required: true, label: { en: 'Name', bn: 'নাম' } },
    {
      name: 'position',
      type: 'select',
      required: true,
      index: true,
      label: { en: 'Position', bn: 'অবস্থান' },
      options: AD_POSITIONS.map((value) => ({ value, label: POSITION_LABELS[value] })),
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
      name: 'codeSnippet',
      type: 'textarea',
      label: { en: 'Ad code', bn: 'বিজ্ঞাপন কোড' },
      admin: { description: 'AdSense বা সরাসরি বিজ্ঞাপনের কোড।' },
    },
    { name: 'image', type: 'upload', relationTo: 'media', label: { en: 'Image', bn: 'ছবি' } },
    { name: 'targetUrl', type: 'text', label: { en: 'Target URL', bn: 'লক্ষ্য লিংক' } },
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
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      label: { en: 'Active', bn: 'সক্রিয়' },
    },
    {
      name: 'clickCount',
      type: 'number',
      defaultValue: 0,
      label: { en: 'Clicks', bn: 'ক্লিক' },
      admin: { readOnly: true },
    },
  ],
  timestamps: true,
}
