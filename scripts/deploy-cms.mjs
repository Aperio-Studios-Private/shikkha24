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
 * ## ⚠️ `fileop` does not overwrite, so the bundle's paths are cleared first
 *
 * `Fileman::fileop op=extract` — the only extract path this host offers —
 * silently skips any file that already exists at the destination. Most of a
 * Next standalone build is content-hashed chunks whose names change every
 * build, so they land and the deploy *looks* successful. The stable-named
 * manifests that tell Next which chunk to load do not, so the CMS keeps booting
 * the previous build. This is what kept the CSRF allow-list fix off the host
 * while every other file in the archive arrived (2026-10-08).
 *
 * The deploy therefore removes the bundle's own paths on the host before
 * extracting, letting `fileop` write every file as though it were new. Only
 * paths the build is about to re-supply are removed — `data/`, `.env` and the
 * venv `node_modules` symlinks are excluded structurally — so the removal is
 * self-correcting rather than a list someone has to maintain. See
 * `overwrittenPaths`.
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
import {
  config,
  deletePath,
  extractArchive,
  listFiles,
  uploadFile,
  writeTextFile,
} from './cpanel-client.mjs'
import { buildManifest } from './deploy-manifest.mjs'
import { summary as report } from './deploy-summary.mjs'

// ⚠️ `||`, never `??`. GitHub Actions sets an env var to an EMPTY STRING when the
// expression that produces it resolves to nothing, and `'' ?? 'fallback'` is `''`,
// not the fallback. Both variables below are fed by expressions that can resolve
// empty (`${{ inputs.cms-root || vars.DEPLOY_CMS_ROOT }}` and `${{ secrets.CMS_URL }}`),
// so `??` sent a live CMS deploy at the account HOME directory instead of
// `~/shikkha24-cms`, and would have probed `/api/articles` against no origin.
const CMS_ROOT = process.env.DEPLOY_CMS_ROOT || 'shikkha24-cms'
const CMS_DIST = process.env.DEPLOY_CMS_DIST || 'cms-dist'
const CMS_URL = process.env.CMS_URL || 'https://cms.shikkha24.com'

/**
 * Paths under the live app directory a deploy must never delete.
 *
 * `node_modules` on the host is not a directory but a forest of symlinks into
 * the CloudLinux venv at `~/nodevenv/shikkha24-cms/<NODE_MAJOR>/lib/node_modules`.
 * Removing entries there is the boot-failure case in the runbook, and the
 * extract already drops the bundle's own copies in exactly as it always has, so
 * it is excluded from the clear set rather than recreated.
 *
 * `data/` and `.env` are never in the bundle (`assertBundleIsSafe` refuses it),
 * so they cannot reach the clear set anyway — they are listed here so that a
 * future edit to one guard does not silently open the other.
 */
const CMS_PROTECTED = new Set(['node_modules', 'data', '.env'])

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
/**
 * Name this run's archive on the host.
 *
 * cPanel's `Fileman::upload_files` refuses to overwrite an existing name and
 * answers `"The file “…” you uploaded already exists."`. Under a fixed name, any
 * archive left behind by an earlier run - one that died mid-deploy, was
 * cancelled, or lost its connection - blocks every subsequent deploy, permanently
 * and silently until someone reads the cPanel directory.
 *
 * That is not hypothetical. The run carrying the `users.roles` migration on
 * 2026-10-10 died exactly this way, on an archive the *previous* successful run
 * had left in place. `deploy-static.mjs` was fixed for it in 9471e5a; this script
 * was not, which is why the same defect survived in one deploy and not the other.
 *
 * Extracted as a pure function so the harness can test the real shipped decision
 * rather than a copy of it. Deleting the archive afterwards is **not** a defence:
 * the delete only runs once the upload has already succeeded, so it cannot help
 * the run that needs it.
 *
 * @param {string} [runId] defaults to `GITHUB_RUN_ID`, or `local` off CI.
 * @returns {string} a name no other run can produce.
 */
export function remoteArchiveName(runId = process.env.GITHUB_RUN_ID ?? 'local') {
  return `cms-deploy-${runId}.zip`
}

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
 * Every directory the bundle writes into, as `/`-separated paths relative to
 * the bundle root. Used to prune the host walk so it never descends into
 * `data/` or the venv symlinks.
 *
 * @param {string[]} files Bundle-relative file paths.
 * @returns {Set<string>}
 */
function directoriesOf(files) {
  const dirs = new Set()
  for (const file of files) {
    const segments = file.split('/')
    segments.pop()
    let prefix = ''
    for (const segment of segments) {
      prefix = prefix ? `${prefix}/${segment}` : segment
      dirs.add(prefix)
    }
  }
  return dirs
}

/**
 * Recursively list what is **actually on the host**, pruning to directories the
 * bundle itself writes into.
 *
 * ⚠️ This is the fact the whole fix rests on: `Fileman::fileop op=extract` — the
 * only extract path this host offers — does **not overwrite a file that already
 * exists**. It silently skips it. A Next standalone build puts most code into
 * content-hashed chunks whose names change every build, so those land fine and
 * *look* like a successful deploy. But the **stable-named** manifests that tell
 * Next which chunk to load — `.next/required-server-files.json`,
 * `build-manifest.json`, `routes-manifest.json`, `BUILD_ID` — are skipped, so
 * the CMS keeps booting the *previous* build and pointing at the previous
 * chunks. New code sits on disk, orphaned and unreachable.
 *
 * That is exactly the defect that kept the CSRF allow-list fix (`1fa2a4d`) off
 * the host: `cms.shikkha24.com` was added to `ALLOWED_ORIGINS`, compiled into a
 * fresh chunk, and the chunk arrived while the manifest that should have
 * referenced it did not. The admin then 403'd on `/api/globals/site-settings`
 * because Payload's `extractJWT` discards the session cookie for any
 * `Origin` not in `payload.config.csrf` (2026-10-08).
 *
 * The static site hit the same bug through the same host with `.htaccess`
 * (fixed in `e3b09f9` by writing that one file explicitly). The CMS cannot be
 * fixed one file at a time — the affected set is every stable-named artefact,
 * and it changes with each Next release — so instead the deploy **removes the
 * bundle's own paths before extracting**, letting the extract write every file
 * as though it were new. Only paths the bundle is about to re-supply are ever
 * removed, so the removal is self-correcting rather than trusting a list.
 *
 * @param {ReturnType<typeof config>} cfg
 * @param {string} root App root, relative to home.
 * @param {Set<string>} bundleDirs Directories the bundle writes into.
 * @param {string} prefix Path already walked, relative to `root`.
 * @returns {Promise<string[]>} file paths on the host, `/`-separated, relative to `root`.
 */
async function listHostFiles(cfg, root, bundleDirs, prefix = '') {
  const dir = prefix ? `${root}/${prefix}` : root
  let entries
  try {
    entries = await listFiles(cfg, dir)
  } catch {
    // An unreadable or missing directory has nothing the bundle needs to clear.
    // Surfacing it here would abort a deploy that is otherwise safe.
    return []
  }
  const found = []
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (CMS_PROTECTED.has(rel)) continue
    if (entry.type === 'dir' || entry.type === 'directory') {
      if (bundleDirs.has(rel)) {
        found.push(...(await listHostFiles(cfg, root, bundleDirs, rel)))
      }
      continue
    }
    found.push(rel)
  }
  return found
}

/**
 * Paths on the host that the bundle is about to write again — exactly the files
 * `fileop` will silently skip.
 *
 * @param {object} options
 * @param {ReturnType<typeof config>} options.cfg
 * @param {string[]} options.current Files this build produced.
 * @returns {Promise<string[]>}
 */
export async function overwrittenPaths({ cfg, current }) {
  const bundleDirs = directoriesOf(current)
  const onHost = await listHostFiles(cfg, CMS_ROOT, bundleDirs)
  const currentSet = new Set(current)
  return onHost.filter((path) => currentSet.has(path)).sort()
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

  // ⚠️ The archive name must be unique per run, or the deploy blocks ITSELF.
  //
  // cPanel's `upload_files` **refuses to overwrite** an existing name and answers
  // `"The file “cms-deploy.zip” you uploaded already exists."` — so a leftover
  // from any earlier run makes every later run fail before it uploads a byte.
  // That is not hypothetical: the run on 2026-10-10 that carried the users.roles
  // migration died exactly this way, on an archive the *previous* deploy left
  // behind.
  //
  // `deploy-static.mjs` was fixed for this in 9471e5a and this script was not. The
  // delete below is not a defence — it only runs once the upload has already
  // succeeded, so it cannot help the run that needs it.
  const remoteName = remoteArchiveName()
  const remoteZip = await uploadFile(cfg, CMS_ROOT, zip, remoteName)

  // ⚠️ Clear the bundle's own paths *before* extracting. `fileop` skips a file
  // that already exists, so without this the CMS keeps the previous build's
  // stable-named manifests and boots the old chunk map while the new chunks sit
  // on disk unreachable. See `overwrittenPaths` — the set is derived from what
  // the build produced, so a path the bundle does not supply is never removed.
  const current = await buildManifest(CMS_DIST)
  const stale = await overwrittenPaths({ cfg, current })
  if (stale.length) {
    for (const path of stale) {
      await deletePath(cfg, `${CMS_ROOT}/${path}`)
    }
    say(
      `Cleared ${stale.length} file(s) the extract would have skipped (fileop does not overwrite).`,
    )
  }

  const { via } = await extractArchive(cfg, remoteZip, CMS_ROOT)
  await deletePath(cfg, `${CMS_ROOT}/${remoteName}`)
  // Best-effort sweep of archives older runs left behind. These are inert once
  // extracted, but each is ~20 MB in a 5 GB account, and one that lingers is also
  // a trap for anyone re-running the deploy by hand with the old fixed name.
  for (const leftover of await listFiles(cfg, CMS_ROOT)) {
    if (/^cms-deploy.*\.zip$/.test(leftover.name)) {
      await deletePath(cfg, `${CMS_ROOT}/${leftover.name}`)
    }
  }
  say(`Extracted via ${via}.`)

  // Touching tmp/restart.txt is the documented Phusion restart and the only
  // headless one available — cPanel's WebApp::restart needs cPanel 138 and this
  // host runs 134. The write is throttled to ~10s by PassengerStatThrottleRate.
  await writeTextFile(cfg, `${CMS_ROOT}/tmp`, 'restart.txt', '')
  say('Restart requested; Passenger will pick it up within ~10s. Cold start is 5–15s.')

  await verifyCms()

  summary.push(
    '',
    `Extraction mechanism: \`${via}\``,
    `- **Cleared before extract:** ${stale.length} file(s) (fileop does not overwrite)`,
    '',
    `✅ ${CMS_URL} verified after restart.`,
  )
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
