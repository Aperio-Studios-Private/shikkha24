#!/usr/bin/env node
/**
 * Wait for CI to conclude on a given SHA, and fail unless it passed.
 *
 * ## Why this exists
 *
 * `deploy.yml` triggers on `push` and on `workflow_dispatch`, and until this gate
 * it never waited on `ci.yml`. Two builds reached the host on 2026-10-11 carrying
 * code that did not do what it claimed:
 *
 *   * the browser-side image optimiser was inert, because `importMap.js` had never
 *     been regenerated — nothing caught this at all except a browser console log
 *   * removing `imageSizes` changed the schema with no migration committed — CI
 *     caught it, one push later, after it had already shipped
 *
 * Both gaps now have their own gates. Those stop the *next* occurrence. This is the
 * control that stops the deploy that would have carried it.
 *
 * ## Why it polls instead of using `workflow_run`
 *
 * `workflow_run` would mean restructuring the triggers, and it fires on the
 * *workflow*, not the commit — so a manual `workflow_dispatch` and a push for the
 * same SHA would race. Polling the API for the CI run whose `head_sha` matches is
 * the only approach that is correct for all three entry points: push,
 * `workflow_dispatch`, and the publish webhook's `repository_dispatch`.
 *
 * ## Why it fails closed
 *
 * A missing CI run is treated as a failure, not a pass. "I could not find evidence
 * that this was tested" and "this was tested and passed" must not look the same,
 * or the gate can be bypassed simply by deleting the CI run.
 *
 * ## Why polling is bounded
 *
 * CI runs ~3 minutes. The deploy job has a 25-minute budget, so a generous ceiling
 * is safe and a hung poll can never consume the whole job.
 */

import { setTimeout as sleep } from 'node:timers/promises'

const API = 'https://api.github.com'
const REPO = process.env.GITHUB_REPOSITORY
const SHA = process.env.GITHUB_SHA
const TOKEN = process.env.GITHUB_TOKEN
/** Bounded so a CI run that never reports cannot eat the deploy job's 25 minutes. */
const DEADLINE_MS = Number(process.env.CI_GATE_TIMEOUT_MS ?? 15 * 60 * 1000)
const POLL_MS = 15_000

if (!REPO || !SHA || !TOKEN) {
  console.error('CI_GATE: GITHUB_REPOSITORY, GITHUB_SHA and GITHUB_TOKEN are all required')
  process.exit(1)
}

/**
 * Ask GitHub for the CI run covering this SHA.
 *
 * @param {string} sha the commit to look for.
 * @returns {Promise<{run: object|null, fatal: string|null}>} the run, or a fatal reason the poll must stop for.
 */
async function findCiRun(sha) {
  const url = `${API}/repos/${REPO}/actions/workflows/ci.yml/runs?head_sha=${sha}&per_page=5`
  let res
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
  } catch (err) {
    // Network blips are genuinely transient — keep polling.
    console.error(`CI_GATE: network error listing CI runs (${err.message})`)
    return { run: null, fatal: null }
  }

  if (!res.ok) {
    // 401/403/404 will not fix themselves: the token lacks `actions: read`, or
    // the workflow does not exist. Retrying for the full 15 minutes turns a
    // one-second misconfiguration into a 15-minute deploy timeout — which is
    // exactly what the first live run of this gate did, because
    // `permissions: contents: read` in deploy.yml withholds `actions: read`.
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      return {
        run: null,
        fatal:
          `GitHub API returned ${res.status} listing CI runs. This is not transient — ` +
          'the GITHUB_TOKEN cannot read Actions runs. Give the workflow `actions: read` ' +
          'in its `permissions:` block.',
      }
    }
    // 5xx and rate limits are transient.
    console.error(`CI_GATE: GitHub API returned ${res.status} listing CI runs`)
    return { run: null, fatal: null }
  }

  const body = await res.json()
  const runs = body.workflow_runs ?? []
  // Prefer a finished run if several exist for this SHA.
  return { run: runs.find((r) => r.status === 'completed') ?? runs[0] ?? null, fatal: null }
}

const started = Date.now()
console.log(`CI_GATE: waiting for a CI verdict on ${SHA.slice(0, 7)}`)

let run = null
let fatal = null
while (Date.now() - started < DEADLINE_MS) {
  ;({ run, fatal } = await findCiRun(SHA))
  if (fatal) break
  if (run && run.status === 'completed') break
  await sleep(POLL_MS)
}

if (fatal) {
  console.error(`CI_GATE: ${fatal}`)
  process.exit(1)
}

if (!run) {
  console.error(
    `CI_GATE: no CI run exists for ${SHA.slice(0, 7)}. Failing closed — an untested commit must not publish.`,
  )
  process.exit(1)
}

if (run.status !== 'completed') {
  console.error(
    `CI_GATE: CI did not conclude within ${Math.round(DEADLINE_MS / 60000)} minutes (last status "${run.status}"). Failing closed.`,
  )
  process.exit(1)
}

console.log(`CI_GATE: CI concluded "${run.conclusion}" — ${run.html_url}`)

if (run.conclusion !== 'success') {
  console.error(
    `CI_GATE: refusing to deploy. CI concluded "${run.conclusion}" for ${SHA.slice(0, 7)}.`,
  )
  console.error(`CI_GATE: see ${run.html_url}`)
  process.exit(1)
}

console.log(`CI_GATE: passed after ${Math.round((Date.now() - started) / 1000)}s`)
