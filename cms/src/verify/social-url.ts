/**
 * Counter-proof for the social-URL validator — `pnpm --filter @shikkha24/cms verify:social`
 *
 * The validator exists because four unvalidated text fields accepted the
 * platforms' own homepages (`https://www.fb.com/` and friends) as if they were
 * the newsroom's accounts. Every one of those is a *valid URL*, so only a test
 * that asserts the specific rejection can prove the rule holds — and a validator
 * that rejected everything would pass every negative case here while being
 * useless, which is why the accepted cases matter just as much.
 */
import { socialUrlValidator } from '../lib/social-url'

let failures = 0
const check = (label: string, actual: true | string, shouldPass: boolean) => {
  const passed = actual === true
  const ok = passed === shouldPass
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
  if (!passed) console.log(`        → ${actual}`)
}

const facebook = socialUrlValidator('facebook')
const twitter = socialUrlValidator('twitter')

console.log('=== must be REJECTED — what the owner actually entered ===')
check('https://www.fb.com/  (platform homepage)', facebook('https://www.fb.com/'), false)
check(
  'https://www.facebook.com/  (platform homepage)',
  facebook('https://www.facebook.com/'),
  false,
)
check('http://x.com/  (plain http, homepage)', twitter('http://x.com/'), false)
check('facebook.com/shikkha24  (no scheme)', facebook('facebook.com/shikkha24'), false)
check('shikkha24  (bare handle)', facebook('shikkha24'), false)

console.log('\n=== must be ACCEPTED — a real account URL ===')
check('https://www.facebook.com/shikkha24', facebook('https://www.facebook.com/shikkha24'), true)
check(
  'https://fb.com/shikkha24  (short host, real path)',
  facebook('https://fb.com/shikkha24'),
  true,
)
check('https://x.com/shikkha24  (https, real path)', twitter('https://x.com/shikkha24'), true)

console.log('\n=== empty is allowed — the field is optional and the UI self-hides ===')
check('empty string', facebook(''), true)
check('null', facebook(null), true)
check('undefined', facebook(undefined), true)

console.log(
  failures === 0
    ? '\nAll social-URL validator checks passed.'
    : `\n${failures} social-URL validator check(s) FAILED.`,
)
process.exit(failures === 0 ? 0 : 1)
