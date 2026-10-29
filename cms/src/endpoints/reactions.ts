import type { Endpoint, PayloadRequest } from 'payload'
import {
  clientIp,
  isHoneypotFilled,
  json,
  readJsonBody,
  requireClientIp,
  tooManyRequests,
} from '../lib/http'
import { rateLimit } from '../lib/rate-limit'
import {
  emptyCounts,
  isReactionType,
  REACTION_TYPES,
  type ReactionType,
  reactionFingerprint,
} from '../lib/reactions'
import { readerIdFromRequest } from '../lib/reader-session'

/**
 * The reaction endpoints — S16.
 *
 *   `POST /api/reactions/toggle`          toggle the caller's reaction
 *   `GET  /api/reactions/counts?article=` the aggregate, plus the caller's own
 *
 * ⚠️ **Both are mounted on the Reactions collection, not at the API root.** A root
 * endpoint whose first path segment equals a collection slug is shadowed by that
 * collection's generated REST route: `/api/reactions/toggle` would be parsed as
 * "collection `reactions`, document id `toggle`", the handler would never be
 * reached, and every reaction would 404 — exactly what happened to
 * `/api/comments/submit` (`docs/security.md` §13.4). Collection endpoints are
 * matched before the generated routes, which is why the paths below are relative.
 *
 * ## Why the counts are an endpoint rather than a public collection read
 *
 * The rows hold a `fingerprint`. Making the collection publicly readable would let
 * anyone page through every fingerprint on an article, and would ship the whole
 * row set to every reader just to add up five numbers. `Reactions.read` is
 * therefore **not** public: the aggregate is computed here, server-side, and only
 * the five counts and the caller's own choice leave the CMS.
 *
 * ## Why not the generated `POST /api/reactions`
 *
 * A generated create route cannot rate limit, cannot honeypot, and cannot verify
 * that the `article` exists. It would also let a caller write a `fingerprint` of
 * their choosing, which is the whole dedupe mechanism.
 */

/** Toggles per IP per window. Generous — a reader may genuinely change their mind. */
const TOGGLES_PER_WINDOW = 20
const WINDOW_MS = 5 * 60 * 1000

/**
 * The caller's dedupe key. IP + UA, salted and hashed — never stored raw.
 */
function fingerprintOf(req: PayloadRequest): string {
  // No proxy headers = direct-to-origin request. A distinct sentinel per call
  // means it can never dedupe against (or impersonate) a real reader's fingerprint.
  const ip = clientIp(req)
  if (ip === null)
    return reactionFingerprint(
      `unproxied-${Date.now()}-${Math.random()}`,
      req.headers.get('user-agent') ?? '',
    )
  return reactionFingerprint(ip, req.headers.get('user-agent') ?? '')
}

/** `true` when the id names a real, published article. */
async function articleExists(req: PayloadRequest, articleId: number): Promise<boolean> {
  const found = await req.payload
    .find({
      collection: 'articles',
      where: { id: { equals: articleId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    .catch(() => null)
  return Boolean(found?.docs?.length)
}

/**
 * The five counts for an article, and the caller's own reaction.
 *
 * ## ⚠️ Aggregated in the database, not in Node
 *
 * The original version did `payload.find({ pagination: false })` and counted the
 * returned rows in JavaScript. That loads **every reaction row on the article**
 * into the Node process on every single read — and `countsFor` runs on both the
 * counts endpoint and every toggle, because a toggle returns fresh numbers.
 *
 * That made the endpoint's cost grow linearly with popularity, which is the one
 * shape a news site cannot have: a story that goes viral is exactly the story
 * that starts timing out. On a 2 GB host sharing the disk with the SQLite file
 * and the standalone bundle, that is memory pressure, not just latency.
 *
 * ## Why the database is genuinely faster here, not just tidier
 *
 * It is not "SQL is nicer than JS" — the win comes from the two compound unique
 * indexes the collection already declares:
 *
 *     (article, type, reader)
 *     (article, type, fingerprint)
 *
 * `article` is the leading column of both, so `WHERE article = ? AND type = ?`
 * is answered from an index prefix. Five such queries read **five index entries
 ***, regardless of how many reactions exist — against a full row fetch that
 * reads every row on the article.
 *
 * `payload.count` is used rather than `find` precisely because it issues a bare
 * `SELECT COUNT(*)` and **never materialises documents** — there is no `limit`
 * option on it to get wrong, and no rows cross into the process. The earlier
 * concern that a default page size might quietly cap the tally applies to
 * `find` + `docs.length`, which is exactly the shape this replaces
 * (`sandbox-build-traps`, trap 10A).
 *
 * The unique indexes also make each `(article, type)` pair **provably unique** —
 * at most one row per fingerprint, and one per reader — so each count is 0 or 1
 * per reader rather than an arbitrary tally. That is the approved S16 design
 * (see `collections/Reactions.ts`), not a limitation introduced here.
 */
async function countsFor(
  req: PayloadRequest,
  articleId: number,
  fingerprint: string,
): Promise<{ counts: Record<ReactionType, number>; total: number; mine: ReactionType | null }> {
  const counts = emptyCounts()

  // One indexed COUNT per reaction type, in parallel. `payload.count` resolves to
  // `{ totalDocs }` and issues a bare `SELECT COUNT(*)` — no documents are
  // materialised, whatever the row count.
  const perType = await Promise.all(
    REACTION_TYPES.map((type) =>
      req.payload
        .count({
          collection: 'reactions',
          where: { article: { equals: articleId }, type: { equals: type } },
          overrideAccess: true,
          req,
        })
        // `count` resolves to `{ totalDocs }`; normalise to a number and default to
        // 0 on failure so one bad query degrades that type's count rather than
        // failing the whole response — the same contract the old `.catch(() => null)`
        // gave, where a failed read produced zeros.
        .then((result) => result?.totalDocs ?? 0)
        .catch(() => 0),
    ),
  )

  REACTION_TYPES.forEach((type, index) => {
    counts[type] = perType[index] ?? 0
  })

  const total = REACTION_TYPES.reduce((sum, type) => sum + counts[type], 0)

  /*
   * The caller's own reaction, if any.
   *
   * A second narrow query rather than a scan for "which of these rows is mine":
   * it is answered by the `(article, type, fingerprint)` index, so it stays a
   * fixed-cost lookup. `limit: 1` because the unique index guarantees at most
   * one matching row.
   */
  let mine: ReactionType | null = null
  if (fingerprint) {
    const mineRow = await req.payload
      .find({
        collection: 'reactions',
        where: { article: { equals: articleId }, fingerprint: { equals: fingerprint } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
        req,
      })
      .catch(() => null)

    const type = (mineRow?.docs?.[0] as { type?: unknown } | undefined)?.type
    if (isReactionType(type)) mine = type
  }

  return { counts, total, mine }
}

/**
 * Toggle the caller's reaction.
 *
 * ## Replace, not accumulate
 *
 * The island is a `radiogroup` — one reaction per article — so choosing a
 * different one **replaces** the previous. Tapping the current one removes it.
 * The two compound unique indexes make the *same* reaction impossible to
 * double-write; the replace behaviour is this handler's rule, because a
 * "one row per article per fingerprint" constraint is not what the approved spec
 * specifies (see `.sps/section-todos/S16.md`, "Deviations").
 *
 * ## The write is whitelisted key by key
 *
 * `overrideAccess: true` bypasses field-level access — that is unavoidable here,
 * because there is no CMS user to run access control against. So the `fingerprint`
 * is computed server-side from the request and **never read from the body**, and
 * the data object is built field by field. Do not change this to spread the body.
 */
const reactionToggleEndpoint: Endpoint = {
  // Relative to the Reactions collection slug → `/api/reactions/toggle`.
  path: '/toggle',
  method: 'post',
  handler: async (req: PayloadRequest): Promise<Response> => {
    const body = await readJsonBody(req)

    // 1 — honeypot. Silent success, no write, no signal to the bot.
    if (isHoneypotFilled(body)) {
      return json({ ok: true })
    }

    // 2 — rate limit.
    const caller = requireClientIp(req)
    if ('error' in caller) return caller.error
    const limit = rateLimit(`reaction-toggle:${caller.ip}`, TOGGLES_PER_WINDOW, WINDOW_MS)
    if (!limit.ok) {
      return tooManyRequests(limit.retryAfterSeconds)
    }

    // 3 — validation. `type` is checked against the allow-list, so no arbitrary
    //     string can reach the column.
    const articleId = Number(body.article)
    if (!Number.isInteger(articleId) || articleId <= 0) {
      return json({ error: 'সংবাদটি খুঁজে পাওয়া যায়নি।' }, 400)
    }
    if (!isReactionType(body.type)) {
      return json({ error: 'প্রতিক্রিয়াটি সঠিক নয়।' }, 400)
    }
    const type = body.type

    if (!(await articleExists(req, articleId))) {
      return json({ error: 'সংবাদটি খুঁজে পাওয়া যায়নি।' }, 404)
    }

    const fingerprint = fingerprintOf(req)
    const reader = readerIdFromRequest(req)

    // The caller's existing rows on this article. Top-level keys rather than a
    // nested `and` — a nested `and` with a negative operator silently failed to
    // filter on this stack (`sandbox-build-traps`, trap 10C), and there is no
    // reason to rely on it when three top-level keys express the same thing.
    const existing = await req.payload
      .find({
        collection: 'reactions',
        where: { article: { equals: articleId }, fingerprint: { equals: fingerprint } },
        pagination: false,
        depth: 0,
        overrideAccess: true,
        req,
      })
      .catch(() => null)

    const rows = existing?.docs ?? []
    const sameType = rows.find((row) => (row as { type?: unknown }).type === type)

    try {
      if (sameType) {
        // Tapping the current reaction removes it.
        await req.payload.delete({
          collection: 'reactions',
          id: sameType.id,
          overrideAccess: true,
          req,
        })
      } else {
        // A different reaction replaces whatever was there.
        for (const row of rows) {
          await req.payload.delete({
            collection: 'reactions',
            id: row.id,
            overrideAccess: true,
            req,
          })
        }
        await req.payload.create({
          collection: 'reactions',
          // Whitelisted key by key — never a spread of `body`.
          data: {
            article: articleId,
            type,
            fingerprint,
            ...(reader ? { reader } : {}),
          },
          overrideAccess: true,
          req,
        })
      }
    } catch {
      /*
       * The unique index is the real dedupe control, and it can fire here: two
       * concurrent toggles from one browser can both see "no existing row" and
       * both try to insert. That is the database doing its job, not an error the
       * reader caused, so the fresh counts are returned instead of a 500.
       */
    }

    return json({ ok: true, ...(await countsFor(req, articleId, fingerprint)) })
  },
}

/**
 * The aggregate for an article, plus the caller's own reaction.
 *
 * ⚠️ **Read at runtime, never baked into the static HTML.** A count rendered at
 * build time would freeze until the next rebuild, so a reaction would appear to do
 * nothing — the same silent-staleness failure the static frontend has already been
 * bitten by once (`.sps/handoff.md`, "the frontend is STATIC").
 */
const reactionCountsEndpoint: Endpoint = {
  // Relative to the Reactions collection slug → `/api/reactions/counts`.
  path: '/counts',
  method: 'get',
  handler: async (req: PayloadRequest): Promise<Response> => {
    const articleId = Number(new URL(req.url ?? '', 'http://localhost').searchParams.get('article'))
    if (!Number.isInteger(articleId) || articleId <= 0) {
      return json({ error: 'সংবাদটি খুঁজে পাওয়া যায়নি।' }, 400)
    }

    return json(await countsFor(req, articleId, fingerprintOf(req)))
  },
}

export const reactionEndpoints: Endpoint[] = [reactionToggleEndpoint, reactionCountsEndpoint]
