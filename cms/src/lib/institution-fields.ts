import type { Field } from 'payload'

import { INSTITUTION_DISCIPLINE_OPTIONS, INSTITUTION_TYPE_OPTIONS } from './institution-options'

/**
 * The institution collection's fields — kept beside `institution-options.ts`
 * rather than inside `collections/Institutions.ts` because the two together
 * outgrew the 300-line file budget, and the collection file is the one that
 * carries the model's rationale.
 *
 * ## The tabs are presentational, and they exist because there are ~25 fields
 *
 * A flat list that long is unusable in the admin: an editor filling a Tier-2
 * profile scrolls past identity, contact and provenance on every save. Tabs
 * change no column, no `where` clause and no generated type — they only decide
 * what the editor sees first.
 *
 * The split follows the *work*, not the schema: what a reader always sees, what
 * only an editor fills in, and what proves it was checked.
 *
 * ## `contact.address` — a rename, not an addition
 *
 * ⚠️ `address` **moved into the `contact` group**. The old top-level field is
 * gone, and a frontend page still reading `institution.address` renders
 * **nothing rather than erroring**, because `.astro` frontmatter is not
 * typechecked.
 */
export const INSTITUTION_FIELDS: Field[] = [
  {
    type: 'tabs',
    tabs: [
      {
        label: { en: 'Identity & contact', bn: 'পরিচিতি ও যোগাযোগ' },
        description: 'নাম, ধরন, বিভাগ ও ঠিকানা — তালিকা পাতায় ও কার্ডে যা দেখা যায়।',
        fields: [
          // ── Identity ─────────────────────────────────────────────────────────────
          {
            name: 'nameBn',
            type: 'text',
            required: true,
            index: true,
            label: { en: 'Name (Bengali)', bn: 'নাম (বাংলা)' },
            admin: { description: 'এই সাইট বাংলা-প্রথম, তাই বাংলা নামটিই প্রধান।' },
          },
          { name: 'nameEn', type: 'text', label: { en: 'Name (English)', bn: 'নাম (ইংরেজি)' } },
          {
            name: 'acronym',
            type: 'text',
            label: { en: 'Acronym', bn: 'সংক্ষিপ্ত রূপ' },
            admin: { description: 'যেমন: ঢাবি, বুয়েট, জাবি। ঐচ্ছিক।' },
          },
          {
            name: 'slug',
            type: 'text',
            required: true,
            unique: true,
            index: true,
            label: { en: 'Slug', bn: 'স্লাগ' },
            admin: { position: 'sidebar', description: 'ASCII, lowercase।' },
          },

          // ── The two axes ─────────────────────────────────────────────────────────
          {
            name: 'type',
            type: 'select',
            required: true,
            index: true,
            label: { en: 'Type (ownership)', bn: 'ধরন (মালিকানা)' },
            options: INSTITUTION_TYPE_OPTIONS,
            admin: {
              position: 'sidebar',
              description: 'মালিকানা — কে পরিচালনা করে। বিষয়ভিত্তিক শ্রেণি নয়, সেটি "বিভাগ"।',
            },
          },
          {
            name: 'discipline',
            type: 'select',
            index: true,
            label: { en: 'Discipline (subject)', bn: 'বিভাগ (বিষয়)' },
            options: INSTITUTION_DISCIPLINE_OPTIONS,
            admin: {
              position: 'sidebar',
              description:
                'বিষয়ভিত্তিক শ্রেণি — "ধরন" থেকে আলাদা। একটি প্রতিষ্ঠান দুটিতেই থাকতে পারে (বুয়েট = সরকারি + প্রকৌশল)।',
            },
          },
          {
            name: 'levelOffered',
            type: 'relationship',
            relationTo: 'levels',
            hasMany: true,
            label: { en: 'Levels offered', bn: 'প্রদত্ত শ্রেণি' },
            admin: { position: 'sidebar' },
          },
          {
            name: 'district',
            type: 'relationship',
            relationTo: 'districts',
            index: true,
            label: { en: 'District', bn: 'জেলা' },
            admin: { position: 'sidebar' },
          },
          { name: 'established', type: 'number', label: { en: 'Established', bn: 'প্রতিষ্ঠাকাল' } },
          { name: 'website', type: 'text', label: { en: 'Website', bn: 'ওয়েবসাইট' } },
          {
            name: 'logo',
            type: 'upload',
            relationTo: 'media',
            label: { en: 'Logo', bn: 'লোগো' },
          },
          { name: 'description', type: 'richText', label: { en: 'Description', bn: 'বিবরণ' } },

          // ── Contact ──────────────────────────────────────────────────────────────
          {
            type: 'group',
            name: 'contact',
            label: { en: 'Contact', bn: 'যোগাযোগ' },
            fields: [
              { name: 'address', type: 'textarea', label: { en: 'Address', bn: 'ঠিকানা' } },
              { name: 'phone', type: 'text', label: { en: 'Phone', bn: 'ফোন' } },
              { name: 'email', type: 'text', label: { en: 'Email', bn: 'ইমেইল' } },
              { name: 'mapUrl', type: 'text', label: { en: 'Map URL', bn: 'মানচিত্রের লিংক' } },
            ],
          },
        ],
      },
      {
        label: { en: 'Rich profile', bn: 'বিস্তারিত প্রোফাইল' },
        description: 'কোনো তথ্যসূত্রে এগুলো নেই — প্রতিষ্ঠানভিত্তিক সম্পাদকীয় কাজ। প্রযোজ্য না হলে খালি রাখুন।',
        fields: [
          // ── Rich profile (Tier 2 — filled in editorially) ────────────────────────
          /*
           * ⚠️ These are the fields no data source carries (`docs/university-directory.md`
           * §3.1.5) — faculties, departments, admission rules, fees, links. They are
           * per-institution editorial work, and a section that does not apply is
           * **hidden, not empty**: a NU-affiliated college has no faculty list, so the
           * frontend must render nothing rather than an empty heading.
           */
          {
            name: 'faculties',
            type: 'array',
            label: { en: 'Faculties', bn: 'অনুষদ' },
            admin: { description: 'প্রযোজ্য না হলে খালি রাখুন — খালি অনুষদ তালিকা দেখানো হবে না।' },
            fields: [
              {
                name: 'name',
                type: 'text',
                required: true,
                label: { en: 'Faculty', bn: 'অনুষদের নাম' },
              },
              {
                name: 'departments',
                type: 'array',
                label: { en: 'Departments', bn: 'বিভাগসমূহ' },
                fields: [
                  {
                    name: 'name',
                    type: 'text',
                    required: true,
                    label: { en: 'Department', bn: 'বিভাগের নাম' },
                  },
                ],
              },
            ],
          },
          {
            name: 'admissionInfo',
            type: 'array',
            label: { en: 'Admission information', bn: 'ভর্তি তথ্য' },
            admin: { description: 'শিরোনাম-মান জোড়া, যেমন: "আবেদনের সময়" → "মে–জুন"।' },
            fields: [
              {
                name: 'label',
                type: 'text',
                required: true,
                label: { en: 'Label', bn: 'শিরোনাম' },
              },
              { name: 'value', type: 'text', required: true, label: { en: 'Value', bn: 'মান' } },
            ],
          },
          {
            name: 'admissionUrl',
            type: 'text',
            label: { en: 'Admission page URL', bn: 'ভর্তি পাতার লিংক' },
          },
          {
            name: 'tuitionFees',
            type: 'array',
            label: { en: 'Tuition fees', bn: 'টিউশন ফি' },
            admin: {
              description:
                'প্রতি প্রোগ্রামে সঠিক অঙ্ক। যাচাইয়ের তারিখ ছাড়া সংরক্ষণ করা যাবে না — পুরনো অঙ্ক নির্ভরযোগ্য দেখায়।',
            },
            fields: [
              {
                name: 'programme',
                type: 'text',
                required: true,
                label: { en: 'Programme', bn: 'প্রোগ্রাম' },
              },
              {
                name: 'amount',
                type: 'text',
                required: true,
                label: { en: 'Amount', bn: 'পরিমাণ' },
              },
              {
                name: 'period',
                type: 'select',
                required: true,
                label: { en: 'Period', bn: 'সময়কাল' },
                options: [
                  { value: 'per-semester', label: 'প্রতি সেমিস্টার' },
                  { value: 'per-year', label: 'প্রতি বছর' },
                  { value: 'per-credit', label: 'প্রতি ক্রেডিট' },
                  { value: 'one-time', label: 'এককালীন' },
                ],
              },
              {
                name: 'academicYear',
                type: 'text',
                required: true,
                label: { en: 'Academic year', bn: 'শিক্ষাবর্ষ' },
                admin: { description: 'যেমন: ২০২৬। অঙ্কটি কোন বছরের, তা স্পষ্ট রাখে।' },
              },
              { name: 'note', type: 'textarea', label: { en: 'Note', bn: 'মন্তব্য' } },
              {
                name: 'sourceUrl',
                type: 'text',
                label: { en: 'Source URL', bn: 'সূত্রের লিংক' },
                admin: {
                  description: 'বিশ্ববিদ্যালয়ের নিজের ফি পাতার লিংক — পাঠক নিজে যাচাই করতে পারেন।',
                },
              },
              {
                name: 'verifiedAt',
                type: 'date',
                required: true,
                label: { en: 'Verified on', bn: 'সর্বশেষ যাচাই' },
                admin: { description: 'অঙ্কটি কবে যাচাই করা হয়েছে। বাধ্যতামূলক।' },
              },
            ],
          },
          {
            name: 'importantLinks',
            type: 'array',
            label: { en: 'Important links', bn: 'গুরুত্বপূর্ণ লিংক' },
            fields: [
              {
                name: 'label',
                type: 'text',
                required: true,
                label: { en: 'Label', bn: 'শিরোনাম' },
              },
              { name: 'url', type: 'text', required: true, label: { en: 'URL', bn: 'লিংক' } },
            ],
          },
        ],
      },
      {
        label: { en: 'Verification & source', bn: 'যাচাই ও সূত্র' },
        description: 'তথ্য কে যাচাই করেছে, কবে, আর কোথা থেকে এসেছে।',
        fields: [
          // ── Provenance ───────────────────────────────────────────────────────────
          {
            name: 'isVerified',
            type: 'checkbox',
            defaultValue: false,
            index: true,
            label: { en: 'Verified', bn: 'যাচাইকৃত' },
            admin: {
              description: 'কোনো ব্যক্তি তথ্য যাচাই করেছেন কিনা। আমদানি করা সারি ডিফল্টভাবে অযাচাইকৃত থাকে।',
            },
          },
          {
            name: 'lastVerifiedAt',
            type: 'date',
            label: { en: 'Last verified on', bn: 'সর্বশেষ যাচাইয়ের তারিখ' },
            admin: { description: 'সর্বশেষ কবে প্রোফাইলটি যাচাই করা হয়েছে।' },
          },
          {
            name: 'dataSource',
            type: 'text',
            label: { en: 'Data source', bn: 'তথ্যসূত্র' },
            admin: { description: 'তথ্য কোথা থেকে এসেছে — আমদানি করা সারির জন্য।' },
          },
          {
            name: 'wikidataId',
            type: 'text',
            index: true,
            label: { en: 'Wikidata ID', bn: 'উইকিডেটা আইডি' },
            admin: { description: 'আমদানির পুনরাবৃত্তি ঠেকাতে ব্যবহৃত — যেমন Q12345।' },
          },
        ],
      },
    ],
  },
]
