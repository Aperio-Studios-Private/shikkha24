/**
 * The deploy manifest — the list of files the last deploy actually put on the
 * host, and the arithmetic for working out what this deploy must remove.
 *
 * ## Why a manifest at all
 *
 * The old deploy was `rsync --delete`, which mirrored the build onto the host
 * exactly: anything the build stopped producing disappeared. The cPanel API has
 * no `--delete`, so without a record of the previous deploy there are only two
 * ways to emulate it, and both are wrong:
 *
 * - **Overwrite only.** A deleted article keeps serving its old page forever.
 *   Astro emits `news/old-story/index.html`; without the article there is
 *   nothing to overwrite it, and the URL stays live and indexable.
 * - **Wipe `public_html` and re-extract.** Correct, but the site 404s for the
 *   seconds in between, and anything placed on the host by hand is destroyed.
 *
 * The manifest turns "delete what is no longer built" into a computed set
 * rather than a blunt one. It lives **on the host**, at
 * `~/shikkha24-deploy/frontend-manifest.txt`, for three reasons:
 *
 * 1. It is outside the docroot, so it is not publicly readable.
 * 2. It records what is *actually deployed*, not what some artifact claims.
 *    A failed run cannot leave it out of step with reality.
 * 3. Writing it needs no `contents: write` permission and produces no commit on
 *    every publish.
 *
 * ## ⚠️ `.htaccess` is never in the manifest, on purpose
 *
 * `.htaccess` is the one artefact an operator may need to fix **on the host**
 * during an incident — a `<LocationMatch>` that fails to match does not error,
 * the page still returns 200 under the strict policy and AdSense is silently
 * blocked (`docs/security.md` §5). The previous workflow carried an explicit
 * `NO-DEPLOY` marker contract to protect it.
 *
 * Excluding the file from the manifest preserves that hotfix **structurally**:
 * a path that was never recorded can never be in a delete set, so no arithmetic
 * can remove it. That is stronger than a marker a future edit could forget.
 */
import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'

/**
 * The one path that must never be deleted, whatever the arithmetic says.
 * Excluded when the manifest is written, so it is absent from every later set.
 */
export const PROTECTED = new Set(['.htaccess'])

/**
 * List every deployable file under `root`, as posix-relative paths, sorted.
 *
 * Directories are not listed — only the files inside them. Deletion collapses
 * them back into directories (see `collapse`), which keeps the number of API
 * calls proportional to the change rather than to the site size.
 *
 * @param {string} root Absolute path to the build output.
 * @returns {Promise<string[]>} sorted, `/`-separated, relative paths.
 */
export async function buildManifest(root) {
  const found = []

  /** Recurse into one directory, appending files. */
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
        continue
      }
      if (!entry.isFile()) continue
      const rel = relative(root, full).split(sep).join('/')
      if (!PROTECTED.has(rel)) found.push(rel)
    }
  }

  await walk(root)
  return found.sort()
}

/**
 * Serialise a manifest for storage as a plain text file.
 *
 * One path per line rather than JSON: it is smaller, it diffs readably, and a
 * trailing newline makes `readFile`/`split` round-trip exactly.
 *
 * @param {string[]} paths
 * @returns {string}
 */
export function serializeManifest(paths) {
  return paths.length ? `${paths.join('\n')}\n` : ''
}

/**
 * Parse a stored manifest back into paths.
 *
 * Blank lines are dropped and `/` is trimmed so a hand-edited file cannot
 * produce empty or `./`-prefixed entries that would match nothing.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function parseManifest(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

/**
 * Reduce a set of stale file paths to the fewest deletions that clear all of them.
 *
 * ## Why this has to derive directories rather than read them
 *
 * The manifest records **files only**. Recording directories as well would make
 * this function dangerous: a directory that still contains live files would
 * itself read as "not produced by the build", and deleting it recursively would
 * take the live files with it.
 *
 * So directories are *inferred*. A stale file is promoted to its parent
 * directory — and as far up as it will go — only while that directory holds no
 * file the current build still produces. `news/gone/index.html` and
 * `news/kept/index.html` produce `news/gone` and `news/kept/index.html`
 * respectively: the first because nothing live is under `news/gone`, the second
 * because `news` does contain a live file and so cannot be removed.
 *
 * Without this, removing one section costs one API call per file in it. With it,
 * one call. On a site of this size that is the difference between a deploy that
 * takes seconds and one that hits a rate limit.
 *
 * @param {string[]} stale File paths the build no longer produces.
 * @param {string[]} live File paths it still produces.
 * @returns {string[]} paths to delete, each a file or a whole directory.
 */
export function collapse(stale, live = []) {
  const held = [...new Set(stale)]
  const result = new Set()

  for (const path of held) {
    // An ancestor already scheduled for deletion covers this one.
    if ([...result].some((done) => path === done || path.startsWith(`${done}/`))) continue
    let best = path
    let dir = dirname(path)
    while (dir && dir !== '.' && !live.some((other) => other.startsWith(`${dir}/`))) {
      best = dir
      dir = dirname(dir)
    }
    result.add(best)
  }
  return [...result].sort()
}

/**
 * Work out what this deploy must delete, and what it will add.
 *
 * Deleting is scoped to the previous manifest and nothing else. A file on the
 * host that this project never deployed — a hand-placed file, or anything else
 * in the account — is outside the set by construction, not by a rule someone
 * has to remember to apply.
 *
 * `PROTECTED` is filtered here as well as at write time. Excluding it when the
 * manifest is written is the primary guarantee; re-checking on the way out means
 * the guarantee survives a future edit to `buildManifest` that forgets, or a
 * manifest hand-edited on the host.
 *
 * ⚠️ One trade-off, the same one `rsync --delete` made: a file placed by hand
 * *inside a build output directory* is removed when that directory is collapsed.
 * Files outside the build are untouched.
 *
 * @param {object} options
 * @param {string[]} options.previous Paths recorded by the last deploy.
 * @param {string[]} options.current Paths this build produced.
 * @returns {{delete: string[], added: string[], unchangedCount: number, firstDeploy: boolean}}
 */
export function planDeletes({ previous, current }) {
  const currentSet = new Set(current)
  const previousSet = new Set(previous)
  const protectedPaths = previous.filter((path) => PROTECTED.has(path))
  const stale = previous.filter((path) => !currentSet.has(path) && !PROTECTED.has(path))
  const deletions = collapse(stale, current)
  return {
    delete: deletions,
    added: current.filter((path) => !previousSet.has(path)),
    unchangedCount: current.length - stale.length,
    // No previous manifest means the site was deployed by hand. Deleting
    // nothing is the only safe reading: we do not know what is there.
    firstDeploy: previous.filter((path) => !PROTECTED.has(path)).length === 0,
    // Recorded so a deploy can warn rather than silently ignore one.
    protectedOnHost: protectedPaths,
  }
}

/**
 * Read a manifest file from disk.
 *
 * @param {string} path
 * @returns {Promise<string[]>} empty when the file does not exist.
 */
export async function readManifestFile(path) {
  try {
    await stat(path)
  } catch {
    return []
  }
  return parseManifest(await readFile(path, 'utf8'))
}
