import type { CollectionConfig } from 'payload'

import { hasRole, isEditorial, isSuperAdminOrEditorInChief } from '../access/roles'

/**
 * Newsletter campaigns — the composer half of the self-built module.
 *
 * ## Transport-agnostic by design
 *
 * The owner accepted the **cPanel SMTP** fallback rather than an ESP account
 * (`.sps/plan.md` §"Scope amendment (2026-09-12)"), with the gate closing as
 * *explicitly accepted* rather than *confirmed working*. Nothing in this
 * collection knows that: a campaign is a subject, a body and a delivery record.
 * Swapping in an ESP later is a change to `lib/mailer.ts` alone.
 *
 * ## Why the counters are stored rather than computed
 *
 * A campaign is sent by a **background sweep** that respects the hourly cap, so
 * it can legitimately finish across several hours. The counts therefore have to
 * survive a process restart — they are the record of what actually went out,
 * which matters because cPanel offers **no delivery reporting** and silently
 * truncates past its own cap. `deferredCount > 0` is the signal that the run hit
 * our ceiling and the rest is waiting for the next hour.
 *
 * ## The body is rich text, never raw HTML
 *
 * Same rule as the ad system (S7): a field that stores markup to be rendered
 * verbatim is a stored-XSS vector, and here it would also let a compromised
 * account send mail from the domain's reputation. The body is Lexical, and
 * `lib/lexical-to-html.ts` escapes every text node on the way out.
 */
export const NewsletterCampaigns: CollectionConfig = {
  slug: 'newsletter-campaigns',
  labels: {
    singular: { en: 'Campaign', bn: 'ক্যাম্পেইন' },
    plural: { en: 'Newsletter campaigns', bn: 'নিউজলেটার ক্যাম্পেইন' },
  },
  admin: {
    useAsTitle: 'subject',
    group: { en: 'Readers (পাঠক)' },
    defaultColumns: ['subject', 'status', 'sentAt', 'sentCount', 'deferredCount'],
    description: 'নিউজলেটার ক্যাম্পেইন। পাঠানোর আগে বিষয় ও বিষয়বস্তু দেখে নিন — পাঠানোর পর পরিবর্তন করা যায় না।',
  },
  access: {
    create: isEditorial,
    read: isEditorial,
    // A sent campaign is a record of what was mailed. Editing it afterwards
    // would make the record a lie, so only a super admin may touch it.
    update: ({ req }) => hasRole(req.user, 'superAdmin', 'editorInChief'),
    delete: isSuperAdminOrEditorInChief,
  },
  fields: [
    {
      name: 'subject',
      type: 'text',
      required: true,
      label: { en: 'Subject', bn: 'বিষয়' },
      admin: { description: 'ইমেইলের বিষয় — ছোট ও স্পষ্ট রাখুন।' },
    },
    {
      name: 'preheader',
      type: 'text',
      label: { en: 'Preheader', bn: 'প্রিহেডার' },
      admin: {
        description: 'ইনবক্সে বিষয়ের পাশে দেখানো সংক্ষিপ্ত লাইন (ঐচ্ছিক)।',
      },
    },
    {
      name: 'body',
      type: 'richText',
      required: true,
      label: { en: 'Body', bn: 'বিষয়বস্তু' },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      required: true,
      index: true,
      label: { en: 'Status', bn: 'অবস্থা' },
      options: [
        { value: 'draft', label: { en: 'Draft', bn: 'খসড়া' } },
        { value: 'sending', label: { en: 'Sending', bn: 'পাঠানো হচ্ছে' } },
        { value: 'sent', label: { en: 'Sent', bn: 'পাঠানো হয়েছে' } },
        { value: 'failed', label: { en: 'Failed', bn: 'ব্যর্থ' } },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'sentAt',
      type: 'date',
      label: { en: 'Sent at', bn: 'পাঠানোর সময়' },
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'recipientCount',
      type: 'number',
      defaultValue: 0,
      label: { en: 'Recipients', bn: 'প্রাপক সংখ্যা' },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'sentCount',
      type: 'number',
      defaultValue: 0,
      label: { en: 'Sent', bn: 'পাঠানো হয়েছে' },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'deferredCount',
      type: 'number',
      defaultValue: 0,
      label: { en: 'Deferred', bn: 'বাকি আছে' },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'ঘণ্টায় পাঠানোর সীমার কারণে পরের ঘণ্টায় পাঠানো হবে।',
      },
    },
    {
      name: 'sentThroughId',
      type: 'number',
      defaultValue: 0,
      label: { en: 'Sent through subscriber id', bn: 'ক্রম' },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'সর্বশেষ যে সাবস্ক্রাইবারকে পাঠানো হয়েছে তার আইডি — পরের ধাপ এখান থেকে শুরু হয়।',
      },
    },
    {
      name: 'lastError',
      type: 'text',
      label: { en: 'Last error', bn: 'সর্বশেষ ত্রুটি' },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'ব্যর্থ হলে কারণ এখানে দেখা যাবে।',
      },
    },
  ],
  timestamps: true,
}
