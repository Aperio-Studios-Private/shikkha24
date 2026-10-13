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
 *   transfer  upload a .tar.gz, extract it    (cPanel Fileman + host cron)
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
 * `Fileman::fileop op=extract` has no destination, so using it means the archive
 * must sit inside `public_html` — publicly downloadable at a guessable URL
 * until it is deleted. Whether this host also offers `Fileman::extract_files`,
 * which takes a destination, could not be confirmed from cPanel's docs.
 *
 * So it is not assumed: a one-file archive is uploaded to the staging directory
 * and extracted before anything real happens. If the call works the archive
 * never enters the docroot and the probe artefact is removed. If it does not, the
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
 * Tar+gzip a directory, failing clearly if `tar` is unavailable.
 *
 * The host-side cron extractor expands this with `tar -xzf`, so the archive is
 * built with the same tool that reads it — one format, one dependency. `tar` is
 * used over `zip`/`unzip` because it is proven on the **DianaHost platform**:
 * the live almarsus.com deployment extracts a `.tar.gz` with `tar -xzf` over a
 * cPanel cron every minute. That is platform-level evidence from a *different*
 * cPanel account, not proof for ours — and the shikkha24 backup's `tar -czf` has
 * never actually run on this host. So `tar` remains unverified on our account,
 * and `host-extract.sh` guards for that with `command -v tar` before doing
 * anything else. See `.sps/handoff.md` and M34.
 *
 * @param {string} dir Directory whose contents should be archived.
 * @param {string} out Absolute path of the .tar.gz to write.
 * @returns {string} `out`.
 */
function packTarGz(dir, out) {
  try {
    // `-C dir .` archives the directory's *contents*, so the extract lands
    // directly in the docroot rather than under a nested `./dist/`.
    execFileSync('tar', ['-czf', out, '-C', dir, '.'], { stdio: 'pipe' })
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('the `tar` command is not installed on this runner')
    }
    throw new Error(`tar failed: ${error.stderr?.toString().trim() ?? error.message}`)
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
 * on a host that has no destination support at all. The archive was then staged
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
 * Is the host-side cron extractor alive AND able to publish?
 *
 * The cron (`scripts/host-extract.sh`) writes `extract-heartbeat.txt` only
 * *after* it has confirmed `tar` exists — so a fresh timestamp means "the cron
 * ran recently and could extract", never merely "the cron ran". A host with no
 * `tar` never writes a heartbeat, which is exactly why this gate is safe: an
 * absent, unparseable or stale heartbeat all mean "do not rely on the cron", and
 * the deploy falls through to the loud failure rather than trusting it.
 *
 * @param {ReturnType<typeof config>} cfg
 * @returns {Promise<boolean>}
 */
async function cronExtractorAlive(cfg) {
  const maxAgeMs = Number(process.env.EXTRACT_CRON_MAX_AGE_MS ?? 10 * 60 * 1000)
  let raw = ''
  try {
    raw = await readTextFile(cfg, STAGING, 'extract-heartbeat.txt')
  } catch {
    return false
  }
  const ts = Date.parse((raw ?? '').trim())
  if (!Number.isFinite(ts)) return false
  // Tolerate a little clock skew in both directions; a stale heartbeat is dead.
  const age = Date.now() - ts
  return age <= maxAgeMs && age >= -maxAgeMs
}

/**
 * Map a built file's manifest path to the URL a reader would fetch.
 *
 * `news/story/index.html` → `/news/story/`; `news/story.html` → `/news/story.html`.
 *
 * @param {string} relPath `/`-separated, relative to the docroot.
 * @returns {string} a leading-slash URL path.
 */
function pathToUrl(relPath) {
  const clean = relPath.replace(/^\/+/, '')
  if (clean.endsWith('/index.html')) return `/${clean.slice(0, -'index.html'.length)}`
  return `/${clean}`
}

/**
 * Wait for the cron extractor to publish a newly-added page.
 *
 * Polls the **site**, not the host API: a static GET forks no PHP process on a
 * shared host, and it proves the reader-visible end state rather than an
 * internal detail — which is the whole point. A stale site answers the homepage
 * with 200, so the probed URL is a file that is *new in this build* and could
 * only be live if this build's archive was extracted.
 *
 * @param {string} relPath A path from `plan.added`.
 * @returns {Promise<boolean>} true if the page returned 200 within the budget.
 */
async function waitForCronPublish(relPath) {
  const url = `${SITE_URL}${pathToUrl(relPath)}`
  const budgetMs = Number(process.env.EXTRACT_CRON_WAIT_MS ?? 5 * 60 * 1000)
  const intervalMs = Number(process.env.EXTRACT_CRON_POLL_MS ?? 20 * 1000)
  const deadline = Date.now() + budgetMs
  say(`Waiting for the cron extractor to publish ${url} (up to ${Math.round(budgetMs / 1000)}s)…`)
  for (;;) {
    try {
      const res = await fetch(url, { redirect: 'follow' })
      if (res.status === 200) return true
    } catch {
      // Not up yet.
    }
    if (Date.now() >= deadline) return false
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
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
  const archive = packTarGz(DIST, join(work, 'frontend.tar.gz'))

  // One identifier for every artefact this run puts on the host.
  const runId = process.env.GITHUB_RUN_ID ?? 'local'
  const probeName = `probe-${runId}.tar.gz`
  writeFileSync(join(work, 'probe.txt'), 'probe')
  execFileSync('tar', ['-czf', join(work, probeName), '-C', work, 'probe.txt'])
  await uploadFile(cfg, STAGING, join(work, probeName), probeName)
  const hasDestination = await supportsDestination(cfg, probeName)
  say(
    hasDestination
      ? 'Host supports a destination directory — archive stays out of the docroot.'
      : 'Host has no destination parameter — archive is staged inside the docroot and removed after extract.',
  )

  const target = hasDestination ? STAGING : DOCROOT
  // ⚠️ **A per-run name, and this is load-bearing.** `Fileman::upload_files` on this
  // host does NOT overwrite. An upload whose name already exists fails outright:
  //
  //     The file “frontend.tar.gz” you uploaded already exists.      succeeded: 0, failed: 1
  //
  // A fixed name therefore makes the deploy **self-blocking**: the archive is only
  // removed *after* the extract, so any run that dies between upload and cleanup —
  // or is cancelled, or loses the connection — leaves a file that makes every
  // later live deploy fail at the upload step. Not hypothetical: the live run of
  // 2026-10-09 (37944210521) died exactly there, blocked by an archive an earlier
  // failed run had left behind. A per-run name makes the collision impossible,
  // which removes the dependency on that delete having succeeded — and matches how
  // the probe archive has always been named.
  const archiveName = `frontend-${runId}.tar.gz`
  const remoteArchive = await uploadFile(cfg, target, archive, archiveName)
  // The destination is the docroot either way. Only the *source* of the archive
  // differs: with a destination parameter the archive stays in staging, without one
  // it must already be inside the docroot for `fileop` to expand it.
  const { via } = await extractArchive(cfg, remoteArchive, DOCROOT)
  say(`Extracted via ${via}.`)

  // The archive is removed only once the extract is confirmed below.

  // Best-effort sweep of the fixed-name archive older deploys wrote, which the
  // per-run name above will never clean up. It is a stale copy of the built site
  // sitting at a guessable public URL, so it should not outlive its deploy. Absent
  // is the normal case from here on and must not fail the run. Both the old `.zip`
  // and the brief `.tar.gz` fixed name are swept, so nothing predating the
  // per-run naming lingers.
  for (const stale of ['frontend.zip', 'frontend.tar.gz']) {
    try {
      await deletePath(cfg, `${DOCROOT}/${stale}`)
    } catch {
      // Nothing to remove.
    }
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
  // Set true when the host cron extractor publishes the build instead of the
  // API. Declared here, outside the `plan.added` block, because the archive
  // cleanup below reads it — and that cleanup must run for every live deploy,
  // not only the ones with something new to land.
  let handedToCron = false
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

    // ⚠️ **The host cron extractor is the fallback, and only a live one counts.**
    //
    // When the API extract no-ops — this host's measured behaviour — the
    // host-side cron (`scripts/host-extract.sh`) is what actually publishes the
    // build. So instead of failing immediately, CI asks one question: is that
    // cron alive and able to extract? The answer comes only from a *fresh
    // heartbeat*, which the cron writes after confirming `tar` exists. If it
    // is fresh, CI waits for the cron to publish a page that is new in this
    // build and goes green the moment a reader could actually see it. If the
    // heartbeat is absent, stale or unparseable — including a host with no
    // `tar`, which never heartbeats — CI falls straight through to the loud
    // failure below, unchanged. That is what keeps this fail-safe: the
    // automation is inert until the cron is genuinely working, and it can never
    // report a green deploy on a stale site.
    if (!landed && (await cronExtractorAlive(cfg))) {
      say(
        'The API extract reported success but wrote nothing (known on this host). ' +
          'A live cron extractor is present — waiting for it to publish the build.',
      )
      landed = await waitForCronPublish(probe)
      handedToCron = landed
      if (landed) {
        say(`Cron extractor published ${pathToUrl(probe)} — the new build is live.`)
      }
    }

    if (!landed) {
      throw new Error(
        `Extraction reported success via ${via}, but ${probe} is not on the host.\n` +
          `  ${via === 'api2-fileop' ? 'This host answers fileop op=extract with success and writes nothing — a known and measured behaviour, not a transient failure.' : 'The extract reported a different mechanism, so treat this as a real extraction failure.'}\n` +
          '  No live cron extractor answered either (see scripts/host-extract.sh and the extract-heartbeat.txt it writes).\n' +
          `  The archive is still on the host at ${target}/${archiveName}. Extract it by hand in cPanel File Manager into ${DOCROOT}, overwriting everything.\n` +
          '  Nothing was rolled back: the deletions above were correct for the files this run replaced.',
      )
    }
    if (!handedToCron) say(`Extraction confirmed on the host — ${probe} is present.`)
  }

  // The archive is removed only now — after the extract has been confirmed to
  // have landed. Deleting it earlier meant a silent no-op left the operator with
  // a failed deploy *and* no archive to extract by hand, which is the one thing
  // that would have recovered the site.
  //
  // Only the no-destination fallback leaves an archive in the docroot; with a
  // destination the archive was staged in STAGING and this is a no-op.
  //
  // ⚠️ When the cron published the build, the archive is the cron's to remove —
  // it deletes every `frontend-*.tar.gz` once it has extracted them (step 6 of
  // host-extract.sh). Removing it here as well would only race the cron over a
  // file it already owns; a no-op delete on a missing file must not fail a
  // deploy that has otherwise succeeded.
  if (!hasDestination && !handedToCron) {
    try {
      await deletePath(cfg, `${DOCROOT}/${archiveName}`)
    } catch {
      // Already gone — nothing to remove.
    }
  }

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
