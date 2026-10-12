#!/usr/bin/env node
/**
 * Diagnostic: find an extraction mechanism that actually works on this host.
 *
 * ## Why this exists
 *
 * `Fileman::fileop op=extract` — the only mechanism the frontend deploy can use —
 * returns a success envelope and writes nothing. Measured 2026-10-12: a deploy
 * built 161 correct pages, logged `Extracted via api2-fileop`, deleted stale
 * paths, verified `GET / → 200`, and reported success while the storefront kept
 * serving bytes from 2026-10-04.
 *
 * `Fileman::extract_files` (UAPI, the form with a `destination` parameter) does
 * not exist on this host. So the only way to update the site today is for a human
 * to extract an archive in File Manager.
 *
 * This probes the plausible mechanisms against the live host and, for each,
 * **verifies by listing the directory afterwards** rather than trusting any return
 * value — which is precisely the mistake that hid the no-op.
 *
 * It uses `cpanel-client.mjs` rather than its own HTTP layer. An earlier version
 * hand-rolled `fetch` calls, hit an HTML error page where UAPI should answer
 * JSON, and timed out against the API-2.0 port. The client already knows the
 * endpoints this host actually answers on; re-deriving them is how the original
 * failure happened.
 *
 * Touches only a scratch directory it creates and removes. Never writes to
 * `public_html`.
 */

import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { config, deletePath, listFiles, uapi, uploadFile } from './cpanel-client.mjs'

const cfg = config()
const PROBE_DIR = `probe-extract-${randomBytes(3).toString('hex')}`

/**
 * Build a tiny archive containing one marker file, so extraction has something
 * to produce.
 *
 * Uses the `zip` binary, which GitHub's runners ship and which the deploy already
 * depends on. An earlier version assembled the archive byte by byte and crashed
 * on its own CRC helper — a diagnostic failing on its own cleverness tells us
 * nothing about the host.
 *
 * @returns {{zip: string, marker: string}} the archive path and the file inside it.
 */
function buildZip() {
  const dir = mkdtempSync(join(tmpdir(), 'probe-extract-'))
  const marker = 'marker.txt'
  writeFileSync(join(dir, marker), 'shikkha24-extract-probe\n')
  const zip = join(dir, 'probe.zip')
  execFileSync('zip', ['-q', zip, marker], { cwd: dir })
  return { zip, marker }
}

console.log(`\nprobe-extract against ${cfg.base ?? cfg.host ?? 'the host'}\n`)
const { zip, marker } = buildZip()
console.log(`  built a probe archive containing ${marker}`)

const results = []

/**
 * Try one mechanism and report whether it actually produced the marker.
 *
 * @param {string} label how to describe the mechanism.
 * @param {() => Promise<unknown>} call the mechanism.
 * @returns {Promise<void>} records the outcome on `results`.
 */
async function tryMechanism(label, call) {
  let response
  let threw = null
  try {
    response = await call()
  } catch (error) {
    threw = error?.message ?? String(error)
  }
  // The only thing that counts: did the marker appear? Trusting the return value
  // is the exact mistake that hid the no-op for a week.
  let listing = null
  try {
    listing = await listFiles(cfg, PROBE_DIR)
  } catch (error) {
    listing = `list failed: ${error?.message ?? error}`
  }
  const landed = Array.isArray(listing) && listing.includes(marker)
  results.push({ label, landed })
  console.log(
    `\n  ${landed ? '✅ WORKS  ' : '❌ no-op '} ${label}` +
      `\n      response: ${threw ? `threw — ${threw}` : JSON.stringify(response).slice(0, 130)}` +
      `\n      listing:   ${JSON.stringify(listing)}`,
  )
  // Leave the directory as we found it so each candidate starts from the same
  // state — otherwise the first one to work makes every later one look like it
  // also worked.
  if (landed) {
    await deletePath(cfg, PROBE_DIR, true).catch(() => {})
    await uapi('Fileman', 'mkdir', { path: PROBE_DIR }).catch(() => {})
    await uploadFile(cfg, PROBE_DIR, zip, 'probe.zip').catch(() => {})
  }
}

const made = await uapi('Fileman', 'mkdir', { path: PROBE_DIR }).catch((e) => ({
  error: e.message,
}))
console.log(`  mkdir ${PROBE_DIR}: ${JSON.stringify(made).slice(0, 140)}`)

await uploadFile(cfg, PROBE_DIR, zip, 'probe.zip')
console.log(`  uploaded probe.zip; listing: ${JSON.stringify(await listFiles(cfg, PROBE_DIR))}`)

await tryMechanism('UAPI Fileman::extract_files (with destination)', () =>
  uapi('Fileman', 'extract_files', {
    sourcefile: `${PROBE_DIR}/probe.zip`,
    destination: PROBE_DIR,
  }),
)
await tryMechanism('UAPI Fileman::unzip', () =>
  uapi('Fileman', 'unzip', { sourcefile: `${PROBE_DIR}/probe.zip`, destination: PROBE_DIR }),
)
await tryMechanism('UAPI Extract::extract_archive', () =>
  uapi('Extract', 'extract_archive', { archive: 'probe.zip', dir: PROBE_DIR }),
)
await tryMechanism('UAPI Fileman::extract (dir form)', () =>
  uapi('Fileman', 'extract', { dir: PROBE_DIR }),
)

await deletePath(cfg, PROBE_DIR, true).catch(() => {})
console.log('\n  scratch directory removed\n')

const winners = results.filter((r) => r.landed)
if (winners.length === 0) {
  console.log('  RESULT: no API extraction mechanism works on this host.')
  console.log('  Extraction by hand in cPanel File Manager is the only path.')
} else {
  console.log(`  RESULT: ${winners.map((w) => w.label).join(' | ')}`)
}
