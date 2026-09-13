/**
 * S9 engagement-endpoint verification — `pnpm --filter @shikkha24/cms verify:engagement`
 *
 * ## Why this drives the endpoint handlers directly
 *
 * Every assertion here is about a **guard**, and a guard that is only exercised
 * through a browser is a guard nobody has tested. The three public write
 * endpoints (`comments`, `citizen`, `newsletter`) each need a `PayloadRequest`
 * with a body, a header set and a `payload` handle — which is exactly what the
 * stub below provides. Nothing is mocked except the request envelope; the real
 * handler, the real rate limiter and the real database all run.
 *
 * ## The assertion that matters most
 *
 * `overrideAccess: true` bypasses Payload's field-level access control, and all
 * three handlers must use it because there is no user session to run access
 * control against. That means **the field-level `isApproved` / `status`
 * restriction is not protecting anything at these call sites** — the whitelist
 * inside each handler is. So this harness posts `isApproved: true` and
 * `status: 'published'` and asserts the stored row ignores both. If that ever
 * regresses, an anonymous caller could publish their own comment or their own
 * news tip, and no other test in the project would notice.
 *
 * ## Rate limits are keyed per IP
 *
 * The limiter is module-global, so each case uses its own `x-forwarded-for`
 * value — otherwise one case would exhaust the allowance of the next and the
 * failure would look like a bug in the handler.
 *
 * ## It must run with the dev server STOPPED (schema-push collision).
 */
import { getPayload, type PayloadRequest } from 'payload'
import { citizenSubmitEndpoint } from '../endpoints/citizen'
import { commentSubmitEndpoint } from '../endpoints/comments'
import { newsletterEndpoints } from '../endpoints/newsletter'
import config from '../payload.config'

const payload = await getPayload({ config })

let failures = 0
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

const created: Array<{ collection: string; id: number | string }> = []

/**
 * Payload's per-slug overloads cannot type a union slug, so cleanup goes through
 * one confined cast rather than a cast per call (`.sps/handoff.md`, S1 finding 4).
 */
const cleanupHandle = payload as unknown as {
  delete(args: Record<string, unknown>): Promise<unknown>
}

/** A request envelope with just the four things the handlers touch. */
function req(body: unknown, ip: string): PayloadRequest {
  return {
    payload,
    headers: new Headers({ 'x-forwarded-for': ip, 'content-type': 'application/json' }),
    json: async () => body,
  } as unknown as PayloadRequest
}

const stamp = Date.now()

/** POST to a handler and read its JSON body back. */
async function post(
  endpoint: { handler: (r: PayloadRequest) => Promise<Response> | Response },
  body: unknown,
  ip: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await endpoint.handler(req(body, ip))
  const parsed = (await response.json().catch(() => ({}))) as Record<string, unknown>
  return { status: response.status, body: parsed }
}

const article = await payload.find({ collection: 'articles', limit: 1, overrideAccess: true })
const articleId = article.docs[0]?.id

if (!articleId) {
  console.error('No article in the database — run `pnpm seed && pnpm seed:demo` first.')
  process.exit(1)
}

/* ── comments ──────────────────────────────────────────────────────────────── */

console.log('\n── comments endpoint ───────────────────────────────────────────')

const honeypot = await post(
  commentSubmitEndpoint,
  { article: articleId, userName: 'বট', body: 'স্প্যাম', company: 'filled' },
  '10.0.0.1',
)
check('a filled honeypot answers success', honeypot.status === 200 && honeypot.body.ok === true)

const afterHoneypot = await payload.find({
  collection: 'comments',
  where: { body: { equals: 'স্প্যাম' } },
  overrideAccess: true,
})
check('a filled honeypot writes nothing', afterHoneypot.totalDocs === 0)

const forged = await post(
  commentSubmitEndpoint,
  {
    article: articleId,
    userName: `s9-verify-${stamp}`,
    body: `s9-verify comment ${stamp}`,
    isApproved: true,
  },
  '10.0.0.2',
)
check('a valid comment is accepted', forged.status === 200, `status=${forged.status}`)

const stored = await payload.find({
  collection: 'comments',
  where: { body: { equals: `s9-verify comment ${stamp}` } },
  overrideAccess: true,
})
const storedComment = stored.docs[0] as { id: number | string; isApproved?: boolean } | undefined
if (storedComment) created.push({ collection: 'comments', id: storedComment.id })
check('the comment was stored', Boolean(storedComment))
check(
  'a forged isApproved:true is ignored — the row is pending',
  storedComment?.isApproved === false,
  `isApproved=${storedComment?.isApproved}`,
)

const missing = await post(commentSubmitEndpoint, { article: articleId, userName: 'x' }, '10.0.0.3')
check('a comment with no body is refused', missing.status === 400, `status=${missing.status}`)

const orphan = await post(
  commentSubmitEndpoint,
  { article: 999999, userName: 'x', body: 'y' },
  '10.0.0.4',
)
check(
  'a comment on a nonexistent article is refused',
  orphan.status === 404,
  `status=${orphan.status}`,
)

let limited = 0
for (let i = 0; i < 7; i += 1) {
  const attempt = await post(
    commentSubmitEndpoint,
    { article: articleId, userName: 'x', body: `rate ${i}` },
    '10.0.0.5',
  )
  if (attempt.status === 429) limited += 1
  if (attempt.status === 200) {
    const row = await payload.find({
      collection: 'comments',
      where: { body: { equals: `rate ${i}` } },
      overrideAccess: true,
    })
    for (const doc of row.docs) created.push({ collection: 'comments', id: doc.id })
  }
}
check('the comment rate limit engages within seven attempts', limited > 0, `429s=${limited}`)

/* ── citizen submissions ───────────────────────────────────────────────────── */

console.log('\n── citizen submissions endpoint ────────────────────────────────')

const citizenHoneypot = await post(
  citizenSubmitEndpoint,
  { title: 'x', body: 'y', reporterName: 'z', reporterEmail: 'a@b.co', company: 'filled' },
  '10.1.0.1',
)
check('a filled honeypot answers success', citizenHoneypot.status === 200)

const citizen = await post(
  citizenSubmitEndpoint,
  {
    title: `s9-verify ${stamp}`,
    body: 'পরীক্ষামূলক জমা',
    reporterName: 'পরীক্ষক',
    reporterEmail: `s9-verify-${stamp}@example.invalid`,
    status: 'published',
  },
  '10.1.0.2',
)
check('a valid submission is accepted', citizen.status === 200, `status=${citizen.status}`)

const storedCitizen = await payload.find({
  collection: 'citizen-submissions',
  where: { title: { equals: `s9-verify ${stamp}` } },
  overrideAccess: true,
})
const citizenRow = storedCitizen.docs[0] as { id: number | string; status?: string } | undefined
if (citizenRow) created.push({ collection: 'citizen-submissions', id: citizenRow.id })
check(
  'a forged status:published is ignored — the row is queued as new',
  citizenRow?.status === 'new',
  `status=${citizenRow?.status}`,
)

const badEmail = await post(
  citizenSubmitEndpoint,
  { title: 'x', body: 'y', reporterName: 'z', reporterEmail: 'not-an-email' },
  '10.1.0.3',
)
check('an invalid reporter email is refused', badEmail.status === 400, `status=${badEmail.status}`)

/* ── newsletter ────────────────────────────────────────────────────────────── */

console.log('\n── newsletter endpoints ────────────────────────────────────────')

const subscribe = newsletterEndpoints.find((e) => e.path === '/newsletter/subscribe')
const send = newsletterEndpoints.find((e) => e.path === '/newsletter/send')
const status = newsletterEndpoints.find((e) => e.path === '/newsletter/status')

if (!subscribe || !send || !status) {
  console.error('Newsletter endpoints are not registered — check payload.config.ts.')
  process.exit(1)
}

const subHoneypot = await post(
  subscribe,
  { email: 'bot@example.invalid', company: 'filled' },
  '10.2.0.1',
)
check('a filled honeypot answers success', subHoneypot.status === 200)
const botRow = await payload.find({
  collection: 'newsletter-subscribers',
  where: { email: { equals: 'bot@example.invalid' } },
  overrideAccess: true,
})
check('a honeypotted signup writes nothing', botRow.totalDocs === 0)

const badSignup = await post(subscribe, { email: 'nope' }, '10.2.0.2')
check('an invalid address is refused', badSignup.status === 400, `status=${badSignup.status}`)

// SMTP is not configured in this environment, so the endpoint must say so
// rather than accept an address that can never be mailed.
delete process.env.SMTP_HOST
delete process.env.SMTP_FROM_EMAIL
const unconfigured = await post(subscribe, { email: 'real@example.invalid' }, '10.2.0.3')
check(
  'signup is refused with 503 while SMTP is unconfigured',
  unconfigured.status === 503,
  `status=${unconfigured.status}`,
)
const realRow = await payload.find({
  collection: 'newsletter-subscribers',
  where: { email: { equals: 'real@example.invalid' } },
  overrideAccess: true,
})
check('a refused signup writes nothing', realRow.totalDocs === 0)

// The send trigger must be closed when no token is configured.
delete process.env.NEWSLETTER_SEND_TOKEN
const noToken = await post(send, { campaignId: 1 }, '10.2.0.4')
check(
  'the send trigger refuses an unauthenticated call',
  noToken.status === 403,
  `status=${noToken.status}`,
)

process.env.NEWSLETTER_SEND_TOKEN = 'verify-token'
const wrongToken = await post(send, { campaignId: 1, token: 'nope' }, '10.2.0.5')
check(
  'the send trigger refuses a wrong token',
  wrongToken.status === 403,
  `status=${wrongToken.status}`,
)

const statusResponse = await status.handler(req({}, '10.2.0.6') as PayloadRequest)
const statusBody = (await statusResponse.json()) as { sendTriggerEnabled?: boolean }
check('the status endpoint reports the trigger as enabled', statusBody.sendTriggerEnabled === true)

/* ── cleanup ───────────────────────────────────────────────────────────────── */

console.log('\n── cleanup ─────────────────────────────────────────────────────')

for (const { collection, id } of created) {
  await cleanupHandle.delete({ collection, id, overrideAccess: true }).catch(() => null)
}

const leftoverComments = await payload.find({
  collection: 'comments',
  where: { userName: { equals: 'x' } },
  overrideAccess: true,
})
for (const doc of leftoverComments.docs) {
  await payload
    .delete({ collection: 'comments', id: doc.id, overrideAccess: true })
    .catch(() => null)
}
const finalComments = await payload.find({
  collection: 'comments',
  where: { body: { like: 's9-verify' } },
  overrideAccess: true,
})
check(
  'every test comment was removed',
  finalComments.totalDocs === 0,
  `remaining=${finalComments.totalDocs}`,
)

const finalCitizen = await payload.find({
  collection: 'citizen-submissions',
  where: { title: { like: 's9-verify' } },
  overrideAccess: true,
})
check(
  'every test submission was removed',
  finalCitizen.totalDocs === 0,
  `remaining=${finalCitizen.totalDocs}`,
)

console.log(`\n${failures === 0 ? '✅ all checks passed' : `❌ ${failures} check(s) failed`}\n`)
process.exit(failures === 0 ? 0 : 1)
