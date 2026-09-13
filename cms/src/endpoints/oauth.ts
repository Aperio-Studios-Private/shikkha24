import type { Endpoint, PayloadRequest } from 'payload'

import { json } from '../lib/http'
import {
  authorizeUrl,
  configuredProviders,
  exchangeCodeForProfile,
  isOAuthConfigured,
  isOAuthProvider,
  OAUTH_STATE_COOKIE,
  type OAuthProfile,
  oauthStateClearCookie,
  oauthStateSetCookie,
  postLoginUrl,
  safeNextPath,
  signOAuthState,
  verifyOAuthState,
} from '../lib/oauth'
import {
  READER_SESSION_COOKIE,
  readerSessionClearCookie,
  readerSessionSetCookie,
  signReaderSession,
  verifyReaderSession,
} from '../lib/reader-session'
import { readCookie } from '../lib/signed-token'

/**
 * Social login endpoints — `/api/oauth/*`.
 *
 * ## The flow
 *
 *   1. `GET /api/oauth/providers`   — which providers are usable (build-time)
 *   2. `GET /api/oauth/:p/start`    — set a signed state cookie, redirect out
 *   3. `GET /api/oauth/:p/callback` — verify state, exchange the code, upsert the
 *                                     reader, set the session cookie, redirect home
 *   4. `POST /api/oauth/logout`     — clear the session cookie
 *   5. `GET /api/oauth/me`          — who is signed in, for the frontend
 *
 * ## Two guards, both load-bearing
 *
 * **`state`** is a signed token, set as a cookie by `start` and required to match
 * the query parameter on `callback`. Without it, an attacker can hand a reader a
 * crafted `code` and silently sign them into the attacker's account — login CSRF.
 *
 * **The destination** is carried *inside* the signed state, not in a plain query
 * parameter. A `?next=` that the reader can edit turns the login flow into an
 * open redirect, which is a phishing primitive. `safeNextPath` additionally
 * refuses anything that is not site-relative, so `//evil.com` is rejected too.
 *
 * ## Nothing here is reachable without credentials
 *
 * Every route answers `503` when its provider has no client id and secret, so a
 * half-configured deploy fails visibly at the endpoint rather than halfway
 * through a consent screen.
 */

/** A redirect back to the site carrying a machine-readable reason. */
function redirectBack(next: string, extraCookies: string[] = []): Response {
  const headers = new Headers({ Location: postLoginUrl(next) })
  for (const cookie of extraCookies) headers.append('Set-Cookie', cookie)
  return new Response(null, { status: 302, headers })
}

/** The failure path: back to the site with a reason, and the state cookie gone. */
function redirectFailure(reason: string): Response {
  return redirectBack(`/?login=${reason}`, [oauthStateClearCookie()])
}

function providerOf(req: PayloadRequest): string {
  return String(req.routeParams?.provider ?? '')
}

function queryString(req: PayloadRequest, key: string): string | null {
  const value = req.query?.[key]
  return typeof value === 'string' && value !== '' ? value : null
}

/* ── Providers ───────────────────────────────────────────────────────────── */

const providers: Endpoint = {
  path: '/oauth/providers',
  method: 'get',
  /**
   * Which providers can complete a login right now.
   *
   * The frontend calls this at **build time** and renders the login control only
   * for what comes back — which is what keeps "no button that cannot work" true
   * without duplicating the credential list into a second env var that could
   * drift from this one.
   */
  handler: async (): Promise<Response> => json({ providers: configuredProviders() }),
}

/* ── Start ───────────────────────────────────────────────────────────────── */

const start: Endpoint = {
  path: '/oauth/:provider/start',
  method: 'get',
  handler: async (req: PayloadRequest): Promise<Response> => {
    const provider = providerOf(req)

    // An unknown provider is a 404; a known-but-unconfigured one is a 503. The
    // distinction matters when debugging a deploy.
    if (!isOAuthProvider(provider)) return json({ error: 'অজানা প্রোভাইডার।' }, 404)
    if (!isOAuthConfigured(provider)) {
      return json({ error: 'এই প্রোভাইডারটি এখনো কনফিগার করা হয়নি।' }, 503)
    }

    const next = safeNextPath(queryString(req, 'next'))
    const state = signOAuthState(provider, next)

    const headers = new Headers({ Location: authorizeUrl(provider, state) })
    headers.append('Set-Cookie', oauthStateSetCookie(state))
    return new Response(null, { status: 302, headers })
  },
}

/* ── Callback ────────────────────────────────────────────────────────────── */

/**
 * A slug-agnostic view of `create`, confined to this one call.
 *
 * Payload's `create` is **overloaded per collection slug**, and for `readers` the
 * overload that matches falls through to the draft variant and then demands
 * `draft: true`. The same cast is used by the seeds and harnesses for the same
 * reason (S1 finding 4). It is safe here because the payload is built from
 * `shared`, which names only fields `Readers` declares.
 */
interface ReadersCreateHandle {
  create(args: Record<string, unknown>): Promise<Record<string, unknown>>
}

/**
 * Find or create the reader behind a provider profile.
 *
 * Identity is `provider` + `providerId`, never the email — an address can be
 * changed at the provider, and one address can belong to two provider identities
 * that we deliberately do not merge (see `collections/Readers.ts`).
 *
 * @returns The reader id, or `null` if the write failed.
 */
async function upsertReader(req: PayloadRequest, profile: OAuthProfile): Promise<string | null> {
  const existing = await req.payload.find({
    collection: 'readers',
    where: {
      and: [
        { provider: { equals: profile.provider } },
        { providerId: { equals: profile.providerId } },
      ],
    },
    limit: 1,
    depth: 0,
    // The reader is not signed in yet — there is no session to authorise this
    // read against, and the lookup is by provider id, not by anything the
    // caller supplied. See `auth/reader-strategy.ts` for the same argument.
    overrideAccess: true,
    req,
  })

  // A provider may return no email; the field is optional for exactly that case.
  const shared = {
    displayName: profile.displayName,
    provider: profile.provider,
    providerId: profile.providerId,
    ...(profile.email ? { email: profile.email } : {}),
    ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
  }

  const found = existing.docs[0]
  if (found) {
    // Refresh the name and avatar — providers change both, and a stale avatar on
    // a comment reads as someone else's account.
    await req.payload.update({
      collection: 'readers',
      id: found.id,
      data: shared,
      overrideAccess: true,
      req,
    })
    return String(found.id)
  }

  const created = await (req.payload as unknown as ReadersCreateHandle).create({
    collection: 'readers',
    data: shared,
    overrideAccess: true,
    req,
  })
  return String(created.id)
}

const callback: Endpoint = {
  path: '/oauth/:provider/callback',
  method: 'get',
  handler: async (req: PayloadRequest): Promise<Response> => {
    const provider = providerOf(req)

    if (!isOAuthProvider(provider)) return json({ error: 'অজানা প্রোভাইডার।' }, 404)
    if (!isOAuthConfigured(provider)) {
      return json({ error: 'এই প্রোভাইডারটি এখনো কনফিগার করা হয়নি।' }, 503)
    }

    // The reader tapped "cancel" on the consent screen. Not an error worth a
    // stack trace — send them back with a neutral message.
    if (queryString(req, 'error')) return redirectFailure('cancelled')

    const code = queryString(req, 'code')
    const queryState = queryString(req, 'state')
    const cookieState = readCookie(req.headers.get('cookie'), OAUTH_STATE_COOKIE)

    // Double submit: the state must be present in both places and identical.
    // A mismatch means either a forged callback or a stale tab.
    if (!code || !queryState || !cookieState || queryState !== cookieState) {
      return redirectFailure('invalid')
    }

    const claims = verifyOAuthState(queryState)
    if (!claims || claims.provider !== provider) return redirectFailure('invalid')

    const profile = await exchangeCodeForProfile(provider, code)
    if (!profile) return redirectFailure('failed')

    const readerId = await upsertReader(req, profile)
    if (!readerId) return redirectFailure('failed')

    return redirectBack(claims.next, [
      oauthStateClearCookie(),
      readerSessionSetCookie(signReaderSession(readerId)),
    ])
  },
}

/* ── Session ─────────────────────────────────────────────────────────────── */

const me: Endpoint = {
  path: '/oauth/me',
  method: 'get',
  /**
   * Who the session cookie names, or `null`.
   *
   * Deliberately narrow: a reader's own id, display name and avatar, never the
   * email and never the provider id. The frontend needs the first three to show
   * a signed-in state, and has no use for the others.
   */
  handler: async (req: PayloadRequest): Promise<Response> => {
    const readerId = verifyReaderSession(
      readCookie(req.headers.get('cookie'), READER_SESSION_COOKIE),
    )
    if (!readerId) return json({ reader: null })

    try {
      const reader = await req.payload.findByID({
        collection: 'readers',
        id: readerId,
        depth: 0,
        overrideAccess: true,
        disableErrors: true,
      })
      if (!reader) return json({ reader: null })

      return json({
        reader: {
          id: reader.id,
          displayName: reader.displayName,
          avatarUrl: reader.avatarUrl ?? null,
          provider: reader.provider ?? null,
        },
      })
    } catch {
      return json({ reader: null })
    }
  },
}

const logout: Endpoint = {
  path: '/oauth/logout',
  method: 'post',
  /**
   * Clear the session cookie.
   *
   * There is no server-side session to destroy — the cookie *is* the session, and
   * it is signed rather than stored. Clearing it is therefore complete, and a
   * copy of the token taken before logout would still verify until it expires.
   * That is the standard trade-off for stateless sessions and is why the TTL is
   * 30 days rather than "forever".
   */
  handler: async (): Promise<Response> => {
    const headers = new Headers({ 'Content-Type': 'application/json' })
    headers.append('Set-Cookie', readerSessionClearCookie())
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
  },
}

export const oauthEndpoints: Endpoint[] = [providers, start, callback, me, logout]
