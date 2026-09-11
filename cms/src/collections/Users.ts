import type { CollectionConfig } from 'payload'

import { hasRole, isSelfOrAdmin, isSuperAdmin, ROLE_LABELS, ROLES } from '../access/roles'

/**
 * Users — the editorial team's login accounts, and the root of the RBAC model.
 *
 * Five roles (`docs/profile.md` → Editorial Workflow):
 *   প্রতিবেদক · বিভাগীয় সম্পাদক · প্রধান সম্পাদক · বিজ্ঞাপন ব্যবস্থাপক · সুপার অ্যাডমিন
 *
 * ⚠️ **`roles` is field-level restricted to Super Admin.** Without that, any
 * authenticated reporter could grant themselves Editor-in-Chief by sending a
 * crafted `PATCH /api/users/<their-id>`. `docs/security.md` §3 is explicit that
 * hiding a field in the UI is not authorisation.
 *
 * Reader accounts (comments, saved deadlines) are a **separate** collection —
 * readers must never be able to reach this one.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: { en: 'User', bn: 'ব্যবহারকারী' },
    plural: { en: 'Users', bn: 'ব্যবহারকারীগণ' },
  },
  admin: {
    useAsTitle: 'nameBn',
    group: 'প্রশাসন',
    defaultColumns: ['nameBn', 'email', 'roles', 'updatedAt'],
    description: 'সম্পাদকীয় দলের অ্যাকাউন্ট। পাঠকের অ্যাকাউন্ট আলাদা।',
  },
  auth: {
    // Lockout after repeated failures on the single most attacked endpoint
    // (docs/security.md §3).
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000, // 10 minutes
    tokenExpiration: 2 * 60 * 60, // 2 hours
  },
  access: {
    // Only Super Admin may list or create accounts.
    create: isSuperAdmin,
    read: isSelfOrAdmin,
    update: isSelfOrAdmin,
    delete: isSuperAdmin,
    // Only Super Admin can reach the admin panel at all.
    admin: ({ req }) =>
      hasRole(req.user, 'superAdmin', 'editorInChief', 'sectionEditor', 'reporter', 'adManager'),
  },
  fields: [
    {
      name: 'nameBn',
      type: 'text',
      required: true,
      label: { en: 'Name (Bengali)', bn: 'নাম (বাংলা)' },
    },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['reporter'],
      index: true,
      label: { en: 'Roles', bn: 'ভূমিকা' },
      options: ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] })),
      admin: {
        description: 'একজন ব্যবহারকারী একাধিক ভূমিকা পেতে পারেন। প্রতিবেদক নিজের ভূমিকা পরিবর্তন করতে পারেন না।',
      },
      // ⚠️ Privilege-escalation guard. Field-level access is enforced server-side.
      access: {
        create: ({ req }) => hasRole(req.user, 'superAdmin'),
        update: ({ req }) => hasRole(req.user, 'superAdmin'),
      },
    },
    {
      name: 'authorProfile',
      type: 'relationship',
      relationTo: 'authors',
      label: { en: 'Author profile', bn: 'লেখক প্রোফাইল' },
      admin: {
        description: 'এই অ্যাকাউন্টের সাথে যুক্ত লেখক প্রোফাইল — বাইলাইনের জন্য।',
      },
    },
    {
      name: 'phone',
      type: 'text',
      label: { en: 'Phone', bn: 'ফোন' },
      access: { read: ({ req }) => Boolean(req.user) },
    },
  ],
  timestamps: true,
}
