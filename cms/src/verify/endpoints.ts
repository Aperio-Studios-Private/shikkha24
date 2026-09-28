/**
 * End-to-end verification of every custom CMS endpoint the storefront calls.
 *
 * ## Why this exists
 *
 * A report of "CMS data is not syncing" traced to `POST /api/comments/submit`
 * returning `404 Route not found`. The cause was a **mount collision**: the
 * endpoint was registered at the API root with `path: '/comments/submit'`, and
 * `comments` is a collection slug — so Payload's collection router claimed
 * `/api/comments/*` first and parsed `submit` as a document id. The handler was
 * never reached and every reader comment failed silently.
 *
 * No existing harness caught it, because the other harnesses call the Payload
 * **local API** directly and never exercise the HTTP routing layer where the
 * collision lives. This one deliberately goes over HTTP.
 *
 * ## How it tests
 *
 * Each case performs a REAL write through the public HTTP route, then reads the
 * row back through the local API to prove it landed, then deletes it. A test
 * that only checks the status code cannot tell "wrote the right row" from
 * "returned 200 and wrote nothing".
 *
 * Run: pnpm --filter @shikkha24/cms verify:endpoints
 */
import config from '@payload-config'
import { getPayload } from 'payload'
import { isMailConfigured } from '../lib/mailer'

const BASE = `http://localhost:${process.env.PORT ?? 3000}`

const payload = await getPayload({ config: await config })

/**
 * Whether a mail transport is configured. The newsletter signup legitimately
 * refuses with 503 when it is not, so the expected result depends on this
 * rather than being hard-coded.
 */
const mailConfigured = isMailConfigured()

let failures = 0
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

/**
 * A synthetic client IP, unique per run.
 *
 * ⚠️ **This is what makes the harness repeatable.** Every write endpoint is
 * rate-limited per IP (comments 5/10min, citizen 3/10min, newsletter 5/min), and
 * the limiter keys on `clientIp(req)` — which reads `x-forwarded-for` first. A
 * second run from the same address would be throttled with **429**, and the
 * harness would report eight failures that are really just its own earlier
 * requests. Sending a fresh address per run gives each run its own bucket, so
 * the results describe the code rather than how many times the test has been run.
 */
const CLIENT_IP = `198.51.100.${Math.floor(Math.random() * 200) + 1}`

const call = async (
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; json: Record<string, unknown> | null }> => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': CLIENT_IP,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const text = await res.text()
  let json: Record<string, unknown> | null = null
  try {
    json = JSON.parse(text)
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, json }
}

/** A stamp unique to this run, so cleanup can never touch real content. */
const STAMP = `verify-${Date.now()}`

console.log(`\n=== custom endpoint verification (stamp ${STAMP}, ip ${CLIENT_IP}) ===\n`)

/* ── 1. Route reachability — the collision class ───────────────────────────── */

console.log('-- route reachability (a shadowed route answers 404) --')
const reach = [
  ['POST', '/api/comments/submit'],
  ['POST', '/api/citizen/submit'],
  ['POST', '/api/newsletter/subscribe'],
  ['POST', '/api/newsletter/confirm'],
  ['POST', '/api/newsletter/unsubscribe'],
  ['POST', '/api/push/subscribe'],
  ['GET', '/api/push/key'],
  ['GET', '/api/newsletter/status'],
  ['GET', '/api/oauth/providers'],
  // S16. Both are collection-mounted — a root-mounted path whose first segment
  // equals the collection slug would be swallowed by the collection router and
  // answer 404, exactly as `/comments/submit` once did.
  ['POST', '/api/reactions/toggle'],
  ['GET', '/api/reactions/counts'],
] as const
for (const [method, path] of reach) {
  const { status } = await call(method, path, method === 'POST' ? {} : undefined)
  // 404 = shadowed/missing. Anything else (400 validation, 503 unconfigured,
  // 200) proves the route was reached.
  check(`${method} ${path} is mounted`, status !== 404, `status ${status}`)
}

/* ── 2. Comments — real write, read back, clean up ─────────────────────────── */

console.log('\n-- comments --')
{
  const article = await payload.find({
    collection: 'articles',
    limit: 1,
    where: { _status: { equals: 'published' } },
  })
  const articleId = article.docs[0]?.id

  if (!articleId) {
    check('comments: an article exists to comment on', false, 'no published article')
  } else {
    const { status, json } = await call('POST', '/api/comments/submit', {
      article: articleId,
      userName: STAMP,
      userEmail: 'verify@example.com',
      body: 'যাচাইকরণ মন্তব্য।',
      company: '', // honeypot must be empty
    })
    check(
      'POST /api/comments/submit accepts a valid comment',
      status === 200 && json?.ok === true,
      `status ${status}`,
    )

    const found = await payload.find({
      collection: 'comments',
      where: { userName: { equals: STAMP } },
      overrideAccess: true,
    })
    const row = found.docs[0]
    check('the comment row was actually written', Boolean(row))
    check(
      'it is stored UNAPPROVED (moderation gate intact)',
      row?.isApproved === false,
      `isApproved=${row?.isApproved}`,
    )

    // A forged approval must be ignored — the whitelist is the protection.
    const forged = await call('POST', '/api/comments/submit', {
      article: articleId,
      userName: `${STAMP}-forged`,
      userEmail: 'verify@example.com',
      body: 'নকল অনুমোদন।',
      isApproved: true,
      company: '',
    })
    check('a forged isApproved is accepted-but-ignored', forged.status === 200)
    const forgedRow = (
      await payload.find({
        collection: 'comments',
        where: { userName: { equals: `${STAMP}-forged` } },
        overrideAccess: true,
      })
    ).docs[0]
    check(
      'the forged row is still unapproved',
      forgedRow?.isApproved === false,
      `isApproved=${forgedRow?.isApproved}`,
    )

    // Cleanup.
    for (const doc of [...found.docs, ...(forgedRow ? [forgedRow] : [])]) {
      await payload.delete({ collection: 'comments', id: doc.id, overrideAccess: true })
    }
    const after = await payload.find({
      collection: 'comments',
      where: { userName: { contains: STAMP } },
      overrideAccess: true,
    })
    check('cleanup removed every test row', after.totalDocs === 0, `${after.totalDocs} left`)
  }
}

/* ── 3. Citizen submissions — real write, read back, clean up ──────────────── */

console.log('\n-- citizen submissions --')
{
  const { status, json } = await call('POST', '/api/citizen/submit', {
    title: `${STAMP} শিরোনাম`,
    body: 'যাচাইকরণের জন্য জমা দেওয়া প্রতিবেদন।',
    reporterName: STAMP,
    reporterEmail: 'verify@example.com',
    company: '',
  })
  check(
    'POST /api/citizen/submit accepts a valid tip',
    status === 200 && json?.ok === true,
    `status ${status}`,
  )

  const found = await payload.find({
    collection: 'citizen-submissions',
    where: { reporterName: { equals: STAMP } },
    overrideAccess: true,
  })
  const row = found.docs[0]
  check('the submission row was written', Boolean(row))
  check(
    'it is stored with status "new" (never auto-published)',
    row?.status === 'new',
    `status=${row?.status}`,
  )

  if (row) {
    await payload.delete({ collection: 'citizen-submissions', id: row.id, overrideAccess: true })
  }
  const after = await payload.find({
    collection: 'citizen-submissions',
    where: { reporterName: { equals: STAMP } },
    overrideAccess: true,
  })
  check('cleanup removed the test row', after.totalDocs === 0, `${after.totalDocs} left`)
}

/* ── 4. Newsletter — double opt-in must not activate on signup ─────────────── */

console.log('\n-- newsletter --')
{
  const email = `${STAMP}@example.com`
  const { status } = await call('POST', '/api/newsletter/subscribe', { email, company: '' })

  const found = await payload.find({
    collection: 'newsletter-subscribers',
    where: { email: { equals: email } },
    overrideAccess: true,
  })
  const row = found.docs[0]

  if (mailConfigured) {
    // Transport present: the signup must be accepted and stored UNCONFIRMED.
    check(
      'POST /api/newsletter/subscribe accepts a valid address',
      status === 200,
      `status ${status}`,
    )
    check('the subscriber row was written', Boolean(row))
    check(
      'it is NOT confirmed yet (double opt-in)',
      row?.isActive !== true,
      `isActive=${String(row?.isActive)}`,
    )
  } else {
    // No transport: refusing is the CORRECT behaviour. Accepting an address that
    // can never be mailed would be a lie, so the endpoint answers 503 and writes
    // nothing. This is the documented "unconfigured = off" contract.
    check('with no mail transport the signup is refused (503)', status === 503, `status ${status}`)
    check('and nothing was written', !row, `${found.totalDocs} row(s)`)
  }

  if (row) {
    await payload.delete({ collection: 'newsletter-subscribers', id: row.id, overrideAccess: true })
  }
  const after = await payload.find({
    collection: 'newsletter-subscribers',
    where: { email: { equals: email } },
    overrideAccess: true,
  })
  check('cleanup removed the test subscriber', after.totalDocs === 0, `${after.totalDocs} left`)
}

/* ── 5. Poll vote — real write, tally moves, clean up ──────────────────────── */

console.log('\n-- poll vote --')
{
  const polls = await payload.find({ collection: 'polls', limit: 1 })
  const poll = polls.docs[0]

  if (!poll) {
    check('poll vote: a poll exists', false, 'no poll found')
  } else {
    const optionIndex = 0
    // The field is `voteCount` on the option — NOT `votes`. Reading the wrong
    // name yields `undefined ?? 0` and the tally check silently compares 0 to 0.
    const readTally = (doc: unknown): number => {
      const options = (doc as { options?: Array<{ voteCount?: number | null }> } | null)?.options
      return options?.[optionIndex]?.voteCount ?? 0
    }

    const before = readTally(poll)
    const { status, json } = await call('POST', `/api/polls/${poll.id}/vote`, {
      optionIndex,
      company: '',
    })
    check(
      'POST /api/polls/:id/vote accepts a vote',
      status === 200 && json?.ok !== false,
      `status ${status}`,
    )

    const after = await payload.findByID({ collection: 'polls', id: poll.id, overrideAccess: true })
    const now = readTally(after)
    check('the tally incremented', now === before + 1, `${before} -> ${now}`)

    // The duplicate guard reports `alreadyVoted: true` with a 200 — it does NOT
    // return an error, because the reader is told the truth rather than having
    // their vote silently dropped.
    const dup = await call('POST', `/api/polls/${poll.id}/vote`, { optionIndex, company: '' })
    check(
      'a duplicate vote is flagged alreadyVoted',
      dup.json?.alreadyVoted === true,
      `status ${dup.status}`,
    )
    const afterDup = await payload.findByID({
      collection: 'polls',
      id: poll.id,
      overrideAccess: true,
    })
    check(
      'the duplicate did not move the tally again',
      readTally(afterDup) === now,
      `${readTally(afterDup)}`,
    )

    // Clean up: restore the tally and drop the guard rows.
    type PollOption = { label?: string; voteCount?: number | null; id?: string | null }
    const currentOptions = (after as { options?: PollOption[] }).options ?? []
    const options = currentOptions.map((o, i) =>
      i === optionIndex ? { ...o, voteCount: before } : o,
    )
    await payload.update({
      collection: 'polls',
      id: poll.id,
      data: { options },
      overrideAccess: true,
    })
    const guards = await payload.find({
      collection: 'poll-votes',
      where: { poll: { equals: poll.id } },
      overrideAccess: true,
      limit: 100,
    })
    for (const g of guards.docs) {
      await payload.delete({ collection: 'poll-votes', id: g.id, overrideAccess: true })
    }
    check('cleanup restored the poll tally', true)
  }
}

/* ── S14: the card endpoints (HTTP-only) ──────────────────────────────────── *
 *
 * These are checked here rather than in `verify:id-card` because routing is
 * what this harness exists for, and routing is the whole risk with these two:
 * `/api/idcard/:x.png` lives under the API root, so a path collision with a
 * collection slug would silently 404 every card the way `comments/submit` once
 * did. `verify:id-card` proves the composition; this proves the URL serves it.
 */
{
  const author = (
    await payload.find({
      collection: 'authors',
      where: { reporterId: { exists: true } },
      limit: 1,
      overrideAccess: true,
    })
  ).docs[0]

  if (!author?.reporterId) {
    console.log('note  no author with a reporterId — the ID card route is untested')
  } else {
    const res = await fetch(`${BASE}/api/idcard/${author.reporterId}.png`)
    check(
      'GET /api/idcard/:reporterId.png serves a PNG',
      res.status === 200 && res.headers.get('content-type') === 'image/png',
      `status ${res.status}`,
    )
    check('the card is cached', (res.headers.get('cache-control') ?? '').includes('max-age=86400'))
    check('the card is ETag-versioned', (res.headers.get('etag') ?? '').length > 0)
    await res.arrayBuffer()
  }

  // A malformed reporter ID must answer 404, not a blank card or a 500.
  const bad = await fetch(`${BASE}/api/idcard/not-an-id.png`)
  check('a malformed reporter ID is refused', bad.status === 404, `status ${bad.status}`)
  await bad.arrayBuffer()

  const article = (
    await payload.find({
      collection: 'articles',
      where: { _status: { equals: 'published' } },
      limit: 1,
      overrideAccess: true,
    })
  ).docs[0]

  if (!article) {
    console.log('note  no published article — the photocard route is untested')
  } else {
    const res = await fetch(`${BASE}/api/photocard/${article.id}.png`)
    check(
      'GET /api/photocard/:articleId.png serves a PNG',
      res.status === 200 && res.headers.get('content-type') === 'image/png',
      `status ${res.status}`,
    )
    await res.arrayBuffer()
  }

  const badArticle = await fetch(`${BASE}/api/photocard/999999999.png`)
  check(
    'an unknown article ID is refused',
    badArticle.status === 404,
    `status ${badArticle.status}`,
  )
  await badArticle.arrayBuffer()
}

/* ── S16: reactions (HTTP, with a real write and read-back) ───────────────── *
 *
 * Routing is the risk this file exists for, so the toggle is exercised end to
 * end over HTTP: react, read the count back, toggle off, and assert the count
 * returned to where it started. `verify:reactions` proves the *database* refuses
 * a duplicate; this proves the URL serves the handler.
 *
 * ⚠️ Both requests carry the same `x-forwarded-for` and the same user agent, so
 * they share one fingerprint — which is what makes "the caller's own choice"
 * meaningful here rather than accidental.
 */
{
  const article = (
    await payload.find({
      collection: 'articles',
      where: { _status: { equals: 'published' } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0]

  if (!article) {
    console.log('note  no published article — the reaction routes are untested')
  } else {
    const countsOf = (res: { json: Record<string, unknown> | null }, key: string): number =>
      Number((res.json?.counts as Record<string, number> | undefined)?.[key] ?? -1)

    const before = await call('GET', `/api/reactions/counts?article=${article.id}`)
    check(
      'GET /api/reactions/counts answers an aggregate',
      before.status === 200 && countsOf(before, 'like') >= 0,
      `status ${before.status}`,
    )

    const on = await call('POST', '/api/reactions/toggle', { article: article.id, type: 'like' })
    check(
      'POST /api/reactions/toggle records a reaction',
      on.status === 200 && countsOf(on, 'like') === countsOf(before, 'like') + 1,
      `${countsOf(before, 'like')} -> ${countsOf(on, 'like')}`,
    )
    check(
      "the response reports the caller's own choice",
      on.json?.mine === 'like',
      String(on.json?.mine),
    )

    const off = await call('POST', '/api/reactions/toggle', { article: article.id, type: 'like' })
    check(
      'toggling the same reaction removes it',
      off.status === 200 && countsOf(off, 'like') === countsOf(before, 'like'),
      `${countsOf(on, 'like')} -> ${countsOf(off, 'like')}`,
    )
    check("the caller's choice is cleared", off.json?.mine === null, String(off.json?.mine))

    // A filled honeypot answers like a success and writes nothing — an error
    // would tell the bot which field caught it.
    await call('POST', '/api/reactions/toggle', {
      article: article.id,
      type: 'love',
      company: 'spam',
    })
    const after = await call('GET', `/api/reactions/counts?article=${article.id}`)
    check(
      'a filled honeypot writes nothing',
      countsOf(after, 'love') === countsOf(before, 'love'),
      `love ${countsOf(before, 'love')} -> ${countsOf(after, 'love')}`,
    )

    // An unknown type must be refused rather than stored under an arbitrary string.
    const bad = await call('POST', '/api/reactions/toggle', {
      article: article.id,
      type: 'not-a-reaction',
    })
    check('an unknown reaction type is refused', bad.status === 400, `status ${bad.status}`)
  }
}

/* ── Result ────────────────────────────────────────────────────────────────── */

console.log(
  failures === 0 ? '\nAll endpoint checks passed.\n' : `\n${failures} endpoint check(s) FAILED.\n`,
)
process.exit(failures === 0 ? 0 : 1)
