import type { CollectionConfig } from 'payload'

import { anyone, isEditorial, isSuperAdminOrEditorInChief } from '../access/roles'

/**
 * Institutions — backs N4, the institution directory.
 *
 * Day 1 ships a **starter set** (public universities + top private) explicitly
 * marked as growing, per `docs/education-feature-inventory.md` §4. This is the
 * most expensive feature in the inventory but also the most valuable: an
 * evergreen SEO surface that underpins internal linking across every other
 * education feature.
 */
export const Institutions: CollectionConfig = {
  slug: 'institutions',
  labels: {
    singular: { en: 'Institution', bn: 'প্রতিষ্ঠান' },
    plural: { en: 'Institutions', bn: 'প্রতিষ্ঠানসমূহ' },
  },
  admin: {
    useAsTitle: 'nameBn',
    group: 'শিক্ষা',
    defaultColumns: ['nameBn', 'type', 'district', 'isVerified'],
    description: 'বিশ্ববিদ্যালয় ও কলেজের তালিকা — প্রাথমিক সেট দিয়ে শুরু, ক্রমে বাড়ছে।',
  },
  access: {
    read: anyone,
    create: isEditorial,
    update: isEditorial,
    delete: isSuperAdminOrEditorInChief,
  },
  fields: [
    {
      name: 'nameBn',
      type: 'text',
      required: true,
      index: true,
      label: { en: 'Name (Bengali)', bn: 'নাম (বাংলা)' },
    },
    { name: 'nameEn', type: 'text', label: { en: 'Name (English)', bn: 'নাম (ইংরেজি)' } },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: { en: 'Slug', bn: 'স্লাগ' },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      index: true,
      label: { en: 'Type', bn: 'ধরন' },
      options: [
        { value: 'public', label: 'সরকারি' },
        { value: 'private', label: 'বেসরকারি' },
        { value: 'madrasa', label: 'মাদ্রাসা' },
        { value: 'college', label: 'কলেজ' },
      ],
    },
    {
      name: 'levelOffered',
      type: 'relationship',
      relationTo: 'levels',
      hasMany: true,
      label: { en: 'Levels offered', bn: 'প্রদত্ত শ্রেণি' },
    },
    {
      name: 'district',
      type: 'relationship',
      relationTo: 'districts',
      index: true,
      label: { en: 'District', bn: 'জেলা' },
    },
    { name: 'established', type: 'number', label: { en: 'Established', bn: 'প্রতিষ্ঠাকাল' } },
    { name: 'website', type: 'text', label: { en: 'Website', bn: 'ওয়েবসাইট' } },
    { name: 'logo', type: 'upload', relationTo: 'media', label: { en: 'Logo', bn: 'লোগো' } },
    { name: 'address', type: 'textarea', label: { en: 'Address', bn: 'ঠিকানা' } },
    { name: 'description', type: 'richText', label: { en: 'Description', bn: 'বিবরণ' } },
    {
      name: 'isVerified',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      label: { en: 'Verified', bn: 'যাচাইকৃত' },
      admin: { description: 'তথ্য যাচাই করা হয়েছে কিনা।' },
    },
  ],
  timestamps: true,
}
