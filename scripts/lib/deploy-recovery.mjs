/**
 * Recoverable destructive changes for the cPanel deploy scripts.
 *
 * ## The defect this exists for (audit T-67)
 *
 * Both deploy paths used to destroy the live release and *then* ask the host
 * whether the replacement had arrived. On a failure the site was left in a
 * state no deploy had ever produced, with no way back that did not need a
 * human reading a cPanel File Manager:
 *
 * - `deploy-static.mjs` deleted the paths the new build no longer shipped, then
 *   extracted. `fileop op=extract` **returns success and writes nothing** on
 *   this host (measured 2026-10-12), so a silent no-op left deleted pages
 *   deleted and nothing put in their place.
 * - `deploy-cms.mjs` deleted every file the bundle re-supplies — including the
 *   stable-named manifests Next boots from — and only then read
 *   `DEPLOYED_COMMIT` back. A no-op extract left the app with no chunk map at
 *   all.
 *
 * ## The primitive: a hold, not a snapshot
 *
 * cPanel's Fileman has no copy and no atomic rename (verified against
 * `cpanel-client.mjs`: upload, extract, delete, list, read, write). The one
 * thing it does reliably — measured in production — is **move**: the workaround
 * the runbooks already document is `fileop op=move` with `file=<path>&newfile=`,
 * which is how this project's own archival buckets were re-arranged by hand.
 *
 * So "remove everything and hope" becomes "move it aside, and put it back":
 *
 * ```text
 * removePath:  fileop op=move  <path>      -> hold/<name>      nothing destroyed
 * restore:     fileop op=move  hold/<name> -> <path>           byte-for-byte
 * ```
 *
 * The hold lives **outside** the directory being replaced, which is what makes
 * it survive the extract: a hold inside `public_html` would be overwritten by
 * the very failure it exists to undo, and one inside the CMS root would be
 * swallowed by the same extract that eats the bundle.
 *
 * ## ⚠️ If `move` is not available, FAIL — never fall back to deleting
 *
 * A `move` this host does not answer is a `status: 0` error, and `removePath`
 * lets it throw. The tempting fallback — delete the path and remember to
 * re-upload it later — is exactly the defect above wearing a different name:
 * once the file is gone, any failure between the delete and the re-upload
 * leaves it gone. A deploy that cannot hold the old release must not remove it.
 *
 * The counter-proof spawns the real static deploy against a fake host that
 * refuses `move` and asserts that nothing was deleted: see
 * `scripts/verify-cpanel-deploy.mjs` §10e.
 */
import { cp, mkdir, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * A record of one destructive step, with the move that undoes it.
 *
 * @typedef {{remove: string, hold: string}} Undo
 */

/**
 * Path a held path is parked at.
 *
 * ⚠️ **The basename carries the original path**, because `fileop` extracts the
 * destination from `newfile` by splitting it on `/` and treats a trailing slash
 * as "same name in this directory" — `newfile=hold/` means `hold/<name>`,
 * `hold/<name>` means itself, and `hold/<name>/` means `hold/<name>/<name>`.
 * So the hold filename is only ever a single path segment, and the directory it
 * names is recreated by the restore. `/`-separated on every platform, because
 * the host is Linux no matter what the runner is (the CMS bundle is zipped from
 * macOS and extracted on Linux today).
 *
 * @param {string} holdRoot Directory holding held paths, relative to home.
 * @param {string} path Path being removed, relative to home.
 * @returns {string} the hold location.
 */
export function holdPathFor(holdRoot, path) {
  return `${holdRoot}/${path.replace(/^\/+/, '')}`
}

/**
 * Move a path out of the live tree instead of deleting it.
 *
 * Nothing is destroyed: the only thing that can fail here is the move itself,
 * and a failed move leaves the original exactly where it was.
 *
 * @param {ReturnType<typeof import('../cpanel-client.mjs').config>} cfg
 * @param {string} path Absolute-or-home-relative path to take out of the way.
 * @param {string} holdRoot Directory outside the live tree to hold it.
 * @param {(cfg: any, parent: string, name: string) => Promise<void>} makeDir
 *   Directory creator, injected so this module does not reach for the API 2.0
 *   `mkdir` fallback that only the client should know about.
 * @param {(cfg: any, path: string, newName: string) => Promise<void>} move
 * @returns {Promise<Undo>} the move that restores it.
 */
async function holdPath(cfg, path, holdRoot, makeDir, move) {
  const hold = holdPathFor(holdRoot, path)
  const slash = hold.lastIndexOf('/')
  // The hold tree does not exist on the first run. `mkdir` is not recursive, so
  // every level is created, and an existing level is a success, not an error.
  let dir = ''
  for (const segment of hold.slice(0, slash).split('/')) {
    dir = dir ? `${dir}/${segment}` : segment
    await makeDir(cfg, dir)
  }
  await move(cfg, path, hold)
  return { remove: path, hold }
}

/**
 * Take every path out of the live tree, in order, recording how to undo each.
 *
 * ⚠️ **The order is the guarantee: nothing is destroyed at this step.** Each
 * path lands in `holdRoot`, so a crash halfway through this loop — a lost
 * connection, a cancelled run, a rate limit — still leaves every file on the
 * host. It leaves them in the hold rather than in place, which is why every
 * caller must either `restore` or tell the operator where the hold is.
 *
 * @param {object} options
 * @param {ReturnType<typeof import('../cpanel-client.mjs').config>} options.cfg
 * @param {string[]} options.paths Paths to take out of the way.
 * @param {string} options.holdRoot Directory outside the live tree.
 * @param {(cfg: any, parent: string, name: string) => Promise<void>} options.makeDir
 * @param {(cfg: any, path: string, newName: string) => Promise<void>} options.move
 * @returns {Promise<Undo[]>} one entry per path, in the order they were held.
 */
export async function holdPaths({ cfg, paths, holdRoot, makeDir, move }) {
  const held = []
  for (const path of paths) {
    held.push(await holdPath(cfg, path, holdRoot, makeDir, move))
  }
  return held
}

/**
 * Put every held path back where it came from, newest first.
 *
 * Reversed because a held **directory** restores as a unit: an entry recorded
 * after it must go home first or it would land inside a directory that is still
 * parked. A path that cannot be restored is reported rather than thrown: the
 * caller is already failing, and a second exception would replace the readable
 * "the deploy failed and the old release is back" message with a stack trace.
 *
 * @param {object} options
 * @param {ReturnType<typeof import('../cpanel-client.mjs').config>} options.cfg
 * @param {Undo[]} options.held Entries from `holdPaths`.
 * @param {(cfg: any, path: string, newName: string) => Promise<void>} options.move
 * @returns {Promise<string[]>} paths that could NOT be restored, if any.
 */
export async function restorePaths({ cfg, held, move }) {
  const failed = []
  for (const entry of [...held].reverse()) {
    try {
      await move(cfg, entry.hold, entry.remove)
    } catch (error) {
      failed.push(`${entry.remove} — ${error.message}`)
    }
  }
  return failed
}

/**
 * Drop a hold once the replacement has been confirmed live.
 *
 * The hold is a **complete** copy of the old release, so it is deleted only
 * after the new one is proven — and deleting it must never fail the deploy that
 * just succeeded, which is why the caller treats a failure here as a note.
 *
 * @param {object} options
 * @param {ReturnType<typeof import('../cpanel-client.mjs').config>} options.cfg
 * @param {Undo[]} options.held
 * @param {string} options.holdRoot
 * @param {(cfg: any, path: string, recursive?: boolean) => Promise<void>} options.del
 * @returns {Promise<string[]>} paths that could not be discarded, if any.
 */
export async function discardHold({ cfg, held, holdRoot, del }) {
  const failed = []
  for (const entry of held) {
    try {
      await del(cfg, entry.hold, true)
    } catch (error) {
      failed.push(`${entry.hold} — ${error.message}`)
    }
  }
  if (held.length > 0) {
    try {
      await del(cfg, holdRoot, true)
    } catch (error) {
      failed.push(`${holdRoot} — ${error.message}`)
    }
  }
  return failed
}

/**
 * The lines every deploy prints when recovery ran.
 *
 * One place, so both deploys say the same thing in the same words — an operator
 * reading a red CI step should not have to work out which script they are in to
 * learn whether the site is safe.
 *
 * @param {object} options
 * @param {string} options.what What was held, in the operator's words.
 * @param {boolean} options.restored Whether the hold went back.
 * @param {string} options.holdRoot
 * @param {string[]} options.failed Paths that did not go back.
 * @returns {string[]} lines to print.
 */
export function recoveryMessage({ what, restored, holdRoot, failed }) {
  const lines = [
    '',
    '---',
    restored ? 'RECOVERY: nothing was lost.' : 'RECOVERY: attention needed.',
  ]
  if (restored && failed.length === 0) {
    lines.push(
      `The deploy failed after ${what} had been taken off the site, so every one of them was`,
      'moved back exactly as it was. The live release is the one that was there before this',
      'run, and it is unchanged. Nothing needs doing by hand.',
    )
  } else if (restored) {
    lines.push(
      `The deploy failed after ${what} had been taken off the site. Most of them were moved`,
      'back; these could not be:',
      ...failed.map((entry) => `  - ${entry}`),
      `  They are still on the host, unchanged, under ${holdRoot}/, at the same relative`,
      '  path. In cPanel File Manager, drag each one back to where it came from.',
    )
  } else {
    lines.push(
      `The deploy failed after ${what} had been taken off the site, and the automatic restore`,
      `did not finish. They are still on the host, unchanged, under ${holdRoot}/ at the same`,
      'relative path — nothing was deleted. In cPanel File Manager, move them back to where',
      'they came from. The site keeps serving the old release once you do.',
    )
  }
  lines.push(
    'Re-running the deploy is safe: it works out what to remove from the host each time, so',
    'files that are already held are simply not removed again.',
    '---',
  )
  return lines
}

/**
 * Keep a local, restorable copy of everything a deploy is about to overwrite.
 *
 * ⚠️ **This is the net under the net.** The hold above covers the paths a
 * deploy *deletes*; this covers the paths it *overwrites in place*, which no
 * move can undo because the original is still in position when the extract
 * starts. For the CMS that set is the whole bundle — the app directory minus
 * `data/`, `.env` and the venv `node_modules` symlinks — and its loss is the
 * one thing `docs/deployment-runbook.md` has no automated repair for.
 *
 * Best-effort by design: it runs before the first mutating step and reports its
 * own failure to the caller, which prints it and continues. A backup that
 * cannot be taken must not block a deploy — the guarantees that must hold are
 * the ones the hold provides, because those are the ones that cannot be
 * skipped.
 *
 * @param {object} options
 * @param {string} options.from Remote directory to copy, relative to home.
 * @param {string} options.to Directory to copy it into, relative to home.
 * @param {string} options.localPath PID-scoped local path for the temporary copy.
 * @param {string[]} [options.exclude] Top-level entry names to leave out.
 * @param {(cfg: any, parent: string, name: string) => Promise<void>} options.makeDir
 * @param {(dir: string) => Promise<void>} options.pack Tar the directory.
 * @param {(dir: string, name: string, file: string) => Promise<void>} options.upload
 * @param {(path: string) => Promise<void>} options.del
 * @returns {Promise<{ok: boolean, message: string}>} never throws.
 */
export async function backupRemoteTree({
  from,
  to,
  localPath,
  exclude = [],
  makeDir,
  pack,
  upload,
  del,
}) {
  const { mkdtemp } = await import('node:fs/promises')
  let staging
  try {
    // `cp` rather than a walk: it preserves the symlink forest the CMS's
    // `node_modules` is made of, and a walk would have to re-derive the whole
    // exclusion set from scratch rather than from the structural list.
    staging = await mkdtemp(`${localPath}-`)
    for (const name of await readdir(from)) {
      if (exclude.includes(name)) continue
      await cp(join(from, name), join(staging, name), { recursive: true, verbatimSymlinks: true })
    }
    await pack(staging)
    await makeDir({}, to)
    await upload(to)
    await del(staging)
    return { ok: true, message: '' }
  } catch (error) {
    // A partial copy is worse than none: it would look like a backup on the
    // host and restore an incomplete tree. Take it away.
    if (staging) await rm(staging, { recursive: true, force: true }).catch(() => {})
    try {
      await del(to)
    } catch {
      // Nothing landed, which is the expected outcome of a failure here.
    }
    return { ok: false, message: error.message }
  }
}

/** Re-exported so callers do not import `node:fs/promises` just to make a directory. */
export { mkdir }
