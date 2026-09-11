import type { CollectionConfig } from 'payload'

import { isSelfOrAdmin, isSuperAdmin } from '../access/roles'

/**
 * Saved Deadlines — backs N7, deadline reminders.
 *
 * `docs/education-feature-inventory.md` §4: this "converts one-off search traffic
 * into a returning audience" by reusing the push + bookmark infrastructure
 * already planned for S9.
 */
export const SavedDeadlines: CollectionConfig = {
  slug: 'saved-deadlines',
  labels: {
    singular: { en: 'Saved deadline', bn: 'সেভ করা সময়সীমা' },
    plural: { en: 'Saved deadlines', bn: 'সেভ করা সময়সীমা' },
  },
  admin: {
    useAsTitle: 'id',
    group: 'পাঠক',
    defaultColumns: ['reader', 'deadline', 'remindAt', 'notified'],
    description: 'পাঠকের সেভ করা সময়সীমা ও রিমাইন্ডার।',
  },
  access: {
    // A reader sees and manages only their own saved items.
    create: isSelfOrAdmin,
    read: isSelfOrAdmin,
    update: isSelfOrAdmin,
    delete: isSuperAdmin,
  },
  fields: [
    {
      name: 'reader',
      type: 'relationship',
      relationTo: 'readers',
      required: true,
      index: true,
      label: { en: 'Reader', bn: 'পাঠক' },
    },
    {
      name: 'deadline',
      type: 'relationship',
      relationTo: 'deadlines',
      required: true,
      index: true,
      label: { en: 'Deadline', bn: 'সময়সীমা' },
    },
    {
      name: 'remindAt',
      type: 'date',
      label: { en: 'Remind at', bn: 'মনে করানোর সময়' },
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'notified',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      label: { en: 'Notified', bn: 'জানানো হয়েছে' },
    },
  ],
  timestamps: true,
}
