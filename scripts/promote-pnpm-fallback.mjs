#!/usr/bin/env node
/**
 * Promote pnpm's hoisted fallback to the top level of a Next.js standalone
 * `node_modules`, **without breaking the symlinks that are already there**.
 *
 * ## ⚠️ Why this is not `cp -R`
 *
 * `node_modules/.pnpm/node_modules/` is 224 KB of **symlinks**. Each points at
 * the real package inside the store, relative to its own depth:
 *
 * ```
 * .pnpm/node_modules/@libsql/core -> ../../@libsql+core@0.14.0/node_modules/@libsql/core
 * ```
 *
 * From `.pnpm/node_modules/@libsql/`, `../../` is `.pnpm/` — so that resolves.
 * Copying the tree's *contents* up one level moves the link to
 * `node_modules/@libsql/core` while leaving the target string alone, and `../../`
 * is now `$ROOT/` instead of `.pnpm/`. **Every link in the copy dangles.**
 *
 * The deploy's own assertion caught this on 2026-10-04 — the first time this
 * step had ever run in CI:
 *
 * ```
 * ::error::pnpm hoist not promoted - the host could not resolve @libsql/core
 * ```
 *
 * ## ⚠️ And why not `cp -RL` (dereference)
 *
 * Because the fallback is symlinks *into a store that is already there*,
 * dereferencing copies the entire dependency tree again, once per referring
 * package. Measured on this repo: **224 KB becomes 3.1 GB.** It would also throw
 * away pnpm's layout, which is what makes a second-level dependency
 * (`@libsql/client` → `@libsql/core`) resolvable in the first place.
 *
 * ## What this does instead
 *
 * It adds a **symlink at the top level that points back into the fallback**, so
 * the original links stay exactly where pnpm computed them and keep resolving:
 *
 * ```
 * node_modules/@libsql  ->  .pnpm/node_modules/@libsql     (whole dir, when absent)
 * node_modules/@libsql/core -> .pnpm/node_modules/@libsql/core   (per child, when the
 *                                                                real dir already exists)
 * ```
 *
 * Both forms are one level deep and both are relative, so the bundle stays
 * relocatable — an absolute path would point back at the CI runner's disk.
 *
 * Scoped entries need the per-child form because Turbopack already copies
 * `@libsql/client` into the bundle as a **real directory**. Replacing `@libsql`
 * with a symlink would throw that away, so only the missing children are linked.
 *
 * ⚠️ **Turbopack vs webpack.** This is a Turbopack-shaped problem. Under webpack's
 * `outputFileTracing`, Next copies the resolved packages in directly and the
 * fallback is usually empty or absent — in which case this is a no-op, which is
 * the correct outcome and why it is safe to run unconditionally.
 *
 * @param {string} nodeModules Absolute path to the bundle's `node_modules`.
 * @returns {{linked: number, skipped: number, missingFallback: boolean}}
 */
import { existsSync, lstatSync, mkdirSync, readdirSync, symlinkSync, unlinkSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

export function promotePnpmFallback(nodeModules) {
  const fallback = join(nodeModules, '.pnpm', 'node_modules')
  if (!existsSync(fallback)) return { linked: 0, skipped: 0, missingFallback: true }

  let linked = 0
  let skipped = 0

  /**
   * Point `dest` at `target` using a relative link, unless `dest` already works.
   *
   * ⚠️ **Presence is tested with `lstat`, not `exists`.** `existsSync` follows
   * symlinks, so a link that is present **but dangling** reads as *absent* — and
   * `symlinkSync` then throws `EEXIST` against the very path it was told does not
   * exist. That is not hypothetical: the old `cp -R` leaves exactly that state,
   * so repairing its damage is a requirement, and the counter-proof in
   * `verify-pnpm-fallback.mjs` found this crash on its first run.
   *
   * A dangling link is therefore removed and re-pointed; a real directory (the
   * thing Turbopack traced) is left alone.
   */
  const linkIfMissing = (dest, target) => {
    const stat = lstatSync(dest, { throwIfNoEntry: false })
    if (stat) {
      if (stat.isSymbolicLink() && !existsSync(dest)) {
        unlinkSync(dest) // present but broken — this is the state we repair
      } else {
        skipped += 1
        return
      }
    }
    mkdirSync(dirname(dest), { recursive: true })
    symlinkSync(relative(dirname(dest), target), dest, 'dir')
    linked += 1
  }

  for (const entry of readdirSync(fallback)) {
    const source = join(fallback, entry)
    const dest = join(nodeModules, entry)

    if (!entry.startsWith('@')) {
      linkIfMissing(dest, source)
      continue
    }

    // A scoped dir is a namespace, not a package — it is never a link target
    // itself. It may already exist as a real directory (Turbopack copies the
    // packages it traced), so promote its children individually.
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true })
    }
    for (const child of readdirSync(source)) {
      linkIfMissing(join(dest, child), join(source, child))
    }
  }

  return { linked, skipped, missingFallback: false }
}

/**
 * Whether every top-level entry of the fallback resolves after promotion.
 *
 * Exported so the caller can fail loudly: a promotion that silently linked
 * nothing is the failure this whole step exists to catch.
 *
 * @param {string} nodeModules Absolute path to the bundle's `node_modules`.
 * @returns {{checked: number, broken: string[]}}
 */
export function unresolvedFallbackEntries(nodeModules) {
  const fallback = join(nodeModules, '.pnpm', 'node_modules')
  if (!existsSync(fallback)) return { checked: 0, broken: [] }

  const broken = []
  let checked = 0
  for (const entry of readdirSync(fallback)) {
    const source = join(fallback, entry)
    const children = entry.startsWith('@')
      ? readdirSync(source).map((c) => join(source, c))
      : [source]
    for (const child of children) {
      const dest = entry.startsWith('@')
        ? join(nodeModules, entry, child.slice(source.length + 1))
        : child
      checked += 1
      if (lstatSync(dest, { throwIfNoEntry: false }) && !existsSync(dest)) {
        broken.push(relative(nodeModules, dest))
      }
    }
  }
  return { checked, broken }
}

// Run as a script: `node scripts/promote-pnpm-fallback.mjs <node_modules>`
if (import.meta.url === `file://${process.argv[1]}`) {
  const target = process.argv[2]
  if (!target) {
    console.error('usage: promote-pnpm-fallback.mjs <path-to-node_modules>')
    process.exit(2)
  }
  const result = promotePnpmFallback(target)
  if (result.missingFallback) {
    console.log('No pnpm fallback in this bundle — nothing to promote (this is fine).')
    process.exit(0)
  }
  const { checked, broken } = unresolvedFallbackEntries(target)
  console.log(
    `promoted ${result.linked} entr${result.linked === 1 ? 'y' : 'ies'}, ${result.skipped} already present`,
  )
  if (broken.length > 0) {
    console.error(`::error::${broken.length} pnpm fallback entries still do not resolve:`)
    for (const path of broken.slice(0, 10)) console.error(`  ${path}`)
    process.exit(1)
  }
  console.log(`all ${checked} fallback entries resolve`)
}
