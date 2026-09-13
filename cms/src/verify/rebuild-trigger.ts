/**
 * Rebuild trigger verification.
 *
 * Run:
 *   DEPLOY_WEBHOOK_URL=http://127.0.0.1:4599/hook REBUILD_MIN_INTERVAL_MS=300 \
 *     pnpm verify:rebuild
 *
 * Two things are worth proving, and only one of them is behavioural:
 *
 * 1. **Published content schedules a rebuild; reader content does not.** That is
 *    a property of the config, so it is asserted structurally — inspecting the
 *    resolved config is more reliable than inferring it from side effects.
 *
 * 2. **A burst of saves collapses into one rebuild.** That is behavioural and
 *    needs a real endpoint, so with `DEPLOY_WEBHOOK_URL` set this performs three
 *    rapid saves and the caller counts the requests that actually arrived.
 *    Without it the module is a documented no-op, so the check is skipped
 *    rather than failed.
 */
import config from '@payload-config'
import { getPayload } from 'payload'

const payload = await getPayload({ config: await config })

let failures = 0
const check = (label: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures += 1
}

const hookCount = (slug: string): number => {
  const collection = payload.config.collections.find((c) => c.slug === slug)
  return collection?.hooks?.afterChange?.length ?? 0
}

console.log('\n=== rebuild trigger ===\n')

// 1. Published content is wired; reader content is not.
check('articles schedules a rebuild', hookCount('articles') > 0, `${hookCount('articles')} hook(s)`)
check('categories schedules a rebuild', hookCount('categories') > 0)
check(
  'comments do NOT schedule a rebuild (reader writes must not spend a build)',
  hookCount('comments') === 0,
  `${hookCount('comments')} hook(s)`,
)
check(
  'poll-votes do NOT schedule a rebuild',
  hookCount('poll-votes') === 0,
  `${hookCount('poll-votes')} hook(s)`,
)

const siteSettings = payload.config.globals?.find((g) => g.slug === 'site-settings')
check(
  'site-settings schedules a rebuild',
  (siteSettings?.hooks?.afterChange?.length ?? 0) > 0,
  `${siteSettings?.hooks?.afterChange?.length ?? 0} hook(s)`,
)

// 2. A burst of saves collapses into one rebuild.
if (!process.env.DEPLOY_WEBHOOK_URL) {
  console.log('\nSKIP  behavioural debounce check — DEPLOY_WEBHOOK_URL is unset (no-op mode)')
} else {
  const current = await payload.findGlobal({ slug: 'site-settings' })

  // Re-saving the same values still fires afterChange, so this proves the
  // trigger without altering the owner's content.
  for (let i = 0; i < 3; i += 1) {
    await payload.updateGlobal({
      slug: 'site-settings',
      data: { siteName: current.siteName, tagline: current.tagline ?? '' },
      overrideAccess: true,
    })
  }
  console.log('\nPerformed 3 saves — the receiver should record exactly 1 request.')

  /**
   * The rebuild is debounced, so it is still pending here. `process.exit()`
   * would discard the timer, which would look like a broken trigger when the
   * real fault was this script exiting too early.
   *
   * Capped so a normal 5-minute interval does not make the harness hang; run it
   * with a short `REBUILD_MIN_INTERVAL_MS` for the behavioural check.
   */
  const intervalMs = Number(process.env.REBUILD_MIN_INTERVAL_MS ?? 300_000)
  const waitMs = Math.min(intervalMs + 500, 3_000)
  if (intervalMs + 500 > waitMs) {
    console.log(
      `WARN  interval ${intervalMs}ms exceeds the ${waitMs}ms wait — set REBUILD_MIN_INTERVAL_MS=300 to exercise the debounce.`,
    )
  }
  await new Promise((resolve) => setTimeout(resolve, waitMs))
}

console.log(`\n${failures === 0 ? 'All rebuild-trigger checks passed.' : `${failures} FAILED`}\n`)
process.exit(failures === 0 ? 0 : 1)
