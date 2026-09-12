/**
 * Ad-hoc verification harness for S7 (ad system).
 *
 * Not part of the build. It exists because two S7 behaviours cannot be observed
 * against the demo content as it stands:
 *
 *  1. the sponsored banner on the article page — no demo article is sponsored
 *  2. the mid-article ad — every demo article is 4 paragraphs, below the
 *     6-paragraph floor, so the split never runs
 *
 * It flips the data, rebuilds, checks the built HTML, and reverts. Every change
 * is restored at the end; the original body is kept in memory.
 *
 * Run with the CMS up: node scripts/verify-ads-s7.mjs
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const SLUG = 'demo-hsc-result-2026'
const DB = 'cms/data/payload.db'
const SPONSOR = 'পরীক্ষা প্রস্তুতি একাডেমি'

let failures = 0
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

const sql = (statement) => execFileSync('sqlite3', [DB, statement], { encoding: 'utf8' })
const sqlFile = (path) =>
  execFileSync('sqlite3', [DB], { input: readFileSync(path), encoding: 'utf8' })
const build = () =>
  execFileSync('pnpm', ['run', 'build:frontend'], {
    encoding: 'utf8',
    env: { ...process.env, CODEBUDDY_SAFE_DELETE_ENABLED: '0' },
  })
const read = (path) => readFileSync(path, 'utf8')
const count = (haystack, needle) => haystack.split(needle).length - 1

const articleHtml = () => read(`frontend/dist/article/${SLUG}/index.html`)

const { docs } = await (
  await fetch(`http://localhost:3000/api/articles?limit=1&depth=0&where[slug][equals]=${SLUG}`)
).json()
const originalBody = JSON.stringify(docs[0].body)

try {
  // ── 1. Sponsored content ──────────────────────────────────────────────────
  console.log('\n--- sponsored content template ---')
  sql(`UPDATE articles SET is_sponsored = 1, sponsor_name = '${SPONSOR}' WHERE slug = '${SLUG}';`)
  build()

  const html = articleHtml()
  check('banner renders above the headline', html.includes('এই লেখাটি'))
  check('banner names the sponsor', html.includes(SPONSOR))
  check('byline badge renders', count(html, 'বিজ্ঞাপন') >= 2, `${count(html, 'বিজ্ঞাপন')} labels`)

  const home = read('frontend/dist/index.html')
  const firstLink = home.match(/\/article\/[a-z0-9-]+/)?.[0] ?? ''
  check(
    'sponsored story displaced from the masthead',
    firstLink !== `/article/${SLUG}`,
    `lead is ${firstLink}`,
  )
  check('sponsored story still reachable (latest feed)', home.includes(`/article/${SLUG}`))

  sql(`UPDATE articles SET is_sponsored = 0, sponsor_name = NULL WHERE slug = '${SLUG}';`)

  // ── 2. Mid-article ad ─────────────────────────────────────────────────────
  console.log('\n--- mid-article ad ---')
  const body = JSON.parse(originalBody)
  const paragraph = () => ({
    type: 'paragraph',
    version: 1,
    children: [
      {
        type: 'text',
        version: 1,
        text: 'পরীক্ষার প্রস্তুতির জন্য নিয়মিত পড়াশোনা ও পরিকল্পনার কোনো বিকল্প নেই।',
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
  })
  // Top up *paragraph* nodes, not total children. The demo body also contains a
  // heading, a list and a blockquote, so padding `children.length` to a target
  // would leave the paragraph count under the mid-ad floor — and the test would
  // then "pass" against a body that never reaches the code path at all.
  const isParagraph = (node) => node?.type === 'paragraph'
  const existing = body.root.children.filter(isParagraph).length
  for (let i = existing; i < 10; i += 1) body.root.children.push(paragraph())

  writeFileSync(
    '/tmp/s7-body.sql',
    `UPDATE articles SET body = '${JSON.stringify(body).replace(/'/g, "''")}' WHERE slug = '${SLUG}';`,
  )
  sqlFile('/tmp/s7-body.sql')
  build()

  const longHtml = articleHtml()
  check('mid-article ad renders on a long body', longHtml.includes('data-ad-slot="articleMiddle"'))
  check(
    'top and bottom ads still render',
    longHtml.includes('data-ad-slot="articleTop"') &&
      longHtml.includes('data-ad-slot="articleBottom"'),
  )
  check(
    'ad sits between two prose blocks',
    count(longHtml, 'prose-bn') === 2,
    `${count(longHtml, 'prose-bn')} prose blocks`,
  )

  // ── 3. Revert ─────────────────────────────────────────────────────────────
  console.log('\n--- revert ---')
  writeFileSync(
    '/tmp/s7-revert.sql',
    `UPDATE articles SET body = '${originalBody.replace(/'/g, "''")}' WHERE slug = '${SLUG}';`,
  )
  sqlFile('/tmp/s7-revert.sql')
  build()

  const reverted = articleHtml()
  check('body reverted (no mid-article ad)', !reverted.includes('data-ad-slot="articleMiddle"'))
  check('sponsorship reverted (no banner)', !reverted.includes('এই লেখাটি'))
} finally {
  // Belt and braces: never leave the demo article mutated.
  writeFileSync(
    '/tmp/s7-revert-final.sql',
    `UPDATE articles SET body = '${originalBody.replace(/'/g, "''")}', is_sponsored = 0, sponsor_name = NULL WHERE slug = '${SLUG}';`,
  )
  sqlFile('/tmp/s7-revert-final.sql')
  console.log(
    '\nfinal state restored:',
    sql(`SELECT slug, is_sponsored FROM articles WHERE slug = '${SLUG}';`).trim(),
  )
}

console.log(failures === 0 ? '\nAll S7 checks passed.' : `\n${failures} check(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
