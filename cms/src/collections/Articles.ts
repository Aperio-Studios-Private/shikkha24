import type { CollectionConfig } from 'payload'

import {
  editorInChiefField,
  hasRole,
  isEditorial,
  isSuperAdminOrEditorInChief,
  publishedOrEditor,
} from '../access/roles'
import { articleBodyEditor } from '../blocks/editors'

/** Review states on top of Payload's own draft/published `_status`. */
export const REVIEW_STATUSES = ['draft', 'pendingReview', 'changesRequested', 'approved'] as const

export type ReviewStatus = (typeof REVIEW_STATUSES)[number]

const REVIEW_LABELS: Record<ReviewStatus, string> = {
  draft: 'খসড়া',
  pendingReview: 'পর্যালোচনার অপেক্ষায়',
  changesRequested: 'পরিবর্তন প্রয়োজন',
  approved: 'অনুমোদিত',
}

/**
 * Articles — the newsroom's primary content type.
 *
 * ## Workflow
 *
 * `docs/profile.md` → Editorial Workflow:
 *   Reporter: Draft → Submit for Review
 *   Section Editor: Review → Approve/Reject with feedback → Publish
 *   Editor-in-Chief: direct publish, homepage control, breaking news
 *
 * Payload's drafts feature gives the draft/published mechanics; `reviewStatus`
 * adds the review queue on top. Publishing itself is `_status: published`, and
 * the collection `update` access below keeps that to editors.
 *
 * ## Field-level restrictions
 *
 * `docs/profile.md`: "reporters cannot change publish date, status, or
 * `is_breaking`." Those are enforced per-field, server-side — not by hiding
 * inputs (`docs/security.md` §3).
 *
 * ## Why the slug is optional
 *
 * Bengali titles do not transliterate to ASCII cleanly, and the URL architecture
 * is `/:category/:subcategory/:id/:slug` — the `id` carries identity, so the slug
 * is cosmetic. `beforeValidate` derives one when it is left blank.
 */
export const Articles: CollectionConfig = {
  slug: 'articles',
  labels: {
    singular: { en: 'Article', bn: 'সংবাদ' },
    plural: { en: 'Articles', bn: 'সংবাদসমূহ' },
  },
  admin: {
    useAsTitle: 'title',
    group: 'সম্পাদকীয়',
    defaultColumns: ['title', 'category', 'reviewStatus', '_status', 'publishedAt'],
    description: 'সংবাদের মূল কনটেন্ট। খসড়া → পর্যালোচনা → প্রকাশ।',
    preview: (doc) => (doc?.slug ? `/article/${doc.slug}` : null),
  },
  access: {
    // Anyone can read published articles; editors additionally see drafts.
    read: publishedOrEditor,
    create: isEditorial,
    update: isEditorial,
    delete: isSuperAdminOrEditorInChief,
  },
  versions: {
    drafts: {
      // Autosave protects reporters writing long pieces on unreliable connections.
      autosave: { interval: 800 },
      // Schedule publishing — required by the retained feature set.
      schedulePublish: true,
    },
    maxPerDoc: 20,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      index: true,
      label: { en: 'Headline', bn: 'শিরোনাম' },
    },
    {
      name: 'titleEn',
      type: 'text',
      label: { en: 'Headline (English)', bn: 'শিরোনাম (ইংরেজি)' },
      admin: {
        description: 'ঐচ্ছিক। থাকলে এটি থেকেই URL-এর slug তৈরি হবে, নাহলে একটি স্বয়ংক্রিয় slug বসবে।',
      },
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      label: { en: 'URL slug', bn: 'URL স্লাগ' },
      admin: {
        description: 'ASCII, lowercase। খালি রাখলে স্বয়ংক্রিয়ভাবে তৈরি হবে।',
        position: 'sidebar',
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      required: true,
      maxLength: 300,
      label: { en: 'Standfirst / excerpt', bn: 'সংক্ষিপ্তসার' },
      admin: { description: 'তালিকা পাতায় ও সার্চ ফলাফলে দেখানো হবে। সর্বোচ্চ ৩০০ অক্ষর।' },
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Featured image', bn: 'প্রধান ছবি' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'body',
      type: 'richText',
      label: { en: 'Body', bn: 'মূল লেখা' },
      // The only field that carries the video block — the article route
      // (`/:category/:id/:slug`) is the only one whose CSP allows a third-party
      // frame. See `blocks/editors.ts`.
      editor: articleBodyEditor,
    },
    {
      name: 'keyTakeaways',
      type: 'array',
      maxRows: 6,
      label: { en: 'Key takeaways', bn: 'মূল বিষয়সমূহ' },
      admin: { description: 'সংক্ষেপে মূল পয়েন্ট — শিক্ষার্থীদের জন্য দ্রুত পাঠ।' },
      fields: [
        { name: 'point', type: 'text', required: true, label: { en: 'Point', bn: 'পয়েন্ট' } },
      ],
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      index: true,
      label: { en: 'Category', bn: 'বিভাগ' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'subcategory',
      type: 'relationship',
      relationTo: 'categories',
      index: true,
      label: { en: 'Subcategory', bn: 'উপবিভাগ' },
      admin: {
        position: 'sidebar',
        description: 'ঐচ্ছিক। নির্বাচিত বিভাগের অধীন একটি উপবিভাগ।',
      },
    },
    {
      name: 'level',
      type: 'relationship',
      relationTo: 'levels',
      hasMany: true,
      index: true,
      label: { en: 'Level', bn: 'শ্রেণি' },
      admin: {
        position: 'sidebar',
        description: 'প্রাথমিক · মাধ্যমিক · উচ্চ মাধ্যমিক · স্নাতক · স্নাতকোত্তর',
      },
    },
    {
      name: 'district',
      type: 'relationship',
      relationTo: 'districts',
      hasMany: true,
      index: true,
      label: { en: 'District', bn: 'জেলা' },
      admin: { position: 'sidebar', description: 'ঐচ্ছিক — স্থানীয় সংবাদের জন্য।' },
    },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
      label: { en: 'Tags', bn: 'ট্যাগ' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'authors',
      required: true,
      index: true,
      label: { en: 'Author', bn: 'লেখক' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'reviewStatus',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      label: { en: 'Review status', bn: 'পর্যালোচনা অবস্থা' },
      options: REVIEW_STATUSES.map((value) => ({ value, label: REVIEW_LABELS[value] })),
      admin: {
        position: 'sidebar',
        description: 'প্রতিবেদক "পর্যালোচনার অপেক্ষায়" পাঠান; সম্পাদক অনুমোদন করেন।',
      },
      // A reporter may submit for review, but only an editor may approve.
      access: {
        update: ({ req, data }) => {
          if (hasRole(req.user, 'superAdmin', 'editorInChief', 'sectionEditor')) return true
          // Reporters may only move their own article into review, never to approved.
          return data?.reviewStatus === 'pendingReview'
        },
      },
    },
    {
      name: 'reviewNote',
      type: 'textarea',
      label: { en: 'Review note', bn: 'পর্যালোচনা মন্তব্য' },
      admin: {
        position: 'sidebar',
        description: 'সম্পাদকের প্রতিক্রিয়া — প্রতিবেদকের কাছে ফেরত পাঠানোর সময়।',
        condition: (data) => data?.reviewStatus === 'changesRequested',
      },
    },
    {
      name: 'isBreaking',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      label: { en: 'Breaking', bn: 'ব্রেকিং' },
      admin: {
        position: 'sidebar',
        description: 'ফলাফল প্রকাশ, ভর্তি বিজ্ঞপ্তি বা পরীক্ষা স্থগিতের জরুরি খবর।',
      },
      access: { create: editorInChiefField, update: editorInChiefField },
    },
    {
      name: 'isLead',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      label: { en: 'Lead story', bn: 'প্রধান সংবাদ' },
      admin: { position: 'sidebar' },
      access: { create: editorInChiefField, update: editorInChiefField },
    },
    {
      name: 'isSponsored',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      label: { en: 'Sponsored content', bn: 'স্পনসর করা কনটেন্ট' },
      admin: {
        position: 'sidebar',
        description:
          'স্পনসর করা লেখা। চালু করলে পাতায় ও কার্ডে "বিজ্ঞাপন" লেবেল বসবে এবং লেখাটি প্রধান সংবাদ বা ব্রেকিং তালিকায় যাবে না — পাঠকের কাছে বিজ্ঞাপনকে সংবাদ হিসেবে দেখানো যাবে না।',
      },
    },
    {
      name: 'sponsorName',
      type: 'text',
      label: { en: 'Sponsor name', bn: 'স্পনসরের নাম' },
      admin: {
        position: 'sidebar',
        description: 'লেবেলে দেখানো হবে — যেমন "বিজ্ঞাপন — পাঠক প্রকাশনী"।',
        condition: (data) => Boolean(data?.isSponsored),
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      index: true,
      label: { en: 'Publish date', bn: 'প্রকাশের তারিখ' },
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
      access: { create: editorInChiefField, update: editorInChiefField },
    },
    {
      name: 'readingTimeMinutes',
      type: 'number',
      label: { en: 'Reading time (minutes)', bn: 'পাঠের সময় (মিনিট)' },
      admin: { position: 'sidebar', readOnly: true, description: 'স্বয়ংক্রিয়ভাবে হিসাব হয়।' },
    },
    {
      name: 'correctionNotice',
      type: 'group',
      label: { en: 'Correction notice', bn: 'সংশোধনী' },
      fields: [
        {
          name: 'hasCorrection',
          type: 'checkbox',
          defaultValue: false,
          label: { en: 'Corrected', bn: 'সংশোধিত' },
        },
        {
          name: 'note',
          type: 'textarea',
          label: { en: 'Correction note', bn: 'সংশোধনের বিবরণ' },
          admin: { condition: (_, siblingData) => siblingData?.hasCorrection },
        },
      ],
    },
    {
      name: 'timelineMilestones',
      type: 'array',
      label: { en: 'Timeline', bn: 'সময়রেখা' },
      admin: {
        description: 'ভর্তি নীতি পরিবর্তন বা পরীক্ষা-কেন্দ্রিক দীর্ঘ ঘটনার সময়রেখা।',
      },
      fields: [
        { name: 'date', type: 'date', required: true, label: { en: 'Date', bn: 'তারিখ' } },
        { name: 'title', type: 'text', required: true, label: { en: 'Title', bn: 'শিরোনাম' } },
        { name: 'detail', type: 'textarea', label: { en: 'Detail', bn: 'বিবরণ' } },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (!data) return data

        // Derive a slug when the editor left it blank. ASCII only — the Bengali
        // headline is kept in `title` and in the schema, never in the URL.
        if (!data.slug) {
          const source = data.titleEn || data.title || ''
          const ascii = String(source)
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .slice(0, 80)
          const suffix = Math.random().toString(36).slice(2, 8)
          data.slug = ascii ? `${ascii}-${suffix}` : `post-${suffix}`
        }

        // First publication stamps the date if an editor did not set one.
        if (operation === 'create' && !data.publishedAt) {
          data.publishedAt = new Date().toISOString()
        }

        // Reading time: ~200 words/minute, counted from the plain text body.
        const text = JSON.stringify(data.body ?? '')
        const words = text.split(/\s+/).filter(Boolean).length
        data.readingTimeMinutes = Math.max(1, Math.round(words / 200))

        return data
      },
    ],
  },
  timestamps: true,
}
