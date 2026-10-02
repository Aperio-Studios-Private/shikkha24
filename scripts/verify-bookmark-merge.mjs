/**
 * Verify the bookmark merge policy.
 *
 * ## Why this exists
 *
 * Bookmark sync reconciles a list the reader owns on two devices, and every wrong
 * answer here is **silent data loss**: a save that disappears, or a bookmark the
 * reader deleted coming back. Neither throws, and neither shows up in a build.
 *
 * The server's half of the policy is exercised over HTTP by `verify:endpoints`.
 * This covers the browser's half — the pending-queue replay — by running the
 * **real** function from `frontend/src/lib/bookmark-merge.ts`, not a copy of the
 * rules re-typed here, which is the harness-that-lies failure mode.
 *
 * ⚠️ **This file is plain JavaScript on purpose.** Node's `--experimental-strip-types`
 * only strips `.ts` files, so a type annotation in a `.mjs` is a hard syntax error.
 *
 * Run: pnpm run verify:bookmarks
 */
import { applyPending, bookmarkKey, collapsePending } from '../frontend/src/lib/bookmark-merge.ts'

let failures = 0
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

const entry = (id, title = `title-${id}`) => ({
  kind: 'article',
  id: String(id),
  slug: `slug-${id}`,
  title,
  savedAt: '2026-10-01T00:00:00.000Z',
})

const op = (id, saved, title) => ({
  kind: 'article',
  id: String(id),
  slug: `slug-${id}`,
  title: title ?? `title-${id}`,
  saved,
})

console.log('\n=== bookmark merge policy ===\n')

// ── The key is kind + id, never the title ────────────────────────────────────
/*
 * A retitled article is the same bookmark. Keying on the title would make one
 * article into two entries the moment an editor fixed a typo.
 */
check(
  'the key is kind + id, not the title',
  bookmarkKey(entry(1, 'before')) === bookmarkKey(entry(1, 'after')),
  bookmarkKey(entry(1, 'before')),
)
check(
  'an article and a deadline with the same id are different items',
  bookmarkKey({ kind: 'article', id: '7' }) !== bookmarkKey({ kind: 'deadline', id: '7' }),
)

// ── The server is authoritative when nothing is pending ──────────────────────
/*
 * ⚠️ This is the assertion that stands between a reader and a resurrected
 * bookmark. If `applyPending` ever merged instead of replacing, the deletion
 * would undo itself here and nothing else would notice.
 */
const server = [entry(1), entry(2)]
const untouched = applyPending(server, [])
check(
  'with nothing pending, the server list is returned unchanged',
  untouched.length === 2 && untouched.every((e) => ['1', '2'].includes(e.id)),
  `${untouched.length} entr(ies)`,
)

// An item the server does not have, and the client is not asking for, stays gone.
const withoutTwo = applyPending([entry(1)], [])
check(
  'an item the server dropped is not resurrected',
  withoutTwo.length === 1 && withoutTwo[0].id === '1',
  `${withoutTwo.length} entr(ies)`,
)

// ── A pending save outranks the server ───────────────────────────────────────
/*
 * The reader saved this while signed out, or the push failed. The server has not
 * heard about it yet, so dropping it here would lose it silently.
 */
const added = applyPending([entry(1)], [op(2, true)])
check(
  'a pending save is applied on top of the server list',
  added.length === 2 && added.some((e) => e.id === '2'),
  `${added.length} entr(ies)`,
)

// An item the server already has must not be duplicated or re-dated.
const alreadyThere = applyPending([entry(1)], [op(1, true, 'renamed')])
check(
  'a pending save for an item the server already has is not duplicated',
  alreadyThere.length === 1,
  `${alreadyThere.length} entr(ies)`,
)
check(
  "the server's savedAt is kept, so the list does not reorder",
  alreadyThere[0].savedAt === entry(1).savedAt,
  alreadyThere[0].savedAt,
)

// ── A pending removal outranks the server ────────────────────────────────────
const removed = applyPending([entry(1), entry(2)], [op(1, false)])
check(
  'a pending removal is applied on top of the server list',
  removed.length === 1 && removed[0].id === '2',
  `${removed.length} entr(ies)`,
)

// ── Collapsing a queue: the last write wins ──────────────────────────────────
/*
 * Toggling an item twice while offline must replay as its final state. Replaying
 * an add and then a remove would work by accident; replaying them out of order
 * would not.
 */
const collapsed = collapsePending([op(1, true), op(1, false)])
check(
  'toggling twice offline collapses to the final state',
  collapsed.length === 1 && collapsed[0].saved === false,
  JSON.stringify(collapsed.map((o) => o.saved)),
)
check(
  'collapsing keeps one op per item, not one per toggle',
  collapsePending([op(1, true), op(2, true), op(1, false)]).length === 2,
)
check('an empty queue collapses to nothing', collapsePending([]).length === 0)

console.log(
  failures === 0 ? '\nAll bookmark merge checks passed.\n' : `\n${failures} check(s) FAILED.\n`,
)
process.exit(failures === 0 ? 0 : 1)
