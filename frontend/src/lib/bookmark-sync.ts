/**
 * Bookmark → CMS sync — the browser half.
 *
 * The local list stays the primary store: it works with no account, and the sync
 * only ever runs when the reader has something to sync and a CMS is configured.
 * The policy it implements lives in `bookmark-merge.ts`, which is pure and
 * harness-tested; this module is the glue around it.
 *
 * ## When a request is made, and when none is
 *
 * A news site's readers are mostly anonymous, so the island must not fire a
 * request on every page load. It runs only when one of these is true:
 *
 *   - the reader has synced before (the marker is set), or
 *   - there are local bookmarks worth merging, or
 *   - the reader is on `/bookmarks`, where they are explicitly asking to see it.
 *
 * That last case is what performs the **first** sync: a reader saves something,
 * signs in, opens their list, and the merge happens. An anonymous reader with an
 * empty list never calls the CMS at all.
 *
 * ## Everything fails quietly
 *
 * `localStorage` throws in Safari private mode, `fetch` fails on a flaky
 * connection, and the CMS may be down. None of those may break the bookmark
 * button — a save that works locally and syncs later is correct; a save that
 * throws is not.
 */

import {
  applyPending,
  bookmarkKey,
  collapsePending,
  type PendingOp,
  type SyncedBookmark,
} from './bookmark-merge'
import {
  BOOKMARKS_CHANGED_EVENT,
  type BookmarkEntry,
  readBookmarks,
  replaceBookmarks,
} from './bookmarks'
import { getPublicCmsOrigin } from './interactive'

/** Set once a sync has succeeded. Its absence means "never synced". */
const SYNCED_KEY = 'shikkha24:bookmarks-synced'

/** Local changes the server has not accepted yet. */
const PENDING_KEY = 'shikkha24:bookmarks-pending'

/** Never throws — a browser with no working storage simply has no marker. */
function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

/** Never throws. */
function writeRaw(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Quota or a locked store — the sync simply retries next time.
  }
}

/** Has this browser ever completed a sync? */
export function hasSynced(): boolean {
  return readRaw(SYNCED_KEY) !== null
}

/**
 * Forget the local half of the sync.
 *
 * ⚠️ Called when a reader deletes their account. It must clear the **marker** as
 * well as the list: leaving the marker behind would make a later account on this
 * browser look "already synced", and its first sync would then discard the local
 * list instead of merging it.
 */
export function forgetBookmarkSync(): void {
  for (const key of [SYNCED_KEY, PENDING_KEY]) {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Nothing to clear in a browser with no working storage.
    }
  }
}

function markSynced(): void {
  writeRaw(SYNCED_KEY, new Date().toISOString())
}

/** The queue of local changes the server has not accepted. */
function readPending(): PendingOp[] {
  const raw = readRaw(PENDING_KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (op): op is PendingOp =>
        typeof op === 'object' &&
        op !== null &&
        typeof (op as PendingOp).id === 'string' &&
        typeof (op as PendingOp).saved === 'boolean' &&
        ((op as PendingOp).kind === 'article' || (op as PendingOp).kind === 'deadline'),
    )
  } catch {
    return []
  }
}

function writePending(ops: PendingOp[]): void {
  const collapsed = collapsePending(ops)
  if (collapsed.length === 0) {
    try {
      window.localStorage.removeItem(PENDING_KEY)
    } catch {
      // Nothing to do — an empty queue read back as absent is the same thing.
    }
    return
  }
  writeRaw(PENDING_KEY, JSON.stringify(collapsed))
}

/** The local list in the shape the wire uses. */
function localAsWire(): SyncedBookmark[] {
  return readBookmarks().map((entry) => ({
    kind: entry.kind,
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    savedAt: entry.savedAt,
  }))
}

/** The wire shape back in the local store's shape. */
function wireAsLocal(entries: SyncedBookmark[]): BookmarkEntry[] {
  return entries.map((entry) => ({
    kind: entry.kind,
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    savedAt: entry.savedAt,
  }))
}

export type SyncOutcome = 'unavailable' | 'signed-out' | 'synced'

/**
 * Reconcile the local list with the server's, then push anything still pending.
 *
 * The server decides whether this is a first merge or an authoritative read —
 * see `cms/src/endpoints/bookmarks.ts`. This side only has to honour the answer,
 * and to replay local intents the server has not heard yet.
 */
export async function syncNow(): Promise<SyncOutcome> {
  const origin = getPublicCmsOrigin()
  if (!origin) return 'unavailable'

  let response: Response
  try {
    response = await fetch(`${origin}/api/bookmarks/sync`, {
      method: 'POST',
      // The reader session is a cookie on the CMS origin. The two hosts share a
      // registrable domain, so `SameSite=Lax` still sends it.
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookmarks: localAsWire() }),
    })
  } catch {
    return 'unavailable'
  }

  // 401 is the ordinary case for a reader with no account — not an error.
  if (response.status === 401) return 'signed-out'
  if (!response.ok) return 'unavailable'

  let body: { bookmarks?: SyncedBookmark[] } = {}
  try {
    body = (await response.json()) as { bookmarks?: SyncedBookmark[] }
  } catch {
    return 'unavailable'
  }

  const server = Array.isArray(body.bookmarks) ? body.bookmarks : []
  const pending = readPending()

  // The server's list is authoritative — but a local change it has not accepted
  // yet outranks it, or a save made while signed out would vanish here.
  const installed = wireAsLocal(applyPending(server, pending))
  installing = true
  replaceBookmarks(installed)
  lastKnown = installed
  installing = false
  markSynced()

  if (pending.length > 0) {
    const remaining: PendingOp[] = []
    for (const op of pending) {
      if (!(await sendToggle(origin, op))) remaining.push(op)
    }
    writePending(remaining)
  }

  return 'synced'
}

/** One toggle request. Returns whether the server accepted it. */
async function sendToggle(origin: string, op: PendingOp): Promise<boolean> {
  try {
    const response = await fetch(`${origin}/api/bookmarks/toggle`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: op.kind,
        id: op.id,
        slug: op.slug,
        title: op.title,
        saved: op.saved,
      }),
    })
    /*
     * A 400 or 404 is a verdict, not a failure: the item is malformed or no
     * longer exists, so retrying forever would never succeed. Anything else —
     * including 401, which means the session expired mid-session — is kept so a
     * later sync can replay it.
     */
    return response.ok || response.status === 400 || response.status === 404
  } catch {
    return false
  }
}

/**
 * Mirror one local change to the server.
 *
 * ⚠️ Does nothing before the first sync, and that is deliberate: until the server
 * has the list, the local store **is** the source of truth and the first sync
 * merges it whole. Pushing individual changes before that would race the merge.
 */
export async function pushToggle(
  entry: Omit<BookmarkEntry, 'savedAt'>,
  saved: boolean,
): Promise<void> {
  if (!hasSynced()) return
  const origin = getPublicCmsOrigin()
  if (!origin) return

  const op: PendingOp = {
    kind: entry.kind,
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    saved,
  }

  if (await sendToggle(origin, op)) {
    // Drop any earlier intent for the same item — this one supersedes it.
    writePending(readPending().filter((queued) => bookmarkKey(queued) !== bookmarkKey(op)))
    return
  }

  writePending([...readPending(), op])
}

/**
 * Start the island. Safe to call once per page; does nothing without a CMS.
 *
 * Returns the outcome of the first sync so a caller (or a harness) can await it.
 */
export async function startBookmarkSync(): Promise<SyncOutcome | 'skipped'> {
  if (!getPublicCmsOrigin()) return 'skipped'

  const onBookmarksPage = window.location.pathname.startsWith('/bookmarks')
  const worthTrying = hasSynced() || readBookmarks().length > 0 || onBookmarksPage
  if (!worthTrying) return 'skipped'

  lastKnown = readBookmarks()
  document.addEventListener(BOOKMARKS_CHANGED_EVENT, () => {
    void mirrorChange()
  })

  return syncNow()
}

/**
 * The most recent list this island has seen.
 *
 * ⚠️ `BOOKMARKS_CHANGED_EVENT` carries no payload — it exists so several buttons
 * stay in step, not so a listener can know what happened. So the island keeps its
 * own copy and **diffs** it: that is what turns "something changed" into "this
 * item was saved" and "that one was removed".
 */
let lastKnown: BookmarkEntry[] = []

/** Set while `syncNow` installs the server's list, so the diff does not echo it back. */
let installing = false

/**
 * Mirror whatever changed to the server.
 *
 * Does nothing before the first sync: until the server has the list, the local
 * store **is** the source of truth and the first sync merges it whole. Pushing
 * individual changes before that would race the merge.
 */
async function mirrorChange(): Promise<void> {
  const current = readBookmarks()
  const before = lastKnown
  lastKnown = current

  if (installing || !hasSynced()) return

  const had = new Set(before.map((entry) => bookmarkKey(entry)))
  const has = new Set(current.map((entry) => bookmarkKey(entry)))

  for (const entry of current) {
    if (!had.has(bookmarkKey(entry))) await pushToggle(entry, true)
  }
  for (const entry of before) {
    if (!has.has(bookmarkKey(entry))) await pushToggle(entry, false)
  }
}
