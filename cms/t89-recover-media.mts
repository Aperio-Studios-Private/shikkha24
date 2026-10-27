/**
 * T-18 P3 recovery — download all live images from the static site + CMS media
 * API, save locally for R2 upload. The prod media files are gone from
 * DianaHost disk; the optimized WebP copies on Cloudflare are what readers
 * see — recovering those preserves the visible site.
 * Throwaway probe (T-77): deleted after the run.
 */
import fs from 'node:fs'
import path from 'node:path'

const OUT = '/Volumes/SSD/CODES/NewsPortal/.sps/media-recovery'
fs.mkdirSync(OUT, { recursive: true })

const seen = new Set<string>()
const urls: Array<{ url: string; source: string }> = []

// 1. crawl key pages for image URLs
const PAGES = [
  'https://shikkha24.com/',
  'https://shikkha24.com/latest/',
  'https://shikkha24.com/education-news/20/demo-madrasa-new-syllabus/',
]

for (const page of PAGES) {
  try {
    const res = await fetch(page)
    if (!res.ok) continue
    const html = await res.text()
    const matches = html.matchAll(/(?:src|href)=["']([^"']+\.(?:webp|jpg|jpeg|png|svg|avif)[^"']*)["']/g)
    for (const m of matches) {
      let u = m[1]
      if (u.startsWith('/')) u = 'https://shikkha24.com' + u
      if (u.startsWith('http') && !seen.has(u)) {
        seen.add(u)
        urls.push({ url: u, source: page })
      }
    }
  } catch (e) {
    console.error(`crawl ${page}: ${(e as Error).message.slice(0, 80)}`)
  }
}

// 2. CMS media API — the authoritative list of media filenames
try {
  const res = await fetch('https://cms.shikkha24.com/api/media?limit=100')
  if (res.ok) {
    const data = await res.json()
    for (const doc of data.docs ?? []) {
      const u = doc.url
      if (u && !seen.has(u)) {
        seen.add(u)
        urls.push({ url: u, source: 'cms-media-api' })
      }
    }
  }
} catch (e) {
  console.error(`cms media api: ${(e as Error).message.slice(0, 80)}`)
}

console.log(`found ${urls.length} unique image URLs`)

// 3. download each
let ok = 0
let failed = 0
const manifest: Array<{ url: string; file: string; bytes: number }> = []

for (const { url } of urls) {
  const filename = url.split('/').pop() ?? `unknown-${ok}`
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
  const dest = path.join(OUT, safe)
  try {
    const res = await fetch(url)
    if (!res.ok) {
      failed++
      console.error(`FAIL ${res.status}: ${url.slice(0, 80)}`)
      continue
    }
    const buffer = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(dest, buffer)
    manifest.push({ url, file: dest, bytes: buffer.length })
    ok++
  } catch (e) {
    failed++
    console.error(`FAIL: ${(e as Error).message.slice(0, 80)}`)
  }
}

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1))
console.log(`\n=== RECOVERY COMPLETE === downloaded: ${ok}, failed: ${failed}`)
console.log(`saved to: ${OUT}`)
process.exit(0)
