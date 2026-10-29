import type { CollectionConfig } from 'payload'

import {
  authenticatedField,
  hasRole,
  isSelfIn,
  isSuperAdmin,
  isSuperAdminOrEditorInChief,
  ROLE_LABELS,
  ROLES,
} from '../access/roles'

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
    group: { en: 'Administration (প্রশাসন)' },
    defaultColumns: ['nameBn', 'email', 'roles', 'updatedAt'],
    description: 'সম্পাদকীয় দলের অ্যাকাউন্ট। পাঠকের অ্যাকাউন্ট আলাদা।',
  },
  auth: {
    // Lockout after repeated failures on the single most attacked endpoint
    // (docs/security.md §3).
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000, // 10 minutes
    tokenExpiration: 2 * 60 * 60, // 2 hours
    // ⚠️ `secure: true` (pentest 2026-10-29, M3). Payload's default is
    // `secure: false`; without it the staff session cookie can travel over
    // plain http on a first visit before HSTS is established. The reader
    // session and OAuth-state cookies already set this — the most valuable
    // cookie was the only one that didn't.
    cookies: {
      secure: true,
      sameSite: 'Lax',
    },
  },
  access: {
    // Only Super Admin may list or create accounts.
    create: isSuperAdmin,
    /*
     * ⚠️ `isSelfIn('users')` — the argument is the fix, not decoration.
     *
     * This was `isSelfOrAdmin`, which returned `{ id: { equals: req.user.id } }`
     * for any session. `users` and `readers` both number their rows from 1, so a
     * **reader** with id 1 matched **user** id 1: a reader session could read a
     * staff account (email, phone, roles) and write to it. See `isSelfIn` for the
     * runtime evidence and the account-takeover path it opened.
     */
    read: isSelfIn('users'),
    update: isSelfIn('users'),
    delete: isSuperAdmin,
    // ⚠️ `unlock` is gated (pentest 2026-10-29, L1). Payload's default lets any
    // session of this collection clear any account's lockout — a reporter could
    // reset the 10-minute lock on an account an attacker is brute-forcing.
    // Only the two roles that administer accounts may unlock.
    unlock: isSuperAdminOrEditorInChief,
    // Only Super Admin can reach the admin panel at all.
    admin: ({ req }) =>
      hasRole(req.user, 'superAdmin', 'editorInChief', 'sectionEditor', 'reporter', 'adManager'),
  },
  fields: [
    /**
     * Overrides Payload's base auth `email` field to attach access control.
     *
     * ⚠️ **`email` is the login identity, so changing it is an escalation step.**
     * Password reset sends to this address, so an attacker who can rewrite a staff
     * email can request a reset and receive it. That is the second half of the
     * reader-session defect this collection was fixed for on 2026-09-30: the
     * collection rule now denies the session outright, and this field rule keeps
     * the escalation closed even if that rule is ever loosened again.
     *
     * Restricted to Super Admin for the same reason `roles` is — the two fields
     * that decide *who you are* and *what you may do* should not be self-service.
     * `type`, `required` and `unique` are restated because declaring the field
     * replaces Payload's base definition rather than merging with it.
     */
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      label: { en: 'Email', bn: 'ইমেইল' },
      admin: {
        description: 'লগইনের ঠিকানা। শুধু সুপার অ্যাডমিন পরিবর্তন করতে পারেন।',
      },
      access: {
        create: ({ req }) => hasRole(req.user, 'superAdmin'),
        update: ({ req }) => hasRole(req.user, 'superAdmin'),
      },
    },
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
      /*
       * ⚠️ Privilege-escalation guard (T-61). This field decides **which
       * articles a reporter may edit** — `access/articles.ts` scopes a
       * reporter's writes to rows whose `author` equals their own
       * `authorProfile`. Left writable, a reporter could point it at a
       * colleague's author record and so inherit write access to every article
       * that colleague owns, including published ones: T-60's hole reopened
       * through a different door. It therefore gets the same treatment as
       * `email` and `roles` above — Super Admin only.
       *
       * Nothing legitimate breaks. This is an administrative link the desk sets
       * when a reporter is onboarded; `endpoints/reporter.ts` only ever *reads*
       * it to resolve a byline, and the seed writes through the local API with
       * `overrideAccess`, which bypasses field access entirely.
       */
      access: {
        create: ({ req }) => hasRole(req.user, 'superAdmin'),
        update: ({ req }) => hasRole(req.user, 'superAdmin'),
      },
      admin: {
        description: 'এই অ্যাকাউন্টের সাথে যুক্ত লেখক প্রোফাইল — বাইলাইনের জন্য।',
      },
    },
    {
      name: 'phone',
      type: 'text',
      label: { en: 'Phone', bn: 'ফোন' },
      // ⚠️ `authenticatedField`, not `Boolean(req.user)`: a reader session sets
      // `req.user` too, so the looser check exposed staff phone numbers to any
      // logged-in reader. See `access/roles.ts`.
      access: { read: authenticatedField },
    },
  ],
  timestamps: true,
}
