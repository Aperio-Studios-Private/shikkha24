/**
 * The 64 districts of Bangladesh, grouped by their 8 divisions.
 *
 * Source: the standard administrative list. Used to seed the `districts`
 * collection, which backs the "আমার জেলা" (my district) filter
 * (`docs/education-feature-inventory.md` §1 — District is a cross-cutting filter
 * axis, separate from categories).
 *
 * This is **seed data, not a hard-coded constant**: once seeded, editors manage
 * districts through the admin panel like any other collection.
 *
 * `slug` is ASCII because the URL architecture is ASCII
 * (`docs/seo-plan.md` — ASCII slugs, Bengali in title/h1/schema).
 */

export interface DistrictSeed {
  nameBn: string
  nameEn: string
  slug: string
  divisionBn: string
  divisionEn: string
}

/** Bengali division names, keyed by the English division name. */
export const DIVISIONS_BN: Record<string, string> = {
  Dhaka: 'ঢাকা',
  Chittagong: 'চট্টগ্রাম',
  Rajshahi: 'রাজশাহী',
  Khulna: 'খুলনা',
  Barisal: 'বরিশাল',
  Sylhet: 'সিলেট',
  Rangpur: 'রংপুর',
  Mymensingh: 'ময়মনসিংহ',
}

export const DISTRICTS: DistrictSeed[] = [
  // ── ঢাকা (Dhaka) — 13 ──────────────────────────────────────────────────────
  { nameBn: 'ঢাকা', nameEn: 'Dhaka', slug: 'dhaka', divisionBn: 'ঢাকা', divisionEn: 'Dhaka' },
  { nameBn: 'ফরিদপুর', nameEn: 'Faridpur', slug: 'faridpur', divisionBn: 'ঢাকা', divisionEn: 'Dhaka' },
  { nameBn: 'গাজীপুর', nameEn: 'Gazipur', slug: 'gazipur', divisionBn: 'ঢাকা', divisionEn: 'Dhaka' },
  {
    nameBn: 'গোপালগঞ্জ',
    nameEn: 'Gopalganj',
    slug: 'gopalganj',
    divisionBn: 'ঢাকা',
    divisionEn: 'Dhaka',
  },
  {
    nameBn: 'কিশোরগঞ্জ',
    nameEn: 'Kishoreganj',
    slug: 'kishoreganj',
    divisionBn: 'ঢাকা',
    divisionEn: 'Dhaka',
  },
  {
    nameBn: 'মাদারীপুর',
    nameEn: 'Madaripur',
    slug: 'madaripur',
    divisionBn: 'ঢাকা',
    divisionEn: 'Dhaka',
  },
  {
    nameBn: 'মানিকগঞ্জ',
    nameEn: 'Manikganj',
    slug: 'manikganj',
    divisionBn: 'ঢাকা',
    divisionEn: 'Dhaka',
  },
  {
    nameBn: 'মুন্সিগঞ্জ',
    nameEn: 'Munshiganj',
    slug: 'munshiganj',
    divisionBn: 'ঢাকা',
    divisionEn: 'Dhaka',
  },
  {
    nameBn: 'নারায়ণগঞ্জ',
    nameEn: 'Narayanganj',
    slug: 'narayanganj',
    divisionBn: 'ঢাকা',
    divisionEn: 'Dhaka',
  },
  {
    nameBn: 'নরসিংদী',
    nameEn: 'Narsingdi',
    slug: 'narsingdi',
    divisionBn: 'ঢাকা',
    divisionEn: 'Dhaka',
  },
  { nameBn: 'রাজবাড়ী', nameEn: 'Rajbari', slug: 'rajbari', divisionBn: 'ঢাকা', divisionEn: 'Dhaka' },
  {
    nameBn: 'শরীয়তপুর',
    nameEn: 'Shariatpur',
    slug: 'shariatpur',
    divisionBn: 'ঢাকা',
    divisionEn: 'Dhaka',
  },
  { nameBn: 'টাঙ্গাইল', nameEn: 'Tangail', slug: 'tangail', divisionBn: 'ঢাকা', divisionEn: 'Dhaka' },

  // ── চট্টগ্রাম (Chittagong) — 11 ────────────────────────────────────────────
  {
    nameBn: 'বান্দরবান',
    nameEn: 'Bandarban',
    slug: 'bandarban',
    divisionBn: 'চট্টগ্রাম',
    divisionEn: 'Chittagong',
  },
  {
    nameBn: 'ব্রাহ্মণবাড়িয়া',
    nameEn: 'Brahmanbaria',
    slug: 'brahmanbaria',
    divisionBn: 'চট্টগ্রাম',
    divisionEn: 'Chittagong',
  },
  {
    nameBn: 'চাঁদপুর',
    nameEn: 'Chandpur',
    slug: 'chandpur',
    divisionBn: 'চট্টগ্রাম',
    divisionEn: 'Chittagong',
  },
  {
    nameBn: 'চট্টগ্রাম',
    nameEn: 'Chittagong',
    slug: 'chittagong',
    divisionBn: 'চট্টগ্রাম',
    divisionEn: 'Chittagong',
  },
  {
    nameBn: 'কুমিল্লা',
    nameEn: 'Comilla',
    slug: 'comilla',
    divisionBn: 'চট্টগ্রাম',
    divisionEn: 'Chittagong',
  },
  {
    nameBn: 'কক্সবাজার',
    nameEn: "Cox's Bazar",
    slug: 'coxs-bazar',
    divisionBn: 'চট্টগ্রাম',
    divisionEn: 'Chittagong',
  },
  { nameBn: 'ফেনী', nameEn: 'Feni', slug: 'feni', divisionBn: 'চট্টগ্রাম', divisionEn: 'Chittagong' },
  {
    nameBn: 'খাগড়াছড়ি',
    nameEn: 'Khagrachari',
    slug: 'khagrachari',
    divisionBn: 'চট্টগ্রাম',
    divisionEn: 'Chittagong',
  },
  {
    nameBn: 'লক্ষ্মীপুর',
    nameEn: 'Lakshmipur',
    slug: 'lakshmipur',
    divisionBn: 'চট্টগ্রাম',
    divisionEn: 'Chittagong',
  },
  {
    nameBn: 'নোয়াখালী',
    nameEn: 'Noakhali',
    slug: 'noakhali',
    divisionBn: 'চট্টগ্রাম',
    divisionEn: 'Chittagong',
  },
  {
    nameBn: 'রাঙ্গামাটি',
    nameEn: 'Rangamati',
    slug: 'rangamati',
    divisionBn: 'চট্টগ্রাম',
    divisionEn: 'Chittagong',
  },

  // ── রাজশাহী (Rajshahi) — 8 ─────────────────────────────────────────────────
  { nameBn: 'বগুড়া', nameEn: 'Bogra', slug: 'bogra', divisionBn: 'রাজশাহী', divisionEn: 'Rajshahi' },
  {
    nameBn: 'চাঁপাইনবাবগঞ্জ',
    nameEn: 'Chapainawabganj',
    slug: 'chapainawabganj',
    divisionBn: 'রাজশাহী',
    divisionEn: 'Rajshahi',
  },
  {
    nameBn: 'জয়পুরহাট',
    nameEn: 'Joypurhat',
    slug: 'joypurhat',
    divisionBn: 'রাজশাহী',
    divisionEn: 'Rajshahi',
  },
  {
    nameBn: 'নওগাঁ',
    nameEn: 'Naogaon',
    slug: 'naogaon',
    divisionBn: 'রাজশাহী',
    divisionEn: 'Rajshahi',
  },
  { nameBn: 'নাটোর', nameEn: 'Natore', slug: 'natore', divisionBn: 'রাজশাহী', divisionEn: 'Rajshahi' },
  { nameBn: 'পাবনা', nameEn: 'Pabna', slug: 'pabna', divisionBn: 'রাজশাহী', divisionEn: 'Rajshahi' },
  {
    nameBn: 'রাজশাহী',
    nameEn: 'Rajshahi',
    slug: 'rajshahi',
    divisionBn: 'রাজশাহী',
    divisionEn: 'Rajshahi',
  },
  {
    nameBn: 'সিরাজগঞ্জ',
    nameEn: 'Sirajganj',
    slug: 'sirajganj',
    divisionBn: 'রাজশাহী',
    divisionEn: 'Rajshahi',
  },

  // ── খুলনা (Khulna) — 10 ────────────────────────────────────────────────────
  {
    nameBn: 'বাগেরহাট',
    nameEn: 'Bagerhat',
    slug: 'bagerhat',
    divisionBn: 'খুলনা',
    divisionEn: 'Khulna',
  },
  {
    nameBn: 'চুয়াডাঙ্গা',
    nameEn: 'Chuadanga',
    slug: 'chuadanga',
    divisionBn: 'খুলনা',
    divisionEn: 'Khulna',
  },
  { nameBn: 'যশোর', nameEn: 'Jessore', slug: 'jessore', divisionBn: 'খুলনা', divisionEn: 'Khulna' },
  {
    nameBn: 'ঝিনাইদহ',
    nameEn: 'Jhenaidah',
    slug: 'jhenaidah',
    divisionBn: 'খুলনা',
    divisionEn: 'Khulna',
  },
  { nameBn: 'খুলনা', nameEn: 'Khulna', slug: 'khulna', divisionBn: 'খুলনা', divisionEn: 'Khulna' },
  { nameBn: 'কুষ্টিয়া', nameEn: 'Kushtia', slug: 'kushtia', divisionBn: 'খুলনা', divisionEn: 'Khulna' },
  { nameBn: 'মাগুরা', nameEn: 'Magura', slug: 'magura', divisionBn: 'খুলনা', divisionEn: 'Khulna' },
  {
    nameBn: 'মেহেরপুর',
    nameEn: 'Meherpur',
    slug: 'meherpur',
    divisionBn: 'খুলনা',
    divisionEn: 'Khulna',
  },
  { nameBn: 'নড়াইল', nameEn: 'Narail', slug: 'narail', divisionBn: 'খুলনা', divisionEn: 'Khulna' },
  {
    nameBn: 'সাতক্ষীরা',
    nameEn: 'Satkhira',
    slug: 'satkhira',
    divisionBn: 'খুলনা',
    divisionEn: 'Khulna',
  },

  // ── বরিশাল (Barisal) — 6 ───────────────────────────────────────────────────
  {
    nameBn: 'বরগুনা',
    nameEn: 'Barguna',
    slug: 'barguna',
    divisionBn: 'বরিশাল',
    divisionEn: 'Barisal',
  },
  {
    nameBn: 'বরিশাল',
    nameEn: 'Barisal',
    slug: 'barisal',
    divisionBn: 'বরিশাল',
    divisionEn: 'Barisal',
  },
  { nameBn: 'ভোলা', nameEn: 'Bhola', slug: 'bhola', divisionBn: 'বরিশাল', divisionEn: 'Barisal' },
  {
    nameBn: 'ঝালকাঠি',
    nameEn: 'Jhalokati',
    slug: 'jhalokati',
    divisionBn: 'বরিশাল',
    divisionEn: 'Barisal',
  },
  {
    nameBn: 'পটুয়াখালী',
    nameEn: 'Patuakhali',
    slug: 'patuakhali',
    divisionBn: 'বরিশাল',
    divisionEn: 'Barisal',
  },
  {
    nameBn: 'পিরোজপুর',
    nameEn: 'Pirojpur',
    slug: 'pirojpur',
    divisionBn: 'বরিশাল',
    divisionEn: 'Barisal',
  },

  // ── সিলেট (Sylhet) — 4 ─────────────────────────────────────────────────────
  {
    nameBn: 'হবিগঞ্জ',
    nameEn: 'Habiganj',
    slug: 'habiganj',
    divisionBn: 'সিলেট',
    divisionEn: 'Sylhet',
  },
  {
    nameBn: 'মৌলভীবাজার',
    nameEn: 'Moulvibazar',
    slug: 'moulvibazar',
    divisionBn: 'সিলেট',
    divisionEn: 'Sylhet',
  },
  {
    nameBn: 'সুনামগঞ্জ',
    nameEn: 'Sunamganj',
    slug: 'sunamganj',
    divisionBn: 'সিলেট',
    divisionEn: 'Sylhet',
  },
  { nameBn: 'সিলেট', nameEn: 'Sylhet', slug: 'sylhet', divisionBn: 'সিলেট', divisionEn: 'Sylhet' },

  // ── রংপুর (Rangpur) — 8 ────────────────────────────────────────────────────
  {
    nameBn: 'দিনাজপুর',
    nameEn: 'Dinajpur',
    slug: 'dinajpur',
    divisionBn: 'রংপুর',
    divisionEn: 'Rangpur',
  },
  {
    nameBn: 'গাইবান্ধা',
    nameEn: 'Gaibandha',
    slug: 'gaibandha',
    divisionBn: 'রংপুর',
    divisionEn: 'Rangpur',
  },
  {
    nameBn: 'কুড়িগ্রাম',
    nameEn: 'Kurigram',
    slug: 'kurigram',
    divisionBn: 'রংপুর',
    divisionEn: 'Rangpur',
  },
  {
    nameBn: 'লালমনিরহাট',
    nameEn: 'Lalmonirhat',
    slug: 'lalmonirhat',
    divisionBn: 'রংপুর',
    divisionEn: 'Rangpur',
  },
  {
    nameBn: 'নীলফামারী',
    nameEn: 'Nilphamari',
    slug: 'nilphamari',
    divisionBn: 'রংপুর',
    divisionEn: 'Rangpur',
  },
  {
    nameBn: 'পঞ্চগড়',
    nameEn: 'Panchagarh',
    slug: 'panchagarh',
    divisionBn: 'রংপুর',
    divisionEn: 'Rangpur',
  },
  { nameBn: 'রংপুর', nameEn: 'Rangpur', slug: 'rangpur', divisionBn: 'রংপুর', divisionEn: 'Rangpur' },
  {
    nameBn: 'ঠাকুরগাঁও',
    nameEn: 'Thakurgaon',
    slug: 'thakurgaon',
    divisionBn: 'রংপুর',
    divisionEn: 'Rangpur',
  },

  // ── ময়মনসিংহ (Mymensingh) — 4 ─────────────────────────────────────────────
  {
    nameBn: 'জামালপুর',
    nameEn: 'Jamalpur',
    slug: 'jamalpur',
    divisionBn: 'ময়মনসিংহ',
    divisionEn: 'Mymensingh',
  },
  {
    nameBn: 'ময়মনসিংহ',
    nameEn: 'Mymensingh',
    slug: 'mymensingh',
    divisionBn: 'ময়মনসিংহ',
    divisionEn: 'Mymensingh',
  },
  {
    nameBn: 'নেত্রকোণা',
    nameEn: 'Netrokona',
    slug: 'netrokona',
    divisionBn: 'ময়মনসিংহ',
    divisionEn: 'Mymensingh',
  },
  {
    nameBn: 'শেরপুর',
    nameEn: 'Sherpur',
    slug: 'sherpur',
    divisionBn: 'ময়মনসিংহ',
    divisionEn: 'Mymensingh',
  },
]

/** All 8 divisions in the order they are conventionally listed. */
export const DIVISIONS = [
  'Dhaka',
  'Chittagong',
  'Rajshahi',
  'Khulna',
  'Barisal',
  'Sylhet',
  'Rangpur',
  'Mymensingh',
] as const
