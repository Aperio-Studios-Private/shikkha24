import type { Access, CollectionConfig } from 'payload'

import {
  editorField,
  editorialField,
  isEditor,
  isEditorUser,
  isSuperAdmin,
  relationId,
} from '../access/roles'
import { guardAssignmentStatus, stampAssignedBy } from '../hooks/assignment'

/**
 * Assignments — the editor → reporter work queue.
 *
 * ## Why this is not just "an article with a draft status"
 *
 * A draft answers *"what has been written"*. An assignment answers *"what has
 * been **asked for**, by whom, by when, and has anyone picked it up"* — which is
 * the question a desk actually runs on. Modelling it as an Article field would
 * lose the un-started work, the deadline, and the record of who was asked.
 *
 * ## ⚠️ The read rule is the security-critical part
 *
 * `read` is not `true` for the newsroom. A reporter gets a `Where` clause
 * limiting them to rows assigned to **their own author profile**; only Section
 * Editor and above see the whole board. This is enforced in the query, so a
 * reporter cannot enumerate a colleague's workload by calling the REST API
 * directly — the same reasoning as `Comments.userEmail` being field-restricted
 * rather than hidden in the UI.
 *
 * A reporter with **no linked author profile** sees nothing at all rather than
 * everything: `relationId()` returning null falls through to `false`, not to an
 * unfiltered query. That direction of failure is deliberate.
 *
 * ## Why most fields are editor-only
 *
 * The reporter's own controls are `status` (restricted values, see
 * `guardAssignmentStatus`) and `filedArticle`. Everything that constitutes *the
 * instruction* — title, brief, deadline, priority, who it is assigned to — is
 * the editor's to set. A reporter who could move the deadline or retitle the job
 * would make the board meaningless.
 */
const readOwnAssignments: Access = ({ req }) => {
  if (!req.user) return false

  // The desk sees the whole board.
  if (isEditorUser(req.user)) return true

  // A reporter sees only their own queue — and only if they are a reporter.
  const authorId = relationId((req.user as { authorProfile?: unknown }).authorProfile)
  if (authorId === null) return false

  return { assignedTo: { equals: authorId } }
}

/** A reporter may update their own row; editors may update any. */
const updateOwnAssignments: Access = ({ req }) => {
  if (!req.user) return false
  if (isEditorUser(req.user)) return true

  const authorId = relationId((req.user as { authorProfile?: unknown }).authorProfile)
  if (authorId === null) return false

  return { assignedTo: { equals: authorId } }
}

export const Assignments: CollectionConfig = {
  slug: 'assignments',
  labels: {
    singular: { en: 'Assignment', bn: 'কাজ' },
    plural: { en: 'Assignments', bn: 'কাজের তালিকা' },
  },
  admin: {
    useAsTitle: 'title',
    group: 'সম্পাদকীয়',
    defaultColumns: ['title', 'assignedTo', 'dueAt', 'priority', 'status'],
    description: 'সম্পাদক প্রতিবেদককে কাজ দেন; প্রতিবেদক কাজ নিয়ে খসড়া জমা দেন।',
  },
  access: {
    read: readOwnAssignments,
    // Only a desk creates work.
    create: isEditor,
    update: updateOwnAssignments,
    delete: isSuperAdmin,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: { en: 'What to cover', bn: 'কী নিয়ে কাজ' },
      access: { update: editorField },
    },
    {
      name: 'brief',
      type: 'textarea',
      label: { en: 'Brief', bn: 'নির্দেশনা' },
      admin: { description: 'কোণ, সূত্র, কী জানতে হবে।' },
      access: { update: editorField },
    },
    {
      name: 'assignedTo',
      type: 'relationship',
      relationTo: 'authors',
      required: true,
      index: true,
      label: { en: 'Assigned to', bn: 'কাকে দেওয়া হলো' },
      // Reassigning is a desk decision, not a reporter's.
      access: { update: editorField },
    },
    {
      name: 'assignedBy',
      type: 'relationship',
      relationTo: 'users',
      label: { en: 'Assigned by', bn: 'কাজ দিয়েছেন' },
      admin: { readOnly: true, position: 'sidebar' },
      access: { read: editorField, update: editorField },
    },
    {
      name: 'dueAt',
      type: 'date',
      index: true,
      label: { en: 'Due', bn: 'সময়সীমা' },
      admin: { position: 'sidebar' },
      access: { update: editorField },
    },
    {
      name: 'priority',
      type: 'select',
      defaultValue: 'normal',
      required: true,
      label: { en: 'Priority', bn: 'গুরুত্ব' },
      options: [
        { value: 'normal', label: { en: 'Normal', bn: 'সাধারণ' } },
        { value: 'high', label: { en: 'High', bn: 'জরুরি' } },
        { value: 'urgent', label: { en: 'Urgent', bn: 'অতি জরুরি' } },
      ],
      admin: { position: 'sidebar' },
      access: { update: editorField },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'assigned',
      required: true,
      index: true,
      label: { en: 'Status', bn: 'অবস্থা' },
      options: [
        { value: 'assigned', label: { en: 'Assigned', bn: 'দেওয়া হয়েছে' } },
        { value: 'accepted', label: { en: 'Accepted', bn: 'নেওয়া হয়েছে' } },
        { value: 'inProgress', label: { en: 'In progress', bn: 'কাজ চলছে' } },
        { value: 'filed', label: { en: 'Filed', bn: 'জমা দেওয়া হয়েছে' } },
        { value: 'approved', label: { en: 'Approved', bn: 'অনুমোদিত' } },
        { value: 'rejected', label: { en: 'Rejected', bn: 'বাতিল' } },
      ],
      admin: {
        position: 'sidebar',
        description: 'প্রতিবেদক শুধু accepted / inProgress / filed দিতে পারেন। অনুমোদন সম্পাদকের কাজ।',
      },
      /*
       * Deliberately `editorialField`, not `editorField`: a reporter MUST be able
       * to move their own job forward. Which values they may reach is enforced by
       * `guardAssignmentStatus`, because a FieldAccess function cannot express a
       * value predicate.
       */
      access: { update: editorialField },
    },
    {
      name: 'filedArticle',
      type: 'relationship',
      relationTo: 'articles',
      label: { en: 'Filed article', bn: 'জমা দেওয়া সংবাদ' },
      admin: { description: 'প্রতিবেদক যে সংবাদটি লিখেছেন।' },
      // The reporter's own output — they link it themselves.
      access: { update: editorialField },
    },
    {
      name: 'district',
      type: 'relationship',
      relationTo: 'districts',
      label: { en: 'District', bn: 'জেলা' },
      access: { update: editorField },
    },
    {
      name: 'editorNote',
      type: 'textarea',
      label: { en: 'Editor note', bn: 'সম্পাদকের নোট' },
      admin: { position: 'sidebar' },
      access: { update: editorField },
    },
  ],
  hooks: {
    beforeChange: [stampAssignedBy, guardAssignmentStatus],
  },
  timestamps: true,
}
