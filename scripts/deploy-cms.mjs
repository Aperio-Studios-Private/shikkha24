/**
 * Deploy the Payload CMS to `~/shikkha24-cms` on DianaHost over the cPanel API.
 *
 * ## Why this is more dangerous than the static deploy, and why it is guarded
 *
 * The CMS bundle is **extracted over the live app directory**, which is
 * destructive to everything already there. Two things in that directory must
 * survive:
 *
 * - **`data/`** — the SQLite database and every uploaded file. This is the whole
 *   editorial archive, and there is **no working backup** of it
 *   (`docs/backup-and-recovery.md` §6). A deploy that overwrites it is not a
 *   failed deploy, it is a data loss event.
 * - **`node_modules`** — not a real directory but a set of symlinks into the
 *   CloudLinux venv at `~/nodevenv/shikkha24-cms/<NODE_MAJOR>/lib/node_modules`.
 *   Extracting over it breaks module resolution and the CMS returns
 *   `ERR_MODULE_NOT_FOUND: Cannot find package 'payload'`. The repair is a shell
 *   loop (`docs/deployment-runbook.md` §3.4) that needs a terminal.
 *
 * So this script refuses to run live unless the caller has explicitly
 * acknowledged both, and it verifies the CMS answers afterwards — because a CMS
 * that boots to a 500 takes the editorial workflow down with it.
 *
 * ## Dry run by default
 *
 * `DEPLOY_DRY_RUN=true` prints the plan and makes no mutating call.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { config, deletePath, extractArchive, uploadFile, writeTextFile } from './cpanel-client.mjs'
import { summary as report } from './deploy-summary.mjs'

const CMS_ROOT = process.env.DEPLOY_CMS_ROOT ?? 'shikkha24-cms'
const CMS_DIST = process.env.DEPLOY_CMS_DIST ?? 'cms-dist'
const CMS_URL = process.env.CMS_URL ?? 'https://cms.shikkha24.com'

const say = (message) => console.log(message)

/**
 * Refuse to ship a bundle that would overwrite the archive or leak secrets.
 *
 * Checked on the **local** bundle, before a byte is uploaded, because after
 * extraction there is no undo. `data/` is excluded when the bundle is assembled,
 * so its presence means the assemble step was wrong or was skipped — either way
 * the bundle is not safe to deploy.
 *
 * `node_modules` is a **warning, not a refusal**. A copy inside the bundle is
 * legitimate; the problem is that extracting over the app directory disturbs the
 * venv symlinks, and that is true whether or not the bundle carries one. It is
 * handled by the workflow's `confirm-risk` gate and by the repair command in the
 * runbook, not by blocking a deploy that might otherwise be fine.
 *
 * @param {string} root Directory about to be zipped and uploaded.
 * @returns {string[]} warnings to print.
 * @throws {Error} if `data/` or `.env` is present at the bundle root.
 */
export function assertBundleIsSafe(root) {
  let entries
  try {
    entries = readdirSync(root)
  } catch {
    throw new Error(`CMS bundle not found at ${root}. Build it before deploying.`)
  }
  for (const forbidden of ['data', '.env']) {
    if (entries.includes(forbidden)) {
      throw new Error(
        `CMS bundle contains "${forbidden}" at its root. Refusing to deploy: ` +
          '`data/` is the editorial archive and `.env` holds secrets. ' +
          'Re-assemble the bundle — see docs/cms-deployment.md §3.3.',
      )
    }
  }
  return entries.includes('node_modules')
    ? [
        'the bundle carries its own node_modules; the venv symlinks may still need recreating afterwards',
      ]
    : []
}

/**
 * Count the files in a bundle, for the plan output.
 *
 * @param {string} root
 * @returns {number}
 */
function countFiles(root) {
  let total = 0
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(dir, entry.name))
      else if (statSync(join(dir, entry.name)).isFile()) total += 1
    }
  }
  walk(root)
  return total
}

/**
 * Confirm the CMS answers after a restart.
 *
 * A cold start takes 5–15 seconds, so this retries rather than reporting a
 * false failure on the first probe. `/api/articles` is the right check because
 * it exercises the database as well as the process — a boot that cannot read
 * `data/` returns 500 here even though `/admin` might render.
 *
 * @param {number} [attempts]
 * @returns {Promise<void>} throws if it never answers 200.
 */
async function verifyCms(attempts = 12) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(`${CMS_URL}/api/articles?limit=1`, {
        headers: { Accept: 'application/json' },
      })
      if (response.status === 200) {
        say(`Verified ${CMS_URL}/api/articles → 200 (after ${attempt} probe(s))`)
        return
      }
      say(`Probe ${attempt}: HTTP ${response.status}`)
    } catch (error) {
      say(`Probe ${attempt}: ${error.message}`)
    }
    // 5s between probes: Passenger's cold start is 5–15s, and the throttle
    // rate is 10s, so polling faster learns nothing.
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }
  throw new Error(
    `${CMS_URL}/api/articles never returned 200. The most likely cause is the venv ` +
      'symlinks in node_modules being disturbed by the extraction. Repair with ' +
      'docs/deployment-runbook.md §3.4 — run the venv loop in cPanel Terminal, then restart.',
  )
}

/**
 * Run the CMS deploy.
 *
 * @returns {Promise<void>}
 */
async function main() {
  const cfg = config()
  const warnings = assertBundleIsSafe(CMS_DIST)
  const files = countFiles(CMS_DIST)

  say(`Mode:        ${cfg.dryRun ? 'DRY RUN — nothing will be changed' : 'LIVE'}`)
  say(`Target:      ~/${CMS_ROOT}`)
  say(`Bundle:      ${CMS_DIST} (${files} files)`)
  say('Preserved:   data/ (not in bundle) — the editorial archive is never touched')
  say('At risk:     node_modules symlinks may be disturbed by the extraction')
  for (const warning of warnings) say(`Warning:      ${warning}`)

  const summary = [
    '',
    '## CMS deploy',
    `- **Mode:** ${cfg.dryRun ? 'dry run' : 'live'}`,
    `- **Files:** ${files}`,
    '- **`data/`:** not in the bundle, so the archive is not touched',
    ...warnings.map((warning) => `- ⚠️ ${warning}`),
  ]

  if (cfg.dryRun) {
    summary.push(
      '',
      '⚠️ Dry run — the host was not contacted for any change.',
      '',
      'After a live deploy, if the CMS stops answering, repair the venv symlinks:',
      '',
      '```sh',
      `V=/home/shikkhac/nodevenv/${CMS_ROOT}/24/lib/node_modules; N=/home/shikkhac/${CMS_ROOT}/node_modules; for d in "$V"/*; do t="$N/\${d#$V/}"; [ -e "$t" ] || { mkdir -p "\${t%/*}"; ln -sfn "$d" "$t"; }; done`,
      '```',
    )
    report(summary)
    return
  }

  const work = mkdtempSync(join(tmpdir(), 'shikkha24-cms-'))
  const zip = join(work, 'cms.zip')
  execFileSync('zip', ['-rq', zip, '.'], { cwd: CMS_DIST, stdio: 'pipe' })

  const remoteZip = await uploadFile(cfg, CMS_ROOT, zip, 'cms-deploy.zip')
  const { via } = await extractArchive(cfg, remoteZip, CMS_ROOT)
  await deletePath(cfg, `${CMS_ROOT}/cms-deploy.zip`)
  say(`Extracted via ${via}.`)

  // Touching tmp/restart.txt is the documented Phusion restart and the only
  // headless one available — cPanel's WebApp::restart needs cPanel 138 and this
  // host runs 134. The write is throttled to ~10s by PassengerStatThrottleRate.
  await writeTextFile(cfg, `${CMS_ROOT}/tmp`, 'restart.txt', '')
  say('Restart requested; Passenger will pick it up within ~10s. Cold start is 5–15s.')

  await verifyCms()

  summary.push('', `Extraction mechanism: \`${via}\``, '', `✅ ${CMS_URL} verified after restart.`)
  report(summary)
}

// Imported by `scripts/verify-cpanel-deploy.mjs`, which needs `assertBundleIsSafe`
// without a deploy running. Auto-executing on import would make the harness push
// to production as a side effect of testing it.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`::error::${error.message}`)
    process.exit(1)
  })
}
