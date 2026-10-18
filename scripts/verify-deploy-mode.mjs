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

/**
 * Read one key out of a `GITHUB_OUTPUT` body.
 *
 * ⚠️ **This models GitHub's own parse rule, not just `key=value`.** The step
 * writes every key as a heredoc (`name<<DELIM … DELIM`) precisely so a value
 * cannot forge additional records, and GitHub parses that form: the opener
 * takes every line up to the delimiter that closes the block LAST (a crafted
 * value cannot close it early — the delimiter is random per run). A reader that
 * only understood `key=value` would compare `undefined` against the expected
 * value and report FAIL on output that is correct, which is what happened when
 * the hardening landed. Modelling only `key=value` here would also make this
 * harness unable to see the very injection it exists to guard, so the heredoc
 * branch is not optional.
 *
 * @param {string} output the `GITHUB_OUTPUT` file body.
 * @param {string} key
 * @returns {string|undefined}
 */
const readOut = (output, key) => {
  const lines = output.split('\n')
  let value
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    // ⚠️ Skip the body of ANY heredoc block, whatever its name.
    //
    // Without this the reader walks into the `reason` block and treats a
    // payload such as `target=cms…` — which legitimately sits there as inert
    // DATA, contained by the delimiter — as a real `target` record, and reports
    // the injected value as the true one. A checker that reconstructs the
    // forgery from contained data is worse than no checker: it would fail a
    // correctly-hardened workflow and send someone to "fix" the write.
    if (/^[A-Za-z_][A-Za-z0-9_]*<<[A-Za-z0-9_]+$/.test(line)) {
      const delim = line.slice(line.indexOf('<<') + 2)
      // ⚠️ The LAST matching delimiter closes the block, so an attacker-supplied
      // line equal to the delimiter earlier in the body cannot shorten it.
      for (let j = i + 1; j < lines.length; j += 1) {
        if (lines[j] === delim) {
          if (line.startsWith(`${key}<<`)) value = lines.slice(i + 1, j).join('\n')
          i = j
          break
        }
      }
      continue
    }
    // Only a bare `key=value` line outside every block is a plain record.
    if (line.startsWith(`${key}=`)) value = line.slice(key.length + 1)
  }
  return value
}

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

  console.log('\n7. ⚠️ A push to main follows AUTO_DEPLOY, and can never reach the CMS')
  {
    // ⚠️ This section exists because the `push` branch was added with NO coverage.
    // That is the same defect that hid all three deploy bugs: a harness that only
    // exercises the branches it was written against passes forever while the new
    // one is wrong. So the push path is asserted in full — including the two
    // properties that actually protect the site.
    const pushed = (extra) => run(script, { EVENT: 'push', ...extra })

    const byDefault = pushed({})
    check('exits cleanly', byDefault.code === 0, byDefault.stdout)
    check(
      'defaults to a dry run, so a push cannot publish by accident',
      readOut(byDefault.output, 'dry_run') === 'true',
      byDefault.output,
    )
    check('mode is dry-run', readOut(byDefault.output, 'mode') === 'dry-run', byDefault.output)

    const live = pushed({ AUTO_DEPLOY: 'live' })
    check('AUTO_DEPLOY=live is honoured', readOut(live.output, 'dry_run') === 'false', live.output)
    check('mode is live', readOut(live.output, 'mode') === 'live', live.output)

    // The property that matters most: a push is a *frontend* deploy. The CMS
    // bundle is extracted over the app directory and can disturb the CloudLinux
    // venv symlinks in node_modules, taking /admin down unattended.
    for (const [label, vars] of [
      ['a default push', {}],
      ['a live push', { AUTO_DEPLOY: 'live' }],
      ['a mis-cased live push', { AUTO_DEPLOY: 'Live' }],
    ]) {
      const result = pushed(vars)
      check(
        `${label} targets static only — never the CMS`,
        readOut(result.output, 'target') === 'static',
        `${label}: ${result.output || result.stdout}`,
      )
    }

    // `confirm-risk` is a workflow_dispatch input. A push has no inputs at all,
    // so if the branch ever fell through to the input branch it would see an
    // empty INPUT_MODE and be REFUSED for an unrecognised mode. A push that
    // exits non-zero would silently stop deploying the website.
    check(
      'a push needs no confirm-risk and is not refused for a missing input',
      byDefault.code === 0,
      byDefault.stdout,
    )

    // A push cannot smuggle a live CMS deploy through by naming a target.
    const sneaky = pushed({ AUTO_DEPLOY: 'live', INPUT_TARGET: 'cms', INPUT_CONFIRM: 'true' })
    check(
      'an input cannot redirect a push at the CMS',
      readOut(sneaky.output, 'target') === 'static',
      sneaky.output,
    )
  }

  console.log('\n8. ⚠️ T-62: a crafted reason cannot forge another output record')
  {
    // ⚠️ This section exists because the reason is the one value in this step
    // that is free text from OUTSIDE the workflow: on `workflow_dispatch` it is
    // an operator string, and on `repository_dispatch` it is
    // `client_payload.reason`, which any actor holding a token with the `repo`
    // scope controls completely. `$GITHUB_OUTPUT` is a record-oriented file, so
    // a newline in that value used to end the `reason=` record early and let
    // the rest of the value become records of its own — `target=cms`,
    // `dry_run=false` — which the deploy steps below consume. The step now
    // allow-lists, strips and writes through a per-run random heredoc
    // delimiter, and every assertion here is on the PARSED output, read with
    // the same rule GitHub uses.
    const dispatch = (reason, extra) =>
      run(script, {
        EVENT: 'workflow_dispatch',
        // A legitimate dispatch: dry run, static target. The reason is the ONLY
        // untrusted value under test, so the attack cannot be confused with the
        // step correctly refusing a missing mode/target.
        INPUT_MODE: 'dry-run',
        INPUT_TARGET: 'static',
        INPUT_CONFIRM: 'false',
        INPUT_REASON: reason,
        ...extra,
      })

    // ⚠️ The property is "no forged RECORD", not "the text never appears".
    // The payload legitimately survives inside the `reason` heredoc as inert
    // data — stripping it is not the defence, containment is. Counting every
    // line that looks like an assignment would match that contained text and
    // report a forgery that does not exist. So the count skips block bodies:
    // it counts only record openers at the file's top level.
    const recordCount = (text, key) => {
      const lines = text.split('\n')
      let n = 0
      for (let i = 0; i < lines.length; i += 1) {
        const opener = /^([A-Za-z_][A-Za-z0-9_]*)<<([A-Za-z0-9_]+)$/.exec(lines[i])
        if (opener) {
          const delim = opener[2]
          if (opener[1] === key) n += 1
          for (let j = i + 1; j < lines.length; j += 1) {
            if (lines[j] === delim) {
              i = j
              break
            }
          }
          continue
        }
        if (lines[i].startsWith(`${key}=`)) n += 1
      }
      return n
    }

    const attacks = [
      ['a newline forges target=cms', 'x\ntarget=cms'],
      ['a newline forges dry_run=false', 'x\ndry_run=false'],
      ['CRLF forges a record', 'x\r\ntarget=cms'],
      ['a blank line forges a record', 'x\n\ntarget=cms'],
      ['a guessed fixed delimiter is closed early', 'x\nEOF\ntarget=cms\nEOF'],
      ['a delimiter-shaped value forges a record', 'x\nEOF_x\ntarget=cms'],
      ['a tab forges a record', 'x\ttarget=cms'],
      ['the whole value is only records', '\ntarget=cms\ndry_run=false\n'],
    ]
    for (const [label, reason] of attacks) {
      const { output, stdout } = dispatch(reason)
      check(
        `${label} — target stays static`,
        readOut(output, 'target') === 'static',
        `${output || stdout}`,
      )
      check(`${label} — dry_run stays true`, readOut(output, 'dry_run') === 'true', output)
      check(
        `${label} — exactly one record per name, so nothing was forged`,
        recordCount(output, 'target') === 1 &&
          recordCount(output, 'dry_run') === 1 &&
          recordCount(output, 'mode') === 1 &&
          recordCount(output, 'reason') === 1,
        output,
      )
    }

    // ⚠️ Negative control: the guard must be able to SEE the defect. The
    // pre-fix writer is reproduced here — one bare `echo "reason=$REASON"` —
    // and the forged `target=cms` record must appear. Without this, section 8
    // would pass just as happily against a harness that cannot detect the
    // injection at all (M18: a check that has never been seen to fail).
    const naive = (reason) => {
      const file = join(mkdtempSync(join(tmpdir(), 'gho-')), 'output')
      try {
        execFileSync('bash', [], {
          input: 'set -euo pipefail\necho "reason=$REASON" >> "$GITHUB_OUTPUT"\n',
          encoding: 'utf8',
          env: { PATH: process.env.PATH, GITHUB_OUTPUT: file, REASON: reason },
          stdio: ['pipe', 'pipe', 'pipe'],
        })
      } catch {
        // The legacy writer is a single echo and cannot realistically fail; an
        // empty read below makes the negative control fail loudly if it does.
      }
      return safeRead(file)
    }
    check(
      'negative control: the pre-fix `reason=` write DOES forge target=cms',
      /^target=cms$/m.test(naive('x\ntarget=cms')),
      'if this fails, section 8 proves nothing',
    )
    check(
      'and the hardened step does NOT, on the same input',
      !/^target=/m.test(dispatch('x\ntarget=cms').output),
    )
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
