import type { CollectionConfig } from 'payload'

import { anyone, isEditorial, isSuperAdminOrEditorInChief } from '../access/roles'
import { INSTITUTION_FIELDS } from '../lib/institution-fields'

/**
 * Institutions — the university & college directory.
 *
 * ## Where this came from
 *
 * S10 shipped N4 as a **starter set**: five rows, a name, a type, a district and
 * a description, explicitly marked as growing. S18 turns it into the directory
 * students actually search, on the model agreed in
 * `docs/university-directory.md` §2. The route and the collection already
 * existed — this is an extension, not a new feature.
 *
 * ## Two axes, not one category
 *
 * `type` (ownership) and `discipline` (subject) are separate on purpose — see
 * `lib/institution-options.ts` for why, and for the value lists themselves.
 *
 * ## `contact.address` — a rename, not an addition
 *
 * ⚠️ `address` **moved into the `contact` group** (it is now `contact.address`).
 * The old top-level field is gone. The frontend reads the new path; a page still
 * reading `institution.address` renders **nothing rather than erroring**, because
 * `.astro` frontmatter is not typechecked.
 *
 * ## Why a fee row cannot be saved without a date
 *
 * The owner chose an **exact figure per programme** over a range
 * (`docs/university-directory.md` §6). An exact figure is the most useful thing a
 * reader can see, and also the first thing to go stale — and a stale number is
 * worse than a missing one because it *looks* authoritative. So
 * `tuitionFees[].verifiedAt` is **required**: the safeguard cannot be skipped by a
 * hurried editor, and the frontend prints "সর্বশেষ যাচাই" next to every figure.
 *
 * ## Why `wikidataId` is indexed but NOT unique
 *
 * The field exists for **import de-duplication** (S19 queries it before
 * inserting). It is deliberately not `unique`, and that is not an oversight:
 * Payload does **not** coerce an empty string to `null` for a text field
 * (`payload/dist/fields/hooks/beforeValidate/promise.js`), so two institutions
 * saved by hand with a blank ID would both store `''` and the **second save would
 * be rejected by the unique index**. S21 fills the first ten public universities
 * by hand, so that would be hit immediately. The import owns the de-duplication.
 *
 * ## The fields live next door
 *
 * `lib/institution-fields.ts` holds them, because ~25 fields plus their rationale
 * pushed this file past the 300-line budget. That module also explains why they
 * are grouped into tabs.
 */
export const Institutions: CollectionConfig = {
  slug: 'institutions',
  labels: {
    singular: { en: 'Institution', bn: 'প্রতিষ্ঠান' },
    plural: { en: 'Institutions', bn: 'প্রতিষ্ঠানসমূহ' },
  },
  admin: {
    useAsTitle: 'nameBn',
    group: { en: 'Education (শিক্ষা)' },
    defaultColumns: ['nameBn', 'type', 'discipline', 'district', 'isVerified'],
    description: 'বিশ্ববিদ্যালয় ও কলেজের তালিকা। ধরন (মালিকানা) ও বিভাগ (বিষয়) — দুটি আলাদা অক্ষ।',
  },
  access: {
    read: anyone,
    create: isEditorial,
    update: isEditorial,
    delete: isSuperAdminOrEditorInChief,
  },
  fields: INSTITUTION_FIELDS,
  timestamps: true,
}
