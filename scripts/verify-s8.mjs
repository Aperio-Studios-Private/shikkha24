/**
 * Ad-hoc verification harness for S8 (live blog, poll, quiz).
 *
 * Not part of the build. It exists because three S8 behaviours cannot be judged
 * by looking at a page:
 *
 *   1. the poll vote endpoint's abuse guards — a honeypot, a duplicate vote and
 *      a rate limit all have to be *attempted* to be shown working
 *   2. the live blog's static fallback — the entries must be in the HTML, not
 *      fetched, or the reliability promise is not kept
 *   3. the quiz's grading data — it must be present without being executable
 *
 * Everything it changes on the poll it restores at the end.
 *
 * Run with the CMS up and the frontend built: node scripts/verify-s8.mjs
 */
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'

const CMS = 'http://localhost:3000'
const DIST = 'frontend/dist'
const DB = 'cms/data/payload.db'

let failures = 0
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

const sql = (statement) => execFileSync('sqlite3', [DB, statement], { encoding: 'utf8' })
const read = (path) => readFileSync(path, 'utf8')
const count = (haystack, needle) => haystack.split(needle).length - 1

/**
 * Every stylesheet in the build, concatenated.
 *
 * Astro extracts component `<style>` blocks into the CSS bundle, so rules like
 * the key-events filter and the poll reveal are NOT in the HTML. Asserting on
 * the HTML for them passes only by accident.
 */
const cssBundle = readdirSync(`${DIST}/_astro`)
  .filter((name) => name.endsWith('.css'))
  .map((name) => read(`${DIST}/_astro/${name}`))
  .join('\n')

/** A vote attempt that mimics a real browser from one fixed address. */
async function vote(pollId, body, ip = '203.0.113.10') {
  const response = await fetch(`${CMS}/api/polls/${pollId}/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
      'user-agent': 'shikkha24-verify/1.0',
    },
    body: JSON.stringify(body),
  })
  return { status: response.status, body: await response.json().catch(() => ({})) }
}

const pollId = sql('SELECT id FROM polls LIMIT 1;').trim()

// ── Live blog ───────────────────────────────────────────────────────────────
console.log('\n--- live blog ---')
const livePath = `${DIST}/live/demo-hsc-result-live/index.html`
const live = read(livePath)

check('page is generated', live.length > 2000, `${live.length} bytes`)
// `data-entry` also prefixes `data-entry-time`/`-content`/`-key`, so count the
// per-entry flag instead — one per entry, unambiguous.
check(
  'entries are baked into the HTML',
  count(live, 'data-key-event=') >= 6,
  `${count(live, 'data-key-event=')} entries`,
)
check(
  'key events are marked',
  count(live, 'data-key-event="true"') >= 3,
  `${count(live, 'data-key-event="true"')} key events`,
)
check('key-events filter is present', live.includes('id="key-only"'))
check('filter needs no JavaScript', cssBundle.includes(':has(#key-only:checked)'))
check('refresh button is present (CMS origin configured)', live.includes('data-live-refresh'))
check('refresh island announces into a live region', live.includes('aria-live="polite"'))
check('LiveBlogPosting schema is present', live.includes('"@type":"LiveBlogPosting"'))
check('each update carries its own timestamp in schema', count(live, '"@type":"BlogPosting"') >= 6)
check('live blog ad slot renders', live.includes('data-ad-slot="liveBlogTop"'))
// Astro emits external module scripts (allowed by `script-src 'self'`) plus
// `type="application/json"` and `application/ld+json` data tags — neither is
// executable, so neither is subject to script-src. Anything else would be
// blocked by the CSP. Both lookaheads must test INSIDE the tag, before `>`.
const bareScript = /<script(?![^>]*\bsrc=)(?![^>]*type="application\/(?:ld\+)?json")[^>]*>/i
check('no executable inline script (CSP has no unsafe-inline)', !bareScript.test(live))

// ── Quiz ────────────────────────────────────────────────────────────────────
console.log('\n--- quiz ---')
const quizIndex = read(`${DIST}/quiz/index.html`)
check('quiz hub lists the quiz', quizIndex.includes('আজকের কুইজ'))

const quizId = sql('SELECT id FROM quizzes LIMIT 1;').trim()
const quizPage = read(`${DIST}/quiz/${quizId}/index.html`)
check('quiz page is generated', quizPage.includes('data-quiz'))
check(
  'all questions are rendered',
  count(quizPage, 'data-quiz-question') >= 5,
  `${count(quizPage, 'data-quiz-question')} questions`,
)
check(
  'grading data travels as non-executable JSON',
  quizPage.includes('type="application/json" data-quiz-data'),
)
check(
  'grading data holds the answers',
  quizPage.includes('correctAnswer') === false && quizPage.includes('"answer"'),
)
check('quiz degrades without JavaScript', quizPage.includes('data-quiz-noscript'))
check('quiz ad slots render', quizPage.includes('data-ad-slot="articleBottom"'))

// ── Poll rendering ──────────────────────────────────────────────────────────
console.log('\n--- poll (rendering) ---')
const home = read(`${DIST}/index.html`)
check('poll renders on the homepage', home.includes('data-poll-widget'))
check('poll has a honeypot field', home.includes('data-poll-honeypot'))
check('poll discloses the duplicate-vote hash', home.includes('ওয়ান-ওয়ে হ্যাশ'))
// The reveal rule lives in the CSS bundle, and minification drops the quotes
// around `true` — so match on the attribute rather than the exact selector.
check(
  'results stay hidden until voting',
  /\[data-poll-widget\]:not\(\[data-voted[^\]]*\]\)/.test(cssBundle),
)
check(
  'interactive strip links to the live blog and quiz',
  home.includes('/live/demo-hsc-result-live') && home.includes('/quiz'),
)

// ── Poll voting ─────────────────────────────────────────────────────────────
console.log('\n--- poll (voting) ---')
const before = sql(
  `SELECT vote_count FROM polls_options WHERE _parent_id = ${pollId} ORDER BY _order;`,
)
  .trim()
  .split('\n')
  .map(Number)

const first = await vote(pollId, { optionIndex: 1 })
check(
  'a valid vote is accepted',
  first.status === 200 && first.body.alreadyVoted === false,
  `status ${first.status}`,
)
check(
  'the tally increments by exactly one',
  first.body.tallies?.[1] === (before[1] ?? 0) + 1,
  `was ${before[1]}, now ${first.body.tallies?.[1]}`,
)
check(
  'the response returns all tallies',
  Array.isArray(first.body.tallies) && first.body.tallies.length === before.length,
)

const second = await vote(pollId, { optionIndex: 1 })
check(
  'a duplicate vote is refused',
  second.body.alreadyVoted === true,
  `alreadyVoted=${second.body.alreadyVoted}`,
)
check(
  'the duplicate did not change the tally',
  second.body.tallies?.[1] === first.body.tallies?.[1],
  `${first.body.tallies?.[1]} → ${second.body.tallies?.[1]}`,
)

const honeypot = await vote(pollId, { optionIndex: 2, company: 'Acme Corp' }, '203.0.113.77')
check(
  'a filled honeypot is not written',
  honeypot.body.tallies?.[2] === (before[2] ?? 0),
  `option 2 = ${honeypot.body.tallies?.[2]}`,
)

const badIndex = await vote(pollId, { optionIndex: 99 }, '203.0.113.11')
check('an out-of-range option is rejected', badIndex.status === 400, `status ${badIndex.status}`)

const badBody = await vote(pollId, { optionIndex: 'not-a-number' }, '203.0.113.12')
check('a non-numeric option is rejected', badBody.status === 400, `status ${badBody.status}`)

const missingPoll = await vote('999999', { optionIndex: 0 }, '203.0.113.13')
check('an unknown poll is a 404', missingPoll.status === 404, `status ${missingPoll.status}`)

// Rate limit: 20 per minute, so the 21st attempt from one address must fail.
let limited = 0
for (let i = 0; i < 24; i += 1) {
  const attempt = await vote(pollId, { optionIndex: 0 }, '198.51.100.200')
  if (attempt.status === 429) limited += 1
}
check('the rate limit engages', limited > 0, `${limited} of 24 refused`)

// ── Cleanup ─────────────────────────────────────────────────────────────────
console.log('\n--- cleanup ---')
sql('DELETE FROM poll_votes;')
sql(`UPDATE polls_options SET vote_count = 0 WHERE _parent_id = ${pollId};`)
const after = sql(
  `SELECT vote_count FROM polls_options WHERE _parent_id = ${pollId} ORDER BY _order;`,
)
  .trim()
  .split('\n')
  .map(Number)
check(
  'vote counts restored to zero',
  after.every((value) => value === 0),
  JSON.stringify(after),
)
check('guard rows removed', sql('SELECT COUNT(*) FROM poll_votes;').trim() === '0')

console.log(failures === 0 ? '\nAll S8 checks passed.' : `\n${failures} check(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
