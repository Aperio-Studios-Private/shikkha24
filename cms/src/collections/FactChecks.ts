import type { CollectionConfig } from 'payload'

import { anyone, isEditorial, isSuperAdminOrEditorInChief } from '../access/roles'

/** Verdicts for the fact-check radar. */
export const FACT_VERDICTS = ['false', 'misleading', 'true'] as const

const VERDICT_LABELS: Record<(typeof FACT_VERDICTS)[number], string> = {
  false: 'মিথ্যা',
  misleading: 'বিভ্রান্তিকর',
  true: 'সত্য',
}

/**
 * Fact checks — the "fact-check radar".
 *
 * Re-scoped for education: the claim-verification surface now targets admission
 * rumours, fake result links and fabricated scholarship notices, which are a
 * persistent problem during Bangladesh's result and admission seasons.
 *
 * `comparisonImages` was flagged for re-scoping in `.sps/content-model.md`
 * ("Re-scope remaining general-news fields… comparison_images on Fact Checks").
 * It is **retained** — a side-by-side "what the rumour claimed vs what the board
 * actually said" is the clearest way to present a verdict.
 */
export const FactChecks: CollectionConfig = {
  slug: 'fact-checks',
  labels: {
    singular: { en: 'Fact check', bn: 'সত্যতা যাচাই' },
    plural: { en: 'Fact checks', bn: 'সত্যতা যাচাই' },
  },
  admin: {
    useAsTitle: 'claim',
    group: { en: 'Editorial (সম্পাদকীয়)' },
    defaultColumns: ['claim', 'verdict', 'updatedAt'],
    description: 'ভুয়া খবর, গুজব ও বিভ্রান্তিকর দাবির যাচাই।',
  },
  access: {
    read: anyone,
    create: isEditorial,
    update: isEditorial,
    delete: isSuperAdminOrEditorInChief,
  },
  fields: [
    {
      name: 'claim',
      type: 'text',
      required: true,
      label: { en: 'Claim', bn: 'দাবি' },
      admin: { description: 'যে দাবিটি যাচাই করা হচ্ছে — যিনি ছড়িয়েছেন তার ভাষায় সংক্ষেপে।' },
    },
    {
      name: 'verdict',
      type: 'select',
      required: true,
      index: true,
      label: { en: 'Verdict', bn: 'রায়' },
      options: FACT_VERDICTS.map((value) => ({ value, label: VERDICT_LABELS[value] })),
      admin: { description: 'প্রমাণ দেখে যাচাইয়ের চূড়ান্ত রায়।' },
    },
    {
      name: 'evidence',
      type: 'richText',
      label: { en: 'Evidence', bn: 'প্রমাণ' },
      admin: { description: 'কেন এই রায় — সূত্র, অফিসিয়াল নোটিশ, যাচাইয়ের ধাপ।' },
    },
    {
      name: 'sourceUrls',
      type: 'array',
      label: { en: 'Sources', bn: 'সূত্র' },
      admin: { description: 'যাচাইয়ের মূল লিংকগুলো — একটিরও নিজে না দেখে যাচাই নয়।' },
      fields: [
        {
          name: 'url',
          type: 'text',
          required: true,
          label: { en: 'URL', bn: 'লিংক' },
          admin: { description: 'https:// সহ পূর্ণ ঠিকানা।' },
        },
        {
          name: 'label',
          type: 'text',
          label: { en: 'Label', bn: 'বর্ণনা' },
          admin: { description: 'লিংকটি কী তা এক শব্দে — যেমন "বোর্ডের নোটিশ"।' },
        },
      ],
    },
    {
      name: 'comparisonImages',
      type: 'array',
      maxRows: 2,
      label: { en: 'Before / after images', bn: 'তুলনামূলক ছবি' },
      admin: { description: 'ভুয়া দাবিটি বনাম আসলটি — সর্বোচ্চ দুটি ছবি, পাশাপাশি দেখানো হবে।' },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
          label: { en: 'Image', bn: 'ছবি' },
        },
        { name: 'caption', type: 'text', label: { en: 'Caption', bn: 'ক্যাপশন' } },
      ],
    },
    {
      name: 'relatedArticle',
      type: 'relationship',
      relationTo: 'articles',
      label: { en: 'Related article', bn: 'সম্পর্কিত সংবাদ' },
    },
  ],
  timestamps: true,
}
