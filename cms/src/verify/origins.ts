/**
 * Counter-proof for the browser-origin allow-list — `pnpm --filter @shikkha24/cms verify:origins`
 *
 * ## What this exists to prevent
 *
 * The allow-list once held **only the public site**. The admin panel is served
 * from `cms.shikkha24.com`, so every request its browser made carried an Origin
 * that was not in the list, and Payload discarded the cookie on all of them
 * (`auth/extractJWT.js`). Media returned 403 and no image could be uploaded;
 * logout appeared to do nothing, because Payload's admin client catches the
 * failure and reports success anyway.
 *
 * An allow-list is a security control, so this checks **both** directions: the
 * admin origin must be accepted, and a stranger's origin must still be refused.
 * Testing only the first would pass on a list that had been replaced with `['*']`.
 */
import { ALLOWED_ORIGINS, CMS_ORIGIN, cookieAuthAcceptedFor } from '../lib/origins'

let failures = 0
const check = (label: string, actual: boolean, shouldPass: boolean) => {
  const ok = actual === shouldPass
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
}

console.log(`=== allow-list is exactly: ${JSON.stringify(ALLOWED_ORIGINS)} ===`)

console.log('\n=== the admin MUST be able to call its own API ===')
// This single line is the regression. It failed on 2026-10-04 and took the whole
// media library and the logout button with it.
check('cms.shikkha24.com is allowed', cookieAuthAcceptedFor(ALLOWED_ORIGINS, CMS_ORIGIN), true)
check('CMS_ORIGIN is https, not a bare host', CMS_ORIGIN.startsWith('https://'), true)

console.log('\n=== the public site MUST be allowed (reader-facing calls) ===')
check(
  'shikkha24.com is allowed',
  cookieAuthAcceptedFor(ALLOWED_ORIGINS, process.env.PUBLIC_SITE_URL || 'https://shikkha24.com'),
  true,
)

console.log("\n=== a stranger's page must NOT be allowed ===")
// The control that stops this check being satisfied by '*' or by a list that
// simply got longer.
for (const hostile of [
  'https://evil.example.com',
  'http://shikkha24.com', // right host, wrong scheme
  'https://shikkha24.com.evil.example.com', // suffix attack
  'https://cms.shikkha24.com.evil.example.com',
  'null', // sandboxed iframe / file://
]) {
  check(`${hostile} is refused`, cookieAuthAcceptedFor(ALLOWED_ORIGINS, hostile), false)
}

console.log('\n=== localhost must not be trusted in production ===')
if (process.env.NODE_ENV === 'production') {
  check(
    'http://localhost:4321 is refused',
    cookieAuthAcceptedFor(ALLOWED_ORIGINS, 'http://localhost:4321'),
    false,
  )
  check(
    'http://localhost:3000 is refused',
    cookieAuthAcceptedFor(ALLOWED_ORIGINS, 'http://localhost:3000'),
    false,
  )
} else {
  check(
    'dev keeps localhost:4321',
    cookieAuthAcceptedFor(ALLOWED_ORIGINS, 'http://localhost:4321'),
    true,
  )
}

console.log("\n=== the predicate mirrors Payload's own branch ===")
// Extracted from payload/dist/auth/extractJWT.js: an empty list permits
// everything, otherwise the Origin must match exactly. Asserted here so the two
// cannot drift apart silently.
check('empty list accepts any origin', cookieAuthAcceptedFor([], 'https://evil.example.com'), true)
check('missing Origin is NOT claimed accepted', cookieAuthAcceptedFor(ALLOWED_ORIGINS, null), false)

console.log('\n=== negative control: remove the CMS origin and the test must go red ===')
// Without this, "all green" would be equally consistent with a check that cannot
// fail — which is what M18 was.
const withoutCms = ALLOWED_ORIGINS.filter((o) => o !== CMS_ORIGIN)
check(
  'a list missing the CMS origin REJECTS the admin',
  cookieAuthAcceptedFor(withoutCms, CMS_ORIGIN),
  false,
)

console.log(
  failures === 0
    ? '\nAll origin allow-list checks passed.'
    : `\n${failures} origin allow-list check(s) FAILED.`,
)
process.exit(failures === 0 ? 0 : 1)
