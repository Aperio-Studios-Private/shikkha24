import { signToken, verifyToken } from './signed-token'

/**
 * Social login — the OAuth half.
 *
 * ## Scope
 *
 * Google and Facebook only, because those are the two the plan names and the two
 * this audience actually has. Adding a provider means adding one entry to
 * `PROVIDERS`; nothing else in the flow is provider-specific, because every
 * provider is normalised to the same profile shape below.
 *
 * ## The owner must create the OAuth apps
 *
 * Both are free and neither needs a card, but the credentials must be created in
 * Google Cloud Console and Meta for Developers by the owner — see the OWNER
 * action list in `.sps/task.md`. Until then `configuredProviders()` returns an
 * empty list, and the frontend renders **no login button at all**. That is the
 * point: a button that cannot work reads to the reader as their own failure.
 *
 * ## The `state` parameter is the CSRF guard
 *
 * `start` mints a signed `state` and sets it as a cookie; `callback` requires the
 * query `state` to match the cookie **and** to verify. Without that, an attacker
 * could hand a reader a crafted `code` and silently log them into the attacker's
 * account — the classic login-CSRF. The signed payload also carries where to
 * send the reader afterwards, so that destination is tamper-proof too.
 */

/** The providers this project supports. */
export const OAUTH_PROVIDERS = ['google', 'facebook'] as const

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number]

/** A provider profile, normalised. Both providers are reduced to this. */
export interface OAuthProfile {
  provider: OAuthProvider
  /** The provider's own immutable user id. Never the email — emails change. */
  providerId: string
  email: string | null
  displayName: string
  avatarUrl: string | null
}

/** Cookie holding the signed `state` between `start` and `callback`. */
export const OAUTH_STATE_COOKIE = 'shikkha24_oauth_state'

/** Ten minutes is ample for a consent screen and short enough to be safe. */
const STATE_TTL_SECONDS = 600

const STATE_CONTEXT = 'oauth-state:v1'

/** Facebook pins a Graph API version; review when Meta deprecates this one. */
const FACEBOOK_GRAPH_VERSION = 'v21.0'

/** Is this string one of our providers? */
export function isOAuthProvider(value: string): value is OAuthProvider {
  return (OAUTH_PROVIDERS as readonly string[]).includes(value)
}

interface ProviderCredentials {
  clientId: string
  clientSecret: string
}

/**
 * Read a provider's credentials from the environment.
 *
 * @returns `null` when either half is missing — a half-configured provider is
 *          treated as unconfigured rather than as a broken one, so it simply
 *          does not appear in the UI.
 */
function credentials(provider: OAuthProvider): ProviderCredentials | null {
  const prefix = provider === 'google' ? 'GOOGLE' : 'FACEBOOK'
  const clientId = process.env[`${prefix}_OAUTH_CLIENT_ID`]
  const clientSecret = process.env[`${prefix}_OAUTH_CLIENT_SECRET`]
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

/** Is this provider usable right now? */
export function isOAuthConfigured(provider: OAuthProvider): boolean {
  return credentials(provider) !== null
}

/**
 * The providers that can actually complete a login.
 *
 * This is what the frontend asks for at build time to decide whether to render
 * the login control at all.
 */
export function configuredProviders(): OAuthProvider[] {
  return OAUTH_PROVIDERS.filter(isOAuthConfigured)
}

/**
 * Where the CMS itself is reachable from a browser.
 *
 * The `redirect_uri` must match what is registered with the provider **exactly**,
 * so it is explicit configuration rather than derived from request headers — a
 * proxy that reports a different host would otherwise produce a `redirect_uri`
 * mismatch that only shows up in production.
 */
function cmsOrigin(): string {
  return (process.env.OAUTH_REDIRECT_BASE || 'http://localhost:3000').replace(/\/$/, '')
}

/** The callback URL to send the provider. Must be registered with it verbatim. */
export function oauthRedirectUri(provider: OAuthProvider): string {
  return `${cmsOrigin()}/api/oauth/${provider}/callback`
}

/**
 * Where the reader goes after a successful login.
 *
 * Read from configuration, not from the request, so an attacker cannot use the
 * login flow as an open redirect. Only the *path* is carried in the state, and
 * it is validated to be site-relative before use.
 */
function siteOrigin(): string {
  return (process.env.PUBLIC_SITE_URL || 'http://localhost:4321').replace(/\/$/, '')
}

/** A destination path we are willing to send a reader to. */
export function safeNextPath(value: string | null | undefined): string {
  if (!value) return '/'
  // Site-relative only. `//evil.com` is protocol-relative and would leave the
  // site, so a leading double slash is rejected along with absolute URLs.
  if (!value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}

/** The absolute URL a completed login lands on. */
export function postLoginUrl(next: string): string {
  return `${siteOrigin()}${safeNextPath(next)}`
}

/* ── State ───────────────────────────────────────────────────────────────── */

/**
 * Mint the signed `state` for one login attempt.
 *
 * @param now Injectable clock, so a harness can mint an expired state.
 */
export function signOAuthState(
  provider: OAuthProvider,
  next: string,
  now: number = Date.now(),
): string {
  return signToken(
    { provider, next: safeNextPath(next), nonce: crypto.randomUUID() },
    { context: STATE_CONTEXT, ttlSeconds: STATE_TTL_SECONDS },
    now,
  )
}

/**
 * Verify a `state` and return what it claims, or `null`.
 *
 * Never throws — it runs on a public callback endpoint.
 */
export function verifyOAuthState(
  token: string | undefined | null,
  now: number = Date.now(),
): { provider: string; next: string } | null {
  const claims = verifyToken<{ provider?: unknown; next?: unknown; exp?: unknown }>(
    token,
    { context: STATE_CONTEXT, ttlSeconds: STATE_TTL_SECONDS },
    now,
  )
  if (typeof claims?.provider !== 'string') return null
  return {
    provider: claims.provider,
    next: safeNextPath(typeof claims.next === 'string' ? claims.next : '/'),
  }
}

/** The `Set-Cookie` value carrying the state. Short-lived and cleared on use. */
export function oauthStateSetCookie(state: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${OAUTH_STATE_COOKIE}=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${STATE_TTL_SECONDS}${secure}`
}

/** Clear the state cookie once the callback has consumed it. */
export function oauthStateClearCookie(): string {
  return `${OAUTH_STATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

/* ── Provider calls ──────────────────────────────────────────────────────── */

/** Where to send the reader to grant consent. */
export function authorizeUrl(provider: OAuthProvider, state: string): string {
  const config = credentials(provider)
  if (!config) throw new Error(`[oauth] ${provider} is not configured`)

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: oauthRedirectUri(provider),
    response_type: 'code',
    state,
  })

  if (provider === 'google') {
    // `openid email profile` is the minimum that yields a stable id and a name.
    params.set('scope', 'openid email profile')
    params.set('prompt', 'select_account')
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  params.set('scope', 'email,public_profile')
  return `https://www.facebook.com/${FACEBOOK_GRAPH_VERSION}/dialog/oauth?${params}`
}

/** Exchange the one-time `code` for an access token. */
async function exchangeCode(provider: OAuthProvider, code: string): Promise<string | null> {
  const config = credentials(provider)
  if (!config) return null

  const redirectUri = oauthRedirectUri(provider)

  try {
    if (provider === 'google') {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      })
      if (!response.ok) return null
      const body = (await response.json()) as { access_token?: unknown }
      return typeof body.access_token === 'string' ? body.access_token : null
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      code,
    })
    const response = await fetch(
      `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/oauth/access_token?${params}`,
    )
    if (!response.ok) return null
    const body = (await response.json()) as { access_token?: unknown }
    return typeof body.access_token === 'string' ? body.access_token : null
  } catch {
    // A provider outage must not become a 500 on our callback.
    return null
  }
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

/** Read the profile, normalised. Returns `null` if the provider gave us no id. */
async function fetchProfile(
  provider: OAuthProvider,
  accessToken: string,
): Promise<OAuthProfile | null> {
  try {
    if (provider === 'google') {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!response.ok) return null
      const body = (await response.json()) as Record<string, unknown>
      const providerId = asString(body.sub)
      if (!providerId) return null
      return {
        provider,
        providerId,
        email: asString(body.email),
        displayName: asString(body.name) ?? 'পাঠক',
        avatarUrl: asString(body.picture),
      }
    }

    const params = new URLSearchParams({
      fields: 'id,name,email,picture.type(large)',
      access_token: accessToken,
    })
    const response = await fetch(
      `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/me?${params}`,
    )
    if (!response.ok) return null
    const body = (await response.json()) as Record<string, unknown>
    const providerId = asString(body.id)
    if (!providerId) return null

    const picture = body.picture as { data?: { url?: unknown } } | undefined

    return {
      provider,
      providerId,
      // Facebook omits `email` for an account registered with a phone number.
      email: asString(body.email),
      displayName: asString(body.name) ?? 'পাঠক',
      avatarUrl: asString(picture?.data?.url),
    }
  } catch {
    return null
  }
}

/**
 * Complete the code exchange: `code` in, normalised profile out.
 *
 * Returns `null` for any failure — a rejected code, a provider outage, or a
 * profile with no id. The caller turns that into a redirect back to the site
 * with an error, never a stack trace.
 */
export async function exchangeCodeForProfile(
  provider: OAuthProvider,
  code: string,
): Promise<OAuthProfile | null> {
  const accessToken = await exchangeCode(provider, code)
  if (!accessToken) return null
  return fetchProfile(provider, accessToken)
}
