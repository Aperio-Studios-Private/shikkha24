/**
 * Seed data for the two editorial taxonomies.
 *
 * Source: `docs/education-feature-inventory.md` §1 — **the approved category tree**.
 * Nothing here is invented; the 8 categories and 5 levels are the owner-approved
 * values, and the flat structure is deliberate (স্কুল-কলেজ was rejected as a
 * category and replaced by the level axis).
 *
 * `slug` is ASCII because the URL architecture is ASCII
 * (`docs/seo-plan.md` — ASCII slugs, Bengali in title/h1/schema).
 */

export interface CategorySeed {
  nameBn: string
  slug: string
  description: string
  sortOrder: number
}

/** The 8 approved top-level categories, in editorial order. */
export const CATEGORIES: CategorySeed[] = [
  {
    nameBn: 'শিক্ষা সংবাদ',
    slug: 'education-news',
    description: 'নীতি, প্রতিষ্ঠান ও সাধারণ শিক্ষা সংবাদ।',
    sortOrder: 1,
  },
  {
    nameBn: 'বৃত্তি ও স্কলারশিপ',
    slug: 'scholarship',
    description: 'দেশি-বিদেশি বৃত্তি ও অর্থায়নের সুযোগ।',
    sortOrder: 2,
  },
  {
    nameBn: 'ভর্তি',
    slug: 'admission',
    description: 'একাদশ শ্রেণি, অনার্স, মাস্টার্স ও মাদ্রাসা ভর্তি।',
    sortOrder: 3,
  },
  {
    nameBn: 'বিশ্ববিদ্যালয়',
    slug: 'university',
    description: 'সরকারি ও বেসরকারি বিশ্ববিদ্যালয়ের খবর।',
    sortOrder: 4,
  },
  {
    nameBn: 'উচ্চশিক্ষা',
    slug: 'higher-study',
    description: 'স্নাতকোত্তর ও গবেষণা।',
    sortOrder: 5,
  },
  {
    nameBn: 'বিদেশে পড়াশোনা',
    slug: 'study-abroad',
    description: 'বিদেশে উচ্চশিক্ষার সুযোগ, ভিসা ও খরচ।',
    sortOrder: 6,
  },
  {
    nameBn: 'পরীক্ষা ও ফলাফল',
    slug: 'exams-results',
    description: 'রুটিন, ফলাফল ও মেধাতালিকা।',
    sortOrder: 7,
  },
  {
    nameBn: 'চাকরি ও ক্যারিয়ার',
    slug: 'jobs-career',
    description: 'বিজ্ঞপ্তি, বিসিএস ও নিয়োগ।',
    sortOrder: 8,
  },
]

export interface LevelSeed {
  nameBn: string
  slug: string
  sortOrder: number
}

/**
 * The 5 levels — the cross-cutting audience filter, **not** categories.
 * Ordered youngest to oldest, which is also how the filter renders.
 */
export const LEVELS: LevelSeed[] = [
  { nameBn: 'প্রাথমিক', slug: 'primary', sortOrder: 1 },
  { nameBn: 'মাধ্যমিক', slug: 'secondary', sortOrder: 2 },
  { nameBn: 'উচ্চ মাধ্যমিক', slug: 'higher-secondary', sortOrder: 3 },
  { nameBn: 'স্নাতক', slug: 'undergraduate', sortOrder: 4 },
  { nameBn: 'স্নাতকোত্তর', slug: 'postgraduate', sortOrder: 5 },
]
