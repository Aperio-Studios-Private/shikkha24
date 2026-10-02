/**
 * The merge policy, as a pure function.
 *
 * Split out of `bookmark-sync.ts` — which touches `fetch` and `localStorage` —
 * so the part that can actually lose a reader's bookmarks is a pure function that
 * a harness can exercise directly, the way `verify:gpa` exercises the GPA rules.
 *
 * ⚠️ **The rule it encodes is the whole point of the sync.** After a successful
 * sync the server is authoritative: the client installs the server's list, and a
 * bookmark deleted on another device stays deleted. A naive union would put it
 * back, and something a reader deliberately removed reappearing is worse than
 * never syncing at all.
 *
 * The one thing that outranks the server is a **local change whose push failed**.
 * A reader who saves an article while signed out, or on a flaky connection, has
 * expressed an intent the server has not heard yet; dropping it would lose it
 * silently. So pending intents are replayed on top of the server's list, and then
 * pushed.
 */

/** One saved item, as it travels between the client and the CMS. */
export interface SyncedBookmark {
  kind: 'article' | 'deadline'
  id: string
  slug: string
  title: string
  savedAt: string
}

/** A local change the server has not accepted yet. */
export interface PendingOp {
  kind: 'article' | 'deadline'
  id: string
  slug: string
  title: string
  /** `true` to save, `false` to remove. */
  saved: boolean
}

/** A stable key for one item — kind and id together, never the title. */
export function bookmarkKey(entry: Pick<SyncedBookmark, 'kind' | 'id'>): string {
  return `${entry.kind}:${entry.id}`
}

/**
 * Collapse a queue so at most one op survives per item.
 *
 * The last write wins: toggling an item twice while offline must replay as the
 * final state, not as an add followed by a remove.
 */
export function collapsePending(ops: PendingOp[]): PendingOp[] {
  const byKey = new Map<string, PendingOp>()
  for (const op of ops) byKey.set(bookmarkKey(op), op)
  return [...byKey.values()]
}

/** The server's list with the not-yet-pushed local intents applied on top. */
export function applyPending(server: SyncedBookmark[], pending: PendingOp[]): SyncedBookmark[] {
  const byKey = new Map<string, SyncedBookmark>()
  for (const entry of server) byKey.set(bookmarkKey(entry), entry)

  for (const op of collapsePending(pending)) {
    const key = bookmarkKey(op)
    if (op.saved) {
      // Keep the server's `savedAt` when it already knows the item — the reader
      // saved it earlier, and re-dating it would reorder the list for no reason.
      if (!byKey.has(key)) {
        byKey.set(key, {
          kind: op.kind,
          id: op.id,
          slug: op.slug,
          title: op.title,
          savedAt: new Date().toISOString(),
        })
      }
    } else {
      byKey.delete(key)
    }
  }

  return [...byKey.values()]
}
