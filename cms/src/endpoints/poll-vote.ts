import { createHmac } from 'node:crypto'
import type { Endpoint, PayloadRequest } from 'payload'

import { clientIp } from '../lib/http'
import { rateLimit } from '../lib/rate-limit'
import { requirePayloadSecret } from '../lib/signed-token'

/**
 * How many vote attempts one IP may make per minute.
 *
 * Set above the realistic human ceiling — a family or a school computer sharing
 * one IP must not be locked out — while still stopping a script. The duplicate
 * guard, not this, is what makes a repeat vote not count.
 */
const MAX_ATTEMPTS_PER_MINUTE = 20

/**
 * POST `/api/polls/:id/vote`
 *
 * Body: `{ optionIndex: number, company?: string }`
 *
 * ## Why a custom endpoint rather than the generated REST API
 *
 * The generated `PATCH /api/polls/:id` would let anyone rewrite the whole poll —
 * the question, the options, the tallies. Voting needs exactly one narrow
 * operation, so it gets exactly one narrow endpoint.
 *
 * ## The abuse guards, in order
 *
 * 1. **Honeypot.** `company` is a field no human sees and no human fills. A
 *    filled honeypot returns a normal-looking success without writing, so a bot
 *    gets no signal that it was caught.
 * 2. **Rate limit.** Per IP, per minute, in-process (`lib/rate-limit.ts`).
 * 3. **Duplicate guard.** A salted hash of IP + user agent, unique per poll. A
 *    repeat vote returns the current tallies with `alreadyVoted: true` — the
 *    reader is told the truth instead of silently having their vote dropped.
 *
 * ## Known limitation, stated rather than hidden
 *
 * The tally update is a read-modify-write, so two simultaneous votes for the
 * same poll can lose one increment. Payload cannot express an atomic
 * `vote_count = vote_count + 1`. For a reader poll on an education portal this
 * is an acceptable trade; it would not be for anything that counted money.
 */
export const pollVoteEndpoint: Endpoint = {
  path: '/:id/vote',
  method: 'post',
  handler: async (req: PayloadRequest): Promise<Response> => {
    // SQLite ids are integers, so reject anything else before it reaches the
    // database — a non-numeric id would otherwise become a string comparison
    // against an integer column and silently match nothing.
    const pollId = Number(req.routeParams?.id)

    if (!Number.isInteger(pollId) || pollId <= 0) {
      return Response.json({ error: 'জরিপের আইডি প্রয়োজন।' }, { status: 400 })
    }

    let body: { optionIndex?: unknown; company?: unknown } = {}
    try {
      body = (await req.json?.()) ?? {}
    } catch {
      return Response.json({ error: 'অনুরোধটি পড়া যায়নি।' }, { status: 400 })
    }

    // 1 — honeypot. Answer as though it worked; write nothing.
    if (typeof body.company === 'string' && body.company.trim() !== '') {
      const poll = await req.payload
        .findByID({ collection: 'polls', id: pollId, depth: 0 })
        .catch(() => null)
      return Response.json({ tallies: talliesOf(poll), total: totalOf(poll), alreadyVoted: false })
    }

    // 2 — rate limit.
    const ip = clientIp(req)
    const limit = rateLimit(`poll-vote:${ip}`, MAX_ATTEMPTS_PER_MINUTE, 60_000)
    if (!limit.ok) {
      return Response.json(
        { error: 'অনেকবার চেষ্টা করা হয়েছে। একটু পরে আবার চেষ্টা করুন।' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
      )
    }

    const optionIndex = Number(body.optionIndex)
    if (!Number.isInteger(optionIndex) || optionIndex < 0) {
      return Response.json({ error: 'বিকল্পটি সঠিক নয়।' }, { status: 400 })
    }

    const poll = await req.payload
      .findByID({ collection: 'polls', id: pollId, depth: 0 })
      .catch(() => null)
    if (!poll) {
      return Response.json({ error: 'জরিপটি পাওয়া যায়নি।' }, { status: 404 })
    }

    const options = Array.isArray(poll.options) ? poll.options : []
    if (optionIndex >= options.length) {
      return Response.json({ error: 'বিকল্পটি সঠিক নয়।' }, { status: 400 })
    }

    // A closed or expired poll accepts no votes — otherwise results keep moving
    // after the result has been published.
    if (poll.isActive === false || isExpired(poll.expiresAt)) {
      return Response.json(
        { error: 'জরিপটি বন্ধ হয়ে গেছে।', tallies: talliesOf(poll), total: totalOf(poll) },
        { status: 409 },
      )
    }

    // 3 — duplicate guard.
    const voterHash = hashVoter(ip, req.headers.get('user-agent') ?? '')

    const existing = await req.payload
      .find({
        collection: 'poll-votes',
        where: { and: [{ poll: { equals: pollId } }, { voterHash: { equals: voterHash } }] },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => null)

    if (existing?.docs?.length) {
      return Response.json({
        tallies: talliesOf(poll),
        total: totalOf(poll),
        alreadyVoted: true,
      })
    }

    try {
      await req.payload.create({
        collection: 'poll-votes',
        data: { poll: pollId, voterHash },
        overrideAccess: true,
      })
    } catch {
      // The unique index rejected it — another request from the same voter won
      // the race. Their vote already counted, so report it as recorded.
      return Response.json({
        tallies: talliesOf(poll),
        total: totalOf(poll),
        alreadyVoted: true,
      })
    }

    const nextOptions = options.map((option, index) =>
      index === optionIndex ? { ...option, voteCount: (option.voteCount ?? 0) + 1 } : option,
    )

    const updated = await req.payload.update({
      collection: 'polls',
      id: pollId,
      data: { options: nextOptions },
      depth: 0,
      overrideAccess: true,
    })

    return Response.json({
      tallies: talliesOf(updated),
      total: totalOf(updated),
      alreadyVoted: false,
    })
  },
}

/**
 * Salted, one-way voter fingerprint.
 *
 * Keyed with `PAYLOAD_SECRET` so the value is not reversible or brute-forceable
 * from a leaked database, and so the same reader hashes differently anywhere
 * else. Deliberately excludes anything that would let the row be joined back to
 * a person.
 *
 * ⚠️ Keyed with the required secret, **never a literal fallback** — see
 * `requirePayloadSecret`. This hash is the whole duplicate-vote guard, so a
 * published key would let anyone cast unlimited distinct votes.
 */
function hashVoter(ip: string, userAgent: string): string {
  return createHmac('sha256', requirePayloadSecret()).update(`${ip}|${userAgent}`).digest('hex')
}

function isExpired(expiresAt: unknown): boolean {
  if (typeof expiresAt !== 'string') return false
  const time = new Date(expiresAt).getTime()
  return !Number.isNaN(time) && time < Date.now()
}

interface PollLike {
  options?: Array<{ voteCount?: number | null }> | null
}

function talliesOf(poll: unknown): number[] {
  const options = (poll as PollLike | null)?.options
  if (!Array.isArray(options)) return []
  return options.map((option) => option.voteCount ?? 0)
}

function totalOf(poll: unknown): number {
  return talliesOf(poll).reduce((sum, count) => sum + count, 0)
}
