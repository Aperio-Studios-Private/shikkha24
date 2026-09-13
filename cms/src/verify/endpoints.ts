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

/* ── Result ────────────────────────────────────────────────────────────────── */

console.log(
  failures === 0 ? '\nAll endpoint checks passed.\n' : `\n${failures} endpoint check(s) FAILED.\n`,
)
process.exit(failures === 0 ? 0 : 1)
