/**
 * Per-IP rate limiting for the staff login endpoint.
 *
 * ## Why this wrapper exists
 *
 * Payload's built-in `maxLoginAttempts` is **per-account** — it locks the
 * account after 5 wrong passwords. An attacker can still try 5 passwords
 * against every account in the directory, which is a slow but real brute-force
 * surface. A **per-IP** limit closes that gap: no IP may attempt more than
 * 5 logins per minute, regardless of which account is targeted.
 *
 * ## Why a route handler, not a hook
 *
 * Payload's `beforeLogin` hook runs **after** the password check, so it cannot
 * count failed attempts. Next.js middleware is deprecated in Next 16. A
 * specific route handler (`/api/users/login/route.ts`) takes precedence over
 * the catch-all `[...slug]` and can apply the limit before the request ever
 * reaches Payload.
 *
 * ## Limits
 * - 5 attempts per minute per IP.
 * - After 5 failures Payload's own account lockout also engages (10 min).
 */
import { REST_POST } from '@payloadcms/next/routes'
import config from '@payload-config'

import { ipFromHeaders, tooManyRequests } from '../../../../../lib/http'
import { rateLimit } from '../../../../../lib/rate-limit'

const DELEGATE = REST_POST(config)

export const POST = async (request: Request): Promise<Response> => {
  const ip = ipFromHeaders(request.headers)
  const limit = rateLimit(`login:${ip}`, 5, 60_000)
  if (!limit.ok) {
    return tooManyRequests(limit.retryAfterSeconds)
  }

  return DELEGATE(request, { params: Promise.resolve({ slug: ['users', 'login'] }) })
}
