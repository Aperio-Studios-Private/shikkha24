#!/usr/bin/env node
/**
 * Counter-proof: every `inputs.*` a step reads is one `workflow_dispatch` actually declares.
 *
 * ## The defect this prevents
 *
 * `DEPLOY_CMS_ROOT` was wired to `${{ inputs.cms-root || vars.DEPLOY_CMS_ROOT }}`
 * while `cms-root` existed **only there**. It was never declared in the
 * `workflow_dispatch` block, so GitHub had nothing to bind it to and
 * `inputs.cms-root` evaluated to the empty string on every run.
 *
 * ## ⚠️ Why nothing caught it
 *
 * GitHub Actions does **not** reject an undeclared input. There is no error, no
 * warning, and no failure — the expression simply yields `''` and the `||`
 * falls through to the default. The workflow runs green and writes to the
 * directory the override was supposed to have redirected away from.
 *
 * That is the same shape as M22 (a check that can only fail in CI) inverted:
 * a reference that cannot fail *at all*, silently taking the production branch
 * of a fallback whose whole purpose was to avoid production. The staging
 * rehearsal — the one thing standing between a first extract and
 * `~/shikkha24-cms` — would have written to production anyway, and reported that
 * it had gone to staging.
 *
 * ## What is asserted
 *
 * 1. Every `inputs.<name>` referenced anywhere in the file is declared under
 *    `workflow_dispatch.inputs`.
 * 2. `cms-root` is not merely declared but **read** — an input nothing consumes
 *    is the same defect wearing a different hat.
 * 3. The deploy step's `DEPLOY_CMS_ROOT` genuinely comes from that input.
 *
 * Section 3's counter-proof feeds a copy with the declaration removed and
 * requires the checks to fail, because otherwise "the workflow is consistent"
 * would be equally consistent with "this harness cannot detect the defect" (M18).
 *
 * Run: node scripts/verify-deploy-inputs.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
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
 * Names declared under `workflow_dispatch:` → `inputs:`.
 *
 * Parsed by indentation rather than with a YAML library: the block is a plain
 * two-level map, the file already relies on line structure elsewhere
 * (`verify-deploy-mode.mjs` extracts `run:` blocks the same way), and pulling in
 * a parser for this would add a dependency for less than it guarantees. A
 * mis-indented workflow fails the `verify` step's own YAML parse in CI first.
 *
 * @param {string} text The workflow source.
 * @returns {string[]}
 */
function declaredInputs(text) {
  const lines = text.split('\n')
  const dispatch = lines.findIndex((line) => line.trim() === 'workflow_dispatch:')
  if (dispatch === -1) return []

  // Indentation is compared, not hardcoded: `workflow_dispatch:` is at two
  // spaces and `inputs:` sits one level under it. Pinning a literal count is
  // what made the first version of this function find nothing at all.
  const dispatchIndent = lines[dispatch].length - lines[dispatch].trimStart().length
  const inputAt = lines.findIndex((line, i) => {
    if (i <= dispatch || line.trim() !== 'inputs:') return false
    return line.length - line.trimStart().length > dispatchIndent
  })
  if (inputAt === -1) return []

  // Inputs sit at six spaces; the block ends at the first line at or below the
  // indentation of `workflow_dispatch:` itself.
  const indent = lines[inputAt].length - lines[inputAt].trimStart().length
  const names = []
  for (const line of lines.slice(inputAt + 1)) {
    if (line.trim() === '') continue
    const at = line.length - line.trimStart().length
    if (at <= indent) break
    if (at === indent + 2) names.push(line.trim().replace(/:$/, ''))
  }
  return names
}

/**
 * Every `inputs.<name>` the file reads, in order of first appearance.
 *
 * @param {string} text
 * @returns {string[]}
 */
function referencedInputs(text) {
  const seen = new Set()
  for (const match of text.matchAll(/\binputs\.([a-z][a-z0-9-]*)/gi)) seen.add(match[1])
  return [...seen]
}

/** Read the value of one env key on a named step, or undefined. */
function stepEnvValue(text, stepName, key) {
  const lines = text.split('\n')
  const at = lines.findIndex((line) => line.trim() === `- name: ${stepName}`)
  if (at === -1) return undefined
  for (const line of lines.slice(at, at + 40)) {
    const match = new RegExp(`^\\s+${key}:\\s*(.+)$`).exec(line)
    if (match) return match[1].trim()
  }
  return undefined
}

const text = readFileSync(workflow, 'utf8')

console.log('\n1. Every referenced input is declared')
{
  const declared = declaredInputs(text)
  const referenced = referencedInputs(text)
  const undeclared = referenced.filter((name) => !declared.includes(name))

  check('the workflow declares inputs', declared.length > 0, declared.join(', ') || 'none found')
  for (const name of undeclared) {
    check(
      `"${name}" is read by a step but not declared in workflow_dispatch`,
      false,
      'GitHub yields an empty string for an undeclared input — no error, no warning',
    )
  }
  check(
    'no input is referenced without being declared',
    undeclared.length === 0,
    undeclared.join(', '),
  )
  check(
    'and none is declared without being referenced',
    referenced.length === declared.length,
    `declared: ${declared.join(', ')} / referenced: ${referenced.join(', ')}`,
  )
}

console.log('\n2. The staging escape hatch is real — declared AND read')
{
  const declared = declaredInputs(text)
  check('cms-root is declared', declared.includes('cms-root'), declared.join(', '))

  const value = stepEnvValue(text, 'Deploy the CMS to ~/shikkha24-cms', 'DEPLOY_CMS_ROOT')
  check('the deploy step reads DEPLOY_CMS_ROOT', value !== undefined)
  check('and it comes from inputs.cms-root', /inputs\.cms-root/.test(value ?? ''), value ?? '')
  check(
    'falling back to the repository variable, not to a hardcoded path',
    /vars\.DEPLOY_CMS_ROOT/.test(value ?? ''),
    value ?? '',
  )
}

console.log('\n3. ⚠️ COUNTER-PROOF: these checks fail when the declaration is removed')
{
  // Without this, "the workflow is consistent" would be equally consistent with
  // "this harness cannot see an undeclared input" — M18, the same mistake in a
  // new place. The copy is only ever in memory; the shipped workflow is never
  // weakened to produce the evidence.
  const stripped = text.replace(/^ {6}cms-root:\n(?:^ {8}.*\n|^\n)*/m, '')
  check('the copy really did lose its declaration', !declaredInputs(stripped).includes('cms-root'))
  check('it still reads inputs.cms-root', referencedInputs(stripped).includes('cms-root'))

  const undeclared = referencedInputs(stripped).filter((n) => !declaredInputs(stripped).includes(n))
  check(
    'so the harness reports it undeclared',
    undeclared.includes('cms-root'),
    undeclared.join(', ') || 'nothing reported',
  )
}

console.log(`\n${failures.length === 0 ? '✅' : '❌'} ${passed} passed, ${failures.length} failed`)
if (failures.length > 0) {
  for (const failure of failures) console.error(`   - ${failure}`)
  process.exit(1)
}
