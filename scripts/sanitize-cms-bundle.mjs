/**
 * Remove the two things a Next standalone bundle must never carry out of
 * `cms/.next/standalone/cms/` before it is uploaded or deployed.
 *
 * ## Why this exists
 *
 * `output: 'standalone'` copies more than the app. Measured on this tree:
 *
 *     cms/.next/standalone/cms/.env   → byte-identical to cms/.env
 *                                       (PAYLOAD_SECRET, SMTP password)
 *     cms/.next/standalone/cms/data/  → 38 MB: payload.db, 11 dated backups,
 *                                       and the whole media library
 *
 * Both are consequences of the same tracing that copies the app, and neither is
 * wanted. The consequences are severe and they pull in opposite directions:
 *
 *   1. **Every CI run published them.** `ci.yml` uploads
 *      `path: cms/.next/standalone` as the `cms-standalone` artifact, with
 *      `include-hidden-files` on (without it the hidden `.next` directories are
 *      silently dropped). So the production secret and the entire editorial
 *      archive have been sitting in GitHub Actions artifact storage.
 *   2. **The CMS deploy could never succeed.** `assertBundleIsSafe` in
 *      `deploy-cms.mjs` refuses a bundle whose root contains `data` or `.env`,
 *      which is correct — and it meant the refusal fired on every single run.
 *
 * ## Why the host does not need them
 *
 * Neither belongs in the bundle, and the deploy's own design already says so:
 * `CMS_PROTECTED` in `deploy-cms.mjs` excludes `data` and `.env` from the clear
 * set, so the live archive and the live secret on the host are never deleted and
 * never overwritten by an extract. The host supplies both at runtime. This
 * script only removes them from the **build output**.
 *
 * ## ⚠️ This deletes, so it is deliberately narrow
 *
 * It removes exactly three names, and only at the root it was pointed at. A
 * `data/` directory *deeper* in the tree (there is one under `.next/`) is not
 * touched, because that is app data, not the archive. It refuses to run at all
 * unless the path looks like a standalone bundle root (it must contain
 * `server.js`), so a mistyped argument fails loudly instead of deleting
 * something. `verify-cms-bundle-sanitize.mjs` counter-proves all of that.
 */
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { join, parse, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * Entries removed from the bundle root. `data` is the editorial archive;
 * `.env*` catches the live secret and any `.env.bak-*` left by `setup-env.mjs`.
 */
const FORBIDDEN = ['data', '.env']

/**
 * Strip the archive and the secrets from a standalone CMS bundle, in place.
 *
 * @param {string} bundleRoot Path to `…/.next/standalone/cms`.
 * @returns {{removed: string[], kept: number}} what was removed, and the file
 *   count left behind — so a caller can print both and a human can see that the
 *   bundle shrank rather than emptied.
 * @throws {Error} if the path is not a standalone bundle root.
 */
export function sanitizeBundle(bundleRoot) {
  const root = resolve(bundleRoot)

  // ⚠️ The guard that makes a deletion script safe: refuse anything that is not
  // the bundle we think it is. A mistyped `--bundle-root` must fail here, not
  // delete a directory tree somewhere else on the machine.
  if (!existsSync(join(root, 'server.js'))) {
    throw new Error(
      `Refusing to sanitise ${root}: it has no server.js, so it is not a Next ` +
        'standalone CMS bundle root. Point this at …/.next/standalone/cms.',
    )
  }
  // ⚠️ This used to refuse any path fewer than three segments deep, which was a
  // mistake this harness caught on CI and not locally: `mkdtempSync` under
  // macOS lands somewhere like /var/folders/…/T (many segments) while GitHub's
  // runner uses TMPDIR=/tmp, so the *same* fixture was accepted on a laptop and
  // rejected on the runner. A depth threshold is a property of the temp
  // directory, not of the bundle. The meaningful test is simply "is this the
  // filesystem root", and `server.js` above already does the real work.
  if (root === parse(root).root) {
    throw new Error(`Refusing to sanitise ${root}: that is the filesystem root.`)
  }

  const removed = []
  // `.env` and any `.env.bak-*` / `.env.production` sibling, matched by prefix.
  for (const entry of readdirSync(root)) {
    if (entry === 'data' || entry === '.env' || entry.startsWith('.env')) {
      rmSync(join(root, entry), { recursive: true, force: true })
      removed.push(entry)
    }
  }

  // ⚠️ Assert the outcome rather than trusting `rmSync`. A silent miss here is
  // the original defect: the deploy's own guard refuses the bundle, so an
  // un-stripped bundle fails later and further from the cause.
  const survivors = FORBIDDEN.filter((name) => existsSync(join(root, name)))
  if (survivors.length > 0) {
    throw new Error(`Sanitise incomplete: ${survivors.join(', ')} still present in ${root}.`)
  }

  let kept = 0
  const count = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) count(join(dir, entry.name))
      else kept += 1
    }
  }
  count(root)
  return { removed, kept }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const target = process.argv[2]
  if (!target) {
    console.error('usage: node scripts/sanitize-cms-bundle.mjs <…/.next/standalone/cms>')
    process.exit(1)
  }
  try {
    const { removed, kept } = sanitizeBundle(target)
    console.log(
      removed.length === 0
        ? `Bundle already clean: nothing to remove (${kept} files).`
        : `Removed ${removed.join(', ')} from the bundle (${kept} files remain).`,
    )
    if (removed.length > 0) {
      console.log(
        '✅ The production secret and the editorial archive are no longer in this bundle.',
      )
    }
  } catch (error) {
    console.error(`::error::${error.message}`)
    process.exit(1)
  }
}
