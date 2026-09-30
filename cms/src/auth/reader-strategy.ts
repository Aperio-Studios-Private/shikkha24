import type { AuthStrategy } from 'payload'

import { READER_SESSION_COOKIE, verifyReaderSession } from '../lib/reader-session'
import { readCookie } from '../lib/signed-token'

/**
 * Turns the reader session cookie into a `req.user`.
 *
 * ## Why a custom strategy at all
 *
 * Readers have no password — they exist only as the result of a social login.
 * Payload's built-in strategies are `local` (email + password), `jwt` and
 * `apiKey`, and none of them fits a passwordless account created by an OAuth
 * callback. A custom strategy is the documented extension point for this
 * (`docs/authentication/custom-strategies`).
 *
 * ## Why `overrideAccess` is correct here, and nowhere else
 *
 * `lib/reader-session.ts` mints a signed cookie; this strategy reads it and
 * loads the reader it names. That lookup has to run with `overrideAccess: true`,
 * because `readers.read` is `isSelfIn('readers')` — a rule that needs `req.user`, which
 * is precisely what we are computing. Asking access control to authorise its own
 * input is circular.
 *
 * This is the opposite of the S9 write endpoints, where `overrideAccess: true`
 * is a **hazard** and the field whitelist is the real control. The distinction:
 * there, access control was being bypassed to *write* attacker-influenced data;
 * here it is being bypassed to resolve *identity* from a token we signed. The
 * caller still has to satisfy the collection's access rules for whatever it goes
 * on to do.
 *
 * ## Failure is always "unauthenticated"
 *
 * Every path returns `{ user: null }` rather than throwing. This runs on every
 * request that carries the cookie, so a throw would turn a stale cookie into a
 * 500 on a public page. A deleted reader, a rotated secret and a forged token
 * all degrade to "not logged in", which is the safe direction.
 */
export const readerSessionStrategy: AuthStrategy = {
  name: 'reader-session',

  authenticate: async ({ payload, headers }) => {
    const token = readCookie(headers.get('cookie'), READER_SESSION_COOKIE)
    const readerId = verifyReaderSession(token)
    if (!readerId) return { user: null }

    try {
      const reader = await payload.findByID({
        collection: 'readers',
        id: readerId,
        depth: 0,
        // See the note above: identity resolution, not data access.
        overrideAccess: true,
        // A cookie naming a reader that no longer exists is a 404, not an error.
        disableErrors: true,
      })

      if (!reader) return { user: null }

      // The spread comes first so `collection` cannot be shadowed — the
      // generated `Reader` type carries its own `collection`, and spreading it
      // over ours would be a silent type error rather than a wrong slug.
      return { user: { ...reader, collection: 'readers' } }
    } catch {
      return { user: null }
    }
  },
}
