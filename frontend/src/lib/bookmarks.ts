/**
 * Reader bookmarks — browser-local, with no backend required.
 *
 * ## Why local storage is the primary store, not a cache
 *
 * `docs/security.md` §8 and `docs/reliability.md` §4 both point the same way: a
 * reader who has no account must still be able to save an article. So the
 * bookmark lives in `localStorage` first and is never gated on signing in. The
 * CMS copy (`bookmarks` collection, S9) exists only so a reader who *does* sign
 * in keeps their list across devices — it is a sync target, not the source of
 * truth. If the CMS is unreachable, saving still works and the list still
 * renders.
 *
 * ## What is deliberately not stored
 *
 * No reader identifier, no email, no timestamp beyond `savedAt`, and nothing is
 * sent anywhere until a reader explicitly signs in. A bookmarks list is a
 * readable signal of what someone is applying for, and on a site about
 * scholarships and admissions that is closer to sensitive than it looks.
 *
 * ## Failure modes are all silent
 *
 * Safari in private mode throws on `localStorage.setItem`, and some browsers
 * disable it entirely. Every accessor here swallows that and degrades to an
 * in-memory list, because a bookmark button that throws is worse than one that
 * forgets.
 */

/** One saved item. `slug` is stored so the list can link without a CMS lookup. */
export interface BookmarkEntry {
  kind: 'article' | 'deadline'
  id: string
  slug: string
  title: string
  savedAt: string
}

/** Namespaced so a future unrelated key cannot collide. */
export const BOOKMARKS_STORAGE_KEY = 'shikkha24:bookmarks'

/** Fired on `document` after any change, so several buttons stay in step. */
export const BOOKMARKS_CHANGED_EVENT = 'shikkha24:bookmarks-changed'

/** Hard ceiling. A reader with 500 bookmarks is a bug, not a power user. */
const MAX_ENTRIES = 200

/**
 * In-memory fallback for a browser with no working `localStorage`.
 *
 * Module-scoped, so it survives for the life of the page — which is enough for
 * the button state to be consistent while the reader is looking at it.
 */
let memoryFallback: BookmarkEntry[] = []

/** Is `localStorage` actually usable? Private mode says no, loudly. */
function storageAvailable(): boolean {
  try {
    const probe = '__shikkha24_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

/** A stable key for one item — kind and id together, never the title. */
function keyOf(entry: Pick<BookmarkEntry, 'kind' | 'id'>): string {
  return `${entry.kind}:${entry.id}`
}

/** Everything saved, newest first. Never throws. */
export function readBookmarks(): BookmarkEntry[] {
  if (!storageAvailable()) return [...memoryFallback]

  try {
    const raw = window.localStorage.getItem(BOOKMARKS_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Trust nothing from storage: an older build, or a hand-edited value, must
    // not be able to put a non-entry into the list.
    return parsed.filter(
      (item): item is BookmarkEntry =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as BookmarkEntry).id === 'string' &&
        typeof (item as BookmarkEntry).title === 'string' &&
        ((item as BookmarkEntry).kind === 'article' || (item as BookmarkEntry).kind === 'deadline'),
    )
  } catch {
    return []
  }
}

function write(entries: BookmarkEntry[]): void {
  const capped = entries.slice(0, MAX_ENTRIES)
  if (!storageAvailable()) {
    memoryFallback = capped
  } else {
    try {
      window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(capped))
    } catch {
      // Quota or a locked store — keep the in-memory copy so the UI stays honest.
      memoryFallback = capped
    }
  }
  document.dispatchEvent(new CustomEvent(BOOKMARKS_CHANGED_EVENT))
}

/** Is this item already saved? */
export function hasBookmark(entry: Pick<BookmarkEntry, 'kind' | 'id'>): boolean {
  const target = keyOf(entry)
  return readBookmarks().some((item) => keyOf(item) === target)
}

/** Save an item. Returns the new state — `true` when it is now saved. */
export function addBookmark(entry: Omit<BookmarkEntry, 'savedAt'>): boolean {
  const target = keyOf(entry)
  const existing = readBookmarks().filter((item) => keyOf(item) !== target)
  write([{ ...entry, savedAt: new Date().toISOString() }, ...existing])
  return true
}

/** Remove an item. Returns the new state — always `false`. */
export function removeBookmark(entry: Pick<BookmarkEntry, 'kind' | 'id'>): boolean {
  const target = keyOf(entry)
  write(readBookmarks().filter((item) => keyOf(item) !== target))
  return false
}

/** Toggle, returning the resulting state so a button can reflect it. */
export function toggleBookmark(entry: Omit<BookmarkEntry, 'savedAt'>): boolean {
  return hasBookmark(entry) ? removeBookmark(entry) : addBookmark(entry)
}

/** Forget everything. Used by the "clear all" control on `/bookmarks`. */
export function clearBookmarks(): void {
  write([])
}

/**
 * The URL an entry points at.
 *
 * Articles use the shortlink `/a/:id` — the bookmark stores only the id and
 * slug (no category), so the shortlink resolves to the full `/:category/:id/:slug`
 * URL via the redirect page. Shortlinks are stable and never reused.
 */
export function bookmarkHref(entry: BookmarkEntry): string {
  return entry.kind === 'article' ? `/a/${entry.id}` : `/deadlines#${entry.slug}`
}
