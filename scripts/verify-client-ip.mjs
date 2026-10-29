#!/usr/bin/env node
/**
 * F-13 gate — the client IP a request is attributed to.
 *
 * ## Why this is a gate and not a comment
 *
 * `clientIp()` keys **every** abuse control in this codebase:
 *
 *   • the rate limit on comments, newsletter signup, poll votes, bookmark
 *     toggles and account deletion (`lib/rate-limit.ts`)
 *   • the poll `voterHash` and the reaction `fingerprint`, both an HMAC of
 *     IP + user agent, which together are the **duplicate-vote** control
 *
 * It resolves that address from `x-forwarded-for`, a header the client controls
 * and a proxy only *appends* to. Reading the wrong end of it does not degrade
 * those controls — it removes them, silently, for anyone who reads this file.
 *
 * The previous implementation took entry `[0]`, which is whatever the caller
 * sent. Rotating that header per request gave an attacker a fresh rate-limit
 * bucket on every call and a fresh "voter" identity on every poll.
 *
 * ## The invariant, stated once
 *
 * **A forged entry must never become the client IP.** The last entry is the one
 * the trusted hop wrote; entries to its left are caller-supplied and are
 * discarded. See `cms/src/lib/http.ts` for why that holds whether the proxy
 * appends or overwrites, and for the one condition under which it stops holding
 * (a second proxy in front).
 *
 * ## The counter-proof at the bottom
 *
 * The harness asserts the OLD behaviour is caught by these same checks. Without
 * it, a fix that merely satisfied every assertion above would prove nothing —
 * they could all be trivially true. This project records the same rule: a check
 * that has never been seen to fail is not evidence.
 *
 * Run: node --experimental-strip-types scripts/verify-client-ip.mjs
 */
import { ipFromHeaders } from '../cms/src/lib/http.ts'

/** The address the proxy actually saw. */
const REAL = '203.0.113.5'
/** Whatever the caller chose to claim. */
const FAKE = '9.9.9.9'

const headers = (forwarded) => new Headers(forwarded ? { 'x-forwarded-for': forwarded } : {})

let failures = 0
const check = (label, actual, expected) => {
  const ok = actual === expected
  if (!ok) failures += 1
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : ` — got ${actual}, expected ${expected}`}`,
  )
}

// ── The attack: a forged entry, with the proxy appending the real one ─────────
check(
  'a forged leading entry is discarded (proxy appends)',
  ipFromHeaders(headers(`${FAKE}, ${REAL}`)),
  REAL,
)
check(
  'a longer forged chain is discarded',
  ipFromHeaders(headers(`${FAKE}, 8.8.8.8, ${REAL}`)),
  REAL,
)

// ── The other proxy behaviour: overwrite rather than append ──────────────────
check('an overwritten header is used as-is', ipFromHeaders(headers(REAL)), REAL)

// ── Malformed input must not produce an empty identity ───────────────────────
// '' as a bucket key would make every malformed request share a single
// rate-limit bucket. Since pentest 2026-10-29 (L2) the absent case returns
// NULL, not 'unknown': a header-less request bypassed the trusted proxy and is
// refused (403) by `requireClientIp` before any rate bucket is touched.
check('a trailing comma does not yield an empty string', ipFromHeaders(headers(`${REAL},`)), REAL)
check('padded entries are trimmed', ipFromHeaders(headers(`  ${FAKE} ,  ${REAL}  `)), REAL)
check(
  'a header of only commas yields null (refused, not bucketed)',
  ipFromHeaders(headers(',,')),
  null,
)

// ── Absent headers ───────────────────────────────────────────────────────────
check(
  'no x-forwarded-for falls back to x-real-ip',
  ipFromHeaders(new Headers({ 'x-real-ip': REAL })),
  REAL,
)
// L2: null means "no trusted proxy spoke" — requireClientIp turns this into a
// 403 so direct-to-origin hits can never share (or exhaust) a bucket.
check('no headers at all yields null', ipFromHeaders(headers()), null)
check('an empty x-forwarded-for yields null', ipFromHeaders(headers('')), null)

// ── The counter-proof ─────────────────────────────────────────────────────────
/** The implementation this replaced, kept here only to be caught. */
const oldLeftmost = (forwarded) => forwarded.split(',')[0]?.trim() || 'unknown'

check(
  'counter-proof: the previous leftmost read WAS fooled by a forged header',
  oldLeftmost(`${FAKE}, ${REAL}`) === FAKE ? 'caught' : 'not caught',
  'caught',
)

console.log(
  failures === 0
    ? '\nAll client-IP checks passed.\n'
    : `\n${failures} client-IP check(s) FAILED.\n`,
)
process.exit(failures === 0 ? 0 : 1)
