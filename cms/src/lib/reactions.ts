import { createHmac } from 'node:crypto'

/**
 * The reaction vocabulary, and the one-way fingerprint that dedupes it.
 *
 * ## Why this is a module and not part of the collection
 *
 * The collection and its endpoints both need `REACTION_TYPES`, and the collection
 * imports the endpoints (to mount them). Importing the vocabulary back out of the
 * collection would make that a cycle. A leaf module breaks it.
 *
 * ## The fingerprint
 *
 * Counting reactions server-side needs a way to recognise a repeat reaction, which
 * means storing something about the reader. What is stored is a **salted one-way
 * hash of IP + user agent** — never the IP itself, and never anything that could
 * be joined back to a person (`docs/security.md` §8).
 *
 * Keyed with `PAYLOAD_SECRET`, so a leaked database does not yield a reversible
 * value, and the same reader hashes differently on any other site. This mirrors
 * `endpoints/poll-vote.ts` deliberately: two different fingerprints for the same
 * purpose would be two things to reason about.
 *
 * ⚠️ The fallback key exists only so a dev or harness run without
 * `PAYLOAD_SECRET` does not crash. **Production always sets it** — the CMS will
 * not start without it — so the fallback never protects a live database.
 */

/** The five reactions. Mirrors `Reactions.type` in the CMS and the island's buttons. */
export const REACTION_TYPES = ['like', 'love', 'wow', 'sad', 'angry'] as const

export type ReactionType = (typeof REACTION_TYPES)[number]

/** `true` when `value` is one of the five. The endpoint's only allow-list. */
export function isReactionType(value: unknown): value is ReactionType {
  return typeof value === 'string' && (REACTION_TYPES as readonly string[]).includes(value)
}

/**
 * Salted, one-way reaction fingerprint.
 *
 * Deliberately excludes anything that would let the row be joined back to a
 * person, and deliberately the same shape as the poll-voter hash.
 */
export function reactionFingerprint(ip: string, userAgent: string): string {
  return createHmac('sha256', process.env.PAYLOAD_SECRET || 'shikkha24-reactions')
    .update(`${ip}|${userAgent}`)
    .digest('hex')
}

/** Every reaction type at zero — the shape a counts response always has. */
export function emptyCounts(): Record<ReactionType, number> {
  return { like: 0, love: 0, wow: 0, sad: 0, angry: 0 }
}
