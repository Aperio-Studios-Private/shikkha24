/**
 * Rebuild-notice verification — `pnpm --filter @shikkha24/cms verify:rebuild-notice`
 *
 * ## What this proves
 *
 * The notice must appear on **exactly** the configs that rebuild the site, and
 * nowhere else. Both directions matter:
 *
 *   · a triggered collection with no notice → the editor is back to silence,
 *     which is the confusion this whole change exists to remove
 *   · a **reader-written** collection with a notice → the editor is told a
 *     commenter's submission will republish the site, which is false
 *
 * The second direction is the one a careless `withRebuildNotice` would break, so
 * `Comments`, `PollVotes` and `Assignments` are asserted **absent** rather than
 * assumed absent.
 *
 * It imports the real `payload.config`, so it checks what Payload will actually
 * load rather than a reimplementation of it.
 */

import { REBUILD_NOTICE } from '../lib/rebuild-trigger'
import rawConfig from '../payload.config'

/*
 * `buildConfig()` returns a **promise**, and it returns a *sanitised* config —
 * so awaiting it is also what proves the notice survives sanitisation rather
 * than only existing in the source.
 */
const config = await rawConfig

let failures = 0
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

/** Read a config's admin description as a plain string. */
const descriptionOf = (entry: unknown): string => {
  const description = (entry as { admin?: { description?: unknown } } | undefined)?.admin
    ?.description
  return typeof description === 'string' ? description : ''
}

const collections = (config.collections ?? []) as unknown[]
const bySlug = (slug: string) =>
  collections.find((c) => (c as { slug?: string }).slug === slug) as unknown

const globals = (config.globals ?? []) as unknown[]
const globalBySlug = (slug: string) =>
  globals.find((g) => (g as { slug?: string }).slug === slug) as unknown

/** `withRebuildTrigger` is unconfigured here, so the notice is the "not set up" text. */
const configured = Boolean(process.env.DEPLOY_WEBHOOK_URL)
console.log(
  `DEPLOY_WEBHOOK_URL is ${configured ? 'SET — expecting the "rebuilds automatically" notice' : 'unset — expecting the "must run a rebuild" warning'}\n`,
)

const expectNotice = (label: string, entry: unknown) =>
  check(label, descriptionOf(entry).includes(REBUILD_NOTICE), descriptionOf(entry).slice(0, 60))

const expectNoNotice = (label: string, entry: unknown) =>
  check(label, !descriptionOf(entry).includes(REBUILD_NOTICE))

console.log('=== triggered content — must carry the notice ===')
expectNotice('articles', bySlug('articles'))
expectNotice('categories', bySlug('categories'))
expectNotice('authors', bySlug('authors'))
expectNotice('media', bySlug('media'))
expectNotice('site-settings (global)', globalBySlug('site-settings'))

console.log('\n=== not triggered — must NOT carry the notice ===')
expectNoNotice('comments (reader-written)', bySlug('comments'))
expectNoNotice('poll-votes (reader-written)', bySlug('poll-votes'))
expectNoNotice('assignments (internal WIP)', bySlug('assignments'))
expectNoNotice('users (admin only)', bySlug('users'))

console.log("\n=== the notice must not have replaced the collection's own description ===")
const articles = descriptionOf(bySlug('articles'))
check(
  'articles keeps its own description after the notice',
  articles.split('\n\n').length > 1,
  `${articles.split('\n\n').length} paragraph(s)`,
)

console.log(
  failures === 0
    ? '\nAll rebuild-notice checks passed.'
    : `\n${failures} rebuild-notice check(s) FAILED.`,
)
process.exit(failures === 0 ? 0 : 1)
