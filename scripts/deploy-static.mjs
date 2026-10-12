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
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  config,
  deletePath,
  extractArchive,
  listFiles,
  MISSING_FUNCTION,
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
 * ⚠️ The answer must reflect *which mechanism succeeded*, not merely that
 * something did. `extractArchive` falls through from a missing UAPI function to
 * the no-destination `fileop` on purpose, and both return without throwing — so
 * a probe that only checked for an exception reported "destination supported"
 * on a host that has no destination support at all. The zip was then staged
 * outside the docroot where `fileop` cannot reach it, and the deploy reported
 * success while extracting to the wrong place. The mechanism is returned, not
 * swallowed.
 *
 * @param {ReturnType<typeof config>} cfg
 * @param {string} probeName Filename already uploaded to the staging dir.
 * @returns {Promise<boolean>} true only when a destination can be specified.
 */
async function supportsDestination(cfg, probeName) {
  try {
    const { via } = await extractArchive(cfg, `${STAGING}/${probeName}`, DOCROOT)
    // Only the UAPI form takes a destination. `fileop` succeeded by extracting
    // where the archive already sat, which is not the same capability.
    if (via !== 'uapi-extract_files') return false
    await deletePath(cfg, `${DOCROOT}/${probeName}`, true)
    return true
  } catch (error) {
    if (MISSING_FUNCTION.test(error.message)) return false
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

  // One identifier for every artefact this run puts on the host.
  const runId = process.env.GITHUB_RUN_ID ?? 'local'
  const probeName = `probe-${runId}.zip`
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
  // ⚠️ **A per-run name, and this is load-bearing.** `Fileman::upload_files` on this
  // host does NOT overwrite. An upload whose name already exists fails outright:
  //
  //     The file “frontend.zip” you uploaded already exists.      succeeded: 0, failed: 1
  //
  // A fixed name therefore makes the deploy **self-blocking**: the archive is only
  // removed *after* the extract, so any run that dies between upload and cleanup —
  // or is cancelled, or loses the connection — leaves a file that makes every
  // later live deploy fail at the upload step. Not hypothetical: the live run of
  // 2026-10-09 (37944210521) died exactly there, blocked by an archive an earlier
  // failed run had left behind. A per-run name makes the collision impossible,
  // which removes the dependency on that delete having succeeded — and matches how
  // the probe archive has always been named.
  const zipName = `frontend-${runId}.zip`
  const remoteZip = await uploadFile(cfg, target, zip, zipName)
  // The destination is the docroot either way. Only the *source* of the archive
  // differs: with a destination parameter the zip stays in staging, without one
  // it must already be inside the docroot for `fileop` to expand it.
  const { via } = await extractArchive(cfg, remoteZip, DOCROOT)
  say(`Extracted via ${via}.`)

  // The archive is removed only once the extract is confirmed below.

  // Best-effort sweep of the fixed-name archive older deploys wrote, which the
  // per-run name above will never clean up. It is a stale copy of the built site
  // sitting at a guessable public URL, so it should not outlive its deploy. Absent
  // is the normal case from here on and must not fail the run.
  try {
    await deletePath(cfg, `${DOCROOT}/frontend.zip`)
  } catch {
    // Nothing to remove.
  }

  // ⚠️ `.htaccess` is written explicitly, not left to the extract.
  //
  // `Fileman::fileop op=extract` — the path this host actually takes — does not
  // overwrite a file that already exists. Every other artefact is new in a fresh
  // build, so the archive's copy lands. `.htaccess` is present on the host from
  // the hand-upload that preceded CI deploys, so the extract silently skipped it
  // and the site kept serving a CSP two commits old while the HTML around it was
  // new (measured 2026-10-08, run 37767514513: the live header matched the
  // pre-push baseline byte for byte).
  //
  // `save_file_content` overwrites unconditionally, which is exactly the
  // property the one file that must always be current needs. The manifest still
  // never lists it — that protects it from *deletion*, which is a different
  // hazard — and the write is skipped when the build produced none.
  const localHtaccess = join(DIST, '.htaccess')
  if (existsSync(localHtaccess)) {
    const content = readFileSync(localHtaccess, 'utf8')
    await writeTextFile(cfg, DOCROOT, '.htaccess', content)
    say('Wrote .htaccess explicitly (extract does not overwrite an existing file).')
  }

  for (const path of plan.delete) {
    await deletePath(cfg, `${DOCROOT}/${path}`, true)
  }
  if (plan.delete.length > 0) say(`Deleted ${plan.delete.length} stale path(s).`)

  // ⚠️ **The extraction is not trusted, and this check exists because it must not
  // be.** `Fileman::fileop op=extract` — the only mechanism this host offers —
  // returns success while writing nothing. Measured 2026-10-12: the run below
  // logged "Extracted via api2-fileop", deleted 3 stale paths, verified
  // `https://shikkha24.com/` → 200, and reported success — while
  // `public_html/education-news/27` did not exist and the homepage still served
  // bytes from 2026-10-04.
  //
  // Two things hid it. `extractArchive` returns the mechanism it called and never
  // looks at the host again. And the post-deploy check was `GET / → 200`, which
  // the **stale** site satisfies perfectly — a green light for a deploy that
  // changed nothing. That is the codebase's own rule turned against it: an
  // assertion that cannot fail is not evidence.
  //
  // So this asks the host a question the stale site cannot answer: is a file this
  // run was supposed to *add* actually there now? If the extract silently no-ops,
  // the deploy fails here with the archive still on disk to extract by hand.
  //
  // Deliberately **not** gated on `firstDeploy`. A first tracked deploy has every
  // file "added", so it is the case most in need of proof — and gating on
  // `firstDeploy` is what let this stay invisible in the first place: the harness
  // ran as a first deploy, skipped the check, and passed.
  if (plan.added.length > 0) {
    const probe = plan.added[plan.added.length - 1]
    const parent = probe.includes('/') ? probe.slice(0, probe.lastIndexOf('/')) : ''
    const wanted = probe.includes('/') ? probe.slice(probe.lastIndexOf('/') + 1) : probe
    let landed = false
    try {
      const entries = await listFiles(cfg, parent ? `${DOCROOT}/${parent}` : DOCROOT)
      landed = entries.some((e) => e.name === wanted)
    } catch (error) {
      say(`Could not list ${parent || DOCROOT} to confirm the extract: ${error.message}`)
    }
    if (!landed) {
      throw new Error(
        `Extraction reported success via ${via}, but ${probe} is not on the host.\n` +
          `  ${via === 'api2-fileop' ? 'This host answers fileop op=extract with success and writes nothing — a known and measured behaviour, not a transient failure.' : 'The extract reported a different mechanism, so treat this as a real extraction failure.'}\n` +
          `  The archive is still on the host at ${target}/${zipName}. Extract it by hand in cPanel File Manager into ${DOCROOT}, overwriting everything.\n` +
          '  Nothing was rolled back: the deletions above were correct for the files this run replaced.',
      )
    }
    say(`Extraction confirmed on the host — ${probe} is present.`)
  }

  // The archive is removed only now — after the extract has been confirmed to
  // have landed. Deleting it earlier meant a silent no-op left the operator with
  // a failed deploy *and* no archive to extract by hand, which is the one thing
  // that would have recovered the site.
  //
  // Only the no-destination fallback leaves an archive in the docroot; with a
  // destination the zip was staged in STAGING and this is a no-op.
  if (!hasDestination) await deletePath(cfg, `${DOCROOT}/${zipName}`)

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
