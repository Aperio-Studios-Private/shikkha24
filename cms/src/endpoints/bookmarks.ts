import type { Endpoint, PayloadRequest } from 'payload'

import {
  isHoneypotFilled,
  json,
  readJsonBody,
  requireClientIp,
  text,
  tooManyRequests,
} from '../lib/http'
import { rateLimit } from '../lib/rate-limit'
import { readerIdFromRequest } from '../lib/reader-session'

/**
 * Bookmark sync — S9's last open build item.
 *
 *   `POST /api/bookmarks/sync`    reconcile the local list with the server's
 *   `POST /api/bookmarks/toggle`  add or remove one bookmark
 *
 * ⚠️ **Both are mounted on the Bookmarks collection, not at the API root.** A root
 * endpoint whose first path segment equals a collection slug is shadowed by that
 * collection's generated REST route — `/api/bookmarks/sync` would be parsed as
 * "collection `bookmarks`, document id `sync`" and 404 forever. That is the
 * `/api/comments/submit` lesson (`docs/security.md` §13.4).
 *
 * ## The merge policy, and why it is not a union
 *
 * A reader's list lives in `localStorage` first and works with no account at all.
 * The server copy exists so that signing in carries the list to another device.
 *
 * ⚠️ **A naive union on every sync is wrong, and the failure is silent.** The
 * reader deletes a bookmark on their phone; the laptop still holds the old list;
 * a union puts the deleted bookmark back. Something the reader deliberately
 * removed reappearing is worse than never syncing at all.
 *
 * So the policy is:
 *
 *   1. **Never synced** (`readers.bookmarksSyncedAt` is empty) — the local list is
 *      an independent list, not a stale copy, so it is **merged in**. This is what
 *      carries the bookmarks a reader saved before signing in.
 *   2. **Already synced** — the server is authoritative. The uploaded list is
 *      **ignored** and the server's list is returned; the client replaces what it
 *      holds. A deletion therefore sticks everywhere, which is the point.
 *
 * The marker lives on the **reader**, not in local storage. A per-device marker
 * would let a device that had lost its storage re-upload a stale list and
 * resurrect the deletion — the exact bug the policy exists to prevent.
 *
 * ## Writes are whitelisted key by key
 *
 * `overrideAccess: true` bypasses field-level access, which is unavoidable here:
 * there is no CMS user to run access control against. So `reader` is taken from
 * the session and **never from the body**, every field is copied explicitly, and
 * the body is never spread.
 */

/** Toggles per IP per window. A reader may genuinely save and unsave while browsing. */
const TOGGLES_PER_WINDOW = 60

/** Syncs per IP per window — one per page load for a signed-in reader. */
const SYNCS_PER_WINDOW = 60

const WINDOW_MS = 5 * 60 * 1000

/** Matches the browser-local ceiling. A reader with 500 bookmarks is a bug. */
const MAX_BOOKMARKS = 200

type Kind = 'article' | 'deadline'

/** The row shape this module reads. Payload's generated type is wider than needed. */
interface StoredBookmark {
  id: number
  kind: Kind
  article?: number | null
  deadline?: number | null
  title?: string | null
  slug?: string | null
  createdAt?: string
}

/** What the client sends and receives — the same shape as `BookmarkEntry`. */
interface WireBookmark {
  kind: Kind
  id: string
  slug: string
  title: string
  savedAt: string
}

function isKind(value: unknown): value is Kind {
  return value === 'article' || value === 'deadline'
}

/**
 * One bookmark from the request body, or `null` when it is not usable.
 *
 * Everything is copied explicitly and bounded: `title` and `slug` go through
 * `text()`, which trims and truncates, so a body cannot put an unbounded string
 * into a column.
 */
function readBookmark(
  value: unknown,
): { kind: Kind; target: number; slug: string; title: string } | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (!isKind(row.kind)) return null

  const target = Number(row.id)
  if (!Number.isInteger(target) || target <= 0) return null

  const title = text(row.title, 300)
  const slug = text(row.slug, 300)
  if (!title || !slug) return null

  return { kind: row.kind, target, slug, title }
}

/** A stable key for one saved item — kind and target together, never the title. */
function keyOf(
  row: Pick<StoredBookmark, 'kind'> & { article?: unknown; deadline?: unknown },
): string {
  const target = row.kind === 'article' ? row.article : row.deadline
  return `${row.kind}:${String(target)}`
}

/** The session's reader id, or `null`. */
function readerOf(req: PayloadRequest): number | null {
  return readerIdFromRequest(req)
}

/** Every bookmark this reader has, oldest first. */
async function storedFor(req: PayloadRequest, readerId: number): Promise<StoredBookmark[]> {
  const found = await req.payload.find({
    collection: 'bookmarks',
    where: { reader: { equals: readerId } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req,
  })
  return found.docs as unknown as StoredBookmark[]
}

/**
 * The answer when any part of a sync failed.
 *
 * ⚠️ Three things are deliberate. The status is non-2xx so the client cannot
 * treat it as an authoritative list. `synced` is **false**, which is what tells
 * the client its local list is still the only complete copy. And
 * `Retry-After`-style guidance is absent on purpose — the client already retries
 * on its next mount; what it must not do is replace good local data with a
 * partial server answer.
 *
 * The message never says what was lost, because nothing is lost: the reader row
 * is untouched and the next sync replays the merge.
 */
function syncFailed(written = 0): Response {
  return json(
    {
      error: 'বুকমার্ক সিঙ্ক করা যায়নি। আপনার ডিভাইসের তালিকা অপরিবর্তিত আছে — আবার চেষ্টা করুন।',
      synced: false,
      written,
    },
    503,
  )
}

/** `StoredBookmark` → the wire shape the client stores. */
function toWire(row: StoredBookmark): WireBookmark {
  const target = row.kind === 'article' ? row.article : row.deadline
  return {
    kind: row.kind,
    id: String(target),
    slug: row.slug ?? '',
    title: row.title ?? '',
    // The collection keeps `createdAt` and nothing else — that is the same fact
    // as `savedAt`, and the client only sorts by it.
    savedAt: row.createdAt ?? new Date(0).toISOString(),
  }
}

/**
 * Drop ids that name nothing, so a stale or forged list cannot leave the reader
 * with rows pointing at an article that no longer exists.
 *
 * One query per kind rather than one per bookmark: a 200-entry sync must not cost
 * 200 round trips.
 *
 * @returns the set of ids that exist, or `null` when the query itself failed.
 *          ⚠️ `null` is not an empty set: an empty set means "none of these
 *          targets exist", which is a legitimate answer that drops the entries;
 *          `null` means "we do not know", and the caller must not drop anything
 *          on the strength of it.
 */
async function existingTargets(
  req: PayloadRequest,
  kind: Kind,
  ids: number[],
): Promise<Set<number> | null> {
  if (ids.length === 0) return new Set()
  const found = await req.payload
    .find({
      collection: kind === 'article' ? 'articles' : 'deadlines',
      where: { id: { in: ids } },
      limit: MAX_BOOKMARKS,
      pagination: false,
      depth: 0,
      overrideAccess: true,
      req,
    })
    .catch(() => null)
  if (!found) return null
  return new Set(found.docs.map((doc) => Number(doc.id)))
}

/**
 * Reconcile the reader's local list with the server's.
 *
 * See the policy at the top of this file — the short version is that the first
 * sync merges and every sync after it takes the server's answer.
 *
 * ## ⚠️ `synced: true` is a claim the client acts on, so it must be earned
 *
 * The client treats a 2xx sync as authoritative: it **replaces** its local list
 * with `bookmarks` and records the reader as synced. Every read and every write
 * here therefore has to be fatal when it fails. When they were suppressed with
 * `.catch(() => null)` the endpoint could:
 *
 *   - return an **empty or partial** list after a failed read — and the client
 *     would wipe a list the reader could still see, and
 *   - mark the reader as synced while a create had failed — after which the
 *     merge branch is never entered again, so the bookmarks that failed to
 *     upload were **never retried** (T-65).
 *
 * On failure the answer is now an error status, and the "unsynced" shape of the
 * body (no `synced: true`) tells the client that its local list is still the
 * only complete copy.
 */
const bookmarkSyncEndpoint: Endpoint = {
  // Relative to the Bookmarks collection slug → `/api/bookmarks/sync`.
  path: '/sync',
  method: 'post',
  handler: async (req: PayloadRequest): Promise<Response> => {
    const readerId = readerOf(req)
    // Not signed in is the normal case for most readers, not an error worth
    // explaining — the client simply keeps its local list.
    if (!readerId) return json({ error: 'সাইন ইন করা নেই।' }, 401)

    const caller = requireClientIp(req)
    if ('error' in caller) return caller.error
    const limit = rateLimit(`bookmark-sync:${caller.ip}`, SYNCS_PER_WINDOW, WINDOW_MS)
    if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds)

    const body = await readJsonBody(req)
    if (isHoneypotFilled(body)) return json({ bookmarks: [] })

    const reader = await req.payload
      .findByID({ collection: 'readers', id: readerId, depth: 0, overrideAccess: true, req })
      .catch(() => null)
    // ⚠️ Still fatal-safe: `null` means either "no such reader" or "the read
    // failed", and both must stop a sync rather than be answered with the marker
    // logic below. A genuinely deleted reader gets a 401 either way.
    if (!reader) return json({ error: 'সাইন ইন করা নেই।' }, 401)

    const stored = await storedFor(req, readerId).catch(() => null)
    if (!stored) return syncFailed()

    const synced = Boolean((reader as { bookmarksSyncedAt?: unknown }).bookmarksSyncedAt)

    /*
     * ⚠️ Already synced → the server wins and the uploaded list is discarded.
     * Returning the server's list here is what makes a deletion on one device
     * stick on the others.
     */
    if (synced) {
      return json({ bookmarks: stored.map(toWire), synced: true })
    }

    // ── First sync: merge, because the local list is independent, not stale ────
    const uploaded = Array.isArray(body.bookmarks) ? body.bookmarks : []
    const candidates = uploaded
      .map(readBookmark)
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .slice(0, MAX_BOOKMARKS)

    const have = new Set(stored.map(keyOf))
    const byKind = new Map<Kind, number[]>()
    for (const entry of candidates) {
      byKind.set(entry.kind, [...(byKind.get(entry.kind) ?? []), entry.target])
    }
    const real = new Map<Kind, Set<number>>()
    for (const [kind, ids] of byKind) {
      const targets = await existingTargets(req, kind, ids)
      // A failed existence query would look like "none of these articles
      // exist" and silently drop every bookmark the reader uploaded.
      if (!targets) return syncFailed()
      real.set(kind, targets)
    }

    let written = 0
    for (const entry of candidates) {
      const key = `${entry.kind}:${entry.target}`
      if (have.has(key)) continue
      if (!real.get(entry.kind)?.has(entry.target)) continue
      // The key is claimed only after the write succeeds, so a failed create is
      // retried on the next sync instead of being treated as already present.
      const created = await req.payload
        .create({
          collection: 'bookmarks',
          // Whitelisted key by key — never a spread of the body. `reader` comes
          // from the session, so a reader cannot file into someone else's list.
          data: {
            reader: readerId,
            kind: entry.kind,
            title: entry.title,
            slug: entry.slug,
            ...(entry.kind === 'article' ? { article: entry.target } : { deadline: entry.target }),
          },
          overrideAccess: true,
          req,
        })
        .then(() => true)
        .catch(() => false)
      if (!created) return syncFailed(written)
      have.add(key)
      written += 1
    }

    /*
     * The marker is set **after** the merge succeeds, never before. If it were set
     * first, a failed merge would leave the reader marked as synced with their
     * bookmarks never uploaded — and the next sync would then discard the local
     * list that still held them.
     */
    const marked = await req.payload
      .update({
        collection: 'readers',
        id: readerId,
        data: { bookmarksSyncedAt: new Date().toISOString() },
        overrideAccess: true,
        req,
      })
      .then(() => true)
      .catch(() => false)
    if (!marked) return syncFailed(written)

    const after = await storedFor(req, readerId).catch(() => null)
    if (!after) return syncFailed(written)

    return json({ bookmarks: after.map(toWire), synced: true })
  },
}

/**
 * Add or remove one bookmark for the signed-in reader.
 *
 * ⚠️ Only ever touches **this reader's** row for the named target. The client
 * cannot name a row id, so it cannot delete someone else's bookmark.
 */
const bookmarkToggleEndpoint: Endpoint = {
  // Relative to the Bookmarks collection slug → `/api/bookmarks/toggle`.
  path: '/toggle',
  method: 'post',
  handler: async (req: PayloadRequest): Promise<Response> => {
    const readerId = readerOf(req)
    if (!readerId) return json({ error: 'সাইন ইন করা নেই।' }, 401)

    const caller = requireClientIp(req)
    if ('error' in caller) return caller.error
    const limit = rateLimit(`bookmark-toggle:${caller.ip}`, TOGGLES_PER_WINDOW, WINDOW_MS)
    if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds)

    const body = await readJsonBody(req)
    if (isHoneypotFilled(body)) return json({ ok: true })

    const entry = readBookmark(body)
    if (!entry) return json({ error: 'বুকমার্কটি সঠিক নয়।' }, 400)

    const stored = await storedFor(req, readerId).catch(() => null)
    // A failed read is not "this bookmark is not saved": answering from an empty
    // list would create a duplicate row, or report a removal that never happened.
    if (!stored) return syncFailed()
    const match = stored.find((row) => keyOf(row) === `${entry.kind}:${entry.target}`)

    if (body.saved === false) {
      if (match) {
        const gone = await req.payload
          .delete({ collection: 'bookmarks', id: match.id, overrideAccess: true, req })
          .then(() => true)
          .catch(() => false)
        // `saved: false` is a claim that the row is gone; a suppressed failure
        // here would leave it in place and the client would believe otherwise.
        if (!gone) return syncFailed()
      }
      return json({ ok: true, saved: false })
    }

    // Already saved — a second tap on the same device must not duplicate the row.
    if (match) return json({ ok: true, saved: true })

    if (stored.length >= MAX_BOOKMARKS) {
      return json({ error: 'বুকমার্কের সীমা পূর্ণ হয়েছে।' }, 400)
    }

    const valid = await existingTargets(req, entry.kind, [entry.target])
    if (!valid) return syncFailed()
    if (!valid.has(entry.target)) return json({ error: 'খুঁজে পাওয়া যায়নি।' }, 404)

    const created = await req.payload
      .create({
        collection: 'bookmarks',
        data: {
          reader: readerId,
          kind: entry.kind,
          title: entry.title,
          slug: entry.slug,
          ...(entry.kind === 'article' ? { article: entry.target } : { deadline: entry.target }),
        },
        overrideAccess: true,
        req,
      })
      .then(() => true)
      .catch(() => false)

    // Told the truth rather than "saved": the client's local list still holds the
    // entry, and it will be replayed on the next toggle or sync.
    if (!created) return syncFailed()

    return json({ ok: true, saved: true })
  },
}

export const bookmarkEndpoints: Endpoint[] = [bookmarkSyncEndpoint, bookmarkToggleEndpoint]
