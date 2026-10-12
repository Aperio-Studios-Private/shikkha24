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
 * not exist on this host at all. So today the only way to update the site is for
 * a human to extract an archive in File Manager.
 *
 * This probes, against the live host, every mechanism that might work, and
 * **verifies by listing the directory afterwards** rather than trusting any
 * return value — which is precisely the mistake that hid the no-op.
 *
 * Read-only apart from writing one small probe file into a scratch directory it
 * creates and then removes. It never touches `public_html`.
 */

import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const HOST = process.env.CPANEL_HOST
const USER = process.env.CPANEL_USER
const TOKEN = process.env.CPANEL_TOKEN
const UAPI = `https://${HOST}:2083`
const API2 = `https://${HOST}:2082`

if (!HOST || !USER || !TOKEN) {
  console.error('probe-extract: CPANEL_HOST, CPANEL_USER and CPANEL_TOKEN are required')
  process.exit(1)
}

const auth = 'Basic ' + Buffer.from(`${USER}:${TOKEN}`).toString('base64')
const PROBE_DIR = `probe-extract-${randomBytes(3).toString('hex')}`

/**
 * Build a tiny zip containing one marker file, so extraction has something to
 * produce.
 *
 * Uses the `zip` binary, which GitHub's runners ship and which the deploy
 * already depends on. An earlier version hand-assembled the archive byte by byte
 * and crashed on its own CRC helper — a diagnostic script failing on its own
 * cleverness is worse than no diagnostic at all.
 */
function buildZip() {
  const dir = mkdtempSync(join(tmpdir(), 'probe-extract-'))
  const marker = 'marker.txt'
  writeFileSync(join(dir, marker), 'shikkha24-extract-probe\n')
  const zip = join(dir, 'probe.zip')
  execFileSync('zip', ['-q', zip, marker], { cwd: dir })
  return { zip: readFileSync(zip), marker }
}

async function uapi(module, func, params) {
  const res = await fetch(`${UAPI}/execute/${module}/${func}`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  })
  const text = await res.text()
  try {
    return { status: res.status, body: JSON.parse(text) }
  } catch {
    return { status: res.status, body: text.slice(0, 200) }
  }
}

async function api2(module, func, params) {
  const url = new URL(`${API2}/json-api/cpanel`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  url.searchParams.set('cpanel_jsonapi_user', USER)
  url.searchParams.set('cpanel_jsonapi_apiversion', '2')
  url.searchParams.set('cpanel_jsonapi_module', module)
  url.searchParams.set('cpanel_jsonapi_func', func)
  const res = await fetch(url, { headers: { Authorization: auth } })
  const text = await res.text()
  try {
    return { status: res.status, body: JSON.parse(text) }
  } catch {
    return { status: res.status, body: text.slice(0, 200) }
  }
}

/** List a directory, tolerating either wire spelling cPanel uses. */
async function listDir(dir) {
  const r = await uapi('Fileman', 'list_files', { dir, elfinder: '0' })
  const data = r.body?.data
  if (!Array.isArray(data)) return null
  return data.map((e) => e?.file ?? e?.name ?? '').filter(Boolean)
}

async function upload(name, buffer) {
  const form = new FormData()
  form.append('dir', '/')
  form.append(
    'file',
    new Blob([buffer]),
    Buffer.from([0x50, 0x4b, 0x03, 0x04]).equals(buffer.subarray(0, 4)) ? name : name,
  )
  const res = await fetch(`${UAPI}/json-api/cpanel`, {
    method: 'POST',
    headers: { Authorization: auth },
    body: form,
  }).catch(() => null)
  return res
}

console.log(`\nprobe-extract against ${HOST}\n`)
const { zip, marker } = buildZip()
console.log(`  built a ${zip.length}-byte probe archive containing ${marker}`)

// Create the scratch directory.
const made = await uapi('Fileman', 'mkdir', { path: PROBE_DIR })
console.log(`  mkdir ${PROBE_DIR}: ${JSON.stringify(made.body).slice(0, 140)}`)

const before = await listDir(PROBE_DIR)
console.log(`  listing before: ${JSON.stringify(before)}`)

// Upload the archive into it via the API-2.0 upload endpoint (the one the
// deploy already proves works).
const upForm = new FormData()
upForm.append('dir', PROBE_DIR)
upForm.append('file', new Blob([zip]), 'probe.zip')
const upRes = await fetch(`${API2}/upload_filemanager_chunked`, {
  method: 'POST',
  headers: { Authorization: auth, 'X-CPanel-User': USER },
  body: upForm,
})
console.log(
  `  upload: HTTP ${upRes?.status} ${(await upRes?.text().catch(() => '')).slice(0, 120)}`,
)
console.log(`  listing after upload: ${JSON.stringify(await listDir(PROBE_DIR))}`)

// ── The candidates ───────────────────────────────────────────────────────────
const candidates = [
  [
    'UAPI Fileman::extract_files (destination)',
    () =>
      uapi('Fileman', 'extract_files', {
        sourcefile: `${PROBE_DIR}/probe.zip`,
        destination: PROBE_DIR,
      }),
  ],
  ['UAPI Fileman::extract (no args)', () => uapi('Fileman', 'extract', { dir: PROBE_DIR })],
  [
    'API2 Fileman::fileop op=extract',
    () =>
      api2('Fileman', 'fileop', {
        op: 'extract',
        source: `${PROBE_DIR}/probe.zip`,
        path: PROBE_DIR,
      }),
  ],
  [
    'UAPI Fileman::unzip',
    () =>
      uapi('Fileman', 'unzip', { sourcefile: `${PROBE_DIR}/probe.zip`, destination: PROBE_DIR }),
  ],
  [
    'UAPI Extract::extract_archive',
    () => uapi('Extract', 'extract_archive', { archive: 'probe.zip', dir: PROBE_DIR }),
  ],
]

for (const [label, run] of candidates) {
  let outcome
  try {
    outcome = await run()
  } catch (error) {
    outcome = { status: 'threw', body: error.message }
  }
  // The only thing that counts: did the marker appear? Trusting the return value
  // is the exact mistake that hid the no-op for a week.
  const listing = await listDir(PROBE_DIR)
  const landed = Array.isArray(listing) && listing.includes(marker)
  console.log(
    `\n  ${landed ? '✅ WORKS' : '❌ no-op'}  ${label}\n` +
      `      response: ${JSON.stringify(outcome.body).slice(0, 150)}\n` +
      `      listing:   ${JSON.stringify(listing)}`,
  )
  if (landed) {
    console.log(`\n  >>> USE THIS MECHANISM: ${label}`)
  }
}

// Clean up the scratch directory; never leave debris on the host.
await api2('Fileman', 'fileop', {
  op: 'unlink',
  source: `${PROBE_DIR}/probe.zip`,
  path: PROBE_DIR,
}).catch(() => {})
await uapi('Fileman', 'delete_fm_file', { file: PROBE_DIR }).catch(() => {})
console.log('\n  probe directory cleanup attempted\n')
