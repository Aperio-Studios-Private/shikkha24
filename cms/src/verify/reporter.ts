/**
 * S13 reporter-system verification — `pnpm --filter @shikkha24/cms verify:reporter`
 *
 * ## What this proves, and why it is not a UI test
 *
 * S13 introduces a public trust badge ("যাচাইকৃত প্রতিবেদক") and an editor→reporter
 * work queue. Both are only worth anything if the *rules behind them* hold when
 * someone talks to the API directly instead of using the admin panel. So every
 * assertion below is a **negative** one — it tries to do the forbidden thing as a
 * reporter and asserts the write did not take effect.
 *
 * `overrideAccess: false` is the whole point of the file. Payload's local API
 * bypasses access control by default, so a harness that forgets it tests nothing:
 * it would pass identically against a schema with no rules at all. With it, the
 * real `Access` and `FieldAccess` functions run against a real `req.user`.
 *
 * ## The four properties under test
 *
 *   1. a reporter cannot verify **themselves**
 *   2. a reporter cannot read **another** reporter's assignment
 *   3. a reporter cannot **approve** their own assignment
 *   4. a reporter cannot **publish** an article
 *
 * Property 4 is the interesting one: it is the only assertion here that was
 * **false when it was written**. See the `_status` finding in `.sps/handoff.md`.
 *
 * ## It must run with the dev server STOPPED
 *
 * The first run pushes the new `assignments` table and the `authors` columns.
 * Drizzle's push is interactive on a rename and would deadlock against a running
 * server (`.sps/handoff.md` — build trap 4).
 */
import { getPayload, type PayloadRequest } from 'payload'
import { reporterQuickDraftEndpoint } from '../endpoints/reporter'
import config from '../payload.config'

const payload = await getPayload({ config })

/**
 * Payload's per-slug generic overloads fight a harness that spans collections.
 *
 * For a draft-enabled collection (`articles`) it resolves to the `draft: true`
 * overload and demands `draft`; for a collection with a `required` field that
 * merely has a `defaultValue` (`authors.verificationStatus`,
 * `assignments.status`) it demands that field be spelled out even though the
 * database would fill it in. Neither is a real problem with the call — it is the
 * overload set. One confined cast keeps the assertions below readable instead of
 * spreading casts across twenty call sites (the same call `.sps/handoff.md`
 * records for the union-slug cleanup in S1).
 */
type Doc = Record<string, unknown>
const db = payload as unknown as {
  create(args: Record<string, unknown>): Promise<Doc & { id: number | string }>
  update(args: Record<string, unknown>): Promise<Doc>
  find(args: Record<string, unknown>): Promise<{ docs: Array<Doc & { id: number | string }> }>
  delete(args: Record<string, unknown>): Promise<unknown>
}

let failures = 0
const check = (label: string, ok: boolean, detail: unknown = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${String(detail)}` : ''}`)
}

/** Read an ID out of a relationship that may be an ID or a populated document. */
const idOf = (value: unknown): string =>
  String((value as { id?: unknown } | null)?.id ?? value ?? '')

const stamp = Date.now()
const created: Array<{ collection: string; id: number | string }> = []
const track = <T extends { id: number | string }>(collection: string, doc: T): T => {
  created.push({ collection, id: doc.id })
  return doc
}

/**
 * Remove every fixture row — **including when the harness throws**.
 *
 * ⚠️ The `finally` below is not decoration. A harness that dies part-way through
 * leaves its fixtures in the database, and because those fixtures carry real
 * slugs they generate **real pages** on the next build. Three crashed runs
 * during S13 development left `/reporters/verify-a-…` pages in `dist/`, which is
 * how this was noticed. A test that pollutes the thing it is testing is worse
 * than no test at all.
 */
async function cleanupFixtures(): Promise<void> {
  for (const { collection, id } of created.reverse()) {
    try {
      await db.delete({ collection, id })
    } catch {
      console.log(`note: could not clean up ${collection}/${id}`)
    }
  }
}

/**
 * Remove fixtures left behind by a run that died before its `finally`.
 *
 * ⚠️ **Every fixture this harness creates is prefixed `verify-`** (author slugs,
 * category slugs, user emails). That prefix is a reserved namespace — no real
 * content may use it — and it is what makes this purge safe to run
 * unconditionally at startup. Without it, a crashed run's leftovers survive into
 * the next build as real pages: three crashes during S13 development left six
 * `verify-*` authors, nine users, an article and four assignments in the
 * database, and `/reporters/verify-a-…` appeared in `dist/`.
 *
 * Deletion order matters: articles and assignments reference authors, so they go
 * first. Everything goes through the Payload API rather than raw SQL so the
 * version tables and relationship rows cascade correctly.
 */
async function purgeStaleFixtures(): Promise<number> {
  let removed = 0
  const wipe = async (collection: string, id: number | string) => {
    try {
      await db.delete({ collection, id })
      removed += 1
    } catch {
      console.log(`note: stale ${collection}/${id} could not be removed`)
    }
  }

  const staleAuthors = await db.find({
    collection: 'authors',
    where: { slug: { like: 'verify-' } },
    limit: 100,
    overrideAccess: true,
  })
  const authorIds = staleAuthors.docs.map((d) => d.id)

  if (authorIds.length > 0) {
    for (const collection of ['articles', 'assignments']) {
      const field = collection === 'articles' ? 'author' : 'assignedTo'
      const dependents = await db.find({
        collection,
        where: { [field]: { in: authorIds } },
        limit: 100,
        overrideAccess: true,
      })
      for (const d of dependents.docs) await wipe(collection, d.id)
    }
    for (const id of authorIds) await wipe('authors', id)
  }

  const staleUsers = await db.find({
    collection: 'users',
    where: { email: { like: 'verify-' } },
    limit: 100,
    overrideAccess: true,
  })
  for (const u of staleUsers.docs) await wipe('users', u.id)

  const staleCategories = await db.find({
    collection: 'categories',
    where: { slug: { like: 'verify-cat-' } },
    limit: 100,
    overrideAccess: true,
  })
  for (const c of staleCategories.docs) await wipe('categories', c.id)

  return removed
}

// ── Setup ────────────────────────────────────────────────────────────────────
// Setup runs with `overrideAccess` left at its default (true) — it is fixture
// creation, not the thing under test.

const purged = await purgeStaleFixtures()
if (purged > 0) console.log(`note: purged ${purged} stale fixture row(s) from a previous run\n`)

try {
  const admin = track(
    'users',
    await db.create({
      collection: 'users',
      data: {
        email: `verify-admin-${stamp}@example.test`,
        password: 'Verify-admin-1234',
        nameBn: 'যাচাই অ্যাডমিন',
        roles: ['superAdmin'],
      },
    }),
  )

  const authorA = track(
    'authors',
    await db.create({
      collection: 'authors',
      data: {
        nameBn: 'পরীক্ষা প্রতিবেদক ক',
        slug: `verify-a-${stamp}`,
        verificationStatus: 'unverified',
      },
    }),
  )

  const authorB = track(
    'authors',
    await db.create({
      collection: 'authors',
      data: {
        nameBn: 'পরীক্ষা প্রতিবেদক খ',
        slug: `verify-b-${stamp}`,
        verificationStatus: 'unverified',
      },
    }),
  )

  const reporterA = track(
    'users',
    await db.create({
      collection: 'users',
      data: {
        email: `verify-rep-a-${stamp}@example.test`,
        password: 'Verify-rep-1234',
        nameBn: 'প্রতিবেদক ক',
        roles: ['reporter'],
        authorProfile: authorA.id,
      },
    }),
  )

  const reporterB = track(
    'users',
    await db.create({
      collection: 'users',
      data: {
        email: `verify-rep-b-${stamp}@example.test`,
        password: 'Verify-rep-1234',
        nameBn: 'প্রতিবেদক খ',
        roles: ['reporter'],
        authorProfile: authorB.id,
      },
    }),
  )

  // ── 0. reporterId generation ─────────────────────────────────────────────────

  const idPattern = /^SHK-R-\d{4}-\d{4}$/
  check(
    'reporterId is generated in SHK-R-YYYY-NNNN form',
    idPattern.test(String(authorA.reporterId)),
    String(authorA.reporterId ?? '(none)'),
  )
  check(
    'two authors get different reporterIds',
    String(authorA.reporterId) !== String(authorB.reporterId),
    `${authorA.reporterId} vs ${authorB.reporterId}`,
  )

  // ── 1. A reporter cannot verify themselves ───────────────────────────────────

  const selfVerify = await db.update({
    collection: 'authors',
    id: authorA.id,
    data: { verificationStatus: 'verified', validUntil: '2099-12-31' },
    user: reporterA,
    overrideAccess: false,
  })
  check(
    'reporter cannot set their own verificationStatus',
    selfVerify.verificationStatus === 'unverified',
    `got "${selfVerify.verificationStatus}"`,
  )
  check(
    'reporter cannot extend their own validUntil',
    !selfVerify.validUntil,
    String(selfVerify.validUntil ?? '(unset)'),
  )

  // An editor can, and the stamp is derived rather than sent.
  const verified = await db.update({
    collection: 'authors',
    id: authorA.id,
    data: { verificationStatus: 'verified' },
    user: admin,
    overrideAccess: false,
  })
  check('an editor can verify', verified.verificationStatus === 'verified')
  check('verifiedAt is stamped', Boolean(verified.verifiedAt), String(verified.verifiedAt ?? ''))
  check(
    'verifiedBy records the acting editor, not the request body',
    idOf(verified.verifiedBy) === String(admin.id),
    `${idOf(verified.verifiedBy)} vs ${admin.id}`,
  )

  // Re-saving an unrelated field must not move the verification date.
  const before = String(verified.verifiedAt)
  const resaved = await db.update({
    collection: 'authors',
    id: authorA.id,
    data: { bio: 'পরীক্ষামূলক পরিচিতি' },
    user: admin,
    overrideAccess: false,
  })
  check('re-saving does not re-stamp verifiedAt', String(resaved.verifiedAt) === before)

  // ── 2. Assignment read scoping ───────────────────────────────────────────────

  const asgA = track(
    'assignments',
    await db.create({
      collection: 'assignments',
      data: { title: 'ক-এর কাজ', assignedTo: authorA.id, dueAt: '2026-12-31T12:00:00.000Z' },
      user: admin,
      overrideAccess: false,
    }),
  )

  // Created only to prove reporter A cannot see it; the handle is not needed.
  track(
    'assignments',
    await db.create({
      collection: 'assignments',
      data: { title: 'খ-এর কাজ', assignedTo: authorB.id },
      user: admin,
      overrideAccess: false,
    }),
  )

  check(
    'assignedBy is stamped from the acting editor',
    idOf((asgA as { assignedBy?: unknown }).assignedBy) === String(admin.id),
    idOf((asgA as { assignedBy?: unknown }).assignedBy),
  )

  const seenByA = await db.find({
    collection: 'assignments',
    user: reporterA,
    overrideAccess: false,
  })
  check(
    'reporter A sees exactly their own assignment',
    seenByA.docs.length === 1 && String(seenByA.docs[0]?.id) === String(asgA.id),
    `${seenByA.docs.length} row(s): ${seenByA.docs.map((d) => d.id).join(', ')}`,
  )

  const seenByB = await db.find({
    collection: 'assignments',
    user: reporterB,
    overrideAccess: false,
  })
  check(
    'reporter B cannot see reporter A’s assignment',
    seenByB.docs.every((d) => String(d.id) !== String(asgA.id)),
    `${seenByB.docs.length} row(s)`,
  )

  const seenByAdmin = await db.find({
    collection: 'assignments',
    user: admin,
    overrideAccess: false,
  })
  check(
    'the desk sees the whole board',
    seenByAdmin.docs.length >= 2,
    `${seenByAdmin.docs.length} row(s)`,
  )

  // ── 3. A reporter cannot approve their own assignment ────────────────────────

  let approveBlocked = false
  try {
    await db.update({
      collection: 'assignments',
      id: asgA.id,
      data: { status: 'approved' },
      user: reporterA,
      overrideAccess: false,
    })
  } catch {
    approveBlocked = true
  }
  check('reporter cannot set status=approved', approveBlocked)

  let rejectBlocked = false
  try {
    await db.update({
      collection: 'assignments',
      id: asgA.id,
      data: { status: 'rejected' },
      user: reporterA,
      overrideAccess: false,
    })
  } catch {
    rejectBlocked = true
  }
  check('reporter cannot set status=rejected', rejectBlocked)

  // …but they can move their own work forward.
  const accepted = await db.update({
    collection: 'assignments',
    id: asgA.id,
    data: { status: 'accepted' },
    user: reporterA,
    overrideAccess: false,
  })
  check('reporter can accept their own assignment', accepted.status === 'accepted', accepted.status)

  // …and cannot reassign it to someone else.
  const reassigned = await db.update({
    collection: 'assignments',
    id: asgA.id,
    data: { assignedTo: authorB.id },
    user: reporterA,
    overrideAccess: false,
  })
  check(
    'reporter cannot reassign work to a colleague',
    idOf(reassigned.assignedTo) === String(authorA.id),
    idOf(reassigned.assignedTo),
  )

  // An editor can approve.
  const approved = await db.update({
    collection: 'assignments',
    id: asgA.id,
    data: { status: 'approved' },
    user: admin,
    overrideAccess: false,
  })
  check('an editor can approve', approved.status === 'approved', approved.status)

  // ── 4. A reporter cannot publish ─────────────────────────────────────────────

  /*
   * An Article requires a category, an author and an excerpt. Borrow the first
   * seeded category — this harness is testing who may publish, not content.
   */
  const categoryList = await db.find({ collection: 'categories', limit: 1, overrideAccess: true })
  const categoryId =
    categoryList.docs[0]?.id ??
    track(
      'categories',
      await db.create({
        collection: 'categories',
        data: { nameBn: `যাচাই বিভাগ ${stamp}`, slug: `verify-cat-${stamp}` },
      }),
    ).id

  const draft = track(
    'articles',
    await db.create({
      collection: 'articles',
      data: {
        title: `যাচাইয়ের খসড়া ${stamp}`,
        excerpt: 'পরীক্ষামূলক সংক্ষিপ্তসার — শুধু যাচাইয়ের জন্য।',
        category: categoryId,
        author: authorA.id,
        reviewStatus: 'draft',
        _status: 'draft',
      },
      user: reporterA,
      overrideAccess: false,
    }),
  )

  /*
   * Publishing is the one action the guard **throws** on rather than silently
   * stripping, so this asserts a rejection. That is deliberate: a stripped write
   * returns 200 and leaves the reporter believing the story went live.
   */
  let publishBlocked = false
  try {
    await db.update({
      collection: 'articles',
      id: draft.id,
      data: { _status: 'published' },
      user: reporterA,
      overrideAccess: false,
    })
  } catch {
    publishBlocked = true
  }
  check('reporter cannot publish their own article', publishBlocked)

  // …and the row must genuinely still be a draft, not merely have thrown.
  const afterPublishAttempt = await db.find({
    collection: 'articles',
    where: { id: { equals: draft.id } },
    limit: 1,
    overrideAccess: true,
  })
  check(
    'the article is still a draft after the blocked publish',
    (afterPublishAttempt.docs[0] as { _status?: string } | undefined)?._status !== 'published',
    `_status = "${(afterPublishAttempt.docs[0] as { _status?: string } | undefined)?._status}"`,
  )

  const attemptedApprove = await db.update({
    collection: 'articles',
    id: draft.id,
    data: { reviewStatus: 'approved' },
    user: reporterA,
    overrideAccess: false,
  })
  check(
    'reporter cannot self-approve reviewStatus',
    attemptedApprove.reviewStatus !== 'approved',
    `reviewStatus = "${attemptedApprove.reviewStatus}"`,
  )

  const submitted = await db.update({
    collection: 'articles',
    id: draft.id,
    data: { reviewStatus: 'pendingReview' },
    user: reporterA,
    overrideAccess: false,
  })
  check(
    'reporter CAN send their own article for review',
    submitted.reviewStatus === 'pendingReview',
    submitted.reviewStatus,
  )

  /*
   * The other half of the counter-proof: the guard must not be so broad that it
   * blocks the editor it exists to protect. A rule that denies everyone passes
   * every negative test above and is still broken.
   */
  const publishedByEditor = await db.update({
    collection: 'articles',
    id: draft.id,
    data: { _status: 'published', reviewStatus: 'approved' },
    user: admin,
    overrideAccess: false,
  })
  check(
    'an editor CAN publish the same article',
    publishedByEditor._status === 'published',
    `_status = "${publishedByEditor._status}"`,
  )

  // ── 5. The quick-draft endpoint ─────────────────────────────────────────────
  /*
   * The mobile form posts here, and it is the one place a reporter can *create*
   * something. The generated `POST /api/articles` accepts every writable field,
   * so the whole point of this endpoint is that it does not — the body is built
   * key by key from a whitelist.
   *
   * So the assertions are about what a hostile body **cannot** do, which is the
   * only thing that distinguishes this handler from the generated route.
   */

  const callQuickDraft = async (user: unknown, body: unknown) => {
    const request = {
      payload,
      user,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => body,
    } as unknown as PayloadRequest

    const response = await (
      reporterQuickDraftEndpoint.handler as (r: PayloadRequest) => Promise<Response>
    )(request)
    return { status: response.status, body: (await response.json()) as Record<string, unknown> }
  }

  const validDraft = {
    title: `দ্রুত খসড়া ${stamp}`,
    excerpt: 'পরীক্ষামূলক সংক্ষিপ্তসার।',
    category: categoryId,
    body: 'প্রথম অনুচ্ছেদ।\n\nদ্বিতীয় অনুচ্ছেদ।',
  }

  const anonymous = await callQuickDraft(null, validDraft)
  check(
    'quick-draft rejects an anonymous caller',
    anonymous.status === 401,
    String(anonymous.status),
  )

  // A hostile body: publish, break the news, claim a byline, self-approve.
  const hostile = await callQuickDraft(reporterA, {
    ...validDraft,
    _status: 'published',
    isBreaking: true,
    isLead: true,
    reviewStatus: 'approved',
    author: authorB.id,
    publishedAt: '2000-01-01T00:00:00.000Z',
  })
  check('quick-draft accepts a well-formed body', hostile.status === 201, String(hostile.status))

  const quickDraftId = hostile.body.id
  if (quickDraftId !== undefined) track('articles', { id: quickDraftId as number | string })

  const stored = quickDraftId
    ? ((
        await db.find({
          collection: 'articles',
          where: { id: { equals: quickDraftId } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })
      ).docs[0] as Record<string, unknown> | undefined)
    : undefined

  check('the created draft is NOT published', stored?._status === 'draft', String(stored?._status))
  check(
    'the created draft is NOT approved',
    stored?.reviewStatus === 'draft',
    String(stored?.reviewStatus),
  )
  check('isBreaking was ignored', stored?.isBreaking !== true, String(stored?.isBreaking))
  check('isLead was ignored', stored?.isLead !== true, String(stored?.isLead))
  check(
    'publishedAt was ignored (not backdated to the body value)',
    String(stored?.publishedAt ?? '') !== '2000-01-01T00:00:00.000Z',
    String(stored?.publishedAt ?? '(unset)'),
  )
  check(
    'the byline is the reporter’s OWN profile, not the one in the body',
    idOf(stored?.author) === String(authorA.id),
    `${idOf(stored?.author)} (body asked for ${authorB.id})`,
  )

  // A body missing a required field must be refused, not silently half-created.
  const incomplete = await callQuickDraft(reporterA, { title: 'শুধু শিরোনাম' })
  check(
    'quick-draft refuses an incomplete body',
    incomplete.status === 400,
    String(incomplete.status),
  )

  // A non-numeric category must be rejected rather than coerced.
  const badCategory = await callQuickDraft(reporterA, { ...validDraft, category: { evil: true } })
  check(
    'quick-draft refuses a non-scalar category',
    badCategory.status === 400,
    String(badCategory.status),
  )

  // ── Cleanup ──────────────────────────────────────────────────────────────────
} finally {
  await cleanupFixtures()
}

console.log(
  failures === 0
    ? `\nAll S13 reporter-system checks passed (${created.length} fixture rows created and removed).`
    : `\n${failures} S13 reporter-system check(s) FAILED.`,
)
process.exit(failures === 0 ? 0 : 1)
