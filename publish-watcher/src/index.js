/**
 * Publish watcher (T-19) — Shikkha24 CMS → automatic site rebuild.
 *
 * Runs on a 5-minute cron. Polls the CMS's PUBLIC REST endpoints, builds a
 * SHA-256 digest of the published content state, and compares it with the
 * last digest stored in Workers KV. On change it fires the same
 * `repository_dispatch` (event_type: `rebuild`) that the CMS webhook used to
 * send — the event `deploy-cloudflare.yml` consumes to build and publish.
 *
 * Why it exists: the CMS's own webhook (`DEPLOY_WEBHOOK_URL`,
 * cms/src/lib/rebuild-trigger.ts) can never be configured on DianaHost — the
 * host's shell cannot fork, so saving the env var in cPanel fails outright
 * (ticket #0590191). The watcher watches from outside the host entirely.
 *
 * Guardrails:
 * - The digest is stored ONLY after a successful dispatch. If the dispatch
 *   fails (missing token, GitHub down), the next tick re-detects the change
 *   and retries — a publish is never lost or double-dispatched.
 * - The polled endpoints are the public REST API, which returns only
 *   published documents — draft saves cannot trigger a rebuild.
 * - `POST /run-tick` requires the `X-Tick-Secret` header matching the
 *   `TICK_SECRET` Worker secret, and is closed (404) when that secret is unset.
 *   It was open until 2026-10-16; see `isAuthorizedTick` for why the original
 *   "safe unauthenticated" reasoning did not hold.
 * - ONE default export holding both handlers: module Workers resolve mixed
 *   named/default exports to the default object alone, which silently breaks
 *   the cron handler (observed live: "Handler does not export a scheduled()").
 * - Design + operations: docs/hosting-and-deployment.md §10.6.
 */

/** Public REST endpoints probed each tick (verified 200 on 2026-10-15). */
const CMS_ENDPOINTS = [
  '/api/articles?limit=1&sort=-updatedAt&depth=0',
  '/api/deadlines?limit=1&sort=-updatedAt&depth=0',
  '/api/categories?limit=1&sort=-updatedAt&depth=0',
  '/api/scholarships?limit=1&sort=-updatedAt&depth=0',
  '/api/circulars?limit=1&sort=-updatedAt&depth=0',
  '/api/live-streams?limit=1&sort=-updatedAt&depth=0',
  '/api/media?limit=1&sort=-updatedAt&depth=0',
  '/api/globals/site-settings',
]

/**
 * Fetch every endpoint and hash the concatenated state.
 * Any failed fetch returns null — an unknown state never dispatches.
 *
 * @param {string} cmsOrigin — e.g. https://cms.shikkha24.com
 * @returns {Promise<string|null>} hex digest, or null when probing failed
 */
async function buildDigest(cmsOrigin) {
  const parts = []
  for (const path of CMS_ENDPOINTS) {
    const res = await fetch(cmsOrigin + path, { cache: 'no-store' })
    if (!res.ok) {
      console.error(`probe failed: ${path} → ${res.status}`)
      return null
    }
    // The endpoint path is part of the hash so adding/removing an endpoint
    // changes the digest on the next tick even with unchanged content.
    parts.push(`${path}\n${await res.text()}`)
  }
  const data = new TextEncoder().encode(parts.sort().join('\x1e'))
  const hash = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * One tick's business logic — shared by the cron handler and /run-tick.
 * Compares state, dispatches on change, persists only on success.
 *
 * @param {{ PUBLISH_WATCHER: KvNamespace, CMS_ORIGIN: string,
 *          GITHUB_REPO: string, GITHUB_TOKEN?: string }} env
 * @returns {Promise<{action: 'unchanged'|'dispatched'|'skipped'|'failed',
 *                     reason?: string}>}
 */
async function runTick(env) {
  const { PUBLISH_WATCHER: kv, CMS_ORIGIN, GITHUB_REPO, GITHUB_TOKEN } = env
  const digest = await buildDigest(CMS_ORIGIN)
  if (digest === null) return { action: 'skipped', reason: 'cms unreachable' }
  const last = await kv.get('digest')
  if (last === digest) return { action: 'unchanged' }
  if (!GITHUB_TOKEN) {
    console.error('content changed but GITHUB_TOKEN is not set — dispatch skipped, will retry')
    return { action: 'skipped', reason: 'no token' }
    // not stored: the first tick after the token lands dispatches immediately
  }
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      // GitHub REJECTS API calls without a User-Agent, and Workers' fetch
      // sends none by default — the cause of every 403 we saw (2026-10-15).
      'User-Agent': 'shikkha24-publish-watcher/1.0',
    },
    body: JSON.stringify({ event_type: 'rebuild' }),
  })
  if (!res.ok) {
    // Log GitHub's own message — it distinguishes bad-token (401) from
    // missing-permission (403) and names the missing scope.
    const detail = (await res.text()).slice(0, 300)
    console.error(
      `dispatch failed with HTTP ${res.status} — digest not stored, will retry: ${detail}`,
    )
    // ⚠️ The status only, NOT `detail`. GitHub's error body quotes the request
    // path, so returning it would disclose the private repo name (`GITHUB_REPO`
    // in wrangler.toml) to whoever can read this response. The full text still
    // reaches the operator through the log line above, which is where it is
    // actually useful — a caller does not need it to act on.
    return { action: 'failed', reason: `HTTP ${res.status}` }
  }
  await kv.put('digest', digest)
  console.log(`rebuild dispatched — ${digest.slice(0, 12)} (was ${String(last).slice(0, 12)})`)
  return { action: 'dispatched' }
}

/**
 * Constant-time string compare, so the secret cannot be recovered a byte at a
 * time by timing repeated guesses. Length is allowed to short-circuit: the
 * length of a fixed-size secret is not the secret.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function secretEquals(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * Authorises `POST /run-tick`.
 *
 * ## Why this route needs a secret at all
 *
 * It was previously open, on the reasoning that it is "safe unauthenticated…
 * idempotent (the digest is stored only on success)". That reasoning holds only
 * while the GitHub dispatch SUCCEEDS — and the digest is written only after a 2xx
 * (see `runTick`). While dispatch is failing, for any reason, the stored digest
 * stays null, so the `last === digest` guard never matches and **every** call
 * reaches the GitHub API. An anonymous caller could therefore spend a full
 * Actions build per request, against a budget that is already exhausted, and
 * make unlimited CMS requests besides. The guard was absent exactly when it was
 * needed.
 *
 * ## Why a header secret rather than removing the route
 *
 * The route exists so the operator can force a tick without waiting up to five
 * minutes for the cron. Removing it would take away a real operational tool; a
 * secret keeps it and closes the abuse path.
 *
 * ## Fails closed
 *
 * With no `TICK_SECRET` configured, the route is unreachable rather than open.
 * That is deliberate: a missing secret must not silently restore the old
 * behaviour. Set it with `wrangler secret put TICK_SECRET` (or the dashboard) —
 * the same mechanism `GITHUB_TOKEN` already uses, and `keep_vars = true` in
 * `wrangler.toml` keeps dashboard secrets across redeploys.
 *
 * @param {Request} request
 * @param {{ TICK_SECRET?: string }} env
 * @returns {Promise<boolean>}
 */
async function isAuthorizedTick(request, env) {
  if (!env.TICK_SECRET) {
    console.error('run-tick refused: TICK_SECRET is not set (route is closed until it is)')
    return false
  }
  return secretEquals(request.headers.get('X-Tick-Secret') ?? '', env.TICK_SECRET)
}

/**
 * Single module-Worker default export — `scheduled` (cron) and `fetch` (HTTP)
 * both live here for the mixed-export reason in the file header.
 */
export default {
  /**
   * Cron entry, fired every 5 minutes by the [triggers] schedule.
   *
   * @param {{ cron: string }} _controller — unused
   * @param {{ PUBLISH_WATCHER: KvNamespace, CMS_ORIGIN: string,
   *          GITHUB_REPO: string, GITHUB_TOKEN?: string }} env
   */
  async scheduled(_controller, env) {
    await runTick(env)
  },

  /**
   * HTTP entry: /health for inspection, POST /run-tick for on-demand ticks.
   *
   * @param {Request} request
   * @param {{ PUBLISH_WATCHER: KvNamespace, GITHUB_TOKEN?: string,
   *          TICK_SECRET?: string, CMS_ORIGIN: string }} env
   */
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/health') {
      const lastDigest = await env.PUBLISH_WATCHER.get('digest')
      return Response.json({
        ok: true,
        hasToken: Boolean(env.GITHUB_TOKEN),
        lastDigest: lastDigest ? lastDigest.slice(0, 12) : null,
        polling: CMS_ENDPOINTS.length,
      })
    }
    if (url.pathname === '/run-tick' && request.method === 'POST') {
      // Ops: run the same digest-change-gated tick on demand (no cron wait).
      if (!(await isAuthorizedTick(request, env))) {
        // 404, not 401: an unauthorised caller should not learn the route exists.
        return new Response('Not found', { status: 404 })
      }
      return Response.json(await runTick(env))
    }
    return new Response('Not found', { status: 404 })
  },
}
