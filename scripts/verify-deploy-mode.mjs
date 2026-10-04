/**
 * Counter-prove the deploy workflow's mode resolution by running it.
 *
 * ## Why this file exists
 *
 * Adversarial review found that the `Resolve mode and target` step fed the
 * free-text `AUTO_DEPLOY` repository variable straight into two comparisons made
 * in opposite senses:
 *
 *     [ "$MODE" = "live" ]              → gates the confirm-risk check
 *     mode == 'dry-run'                 → decides DEPLOY_DRY_RUN
 *
 * Setting `AUTO_DEPLOY` to `Live` made the first false, so the gate was skipped,
 * and the second false too, so the deploy went live. A casing slip in one
 * repository variable silently published to production.
 *
 * ## ⚠️ Why the block is extracted rather than copied
 *
 * The fix is shell inside a YAML file. A test that pasted that shell into itself
 * would prove the copy works and say nothing about the file that ships — which
 * is precisely the failure this project has already paid for twice (a harness
 * that reimplemented Apache's `.htaccess` matching instead of asking Apache).
 *
 * So the step's `run:` block is read out of `.github/workflows/deploy.yml` and
 * executed here, unmodified, under each combination that matters. Editing the
 * workflow breaks this test; that is the point.
 *
 * Run: node scripts/verify-deploy-mode.mjs
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
// Overridable for one reason: so this harness can be pointed at the *pre-fix*
// copy of the step to prove it fails there. A harness that has never been seen
// to fail is not evidence — and that copy is how the evidence is produced,
// without the shipped workflow ever being weakened to get it.
const workflow = process.env.DEPLOY_WORKFLOW ?? join(repoRoot, '.github', 'workflows', 'deploy.yml')

let passed = 0
const failures = []

/**
 * Assert one thing, recording the outcome rather than throwing.
 *
 * @param {string} name
 * @param {boolean} condition
 * @param {string} [detail]
 */
function check(name, condition, detail = '') {
  if (condition) {
    passed += 1
    console.log(`  ok   ${name}`)
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

/**
 * Pull the shell out of one named step of the deploy workflow.
 *
 * Read from the file rather than hardcoded so this harness tests what ships. The
 * block is a literal block scalar (`run: |`), so every content line carries the
 * step's indentation and the block ends at the first line that does not.
 *
 * @param {string} stepName The value of the step's `name:`.
 * @returns {string} the script body, dedented.
 * @throws {Error} if the step or its `run:` block is not found.
 */
function extractStep(stepName) {
  const lines = readFileSync(workflow, 'utf8').split('\n')
  const at = lines.findIndex((line) => line.trim() === `- name: ${stepName}`)
  if (at === -1) throw new Error(`step "${stepName}" not found in ${workflow}`)

  const runAt = lines.findIndex((line, i) => i > at && line.trim() === 'run: |')
  if (runAt === -1) throw new Error(`step "${stepName}" has no \`run: |\` block`)

  const indent = lines[runAt].length - lines[runAt].trimStart().length
  const body = []
  for (const line of lines.slice(runAt + 1)) {
    if (line.trim() === '') {
      body.push('')
      continue
    }
    if (line.length - line.trimStart().length <= indent) break
    body.push(line.slice(indent + 2))
  }
  if (body.length === 0) throw new Error(`step "${stepName}" has an empty \`run: |\` block`)
  return body.join('\n')
}

/**
 * Run the real step with the given environment and report what it did.
 *
 * @param {string} script The extracted shell.
 * @param {Record<string, string>} vars Environment for the step. These stand in
 *   for the `env:` block GitHub would provide, plus `GITHUB_OUTPUT`.
 * @returns {{code: number, output: string, stdout: string}}
 */
function run(script, vars) {
  const outputFile = join(mkdtempSync(join(tmpdir(), 'gho-')), 'output')
  try {
    const stdout = execFileSync('bash', [], {
      input: script,
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH,
        GITHUB_OUTPUT: outputFile,
        EVENT: 'repository_dispatch',
        // ⚠️ Every `env:` key GitHub declares is present, empty or not — an
        // expression that yields nothing still defines the variable. The step
        // runs under `set -euo pipefail`, so omitting one here would fail on an
        // `unbound variable` that cannot happen in a real run. These defaults
        // reproduce what Actions actually provides.
        INPUT_MODE: '',
        INPUT_TARGET: '',
        INPUT_REASON: '',
        INPUT_CONFIRM: '',
        PAYLOAD_REASON: '',
        AUTO_DEPLOY: '',
        ...vars,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return { code: 0, output: readFileSync(outputFile, 'utf8'), stdout }
  } catch (error) {
    return {
      code: error.status ?? 1,
      output: error.status === undefined ? '' : safeRead(outputFile),
      stdout: `${error.stdout ?? ''}${error.stderr ?? ''}`,
    }
  }
}

/**
 * Read a file, tolerating the case where the step failed before creating it.
 *
 * @param {string} path
 * @returns {string}
 */
function safeRead(path) {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return ''
  }
}

/** Read one key out of a `GITHUB_OUTPUT` body. */
const readOut = (output, key) =>
  output
    .split('\n')
    .find((line) => line.startsWith(`${key}=`))
    ?.slice(key.length + 1)

/** Run the whole harness. */
function main() {
  const script = extractStep('Resolve mode and target')
  console.log('\n1. The publish webhook defaults to a dry run')
  {
    const { code, output } = run(script, {})
    check('exits cleanly', code === 0, String(code))
    check('mode is dry-run', readOut(output, 'mode') === 'dry-run', output)
    check('dry_run is true', readOut(output, 'dry_run') === 'true', output)
    check('target is static', readOut(output, 'target') === 'static', output)
  }

  console.log('\n2. AUTO_DEPLOY=live is honoured')
  {
    const { code, output } = run(script, { AUTO_DEPLOY: 'live' })
    check('exits cleanly', code === 0, String(code))
    check('mode is live', readOut(output, 'mode') === 'live', output)
    check(
      'dry_run is false — the host will be mutated',
      readOut(output, 'dry_run') === 'false',
      output,
    )
  }

  console.log('\n3. ⚠️ The bug this exists to prevent: a differently-cased value')
  {
    // `Live` used to skip the confirm-risk gate *and* read as live, because two
    // comparisons read the same string in opposite senses. Both must now agree.
    for (const value of ['Live', 'LIVE', ' live ', 'live\n']) {
      const { output, stdout } = run(script, { AUTO_DEPLOY: value })
      check(
        `AUTO_DEPLOY=${JSON.stringify(value)} normalises to live`,
        readOut(output, 'mode') === 'live' && readOut(output, 'dry_run') === 'false',
        output,
      )
      check(
        `AUTO_DEPLOY=${JSON.stringify(value)} warns that it is live`,
        stdout.includes('LIVE DEPLOY'),
        stdout,
      )
    }
    for (const value of ['Dry-Run', 'DRY-RUN', ' dry-run ']) {
      const { output } = run(script, { AUTO_DEPLOY: value })
      check(
        `AUTO_DEPLOY=${JSON.stringify(value)} normalises to dry-run`,
        readOut(output, 'mode') === 'dry-run' && readOut(output, 'dry_run') === 'true',
        output,
      )
    }
  }

  console.log('\n4. An unrecognised mode is refused, never guessed')
  {
    for (const value of ['yes', '1', 'true', 'deploy', 'dry']) {
      const { code, stdout } = run(script, { AUTO_DEPLOY: value })
      check(`AUTO_DEPLOY=${JSON.stringify(value)} exits non-zero`, code !== 0, String(code))
      check(
        `AUTO_DEPLOY=${JSON.stringify(value)} says what to use instead`,
        stdout.includes("Use 'live' or 'dry-run'"),
        stdout,
      )
    }

    // An empty or absent AUTO_DEPLOY is *not* an error. The variable is
    // optional — that is the whole point of defaulting it to planning only — so
    // empty must mean "plan, do not publish", never "refuse to run".
    const empty = run(script, { AUTO_DEPLOY: '' })
    check('an empty AUTO_DEPLOY is a dry run, not a failure', empty.code === 0, empty.stdout)
    check('and it does not mutate', readOut(empty.output, 'dry_run') === 'true', empty.output)
  }

  console.log('\n5. A live CMS deploy still needs confirm-risk')
  {
    const dispatch = (extra) => run(script, { EVENT: 'workflow_dispatch', ...extra })

    const unconfirmed = dispatch({
      INPUT_MODE: 'live',
      INPUT_TARGET: 'all',
      INPUT_CONFIRM: 'false',
    })
    check('refuses a live all-target deploy without confirm-risk', unconfirmed.code !== 0)
    check('says how to proceed', unconfirmed.stdout.includes('confirm-risk: true'))

    const confirmed = dispatch({ INPUT_MODE: 'live', INPUT_TARGET: 'all', INPUT_CONFIRM: 'true' })
    check('allows it once confirmed', confirmed.code === 0, confirmed.stdout)
    check('and reports dry_run=false', readOut(confirmed.output, 'dry_run') === 'false')

    const staticOnly = dispatch({
      INPUT_MODE: 'live',
      INPUT_TARGET: 'static',
      INPUT_CONFIRM: 'false',
    })
    check('a live static deploy needs no confirmation', staticOnly.code === 0, staticOnly.stdout)
  }

  console.log('\n6. An unrecognised target is refused')
  {
    const { code, stdout } = run(script, {
      EVENT: 'workflow_dispatch',
      INPUT_MODE: 'dry-run',
      INPUT_TARGET: 'everything',
      INPUT_CONFIRM: 'false',
    })
    check('exits non-zero', code !== 0, String(code))
    check('names the valid values', stdout.includes("Use 'all', 'static' or 'cms'"), stdout)
  }

  console.log(
    `\n${failures.length === 0 ? '✅' : '❌'} ${passed} passed, ${failures.length} failed`,
  )
  if (failures.length > 0) {
    for (const failure of failures) console.error(`   - ${failure}`)
    process.exit(1)
  }
}

main()
