/**
 * Every GitHub Actions workflow must parse, and must still declare its triggers.
 *
 * ## Why this file exists
 *
 * On 2026-10-10 a comment block was misplaced into `deploy.yml`'s `env:` mapping,
 * putting a shell line where a YAML key belonged. GitHub rejected the file and
 * **the only symptom was `HTTP 422: Workflow does not have 'workflow_dispatch'
 * trigger`** — surfacing long after the commit, from an action with nothing to do
 * with the edit.
 *
 * That is the worst shape of silent failure: the repository looks healthy, every
 * other check is green, and the workflow has simply stopped existing. Nothing
 * caught it. `verify-deploy-mode.mjs` executes a step's shell in isolation and
 * never parses the file around it; biome does not lint YAML; and the deploy
 * harness drives scripts, not workflows.
 *
 * ## Why it parses instead of pattern-matching
 *
 * The first version of this check used a regex for "shell command at a shallow
 * indent", and its own counter-proof **failed**: reintroducing the exact bug
 * printed a pass. The broken line sat at ten spaces of indent inside an `env:`
 * block, and the regex only looked at six. Guessing at YAML with a regex is the
 * same class of mistake the check exists to catch — an approximation that is
 * confidently wrong.
 *
 * So it parses. A structural parser cannot be fooled by indentation, quoting or
 * block scalars, which is the whole point: this file must be trustworthy about
 * the thing it is guarding.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

const workflowDir = join(dirname(dirname(fileURLToPath(import.meta.url))), '.github', 'workflows')

/** Workflows this repository dispatches by hand or from the CMS. */
const MUST_BE_DISPATCHABLE = new Set(['deploy.yml', 'host-health.yml', 'backup-db.yml'])

const files = readdirSync(workflowDir)
  .filter((name) => name.endsWith('.yml'))
  .sort()
const problems = []

for (const name of files) {
  const source = readFileSync(join(workflowDir, name), 'utf8')

  let doc
  try {
    doc = parse(source)
  } catch (error) {
    problems.push(`${name} — does not parse: ${String(error.message).split('\n')[0]}`)
    continue
  }

  // `on:` parses to the boolean `true` in YAML 1.1, which is why this looks odd.
  const triggers = doc.on ?? doc[true]
  if (!triggers || typeof triggers !== 'object') {
    problems.push(`${name} — has no trigger block at all`)
    continue
  }

  const found = Object.keys(triggers)
  if (!found.includes('workflow_dispatch') && MUST_BE_DISPATCHABLE.has(name)) {
    problems.push(
      `${name} — no workflow_dispatch trigger. It is dispatched by hand or by the CMS; ` +
        'without the trigger every attempt answers HTTP 422 and the workflow is silently gone.',
    )
  }

  // A step whose `run:` is not a string cannot execute; `run: [a, b]` parses fine.
  const brokenSteps = []
  for (const [jobName, job] of Object.entries(doc.jobs ?? {})) {
    for (const step of job.steps ?? []) {
      if (step.run !== undefined && typeof step.run !== 'string') {
        brokenSteps.push(`${jobName}/${step.name ?? 'unnamed'}`)
      }
    }
  }
  if (brokenSteps.length) problems.push(`${name} — non-string run: in ${brokenSteps.join(', ')}`)

  /**
   * The CI gate protects everything *below* it, so a build sitting below is the
   * correct arrangement. The failure is a build or upload sitting **above** it:
   * the gate then clears only after the work it was meant to authorise has
   * already happened, and the workflow still parses, still passes every other
   * check here, and still ships a red build.
   *
   * This is the same silent-failure shape as the import map (M29) — a control
   * that stops working without anything turning red — so it gets a check rather
   * than a comment asking people to remember the ordering.
   */
  const DOES_WORK = /next build|astro build|deploy-cms|deploy-frontend|payload migrate|migrate:create/
  for (const [jobName, job] of Object.entries(doc.jobs ?? {})) {
    const steps = job.steps ?? []
    const gateIndex = steps.findIndex((s) => typeof s.run === 'string' && s.run.includes('wait-for-ci'))
    if (gateIndex === -1) continue

    const earlyWork = steps
      .map((s, i) => ({ s, i }))
      .filter(({ s, i }) => i < gateIndex && typeof s.run === 'string' && DOES_WORK.test(s.run))
    if (earlyWork.length) {
      problems.push(
        `${name}/${jobName} — ${earlyWork.map((e) => e.s.name ?? 'unnamed step').join(', ')} ` +
          'runs ABOVE the CI gate. The gate would authorise the deploy only after that work had already happened.',
      )
    }

    // The override must be dispatch-only. If it ever applied to `push`, a bad
    // commit could set it and publish itself with no human in the loop.
    const gate = steps[gateIndex]
    const condition = gate.if ?? ''
    if (!/workflow_dispatch/.test(String(condition))) {
      problems.push(
        `${name}/${jobName} — the CI gate is not guarded by workflow_dispatch, so ` +
          'skip-ci-gate could apply to a push. Automatic publishing must never bypass CI.',
      )
    }
  }

  console.log(`✓ ${name}  [${found.join(', ')}]`)
}

for (const problem of problems) console.log(`✗ ${problem}`)

console.log(`\n${files.length - problems.length} workflows parsed, ${problems.length} problem(s)`)
process.exit(problems.length === 0 ? 0 : 1)
