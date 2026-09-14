/**
 * Rebuild trigger — how an edit in the CMS becomes a change on the live site.
 *
 * ## Why this exists
 *
 * The public site is pre-built static HTML (`docs/hosting-and-deployment.md`
 * §1). Nothing an editor does is visible until the site is rebuilt. That makes
 * "I changed Site Settings and nothing happened" *expected* behaviour rather
 * than a bug — until now there was nothing to fire the rebuild.
 *
 * The documented pipeline (§3) is: editor publishes → Payload fires a webhook →
 * CI rebuilds → new HTML deploys. This module is the first arrow in that chain.
 *
 * ## Debounced, not immediate
 *
 * One quota constrains rebuilds (§2): GitHub Actions **2,000 minutes/month**
 * on a private repo. A newsroom
 * publishing 15–20 articles a day plus bursts would exhaust a per-save trigger.
 * So saves are **debounced**: every change inside the window collapses into a
 * single rebuild fired when the newsroom goes quiet.
 *
 * A pure debounce starves under a steady stream of saves, so there is also a
 * **maximum wait** — the first change in a batch is guaranteed to go out within
 * it even if edits never stop.
 *
 * Breaking news bypasses the wait entirely (§3, adaptive batching): a scoop is
 * worth a build.
 *
 * ## No-op when unconfigured
 *
 * Without `DEPLOY_WEBHOOK_URL` this module does nothing at all. Local
 * development, the seed run and CI test runs must never attempt a deploy.
 */

/**
 * Rebuilds are triggered only for collections whose content reaches the built
 * HTML. Reader-generated writes (comments, poll votes, push subscriptions,
 * bookmarks, citizen tips) are deliberately excluded — they are not published
 * content, and letting a commenter spend a build would burn the quota.
 */
import type { CollectionConfig, GlobalConfig } from 'payload'

const WEBHOOK_URL = process.env.DEPLOY_WEBHOOK_URL ?? ''
const WEBHOOK_TOKEN = process.env.DEPLOY_WEBHOOK_TOKEN ?? ''

/** Quiet period before a batched rebuild fires. Default 5 minutes (§3 peak). */
const MIN_INTERVAL_MS = Number(process.env.REBUILD_MIN_INTERVAL_MS ?? 5 * 60 * 1000)

/** Longest a change may wait before it is forced out. Default 30 minutes. */
const MAX_WAIT_MS = Number(process.env.REBUILD_MAX_WAIT_MS ?? 30 * 60 * 1000)

let timer: ReturnType<typeof setTimeout> | null = null
/** When the current batch started; 0 when nothing is pending. */
let pendingSince = 0

async function fire(reason: string): Promise<void> {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(WEBHOOK_TOKEN ? { authorization: `Bearer ${WEBHOOK_TOKEN}` } : {}),
      },
      body: JSON.stringify({ reason, at: new Date().toISOString() }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      console.warn(`[rebuild] webhook responded ${response.status}`)
    }
  } catch (error) {
    // A failed trigger must never break the editor's save.
    console.warn(
      `[rebuild] webhook failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Queue a rebuild.
 *
 * @param immediate Skip the debounce — used for breaking news.
 */
export function scheduleRebuild(options: { immediate?: boolean } = {}): void {
  if (!WEBHOOK_URL) return

  if (options.immediate) {
    void fire('breaking')
    return
  }

  const now = Date.now()
  if (pendingSince === 0) pendingSince = now

  // Under a continuous stream of edits, don't let the batch wait forever.
  if (now - pendingSince >= MAX_WAIT_MS) {
    pendingSince = 0
    void fire('max-wait')
    return
  }

  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    pendingSince = 0
    void fire('debounced')
  }, MIN_INTERVAL_MS)
  timer.unref?.()
}

/** True when the saved document is flagged as breaking news. */
const isBreaking = (doc: unknown): boolean =>
  Boolean((doc as { isBreaking?: boolean } | null | undefined)?.isBreaking)

/**
 * Attach the trigger to a collection.
 *
 * Exported rather than applied inside each collection file so the decision of
 * *which* collections rebuild the site stays visible in one place — the config.
 */
export function withRebuildTrigger<T extends CollectionConfig>(collection: T): T {
  return {
    ...collection,
    hooks: {
      ...collection.hooks,
      afterChange: [
        ...(collection.hooks?.afterChange ?? []),
        ({ doc }) => {
          scheduleRebuild({ immediate: isBreaking(doc) })
        },
      ],
      afterDelete: [
        ...(collection.hooks?.afterDelete ?? []),
        () => {
          scheduleRebuild()
        },
      ],
    },
  }
}

/** Attach the trigger to a global such as Site Settings. */
export function withRebuildTriggerGlobal<T extends GlobalConfig>(global: T): T {
  return {
    ...global,
    hooks: {
      ...global.hooks,
      afterChange: [
        ...(global.hooks?.afterChange ?? []),
        () => {
          scheduleRebuild()
        },
      ],
    },
  }
}
