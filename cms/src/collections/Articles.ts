import type { CollectionConfig } from 'payload'

import {
  authorField,
  deleteArticleOrEditorInChief,
  readOwnArticlesOrEditor,
  updateOwnArticlesOrEditor,
} from '../access/articles'
import { editorInChiefField, hasRole, isEditorial } from '../access/roles'
import { articleBodyEditor } from '../blocks/editors'
import { guardPublishStatus } from '../hooks/publish'

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
 * adds the review queue on top. Publishing itself is `_status: published`.
 *
 * ⚠️ **The collection `update` access does NOT restrict publishing.** It cannot:
 * it has to include reporters so they can save their own drafts. Until 2026-09-18
 * this comment claimed otherwise and nothing enforced it, so a reporter could
 * publish their own unreviewed story with a single `PATCH`. `guardPublishStatus`
 * (see `hooks/publish.ts`) is what actually enforces it now, and `verify:reporter`
 * is the check that proves it.
 *
 * ## Who may touch which article (T-60)
 *
 * The rule above is a *role* question and reporters pass it; `update` therefore
 * adds the *ownership* half on top — a reporter reaches only the rows whose
 * `author` is their own `Users.authorProfile`. The `author` field is restricted
 * the same way, so a reporter can set a byline only to their own profile and can
 * never move a row into or out of their scope. The desk is unrestricted on all of
 * it. See `access/articles.ts`.
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
    group: { en: 'Editorial (সম্পাদকীয়)' },
    defaultColumns: ['title', 'category', 'reviewStatus', '_status', 'publishedAt'],
    // R3 — the static description is replaced by the pipeline strip component
    // below (Write → Review → Publish → Live site), which carries the same
    // orientation plus a stage highlight and the rebuild expectation. Kept as
    // the fallback for surfaces that do not render the custom component.
    description: 'সংবাদের মূল কনটেন্ট। খসড়া → পর্যালোচনা → প্রকাশ।',
    preview: (doc) => (doc?.slug ? `/article/${doc.slug}` : null),
    components: {
      // Rendered by renderDocumentSlots (verified in @payloadcms/next 3.90.2):
      // `admin.components.Description` — NOT inside `edit` — replaces the
      // static description in the edit view. Server component; reads
      // reviewStatus/_status per document. R4 folded the publish summary
      // (review chip + live-site line + delete consequence) into this strip.
      // ⚠️ The Status slot is deliberately NOT replaced: the default Status is
      // a reactive client component with the "Revert to published" action and
      // the live changed/draft/published state — a server component would
      // freeze all of that at render time (R4 self-audit regression, reverted).
      Description: '/components/admin/ArticlePipelineDescription#ArticlePipelineDescription',
    },
  },
  access: {
    // Anyone can read published articles; editors additionally see drafts.
    read: readOwnArticlesOrEditor,
    create: isEditorial,
    /*
     * ⚠️ `update` is **not** `isEditorial`, and T-60 is why: that rule has to
     * include reporters so they can save their own drafts, but it also let any
     * reporter edit any colleague's article — including one already published.
     * Editors stay unrestricted; a reporter is scoped to the rows carrying their
     * own byline. See `access/articles.ts` for why ownership is the `author`
     * relationship and not a `createdBy` stamp.
     */
    update: updateOwnArticlesOrEditor,
    /*
     * Delete stays with the desk's top two roles — T-60 asked whether it was as
     * loose as `update` and it was not; see `deleteArticleOrEditorInChief` for why
     * scoping it to ownership would have been a widening, not a fix.
     */
    delete: deleteArticleOrEditorInChief,
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
    /*
     * T-89 R2 — the editor is grouped into four workflow tabs (owner-approved
     * discovery decision, 2026-10-26): write → enrich → classify → publish.
     * Every tab is UNNAMED, which per Payload's tabs-field contract makes the
     * field presentational-only: data paths are unchanged, so no migration is
     * needed and `payload-types.ts` must not change. The sidebar keeps the
     * daily controls (slug, featured image, category, author, review status,
     * publish date); everything a writer touches per step lives in its tab.
     * Nothing was deleted, only re-grouped.
     */
    {
      type: 'tabs',
      tabs: [
        {
          label: '✍️ Content (লেখা)',
          description:
            'Write the story — headline, standfirst, body, takeaways, timeline. (গল্প লিখুন।)',
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
                description:
                  'ঐচ্ছিক। থাকলে এটি থেকেই URL-এর slug তৈরি হবে, নাহলে একটি স্বয়ংক্রিয় slug বসবে।',
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
                {
                  name: 'point',
                  type: 'text',
                  required: true,
                  label: { en: 'Point', bn: 'পয়েন্ট' },
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
                {
                  name: 'title',
                  type: 'text',
                  required: true,
                  label: { en: 'Title', bn: 'শিরোনাম' },
                },
                { name: 'detail', type: 'textarea', label: { en: 'Detail', bn: 'বিবরণ' } },
              ],
            },
          ],
        },
        {
          label: '🖼️ Media (ছবি ও ভিডিও)',
          description: 'Layout, video, and photo-story frames. (লেআউট, ভিডিও ও ছবির গল্প।)',
          fields: [
            {
              name: 'layout',
              type: 'select',
              defaultValue: 'standard',
              index: true,
              label: { en: 'Layout', bn: 'লেআউট' },
              options: [
                { value: 'standard', label: 'Standard (সাধারণ)' },
                { value: 'photoStory', label: 'Photo Story (ছবির গল্প)' },
              ],
              admin: {
                description:
                  'ছবির গল্প বেছে নিলে নিচের ছবির তালিকা থেকে পাতা তৈরি হয় — লেখা নয়, ছবিই প্রধান।',
              },
            },
            {
              name: 'videoProvider',
              type: 'select',
              defaultValue: 'youtube',
              label: { en: 'Video provider', bn: 'ভিডিও সেবাদাতা' },
              options: [
                { label: 'YouTube (ইউটিউব)', value: 'youtube' },
                { label: 'Facebook (ফেসবুক)', value: 'facebook' },
              ],
              admin: {
                // Only meaningful with a video — an editor should not have to read a
                // provider field that does nothing.
                condition: (data: Record<string, unknown>) => Boolean(data?.videoUrl),
              },
            },
            {
              name: 'videoUrl',
              type: 'text',
              label: { en: 'Video URL', bn: 'ভিডিও ঠিকানা' },
              admin: {
                description:
                  'ঐচ্ছিক। দিলে সংবাদের উপরে একটি প্লেয়ার বসে — ক্লিক করার আগে কোনো অনুরোধ যায় না। ইউটিউব লিংক বা ফেসবুক ভিডিওর ঠিকানা।',
              },
            },
            {
              name: 'photoStory',
              type: 'array',
              label: { en: 'Photo story frames', bn: 'ছবির গল্পের ফ্রেম' },
              admin: {
                description:
                  'প্রতিটি ছবির ক্যাপশন ও কৃতিত্ব দিন। ছবির বাক্স আগেই সংরক্ষিত থাকে (আসল মাপ থেকে), তাই পাতা লাফায় না।',
                // Only relevant to the photo-story layout — showing an empty frame list on
                // every ordinary article is noise an editor has to scroll past.
                condition: (data: Record<string, unknown>) => data?.layout === 'photoStory',
              },
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                  label: { en: 'Image', bn: 'ছবি' },
                },
                {
                  name: 'caption',
                  type: 'textarea',
                  label: { en: 'Caption', bn: 'ক্যাপশন' },
                  admin: { description: 'ছবির নিচে দেখানো হয়।' },
                },
                {
                  name: 'credit',
                  type: 'text',
                  label: { en: 'Credit', bn: 'কৃতিত্ব' },
                  admin: { description: 'যেমন: সংগৃহীত / শিক্ষা২৪.কম।' },
                },
                {
                  name: 'fullBleed',
                  type: 'checkbox',
                  defaultValue: false,
                  label: { en: 'Full bleed', bn: 'ফুল ব্লিড' },
                  admin: {
                    description: 'চালু থাকলে ছবিটি পাতার পুরো প্রস্থ নেয়। বন্ধ থাকলে লেখার প্রস্থেই থাকে।',
                  },
                },
              ],
            },
          ],
        },
        {
          label: '🗂️ Classification (শ্রেণিবিন্যাস)',
          description:
            'Where the story belongs — subcategory, level, district, institution, tags. (সংবাদের শ্রেণি।)',
          fields: [
            {
              name: 'subcategory',
              type: 'relationship',
              relationTo: 'categories',
              index: true,
              label: { en: 'Subcategory', bn: 'উপবিভাগ' },
              admin: {
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
              admin: { description: 'ঐচ্ছিক — স্থানীয় সংবাদের জন্য।' },
            },
            /**
             * The institution this story is about — the **only** entry point for the
             * university directory's news linkage.
             *
             * ⚠️ There is deliberately no second field on `Institutions` listing its
             * articles. The profile page queries *this* field, so publishing a story is
             * the whole job: an editor never has to go back and update the institution
             * record, and the two can never disagree about which stories belong where.
             *
             * Optional, because most education stories are not about one institution.
             */
            {
              name: 'university',
              type: 'relationship',
              relationTo: 'institutions',
              index: true,
              label: { en: 'University / institution', bn: 'বিশ্ববিদ্যালয় / প্রতিষ্ঠান' },
              admin: {
                description: 'ঐচ্ছিক। দিলে প্রতিষ্ঠানের পাতায় সংবাদটি স্বয়ংক্রিয়ভাবে যুক্ত হবে।',
              },
            },
            {
              name: 'tags',
              type: 'relationship',
              relationTo: 'tags',
              hasMany: true,
              label: { en: 'Tags', bn: 'ট্যাগ' },
            },
          ],
        },
        {
          label: '🚀 Publishing (প্রকাশ)',
          description:
            'Desk controls — breaking, lead, sponsorship, corrections. (ব্রেকিং, লিড, স্পনসর ও সংশোধনী।)',
          fields: [
            {
              name: 'isBreaking',
              type: 'checkbox',
              defaultValue: false,
              index: true,
              label: { en: 'Breaking', bn: 'ব্রেকিং' },
              admin: {
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
              access: { create: editorInChiefField, update: editorInChiefField },
            },
            {
              name: 'isSponsored',
              type: 'checkbox',
              defaultValue: false,
              index: true,
              label: { en: 'Sponsored content', bn: 'স্পনসর করা কনটেন্ট' },
              admin: {
                description:
                  'স্পনসর করা লেখা। চালু করলে পাতায় ও কার্ডে "বিজ্ঞাপন" লেবেল বসবে এবং লেখাটি প্রধান সংবাদ বা ব্রেকিং তালিকায় যাবে না — পাঠকের কাছে বিজ্ঞাপনকে সংবাদ হিসেবে দেখানো যাবে না।',
              },
            },
            {
              name: 'sponsorName',
              type: 'text',
              label: { en: 'Sponsor name', bn: 'স্পনসরের নাম' },
              admin: {
                description: 'লেবেলে দেখানো হবে — যেমন "বিজ্ঞাপন — পাঠক প্রকাশনী"।',
                condition: (data) => Boolean(data?.isSponsored),
              },
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
          ],
        },
      ],
    },
    // ── Sidebar: the daily controls, unchanged ───────────────────────────────
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
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Featured image', bn: 'প্রধান ছবি' },
      admin: { position: 'sidebar' },
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
      name: 'author',
      type: 'relationship',
      relationTo: 'authors',
      required: true,
      index: true,
      label: { en: 'Author', bn: 'লেখক' },
      admin: { position: 'sidebar' },
      // A byline is an attribution of responsibility and must not be forgeable
      // by the person being attributed — same rule `endpoints/reporter.ts`
      // enforces by ignoring `author` in the request body. See `authorField`.
      access: { create: authorField, update: authorField },
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
    /*
     * ⚠️ The publish guard. `update: isEditorial` above has to include reporters
     * (they save their own drafts), so the collection rule cannot be what keeps
     * publishing to editors — this hook is. See `hooks/publish.ts` for the defect
     * it closes and why it throws rather than silently stripping the field.
     */
    beforeChange: [guardPublishStatus],
  },
  timestamps: true,
}
