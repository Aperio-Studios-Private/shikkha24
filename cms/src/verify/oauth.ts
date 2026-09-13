/**
 * S9 social-login verification — `pnpm --filter @shikkha24/cms verify:oauth`
 *
 * ## What can and cannot be verified here
 *
 * The owner has not created the Google and Meta OAuth apps yet, so **a real
 * consent screen cannot be driven** and this harness does not pretend otherwise.
 * What it verifies is everything that decides whether a login *would* succeed and
 * who a session *is*, which is where the security bugs live:
 *
 *   - with no credentials the whole feature is **inert**: no providers reported,
 *     and `start`/`callback` answer `503` rather than half-working
 *   - a provider is configured only when **both** its values are present
 *   - the `state` token round-trips, and a tampered, expired or
 *     wrong-context token is rejected — the reader-session token is *not* a valid
 *     state and vice versa, which is the context binding working
 *   - the destination carried in the state cannot be an absolute or
 *     protocol-relative URL, so the login flow is not an open redirect
 *   - the auth strategy returns **no user** for a missing, forged or stale cookie
 *   - **a reader is created with no password** — the behaviour that required
 *     `disableLocalStrategy`, and the one thing here that touches the database
 *   - the same provider identity resolves to the same reader on a second login
 *
 * ## It must run with the dev server STOPPED (schema-push collision).
 */

import { getPayload, type PayloadRequest } from 'payload'

import { readerSessionStrategy } from '../auth/reader-strategy'
import { oauthEndpoints } from '../endpoints/oauth'
import {
  authorizeUrl,
  configuredProviders,
  isOAuthConfigured,
  oauthRedirectUri,
  safeNextPath,
  signOAuthState,
  verifyOAuthState,
} from '../lib/oauth'
import { signReaderSession, verifyReaderSession } from '../lib/reader-session'
import config from '../payload.config'

const payload = await getPayload({ config })

let failures = 0
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

/** Slug-agnostic handle — Payload's overloads cannot type a union slug. */
const db = payload as unknown as {
  find(args: Record<string, unknown>): Promise<{ docs: Array<Record<string, unknown>> }>
  delete(args: Record<string, unknown>): Promise<unknown>
}

const stamp = Date.now()
const created: Array<{ collection: string; id: number | string }> = []

function req(query: Record<string, string>, headers: Record<string, string> = {}): PayloadRequest {
  return {
    payload,
    query,
    headers: new Headers(headers),
  } as unknown as PayloadRequest
}

const start = oauthEndpoints.find((e) => e.path === '/oauth/:provider/start')
const callback = oauthEndpoints.find((e) => e.path === '/oauth/:provider/callback')
const providers = oauthEndpoints.find((e) => e.path === '/oauth/providers')

if (!start || !callback || !providers) {
  console.error('OAuth endpoints are not registered — check payload.config.ts.')
  process.exit(1)
}

/** Run an endpoint with a route parameter, which Payload injects at runtime. */
async function hit(
  endpoint: { handler: (r: PayloadRequest) => Promise<Response> | Response },
  query: Record<string, string>,
  routeParams: Record<string, string>,
  headers: Record<string, string> = {},
): Promise<{ status: number; location: string | null; cookies: string[]; body: unknown }> {
  const request = req(query, headers)
  ;(request as { routeParams?: Record<string, string> }).routeParams = routeParams
  const response = await endpoint.handler(request)
  return {
    status: response.status,
    location: response.headers.get('location'),
    cookies: response.headers.getSetCookie?.() ?? [],
    body: await response
      .clone()
      .json()
      .catch(() => null),
  }
}

/* ── inert until configured ────────────────────────────────────────────────── */

console.log('\n── inert until configured ──────────────────────────────────────')

// A harness run must not depend on the machine having credentials, and it must
// prove the unconfigured state rather than skip it. Both halves are cleared
// first so the result is the same on a developer machine and in CI.
const OAUTH_VARS = [
  'GOOGLE_OAUTH_CLIENT_ID',
  'GOOGLE_OAUTH_CLIENT_SECRET',
  'FACEBOOK_OAUTH_CLIENT_ID',
  'FACEBOOK_OAUTH_CLIENT_SECRET',
] as const
const savedEnv = new Map(OAUTH_VARS.map((name) => [name, process.env[name]]))
for (const name of OAUTH_VARS) delete process.env[name]

check('no provider is configured with an empty environment', configuredProviders().length === 0)
check('google reports unconfigured', isOAuthConfigured('google') === false)

const providersResponse = await providers.handler(req({}))
check(
  'the providers endpoint reports an empty list',
  providersResponse.status === 200 &&
    JSON.stringify(await providersResponse.json()) === '{"providers":[]}',
)

const inertStart = await hit(start, { next: '/bookmarks' }, { provider: 'google' })
check(
  'start is refused with 503 while unconfigured',
  inertStart.status === 503,
  `status=${inertStart.status}`,
)

const inertCallback = await hit(callback, { code: 'x', state: 'y' }, { provider: 'google' })
check(
  'callback is refused with 503 while unconfigured',
  inertCallback.status === 503,
  `status=${inertCallback.status}`,
)

const unknown = await hit(start, {}, { provider: 'myspace' })
check('an unknown provider is a 404, not a 503', unknown.status === 404, `status=${unknown.status}`)

/* ── a half-configured provider is unconfigured ────────────────────────────── */

console.log('\n── configuration ───────────────────────────────────────────────')

process.env.GOOGLE_OAUTH_CLIENT_ID = 'verify-client-id'
check(
  'a client id without a secret leaves the provider unconfigured',
  isOAuthConfigured('google') === false,
)

process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'verify-client-secret'
process.env.OAUTH_REDIRECT_BASE = 'https://cms.example.test'
process.env.PUBLIC_SITE_URL = 'https://site.example.test'

check('both values configure the provider', isOAuthConfigured('google') === true)
check('only google is configured', JSON.stringify(configuredProviders()) === '["google"]')
check(
  'the redirect uri is built from OAUTH_REDIRECT_BASE',
  oauthRedirectUri('google') === 'https://cms.example.test/api/oauth/google/callback',
  oauthRedirectUri('google'),
)

const authorize = authorizeUrl('google', 'state-value')
const authorizeUrl_ = new URL(authorize)
check('the authorize url points at Google', authorizeUrl_.host === 'accounts.google.com')
check(
  'it carries our client id',
  authorizeUrl_.searchParams.get('client_id') === 'verify-client-id',
)
check(
  'it carries the exact registered redirect uri',
  authorizeUrl_.searchParams.get('redirect_uri') === oauthRedirectUri('google'),
)
check('it carries the state', authorizeUrl_.searchParams.get('state') === 'state-value')
check(
  'it asks for openid scope',
  authorizeUrl_.searchParams.get('scope') === 'openid email profile',
)

/* ── state ─────────────────────────────────────────────────────────────────── */

console.log('\n── state (the CSRF guard) ──────────────────────────────────────')

const state = signOAuthState('google', '/bookmarks')
const claims = verifyOAuthState(state)
check('a freshly minted state verifies', claims !== null)
check('it names the provider', claims?.provider === 'google')
check('it carries the destination', claims?.next === '/bookmarks')

check('a tampered state is rejected', verifyOAuthState(`${state.slice(0, -1)}x`) === null)
check('an empty state is rejected', verifyOAuthState('') === null)
check('a garbage state is rejected', verifyOAuthState('not-a-token') === null)

const expiredState = signOAuthState('google', '/', Date.now() - 11 * 60 * 1000)
check('an expired state is rejected', verifyOAuthState(expiredState) === null)

check(
  'a reader session token is not a valid state',
  verifyOAuthState(signReaderSession('1')) === null,
)

/* ── the destination cannot leave the site ─────────────────────────────────── */

console.log('\n── open-redirect guard ─────────────────────────────────────────')

check('a site-relative path is kept', safeNextPath('/bookmarks') === '/bookmarks')
check('an absolute url is refused', safeNextPath('https://evil.test/') === '/')
check('a protocol-relative url is refused', safeNextPath('//evil.test/') === '/')
check('an empty destination falls back to root', safeNextPath('') === '/')
check('a missing destination falls back to root', safeNextPath(undefined) === '/')

// The guard must also apply to what the state carries, not only to the raw input.
const sneaky = verifyOAuthState(signOAuthState('google', 'https://evil.test/'))
check('a hostile destination is neutralised inside the state', sneaky?.next === '/')

/* ── session tokens ────────────────────────────────────────────────────────── */

console.log('\n── reader session ──────────────────────────────────────────────')

const session = signReaderSession('4242')
check('a session round-trips to its reader id', verifyReaderSession(session) === '4242')
check('a tampered session is rejected', verifyReaderSession(`${session.slice(0, -1)}x`) === null)
check('a missing session is rejected', verifyReaderSession(undefined) === null)
check('an empty session is rejected', verifyReaderSession('') === null)

const expiredSession = signReaderSession('4242', Date.now() - 31 * 24 * 60 * 60 * 1000)
check('an expired session is rejected', verifyReaderSession(expiredSession) === null)

check(
  'an oauth state is not a valid session',
  verifyReaderSession(signOAuthState('google', '/')) === null,
)

/* ── the auth strategy ─────────────────────────────────────────────────────── */

console.log('\n── auth strategy ───────────────────────────────────────────────')

const noCookie = await readerSessionStrategy.authenticate({
  payload,
  headers: new Headers(),
})
check('no cookie authenticates nobody', noCookie.user === null)

const forged = await readerSessionStrategy.authenticate({
  payload,
  headers: new Headers({ cookie: 'shikkha24_reader=forged.token' }),
})
check('a forged cookie authenticates nobody', forged.user === null)

const unknownReader = await readerSessionStrategy.authenticate({
  payload,
  headers: new Headers({ cookie: `shikkha24_reader=${signReaderSession('99999999')}` }),
})
check('a session naming a deleted reader authenticates nobody', unknownReader.user === null)

/* ── passwordless reader creation ──────────────────────────────────────────── */

console.log('\n── reader creation (no password) ───────────────────────────────')

const providerId = `s9-verify-${stamp}`
const createHandle = payload as unknown as {
  create(args: Record<string, unknown>): Promise<Record<string, unknown>>
}

let readerId: string | number | null = null
try {
  const reader = await createHandle.create({
    collection: 'readers',
    data: {
      displayName: 'যাচাই পাঠক',
      provider: 'google',
      providerId,
      // No email: the case Facebook produces, and the reason the field is
      // optional rather than required.
    },
    overrideAccess: true,
  })
  readerId = reader.id as string | number
  created.push({ collection: 'readers', id: readerId })
} catch (error) {
  check('a reader is created without a password', false, String(error).slice(0, 120))
}

check('a reader is created without a password', readerId !== null, `id=${readerId}`)

const stored = await payload.findByID({
  collection: 'readers',
  id: String(readerId),
  depth: 0,
  overrideAccess: true,
  disableErrors: true,
})
check('the reader was stored with the provider identity', stored?.providerId === providerId)
check('the reader has no password hash', !stored?.hash, `hash=${stored?.hash ?? 'empty'}`)
check('the reader has no email, which is allowed', !stored?.email)

// The identity key is provider + providerId, so a second lookup must find it.
const found = await db.find({
  collection: 'readers',
  where: { and: [{ provider: { equals: 'google' } }, { providerId: { equals: providerId } }] },
  limit: 1,
  overrideAccess: true,
})
check('the identity resolves to exactly one reader', found.docs.length === 1)

// And a session naming it must authenticate.
const liveSession = await readerSessionStrategy.authenticate({
  payload,
  headers: new Headers({ cookie: `shikkha24_reader=${signReaderSession(String(readerId))}` }),
})
check('a valid session authenticates that reader', liveSession.user !== null)
check(
  'the authenticated user names the readers collection',
  (liveSession.user as { collection?: string } | null)?.collection === 'readers',
)

/* ── cleanup ───────────────────────────────────────────────────────────────── */

console.log('\n── cleanup ─────────────────────────────────────────────────────')

for (const { collection, id } of created) {
  await db.delete({ collection, id, overrideAccess: true }).catch(() => null)
}

const leftover = await db.find({
  collection: 'readers',
  where: { providerId: { equals: providerId } },
  overrideAccess: true,
})
check(
  'every test reader was removed',
  leftover.docs.length === 0,
  `remaining=${leftover.docs.length}`,
)

for (const [name, value] of savedEnv) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

console.log(`\n${failures === 0 ? '✅ all checks passed' : `❌ ${failures} check(s) failed`}\n`)
process.exit(failures === 0 ? 0 : 1)
