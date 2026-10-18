#!/usr/bin/env node
/**
 * publish-batch-1.mjs — desk-reporter batch publisher for the 2026-10-16 news batch.
 *
 * Reads credentials from cms/.env.local (git-ignored, never logged), logs into the
 * CMS REST API, ensures the newsroom-desk author exists, uploads the batch covers
 * to Media, then creates the six articles as published. Idempotent: an article
 * whose slug already exists is skipped, so re-runs are safe.
 *
 * Usage: node scripts/publish-batch-1.mjs
 * After success the publish-watcher dispatches the site rebuild automatically.
 */
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CONTENT = JSON.parse(await readFile(resolve(HERE, 'publish-batch-1-content.json'), 'utf8'))

// ── env ────────────────────────────────────────────────────────────────────
const envText = await readFile(resolve(HERE, '../cms/.env.local'), 'utf8')
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((line) => line.includes('='))
    .map((line) => [
      line.slice(0, line.indexOf('=')).trim(),
      line.slice(line.indexOf('=') + 1).trim(),
    ]),
)
const ORIGIN = env.CMS_ORIGIN
if (!ORIGIN || !env.CMS_ADMIN_EMAIL || !env.CMS_ADMIN_PASSWORD) {
  console.error('Missing CMS_ORIGIN / CMS_ADMIN_EMAIL / CMS_ADMIN_PASSWORD in cms/.env.local')
  process.exit(1)
}

/** JSON POST/GET helper that never echoes the token or credentials. */
async function api(path, { method = 'GET', token, body, form } = {}) {
  const headers = {}
  if (token) headers.Authorization = `JWT ${token}`
  if (body) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${ORIGIN}${path}`, {
    method,
    headers: form ? (token ? { Authorization: headers.Authorization } : {}) : headers,
    body: form ?? (body ? JSON.stringify(body) : undefined),
  })
  const text = await res.text()
  let data = null
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data).slice(0, 300)}`)
  }
  return data
}

// ── 1. login ───────────────────────────────────────────────────────────────
const login = await api('/api/users/login', {
  method: 'POST',
  body: { email: env.CMS_ADMIN_EMAIL, password: env.CMS_ADMIN_PASSWORD },
})
const token = login.token
console.log(`login ok (user: ${login.user?.name ?? login.user?.email ?? 'unknown'})`)

// ── 2. desk author ─────────────────────────────────────────────────────────
let authorId
const authorQ = await api(`/api/authors?where[slug][equals]=${CONTENT.author.slug}&limit=1`, {
  token,
})
if (authorQ.docs.length > 0) {
  authorId = authorQ.docs[0].id
  console.log(`author exists: id ${authorId}`)
} else {
  const created = await api('/api/authors', {
    method: 'POST',
    token,
    body: {
      nameBn: CONTENT.author.nameBn,
      nameEn: CONTENT.author.nameEn,
      slug: CONTENT.author.slug,
      bio: CONTENT.author.bioBn,
      email: env.CMS_ADMIN_EMAIL,
    },
  })
  authorId = created.doc.id
  console.log(`author created: id ${authorId}`)
}

// ── 3. lookup tables ───────────────────────────────────────────────────────
const [categories, levels] = await Promise.all([
  api('/api/categories?limit=50&depth=0', { token }),
  api('/api/levels?limit=50&depth=0', { token }),
])
const categoryBySlug = Object.fromEntries(categories.docs.map((c) => [c.slug, c.id]))
const levelByName = Object.fromEntries(levels.docs.map((l) => [l.nameBn ?? l.name, l.id]))

// ── 4. lexical helpers ─────────────────────────────────────────────────────
const textNode = (text = '') => ({
  type: 'text',
  version: 1,
  text,
  format: 0,
  detail: 0,
  mode: 'normal',
  style: '',
  diets: [],
})
const para = (text) => ({
  type: 'paragraph',
  version: 1,
  format: '',
  indent: 0,
  direction: 'ltr',
  children: [textNode(text)],
})
const heading = (tag, text) => ({
  type: 'heading',
  version: 1,
  tag,
  format: '',
  indent: 0,
  direction: 'ltr',
  children: [textNode(text)],
})
const linkPara = (sources) => ({
  type: 'paragraph',
  version: 1,
  format: '',
  indent: 0,
  direction: 'ltr',
  children: [
    textNode('সূত্র: '),
    ...sources.flatMap((s, i) => [
      {
        type: 'link',
        version: 1,
        fields: { linkType: 'custom', newTab: true, url: s.url },
        children: [textNode(s.label)],
      },
      textNode(i < sources.length - 1 ? ', ' : ' — বিস্তারিত ও অফিসিয়াল প্রজ্ঞাপন মূল সূত্রে দেখুন।'),
    ]),
  ],
})
const lexicalBody = (article) => ({
  root: {
    type: 'root',
    version: 1,
    direction: 'ltr',
    format: '',
    indent: 0,
    children: [
      ...article.sections.flatMap((section) => [
        heading('h2', section.h),
        ...section.paras.map(para),
      ]),
      linkPara(article.sources),
    ],
  },
})

// ── 5. media upload ────────────────────────────────────────────────────────
/**
 * REST multipart upload is broken on the live host (alt and other text fields
 * never reach Payload's parser — verified 2026-10-16 with both curl and Node).
 * Covers therefore go in through the admin UI (or a later on-host step) and get
 * PATCHed onto the articles; publish is not gated on images.
 */
const MEDIA_UPLOAD_BROKEN = true
async function uploadCover(_article) {
  if (MEDIA_UPLOAD_BROKEN) return undefined
  const file = resolve(HERE, '../editorial/assets-batch-1/final', _article.image)
  const bytes = await readFile(file)
  const form = new FormData()
  form.append('file', new Blob([bytes], { type: 'image/jpeg' }), `${_article.slug}.jpg`)
  form.append('alt', _article.imageAlt)
  form.append('credit', 'চিত্র: AI')
  const created = await api('/api/media', { method: 'POST', token, form })
  return created.doc.id
}

// ── 6. article creation ────────────────────────────────────────────────────
let published = 0
let skipped = 0
for (const article of CONTENT.articles) {
  const existing = await api(`/api/articles?where[slug][equals]=${article.slug}&limit=1`, { token })
  if (existing.docs.length > 0) {
    skipped++
    console.log(`skip (already live): ${article.slug}`)
    continue
  }
  const mediaId = await uploadCover(article)
  const created = await api('/api/articles', {
    method: 'POST',
    token,
    body: {
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      ...(mediaId ? { featuredImage: mediaId } : {}),
      category: categoryBySlug[article.categorySlug],
      level: article.levelSlugs.map((name) => levelByName[name]).filter(Boolean),
      author: authorId,
      body: lexicalBody(article),
      keyTakeaways: article.takeaways.map((point) => ({ point })),
      reviewStatus: 'approved',
      _status: 'published',
    },
  })
  published++
  console.log(
    `published: ${created.doc.slug} (id ${created.doc.id}${mediaId ? `, media ${mediaId}` : ', cover pending'})`,
  )
}

console.log(`done — published ${published}, skipped ${skipped}`)
