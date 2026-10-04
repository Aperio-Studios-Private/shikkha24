/**
 * Deploy the Astro build to `public_html` on DianaHost over the cPanel API.
 *
 * ## Why this shape
 *
 * The old path was `rsync --delete` over SSH, and the host grants no SSH. The
 * replacement keeps the three properties `rsync` gave us — transfer, remove
 * what is no longer built, never clobber the one file an operator may be
 * hotfixing — and gets them from three different mechanisms:
 *
 *   transfer  upload a zip, extract it          (cPanel Fileman)
 *   delete    manifest-driven, see deploy-manifest.mjs
 *   preserve  `.htaccess` is never recorded, so no delete set can contain it
 *
 * ## Dry run by default
 *
 * `DEPLOY_DRY_RUN=true` — the default — prints the exact plan and exits without
 * a single mutating call. The flag is read by the client itself
 * (`config()`), so a dry run cannot be broken by a helper forgetting to check.
 *
 * ## The probe
 *
 * `Fileman::fileop op=extract` has no destination, so using it means the zip
 * must sit inside `public_html` — publicly downloadable at a guessable URL
 * until it is deleted. Whether this host also offers `Fileman::extract_files`,
 * which takes a destination, could not be confirmed from cPanel's docs.
 *
 * So it is not assumed: a one-file archive is uploaded to the staging directory
 * and extracted before anything real happens. If the call works the zip never
 * enters the docroot and the probe artefact is removed. If it does not, the
 * run falls back to the in-docroot path and says so in the summary. One live
 * run settles it against the actual cPanel version, and the answer is written
 * to the CI summary rather than buried in a log.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  config,
  deletePath,
  extractArchive,
  listFiles,
  readTextFile,
  uploadFile,
  writeTextFile,
} from './cpanel-client.mjs'
import { buildManifest, planDeletes, serializeManifest } from './deploy-manifest.mjs'
import { summary as report } from './deploy-summary.mjs'

/** Directories on the host, relative to the account home. */
const DOCROOT = process.env.DEPLOY_DOCROOT ?? 'public_html'
const STAGING = process.env.DEPLOY_STAGING ?? 'shikkha24-deploy'

/** Local build output and the public URL it will be served from. */
const DIST = process.env.DEPLOY_DIST ?? 'frontend/dist'
const SITE_URL = process.env.SITE_URL ?? 'https://shikkha24.com'

const say = (message) => console.log(message)

/**
 * Zip a directory, failing clearly if `zip` is unavailable.
 *
 * cPanel's extract handles zip only, and Node has no zip in its standard
 * library, so the system tool is the dependency. Its absence must be a clear
 * error rather than a confusing "no such file" from cPanel later.
 *
 * @param {string} dir Directory whose contents should be zipped.
 * @param {string} out Absolute path of the .zip to write.
 * @returns {string} `out`.
 */
function zipDirectory(dir, out) {
  try {
    execFileSync('zip', ['-rq', out, '.'], { cwd: dir, stdio: 'pipe' })
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('the `zip` command is not installed on this runner')
    }
    throw new Error(`zip failed: ${error.stderr?.toString().trim() ?? error.message}`)
  }
  return out
}

/**
 * Ask the host whether `Fileman::extract_files` can target another directory.
 *
 * Runs against a one-file probe archive so the answer comes from the real
 * server rather than from documentation that may not match this cPanel build.
 *
 * @param {ReturnType<typeof config>} cfg
 * @param {string} probeName Filename already uploaded to the staging dir.
 * @returns {Promise<boolean>} true when a destination can be specified.
 */
async function supportsDestination(cfg, probeName) {
  try {
    await extractArchive(cfg, `${STAGING}/${probeName}`, DOCROOT)
    await deletePath(cfg, `${DOCROOT}/${probeName}`, true)
    return true
  } catch (error) {
    if (/unrecogni[sz]ed|not implemented|unknown function/i.test(error.message)) return false
    throw error
  }
}

/**
 * Confirm the live site answers after a deploy.
 *
 * Checks the homepage and one built asset. A deploy that uploaded successfully
 * but produced a 500 — a broken `.htaccess`, a bad rewrite rule — is the failure
 * mode worth catching, and it is invisible in the transfer steps.
 *
 * @returns {Promise<void>} throws if either request is not 200.
 */
async function verifyLive() {
  for (const path of ['/', '/favicon.svg']) {
    const response = await fetch(`${SITE_URL}${path}`, { redirect: 'follow' })
    if (response.status !== 200) {
      throw new Error(`${SITE_URL}${path} returned HTTP ${response.status} after deploy`)
    }
  }
  say(`Verified ${SITE_URL}/ → 200`)
}

/**
 * Run the whole static deploy.
 *
 * @returns {Promise<void>}
 */
async function main() {
  const cfg = config()
  const previous = (await readTextFile(cfg, STAGING, 'frontend-manifest.txt'))
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const current = await buildManifest(DIST)
  const plan = planDeletes({ previous, current })

  say(`Mode:            ${cfg.dryRun ? 'DRY RUN — nothing will be changed' : 'LIVE'}`)
  say(`Files in build:  ${current.length}`)
  say(`Live on host:    ${previous.length}`)
  say(`To delete:       ${plan.delete.length}${plan.firstDeploy ? '  (first tracked deploy)' : ''}`)
  say(`New since last:  ${plan.added.length}`)

  if (plan.firstDeploy && previous.length === 0) {
    say(
      'No previous manifest: this is the first tracked deploy, so nothing is deleted. ' +
        'That is deliberate — the site was deployed by hand and the manifest cannot know what is there.',
    )
  }

  // A dry run has to earn its name by proving the transport works, or it only
  // demonstrates arithmetic. Listing the docroot is read-only and confirms the
  // credentials, the host and the path in one call — the three things most
  // likely to be wrong on a first run.
  let onHost = null
  try {
    onHost = (await listFiles(cfg, DOCROOT)).length
    say(`Docroot:        ${DOCROOT} reachable, ${onHost} top-level entries`)
  } catch (error) {
    say(`Docroot:        ${DOCROOT} NOT reachable — ${error.message}`)
  }

  const summary = [
    '',
    '## Static deploy',
    `- **Mode:** ${cfg.dryRun ? 'dry run' : 'live'}`,
    `- **Files deployed:** ${current.length}`,
    `- **Deleted:** ${plan.delete.length}`,
  ]
  if (onHost === null) {
    summary.push('', `⚠️ Could not reach \`${DOCROOT}\` — the credentials or path may be wrong.`)
  }
  if (plan.delete.length > 0) {
    summary.push('', '<details><summary>Paths removed</summary>', '', '```')
    summary.push(...plan.delete)
    summary.push('```', '</details>')
  }
  summary.push('', '✅ `.htaccess` is excluded from the manifest, so no delete set can contain it.')

  if (cfg.dryRun) {
    summary.push('', '⚠️ Dry run — the host was not contacted for any change.')
    report(summary)
    return
  }

  const work = mkdtempSync(join(tmpdir(), 'shikkha24-deploy-'))
  const zip = zipDirectory(DIST, join(work, 'frontend.zip'))

  const probeName = `probe-${process.env.GITHUB_RUN_ID ?? 'local'}.zip`
  writeFileSync(join(work, 'probe.txt'), 'probe')
  execFileSync('zip', ['-q', join(work, probeName), join(work, 'probe.txt')])
  await uploadFile(cfg, STAGING, join(work, probeName), probeName)
  const hasDestination = await supportsDestination(cfg, probeName)
  say(
    hasDestination
      ? 'Host supports a destination directory — zip stays out of the docroot.'
      : 'Host has no destination parameter — zip is staged inside the docroot and removed after extract.',
  )

  const target = hasDestination ? STAGING : DOCROOT
  const remoteZip = await uploadFile(cfg, target, zip, 'frontend.zip')
  // The destination is the docroot either way. Only the *source* of the archive
  // differs: with a destination parameter the zip stays in staging, without one
  // it must already be inside the docroot for `fileop` to expand it.
  const { via } = await extractArchive(cfg, remoteZip, DOCROOT)
  say(`Extracted via ${via}.`)

  // Only the no-destination fallback leaves an archive in the docroot.
  if (!hasDestination) await deletePath(cfg, `${DOCROOT}/frontend.zip`)

  for (const path of plan.delete) {
    await deletePath(cfg, `${DOCROOT}/${path}`, true)
  }
  if (plan.delete.length > 0) say(`Deleted ${plan.delete.length} stale path(s).`)

  await writeTextFile(cfg, STAGING, 'frontend-manifest.txt', serializeManifest(current))
  await verifyLive()

  summary.push('', `Extraction mechanism: \`${via}\``, '', `✅ ${SITE_URL} verified after deploy.`)
  report(summary)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`::error::${error.message}`)
    process.exit(1)
  })
}
