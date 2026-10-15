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
 * - Single `default` export: module Workers resolve mixed named/default
 *   exports to the default object alone, which silently breaks the cron
 *   handler (observed live: "Handler does not export a scheduled()").
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
 * One tick's business logic — shared by the cron handler and tests.
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
    },
    body: JSON.stringify({ event_type: 'rebuild' }),
  })
  if (!res.ok) {
    console.error(`dispatch failed with HTTP ${res.status} — digest not stored, will retry`)
    return { action: 'failed', reason: `HTTP ${res.status}` }
  }
  await kv.put('digest', digest)
  console.log(`rebuild dispatched — ${digest.slice(0, 12)} (was ${String(last).slice(0, 12)})`)
  return { action: 'dispatched' }
}

/**
 * Single module-Worker default export. `scheduled` is the cron entry;
 * `fetch` serves /health for manual inspection (docs §10.6).
 */
export default {
  /**
   * @param {{ cron: string }} _controller — unused
   * @param {{ PUBLISH_WATCHER: KvNamespace, CMS_ORIGIN: string,
   *          GITHUB_REPO: string, GITHUB_TOKEN?: string }} env
   */
  async scheduled(_controller, env) {
    await runTick(env)
  },

  /**
   * @param {Request} request
   * @param {{ PUBLISH_WATCHER: KvNamespace, GITHUB_TOKEN?: string,
   *          CMS_ORIGIN: string }} env
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
    return new Response('Not found', { status: 404 })
  },
}
