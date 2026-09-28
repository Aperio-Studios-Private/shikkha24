/**
 * The reaction vocabulary — the frontend half of the S16 contract.
 *
 * ## ⚠️ Three copies exist, and they must agree
 *
 *   `cms/src/lib/reactions.ts`            — the allow-list the endpoint validates
 *                                           against, plus the fingerprint helper
 *   `cms/src/collections/Reactions.ts`    — the Bengali labels in the admin UI
 *   `frontend/src/lib/reactions.ts`       — this file: what the island renders
 *
 * The CMS cannot be imported from here (it pulls in `node:crypto` and Payload),
 * and a shared workspace package for five strings would be more machinery than
 * the problem deserves. So they are kept in step by hand — **grepping for
 * `angry` finds all three**, and the order of the tuple is the order the island
 * renders, so adding a reaction means touching all three.
 *
 * The server is the authority: if this list ever drifted ahead of the CMS, the
 * endpoint would refuse the unknown type with a 400 and the island would say so,
 * rather than silently recording something that cannot be counted.
 */

/** The five reactions. Order is the display order in the island. */
export const REACTION_TYPES = ['like', 'love', 'wow', 'sad', 'angry'] as const

export type ReactionType = (typeof REACTION_TYPES)[number]

/** Bengali labels. The UI is Bengali-only (`docs/profile.md`). */
export const REACTION_LABELS_BN: Record<ReactionType, string> = {
  like: 'পছন্দ',
  love: 'ভালোবাসা',
  wow: 'অবাক',
  sad: 'দুঃখ',
  angry: 'ক্ষোভ',
}
