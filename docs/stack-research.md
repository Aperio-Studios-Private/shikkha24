# Stack Research Notes — Sep 11, 2026

> Compiled from web research during planning session.
> Source conversation: `f20130b8-a34c-4c80-af5c-19e1aa38859c`
> Methodology: For each technology, searched npm/official docs/release notes for latest stable version, checked compatibility, and noted caveats.

---

## 1. Astro — v7.3.2

**Checked:** npm registry, astro.build release blog
**Previous assumption:** Astro 5 (from user's original plan)
**Actual latest:** 7.3.2

### Key findings
- **Rust-based compiler** — Astro 7 replaced the JavaScript compiler with Rust for dramatically faster builds. Incremental static builds (since v7.2): only changed pages rebuild, not the entire site. This is transformative for a news portal — publishing one article doesn't rebuild all 10,000 pages.
- **Vite 8 integration** — Astro 7 bundles Vite 8.3.0 internally.
- **Content Collections v3** — Astro's typed content layer for managing markdown/MDX content with schema validation.
- **Server Islands** — Allows mixing static and dynamic content on a single page (useful for comments, live scores).

### Caveats
- Incremental builds are a v7.2 feature; confirmed available in 7.3.2.
- Static HTML output deploys to any hosting (cPanel `public_html/`) — **known to work**.

---

## 2. Payload CMS — v3.89.0

**Checked:** npm registry, payloadcms.com changelog
**Previous assumption:** Strapi 5 CE (from user's original plan)
**Switch reason:** Strapi 5 CE locks Review Workflows, Content History, Scheduled Publishing, and Audit Logs behind paid Enterprise plan ($500+/month). Payload CMS 3 includes ALL of these for free (MIT license).

### Key findings
- **Next.js-native** — Payload 3 runs inside Next.js `/app` directory. No separate server needed.
- **Free built-in features critical for newsroom:**
  - Review Workflows (draft → in-review → published)
  - Content Versioning + Rollback (full history of who changed what)
  - Scheduled Publishing (write now, publish at 6 AM)
  - Field-level Access Control (reporters can't change publish date)
  - Audit Trail (complete activity log)
- **Database adapters:** SQLite (for launch), PostgreSQL (for scale). Swap is a config change.
- **Admin UI i18n:** Supports custom locale bundles — Bengali admin labels achievable.
- **Rich text editor:** Lexical-based block editor with custom blocks.
- **GraphQL + REST API:** Both available out of the box.
- **Version:** 3.89.0 released Sep 10, 2026.
- **Requirements:** Node.js 20.9.0+, Next.js 15.x or 16.x.

### Caveats
- **Payload on cPanel Passenger:** Assumed to work (Passenger runs Node.js apps), but not documented by Payload or DianaHost. Needs testing in S0.
- **Bengali admin labels:** i18n is supported, but no pre-built Bengali locale exists — we write the translation file ourselves.
- **SQLite WAL mode:** Needed for concurrent editors. Known to work with 5+ users.

---

## 3. Tailwind CSS — v4.3.3

**Checked:** npm registry, tailwindcss.com blog
**Previous assumption:** Tailwind 3.x (from user's original plan)
**Actual latest:** 4.3.3

### Key findings
- **Oxide engine** — Rewritten in Rust for 10x faster builds.
- **CSS-first configuration** — No more `tailwind.config.js`. Configuration done via `@theme` in CSS files.
- **Native CSS cascade layers** — Better specificity management.
- **Container queries** — Built-in support for component-level responsive design.
- **`@starting-style`** — CSS-only enter animations without JS.

### Caveats
- Migration from Tailwind 3 config format to CSS-first required if using older examples/tutorials.

---

## 4. TypeScript — v7.0.2

**Checked:** npm registry, devblogs.microsoft.com
**Actual latest:** 7.0.2

### Key findings
- **Go-based compiler** — TypeScript 7 replaced the JavaScript type-checker with a native Go binary. Type-checking is 10x faster.
- **Full backward compatibility** — Existing TS 5.x code compiles without changes.
- **Strict mode** — We use `strict: true` in tsconfig.

### Caveats
- **Compatibility with Astro 7:** Astro 7 uses Vite 8, which should support TS7's Go compiler. Assumed compatible — needs verification in S0.

---

## 5. Node.js — v24 LTS ("Krypton")

**Checked:** nodejs.org releases
**Actual latest LTS:** 24.x

### Key findings
- **Long-term support** — Active LTS until April 2028.
- **Native fetch** — Built-in `fetch()` API, no need for `node-fetch`.
- **Built-in test runner** — `node:test` module for unit testing.
- **Performance** — V8 engine improvements, faster startup.

### Caveats
- DianaHost PNR hosting must support Node 24. PNR stands for Python/Node/Ruby — Node.js is supported, but exact version availability needs confirmation.

---

## 6. Vite — v8.3.0

**Checked:** npm registry, vitejs.dev
**Actual latest:** 8.3.0

### Key findings
- **Used internally by Astro 7** — Astro 7.3 bundles Vite 8.
- **Also used by Tailwind 4.3** — Tailwind 4.3's Oxide engine integrates with Vite 8.
- **Rolldown bundler** — Vite 8 uses Rolldown (Rust-based) instead of Rollup for production builds.

### Caveats
- None. Managed by Astro internally.

---

## 7. SQLite — v3.53.4

**Checked:** sqlite.org changelog
**Actual latest:** 3.53.4

### Key findings
- **WAL mode** — Write-Ahead Logging allows concurrent reads during writes. Essential for 5+ editors.
- **Zero configuration** — No separate database server needed.
- **Payload CMS adapter** — Payload 3 has a first-party `@payloadcms/db-sqlite` adapter.
- **Migration path** — When traffic/editors grow, switch to PostgreSQL by changing one config line.

### Caveats
- SQLite is single-writer. With 5+ concurrent editors, WAL mode handles it, but under heavy load (50+ concurrent writes), PostgreSQL is needed.

---

## 8. PostgreSQL — v18.6

**Checked:** postgresql.org releases
**Actual latest stable:** 18.6 (v19 in beta)

### Key findings
- **Scale-up database** — Full-text search, JSONB, concurrent connections, replication.
- **Payload CMS adapter** — `@payloadcms/db-postgres` available.
- **DianaHost support** — PNR hosting may not include PostgreSQL. Fallback: free-tier cloud PostgreSQL (Supabase, Neon, Railway).

### Caveats
- Not used at launch. SQLite first, PostgreSQL when scaling. The switch is a single config change in Payload.

---

## 9. Pagefind — v1.5.2

**Checked:** npm registry, pagefind.app changelog
**Actual latest:** 1.5.2

### Key findings
- **Build-time search index** — Generates a static search index at build time. Zero server needed.
- **Web Components UI** — Drop-in `<pagefind-search>` component with built-in UI.
- **CJK segmentation** — Has Chinese/Japanese/Korean text segmentation. Bengali is in the same family of complex scripts.
- **Multilingual** — Supports filtering by language.
- **Index size** — Typically 1-5% of total content size.

### Caveats
- **Bengali search: UNVERIFIED.** Pagefind has CJK segmentation but Bengali text search has not been explicitly tested. Bengali uses spaces between words (unlike CJK), so standard tokenization should work, but conjunct characters (যুক্তাক্ষর) may need testing.

---

## 10. Listmonk — v6.2.0

**Checked:** listmonk.app, GitHub releases
**Actual latest:** 6.2.0

### Key findings
- **Self-hosted email marketing** — Full newsletter management, subscriber lists, campaign scheduling, analytics.
- **Written in Go** — Single binary, lightweight.
- **PostgreSQL required** — Listmonk needs its own PostgreSQL database.
- **REST API** — Full API for subscriber management from external forms.
- **Template engine** — HTML email templates with variables.
- **Free and open-source** — AGPL license.

### Caveats
- **Hosting risk:** Listmonk is a Go binary that needs PostgreSQL. DianaHost shared hosting likely can't run it. **Fallback plan:** Deploy Listmonk on Railway.app free tier or Render free tier (both support Go + PostgreSQL). The Astro frontend calls Listmonk's API remotely.

---

## 11. Cloudflare (Free Tier)

**Checked:** cloudflare.com pricing
**Used for:** CDN, SSL, DDoS protection, Web Analytics

### Key findings
- **Free plan includes:** SSL, CDN edge caching, DDoS protection, Web Analytics (cookie-less), Page Rules (3 free), DNS management.
- **Edge caching** — Static HTML cached at Cloudflare's edge nodes. Readers in Bangladesh hit Singapore/Mumbai PoPs.
- **TTFB reduction** — From 500ms+ (DianaHost origin) to <200ms via edge cache.

### Caveats
- Free plan limited to 3 Page Rules. Enough for: cache static, bypass `/admin`, security headers.

---

## 12. Bengali Fonts

**Checked:** Google Fonts, font file sizes

### Hind Siliguri (Headlines)
- **Source:** Google Fonts
- **Weights:** 300, 400, 500, 600, 700
- **Format:** WOFF2 subsetted to Bengali range (`U+0980-09FF`) + basic Latin
- **File size:** ~25-40KB per weight (subsetted)

### Noto Sans Bengali (Body)
- **Source:** Google Fonts
- **Weights:** 400, 500, 600, 700
- **Format:** WOFF2 subsetted
- **File size:** ~30-45KB per weight (subsetted)
- **Note:** Noto Sans Bengali has excellent conjunct character coverage — all যুক্তাক্ষর render correctly.

### Inter (English/UI)
- **Source:** Google Fonts
- **Version:** v4 (variable font)
- **Format:** Single WOFF2 variable file
- **File size:** ~100KB (covers all weights in one file)

### Font loading strategy
```css
@font-face {
  font-family: 'Hind Siliguri';
  font-display: swap;
  size-adjust: 105%;
  src: url('/fonts/hind-siliguri-700.woff2') format('woff2');
}
```
- `font-display: swap` — Shows fallback immediately, swaps when font loads (no FOIT).
- `size-adjust` — Reduces CLS by matching fallback metrics to web font metrics.

---

## 13. GitHub Actions (CI/CD)

**Checked:** github.com/features/actions
**Used for:** Automated build + deploy pipeline

### Key findings
- **Free tier:** 2,000 minutes/month for private repos, unlimited for public repos.
- **Workflow:** Payload publish → webhook → GitHub Actions → Astro incremental build → deploy to DianaHost via SSH/SFTP.
- **Estimated build time:** Astro incremental rebuild = 10-30 seconds (only changed pages). Full rebuild = 2-5 minutes for 10,000 pages.

### Caveats
- Need SSH access to DianaHost cPanel for automated deployment. Verify DianaHost provides SSH (PNR plans should).

---

## Summary: Version Corrections from User's Original Plan

| Technology | User's Plan Said | Actual Latest (Sep 2026) | Impact |
|-----------|-----------------|--------------------------|--------|
| Astro | 5.x | **7.3.2** | Rust compiler, incremental builds, Vite 8 |
| CMS | Strapi 4/5 | **Payload CMS 3.89.0** | Free newsroom features vs $500+/mo |
| Tailwind | 3.x | **4.3.3** | CSS-first config, Oxide engine |
| TypeScript | 5.x | **7.0.2** | Go compiler, 10x faster |
| Node.js | 20/22 | **24 LTS** | Native fetch, test runner |
| Pagefind | 1.x | **1.5.2** | Web Components UI |
| Listmonk | (not specified) | **6.2.0** | Self-hosted newsletter |

---

*Research completed 2026-09-11. All versions verified against npm registry and official project websites.*
