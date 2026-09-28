/**
 * Demo-content purge — `pnpm --filter @shikkha24/cms seed:demo:purge`
 *
 * Removes everything `seed:demo` created. See `./demo.ts` for why the demo
 * content is separate, and `./demo-run.ts` for what seeds it.
 *
 * ## Dry run by default
 *
 * With no flag this prints what *would* be deleted and deletes nothing; the
 * `--confirm` flag is required to apply it. The asymmetry is deliberate — the
 * operation is irreversible, and a wrong match loses real editorial content.
 *
 * ```
 * pnpm --filter @shikkha24/cms seed:demo:purge              # report only
 * pnpm --filter @shikkha24/cms seed:demo:purge -- --confirm # delete
 * ```
 *
 * ## How demo content is identified
 *
 * Most of it marks itself: a `demo-` slug (articles, authors, institutions,
 * study-abroad guides, live blogs, galleries), a `demo-` filename (media) or a
 * `ডেমো:` title prefix (scholarships, result links, circulars). `deadlines`,
 * `quizzes` and `polls` carry no marker, so their keys are imported from
 * `./demo.ts` rather than duplicated here.
 *
 * ## Not touched
 *
 * The taxonomies (`categories`, `levels`, `districts`) are real, owner-approved
 * data seeded by `pnpm seed`. Reader accounts, subscribers and push
 * subscriptions are not demo content either.
 *
 * ## Back up first
 *
 * `docs/backup-and-recovery.md` §2: an untested backup is not a backup. Dump the
 * SQLite file before running this against anything you care about.
 */
import { getPayload } from 'payload'

import config from '../payload.config'
import {
  DEMO_DEADLINE_TITLES,
  DEMO_FACT_CHECK_CLAIM,
  DEMO_POLL_QUESTION,
  DEMO_QUIZ_TITLE,
} from './demo'

/** The confined cast the other seed modules use — `collection` is a variable here. */
interface Db {
  find(args: Record<string, unknown>): Promise<{ docs: Array<Record<string, unknown>> }>
  delete(args: Record<string, unknown>): Promise<unknown>
}

/** Deletion is opt-in. Without this flag the script only reports. */
const CONFIRM = process.argv.includes('--confirm')

/** ASCII marker on every demo slug and media filename. */
const DEMO_SLUG = 'demo-'

/** Bengali marker on demo education titles — «ডেমো:». */
const DEMO_BN = 'ডেমো:'

const payload = await getPayload({ config })
const db = payload as unknown as Db

/** Every matching document — `pagination: false` is the "no limit" form. */
async function all(
  collection: string,
  where: Record<string, unknown>,
): Promise<Array<Record<string, unknown>>> {
  const { docs } = await db.find({
    collection,
    where,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  return docs
}

interface Purged {
  collection: string
  what: string
  count: number
}

const purged: Purged[] = []
const skipped: string[] = []

/** Delete (or, on a dry run, merely count) every row a `where` matches. */
async function purge(
  collection: string,
  where: Record<string, unknown>,
  what: string,
): Promise<void> {
  const docs = await all(collection, where)
  if (docs.length === 0) return
  if (CONFIRM) {
    for (const doc of docs) {
      await db.delete({ collection, id: doc.id, overrideAccess: true })
    }
  }
  purged.push({ collection, what, count: docs.length })
}

/*
 * ── Phase 1: resolve the ids the dependent tables point at ────────────────────
 *
 * Reader-generated rows (comments, poll votes, bookmarks, saved deadlines)
 * reference demo content. They are deleted first, so nothing is left pointing at
 * a row that no longer exists.
 */
const demoArticles = await all('articles', { slug: { like: DEMO_SLUG } })
const demoDeadlines = await all('deadlines', { title: { in: DEMO_DEADLINE_TITLES } })
const demoPolls = await all('polls', { questionBn: { equals: DEMO_POLL_QUESTION } })

const articleIds = demoArticles.map((doc) => doc.id)
const deadlineIds = demoDeadlines.map((doc) => doc.id)
const pollIds = demoPolls.map((doc) => doc.id)

/* ── Phase 2: reader rows that reference demo content ─────────────────────── */
if (articleIds.length > 0) {
  await purge('comments', { article: { in: articleIds } }, 'comments on demo articles')
  await purge('bookmarks', { article: { in: articleIds } }, 'bookmarks of demo articles')
}
if (deadlineIds.length > 0) {
  await purge('bookmarks', { deadline: { in: deadlineIds } }, 'bookmarks of demo deadlines')
  await purge('saved-deadlines', { deadline: { in: deadlineIds } }, 'saved demo deadlines')
}
if (pollIds.length > 0) {
  await purge('poll-votes', { poll: { in: pollIds } }, 'votes on the demo poll')
}

/* ── Phase 3: the demo content itself ─────────────────────────────────────── */
// Galleries before media: a gallery holds references to its images.
await purge('photo-galleries', { slug: { like: DEMO_SLUG } }, 'photo galleries')
await purge('media', { filename: { like: DEMO_SLUG } }, 'media uploads')

await purge('articles', { slug: { like: DEMO_SLUG } }, 'articles')
// After the articles that reference them, so nothing is left pointing at a
// deleted tag. Tags are editorial labels, not fixed taxonomy — the production
// seed deliberately creates none, so every `demo-` tag here is demo content.
await purge('tags', { slug: { like: DEMO_SLUG } }, 'tags')
await purge('live-blogs', { slug: { like: DEMO_SLUG } }, 'live blogs')
await purge('institutions', { slug: { like: DEMO_SLUG } }, 'institutions')
await purge('study-abroad-guides', { slug: { like: DEMO_SLUG } }, 'study-abroad guides')

await purge('scholarships', { title: { like: DEMO_BN } }, 'scholarships')
await purge('result-links', { title: { like: DEMO_BN } }, 'result links')
await purge('circulars', { title: { like: DEMO_BN } }, 'circulars')
// S15. No slug on this collection, so it marks itself the same way the education
// demo rows do — a `ডেমো:` title prefix.
await purge('live-streams', { title: { like: DEMO_BN } }, 'live streams')

await purge('quizzes', { title: { equals: DEMO_QUIZ_TITLE } }, 'quizzes')
await purge('polls', { questionBn: { equals: DEMO_POLL_QUESTION } }, 'polls')
await purge('fact-checks', { claim: { equals: DEMO_FACT_CHECK_CLAIM } }, 'fact checks')
await purge('deadlines', { title: { in: DEMO_DEADLINE_TITLES } }, 'deadlines')

/*
 * Demo authors are removed only when nothing that *survives this purge* still
 * references them. An editor may have assigned one to a real article, and
 * deleting the author would leave that article with a dangling byline — worse
 * than leaving one demo row behind.
 *
 * Matched by the `demo-` slug pattern rather than by a single hardcoded slug:
 * the demo seed now creates three authors so the author-profile route has
 * something to list, and a hardcoded slug would silently leave two behind.
 *
 * The exclusion is by explicit id rather than by a slug pattern, so the check is
 * correct on a dry run too: while a dry run is only counting, the demo articles
 * are still present, and asking "does any article reference this author" would
 * always answer yes. The question that matters is "does any article that is
 * *not* already scheduled for deletion".
 */
for (const author of await all('authors', { slug: { like: DEMO_SLUG } })) {
  const slug = String(author.slug)
  const authorWhere: Record<string, unknown> = { author: { equals: author.id } }
  const survivors = await db.find({
    collection: 'articles',
    where:
      articleIds.length > 0 ? { and: [authorWhere, { id: { not_in: articleIds } }] } : authorWhere,
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (survivors.docs.length > 0) {
    skipped.push(`author "${slug}" — a non-demo article still uses it`)
    continue
  }
  await purge('authors', { slug: { equals: slug } }, `demo author "${slug}"`)
}

/* ── Report ────────────────────────────────────────────────────────────────── */
const total = purged.reduce((sum, row) => sum + row.count, 0)

console.log('')
if (total === 0) {
  console.log('No demo content found. Nothing to do.')
} else {
  console.log(
    CONFIRM ? `Deleted ${total} demo row(s):` : `DRY RUN — ${total} demo row(s) WOULD be deleted:`,
  )
  console.log('')
  for (const row of purged) {
    console.log(`  ${String(row.count).padStart(4)}  ${row.collection.padEnd(22)} ${row.what}`)
  }
}

if (skipped.length > 0) {
  console.log('')
  console.log('Left alone:')
  for (const note of skipped) console.log(`  - ${note}`)
}

if (total > 0 && !CONFIRM) {
  console.log('')
  console.log('Nothing was deleted. To apply, re-run with --confirm:')
  console.log('  pnpm --filter @shikkha24/cms seed:demo:purge -- --confirm')
  console.log('')
  console.log('Back up the SQLite file first — see docs/backup-and-recovery.md §3.')
}

/*
 * Post-purge leftovers. A row the matcher missed is visible here rather than
 * silent: after a clean purge every collection below should read 0 except
 * `media`, which holds the site logo uploaded through Site Settings. Anything
 * else is something to look at by hand.
 */
/** Collections that hold editorial content — checked for survivors after a purge. */
const CONTENT_COLLECTIONS = [
  'articles',
  'authors',
  'tags',
  'deadlines',
  'scholarships',
  'result-links',
  'circulars',
  'institutions',
  'study-abroad-guides',
  'live-blogs',
  'quizzes',
  'polls',
  'photo-galleries',
  'fact-checks',
  'media',
]

/*
 * Post-purge leftovers. A row the matcher missed is visible here rather than
 * silent: after a clean purge every collection below reads 0 except `media`,
 * which holds the site logo uploaded through Site Settings.
 */
if (CONFIRM && total > 0) {
  const leftovers: string[] = []
  for (const collection of CONTENT_COLLECTIONS) {
    const { docs } = await db.find({
      collection,
      where: {},
      pagination: false,
      depth: 0,
      overrideAccess: true,
      select: { id: true },
    })
    if (docs.length > 0) leftovers.push(`${collection}: ${docs.length}`)
  }
  console.log('')
  if (leftovers.length === 0) {
    console.log('Remaining content: none — every content collection is empty.')
  } else {
    console.log('Remaining content (check these are real, not missed demo rows):')
    for (const note of leftovers) console.log(`  ${note}`)
    console.log('')
    console.log('The site logo lives in `media` (uploaded via Site Settings) and is')
    console.log('expected to remain. The demo plates were `demo-plate-*.webp`.')
  }
  console.log('')
  console.log('Taxonomies (categories, levels, districts) are untouched — real data.')
}
process.exit(0)
