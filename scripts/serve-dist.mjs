/**
 * Serve `frontend/dist` the way production does, for Lighthouse measurement.
 *
 * ## Why this file exists
 *
 * `python3 -m http.server` sends **no `Content-Encoding`**, so Lighthouse reports a
 * `uses-text-compression` failure that production does not have — the live site
 * serves Brotli. That single flaw makes the number meaningless, and it has now
 * produced a wrong T-24 figure **twice**:
 *
 * | server | `/` | `/latest/` | article |
 * |---|---|---|---|
 * | `python3 -m http.server` | 92 | 94 | 85 |
 * | this file (Brotli) | **97** | **98** | **97** |
 *
 * The build was identical. **The static server is part of the measuring instrument**,
 * so it belongs in the repo rather than in a shell one-liner that gets retyped
 * slightly differently each time.
 *
 * ## Usage
 *
 * ```sh
 * node scripts/serve-dist.mjs          # http://127.0.0.1:8901
 * ```
 *
 * Then point Lighthouse at it with `--form-factor=mobile`, the 412x823 mobile
 * screen emulation and `--throttling-method=simulate`.
 *
 * ⚠️ Before trusting any local score, confirm the server really is compressing:
 * `curl -sI -H 'Accept-Encoding: br' http://127.0.0.1:8901/ | grep -i content-encoding`
 * must print `br`. And check nothing else is already listening (`lsof -nP -iTCP -sTCP:LISTEN`)
 * — a leftover SSR server from another project was found on :4321 during T-24 and
 * would have measured a different application entirely.
 */

import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, gzipSync } from 'node:zlib'

// Resolve `frontend/dist` from THIS FILE, not from `process.cwd()`.
//
// Run from the wrong directory it served nothing — and errored in a way that looked
// like a port conflict. Deriving the root makes the script correct from any cwd,
// which removes a whole class of "why is the score wrong" confusion.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'frontend', 'dist')
const PORT = Number(process.env.PORT || 8901)
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.woff2': 'font/woff2',
}
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.svg', '.txt', '.xml'])

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0])
    if (!extname(p)) p = `${p.replace(/\/$/, '')}/index.html`
    const file = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ''))
    const buf = await readFile(file)
    const ext = extname(file)
    const accept = req.headers['accept-encoding'] || ''
    let out = buf,
      enc = null
    // Match production: brotli first, gzip as the fallback.
    if (COMPRESSIBLE.has(ext) && buf.length > 1024) {
      if (/\bbr\b/.test(accept)) {
        out = brotliCompressSync(buf)
        enc = 'br'
      } else if (/\bgzip\b/.test(accept)) {
        out = gzipSync(buf)
        enc = 'gzip'
      }
    }
    const h = {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Content-Length': out.length,
    }
    if (enc) {
      h['Content-Encoding'] = enc
      h.Vary = 'Accept-Encoding'
    }
    res.writeHead(200, h)
    res.end(out)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('not found')
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`serving ${ROOT} with brotli/gzip on http://127.0.0.1:${PORT}`)
})
