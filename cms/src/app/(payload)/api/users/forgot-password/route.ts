/**
 * Per-IP rate limiting for the password-reset request endpoint.
 *
 * ## Why this wrapper exists
 *
 * The forgot-password endpoint sends an email with a reset link. An attacker
 * who knows a victim's email can use it to flood their inbox ("email bombing")
 * or to probe which addresses are registered. A per-IP limit of 3 per hour
 * makes both attacks impractical.
 *
 * ## Why a route handler, not a hook
 *
 * Payload has no pre-auth hook that runs before the forgot-password operation.
 * Next.js middleware is deprecated in Next 16. A specific route handler takes
 * precedence over the catch-all `[...slug]`.
 *
 * ## Limits
 * - 3 attempts per hour per IP.
 */
import { REST_POST } from '@payloadcms/next/routes'
import config from '@payload-config'

import { ipFromHeaders, tooManyRequests } from '../../../../../lib/http'
import { rateLimit } from '../../../../../lib/rate-limit'

const DELEGATE = REST_POST(config)

export const POST = async (request: Request): Promise<Response> => {
  const ip = ipFromHeaders(request.headers)
  const limit = rateLimit(`forgot:${ip}`, 3, 3_600_000)
  if (!limit.ok) {
    return tooManyRequests(limit.retryAfterSeconds)
  }

  return DELEGATE(request, { params: Promise.resolve({ slug: ['users', 'forgot-password'] }) })
}
