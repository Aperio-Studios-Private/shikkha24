# Task queue — the single source of truth for what is outstanding

**Read this file first, every session, before any other document.** It answers the
three questions a new agent has: *what was asked, what is in flight, what is next.*

Updated by the agent at the end of every task that changes it. Never written from
memory — if it is not in this file, it was not recorded, and a new session will
not know about it.

---

## How this queue is worked

1. **Every request the owner makes gets an entry** before any work starts. If it
   is not here, it has not been accepted.
2. **One task in flight at a time.** Finish it, verify it, commit it, mark it
   done — *then* take the next. Never batch tasks into one commit.
3. **Never hallucinate state.** A task is `done` only with evidence: a command's
   output, a URL returning an expected status, or a CI run's conclusion. "I
   believe it works" is not evidence and does not close a task.
4. **A blocked task stays open** and says what it is blocked on. It is never
   quietly dropped, and never reordered past without saying so.
5. **Findings that are not tasks still get recorded** — in `.sps/handoff.md`,
   not here. This file is for *work*, not for knowledge.

**Status values:** `todo` · `doing` · `blocked` · `done` · `dropped` (with reason)

---

## 🔴 In flight

### T-19 — Publish watcher: CMS publish → automatic site rebuild (owner chose 2026-10-15, option A)
- **Status:** ✅ DONE 2026-10-15. Evidence: `repository_dispatch` run completed
  success (~21:15Z) carrying the owner's own 20:26/20:31 edits; live on
  https://shikkha24.com (article /admission/25/post-nnsh4m 200; all four contact
  emails on /contact + footer); health `{"hasToken":true,"lastDigest":"a739cc6d6626"}`.
- **Outage log (all fixed, all evidence):** (1) mixed named/default module-Worker
  exports silently dropped `scheduled()`; (2) CLI deploy dropped the
  dashboard-added secret → `keep_vars = true`; (3) **the 403 root cause: GitHub
  rejects UA-less API calls and Workers' fetch sends no User-Agent** — both token
  types failed identically, which had nothing to do with permissions; (4)
  fine-grained PAT limitations made diagnosis noisy — the watcher now uses a
  classic PAT scoped `repo` (private repo). `POST /run-tick` added (ops, idempotent,
  digest-gated).
- **Reported:** during T-15 root-causing, the webhook trigger (`DEPLOY_WEBHOOK_URL`,
  `cms/src/lib/rebuild-trigger.ts`) proved unconfigurable on DianaHost — saving a
  Node app env var in cPanel runs a cagefs shell helper and the host's shell cannot
  fork (`cagefs_enter: Unable to fork`, ticket #0590191; the same failure breaks
  extraction and cron). Not fixable from inside cPanel.
- **Owner decision (2026-10-15, question prompt):** option **A — a standalone
  Cloudflare Worker cron-watcher**, chosen over waiting for P4 (Render) where the
  webhook returns as the instant path. The same day the domain moved to Cloudflare
  (P6 re-sequenced), making the watcher the natural resident there.
- **Design (documented: docs/hosting-and-deployment.md §10.6–10.7):** cron
  `*/5 * * * *`; poll the public REST endpoints (`articles, deadlines, categories,
  scholarships, circulars, live-streams, media` + global `site-settings`, each
  `?limit=1&sort=-updatedAt&depth=0` — header-contact 404s, excluded); sha256 of
  the concatenated response bodies; compare with Workers KV; on change POST
  `api.github.com/repos/SHAHID8142/shikkha24/dispatches` (`event_type: rebuild`);
  **store the digest only after a successful dispatch** (a failed dispatch
  retriggers next tick, so a publish is never lost). Drafts never appear in the
  public REST, so draft saves cannot trigger. Latency: ≤5 min poll + ~3 min
  build; free tier (cron + KV + 100k req/day).
- **Owner item to arm it:** fine-grained GitHub PAT (only repos: shikkha24;
  permission: Actions read+write) pasted as Worker secret `GITHUB_TOKEN`
  (dashboard: Workers & Pages → shikkha24-publish-watcher → Settings → Variables
  and Secrets) — never in chat, never in the repo.

### T-21 — Complete SEO pass + search-engine registration (owner requested 2026-10-15)
- **Status:** 🔴 `in flight` 2026-10-15 (owner: "start SEO"). Runs with the
  `sps-seo` skill (deterministic audit engine; baseline grade F = 30/100 on the
  source tree, with live probes confirming robots/sitemap/favicon/meta all
  present — the score is dominated by 29 H1 anomalies + 30 missing image alts
  + missing llms.txt).
- **GSC VERIFIED 2026-10-15 (owner):** domain property live; sitemap submission +
  index requests guided; alerts on. Bing import later.
- **Owner decisions in consultation:** goal = organic traffic + Bengali keyword
  rankings (keywords to be researched by me); competitors to be identified by me;
  demo content will be deleted and real articles start from 2026-10-16 — so
  per-article SEO ships as TEMPLATE + CMS guidance now, not as demo-article edits.
- **Scope addition — editable FAQ module (owner: "must have, make them editable
  admin can edit"):** CMS FAQ collection (add/edit/delete Q&A pairs) + storefront
  rendering with automatic FAQPage JSON-LD from the same records + starter
  Bengali drafts the admin refines. CMS-coupled: both sides ship together.
- **Scope addition — Google News sitemap + llms.txt: 2026-10-16 VERIFIED ALREADY LIVE,** no build
  needed: `news-sitemap.xml` carries the owner's 90-minute-old article (post-nnsh4m),
  `news:language bn` + CMS publication name + 48h filter (second spec-valid file in the
  vertical per the research); llms.txt curated+live (the source-audit "missing" flags were
  tree-path noise; live probes settle them).
- **Part A — technical SEO action pass:** titles/meta/OG/Twitter (Bengali), canonicals,
  robots.txt + sitemap.xml correctness on the Workers serving path, JSON-LD per page
  type (NewsArticle for articles, ItemList for listings, Organization on home…),
  404/redirect hygiene, internal linking, Core Web Vitals re-measured on
  **https://shikkha24.com** in production (mobile + desktop). Everything the audit
  finds gets fixed and re-verified.
- **Part B — search-engine registration, guided click-by-click for the owner:**
  Google Search Console (domain property; I produce the exact TXT record, owner
  pastes it in the Cloudflare DNS screen), sitemap submission, key-page indexing
  requests; Bing Webmaster Tools (import from GSC). The owner does only what
  Google/Bing require a human for.
- **DoD:** sps-seo audit green-or-waived with evidence; GSC shows sitemap received;
  key URLs submitted; performance + a11y budgets re-measured green on the live domain.

### T-22 — Feature-by-feature debug + bug/error-free + futureproofing pass (owner requested 2026-10-15)
- **Status:** 🔵 `in progress` — live sweep started 2026-10-16 (perf work runs in
  parallel under T-24).
- **DONE 2026-10-16 — route sweep:** all **69** public routes (63 from `sitemap.xml`
  plus `/404`, `/bookmarks`, `/cgpa`, `/citizen`, `/contact`, `/live-tv`, `/login`,
  `/search`, `/verify/<reporterId>`) return **200** on the live site. Two earlier
  "404s" were my own wrong URL forms, not bugs: bare `/verify` correctly 404s
  (the route is `/verify/<reporterId>`, verified content 200 + H1 "পরিচয়পত্র যাচাই"),
  and reporter profiles are addressed by slug, not id.
- **DONE 2026-10-16 — console sweep:** production logs exactly **one** error per
  page, on every template: Cloudflare's injected Web Analytics beacon is blocked by
  our own CSP. Nothing in the repo references it (it is added at the edge), which is
  why the local build scores best-practices 100 while production scores **93**.
  Owner chose to keep the CSP strict and disable the beacon in the dashboard →
  tracked as **O-4** in `.sps/owner-assistance.md`.
- **DONE 2026-10-16 — prayer widget correctness bug found and fixed** (commit
  `a833434`). The header requested Aladhan `method=15` but **never sent `school`**,
  so the API defaulted to **Shafi'i Asr**; Bangladesh follows **Hanafi** (2:1 shadow
  vs 1:1). The live site was serving Asr **5–6 min early** in October (ঢাকা 5.8,
  সিলেট 5.9, চট্টগ্রাম 5.3, রংপুর 6.2, বরিশাল 5.0), widening in summer. Asr is the
  only affected time. `school=1` now ships, documented next to `ALADHAN_METHOD`'s
  three upstream traps.
  The verifier was failing for the right reason via the wrong cause — **three
  defects in it masked the real one**: (1) it omitted `school` too, reproducing the
  bug it exists to catch; (2) its Hanafi shadow ratio was `1 + (hanafi ? noonShadow
  : 0)`, i.e. the Shafi'i shadow in both branches (corrected to `(hanafi ? 2 : 1) +
  noonShadow`, verified against the API across all 12 months, worst drift **1.1
  min**); (3) it compared **today's** API Asr against a computed Asr for a fixed
  **5 October** — an 11-day mismatch that produced a stubborn ~8 min drift no
  formula could explain. `verify:prayer-times` now passes.
- **DONE 2026-10-16 — full verifier-suite sweep: 29/29 green.** Ran every `verify:*`
  script that can run locally (`lighthouse` is CI-only by design). One genuine bug
  surfaced, in the prayer widget — see the entry below. Everything else passed,
  which is meaningful coverage rather than an assumption: CSP/inline-script
  invariants, container nesting, favicon consistency, calculator ID wiring,
  Pagefind hooks, internal links, Apache↔Worker header parity, deploy-mode inputs,
  CMS bundle sanitisation, SQLite WAL, importmap and migration drift, reporter
  pages, bookmarks merge, client-IP handling.
  ⚠️ **The lesson worth keeping: two of the three defects behind that one bug were
  in the verifier itself** — it omitted the same `school` parameter it existed to
  catch, and it compared two different dates. A failing check is evidence that
  *something* is wrong, not evidence of *what*; read the check before trusting it.
  Also note `timeout` is not on macOS (use `gtimeout`) — it silently made two
  results meaningless before I noticed.
- **REMAINING:** feature matrix walk (nav, home modules, article page, listing,
  exam-results, scholarship, deadline, prayer widget, live TV, /verify, ad slots,
  404, CMS admin flows end-to-end, publish watcher) with happy-path + edge cases;
  dependency freshness (`pnpm outdated` + advisories); dead-code purge;
  per-feature owner manual checks.
- **Scope:** walk every shipped feature in a planned matrix (nav, home modules,
  article page, category/listing, exam-results, scholarship, deadline, prayer widget,
  live TV, /verify, ad slots, 404, CMS admin flows end-to-end, publish watcher):
  happy path + edge cases (empty CMS collections, missing media, long Bengali titles,
  numerals, data-saver, slow network), browser-console error sweep (goal: zero
  warnings on every template), performance + accessibility budgets re-measured per
  template, dependency freshness (`pnpm outdated` + advisories), dead-code purge,
  documented owner manual check per feature (rule: each section ends on a manual check).
- **DoD:** per-feature checklist with evidence on https://shikkha24.com; zero
  build/lint/type errors; budgets green; handoff records the feature matrix file path.

### T-23 — Editorial content seeding, batch 1 (owner requested 2026-10-16)
- **Status:** 🔴 `in flight` — fact sweep running; articles land as paste-ready drafts.
- **The owner's ask, adjusted for ethics/safety (agreed framing):** original Bengali
  reporting on REAL public education facts (dates/fees/notices/routines from competitor
  news sitemaps + official/board sources), each citing its source — **no paraphrase
  copying, no copy of competitor prose** (Google scaled-content abuse risk + E-E-A-T;
  "humanized rewrite" replaced by original reporting with humanized voice).
- **Division of labour (owner chose the CMS-admin path):** I draft paste-ready articles
  (title/meta/body/category/cover-note); the OWNER publishes via the CMS admin (their
  login is theirs alone, rule 11) and deletes demo articles via the admin bulk UI.
- **Deliverable:** editorial/news-batch-2026-10-16.md (fact sheets → drafted articles).
- **Fact sweep (2026-10-16, done):** `editorial/news-batch-2026-10-16-sourcefacts.md` —
  6 verified source-fact sheets (ভর্তি নীতিমালা-২০২৭, ৪৫তম বিসিএস গেজেট ১,৭০২ জন,
  ইবতেদায়ি/দাখিল বৃত্তি কেন্দ্রতালিকা, এনইউ নিয়মিত মাস্টার্স ভর্তি, এইচএসসি ফলের সম্ভাব্য
  তারিখ ২৫–২৯ অক্টোবর, জাবি ভর্তি পরীক্ষা জানুয়ারি) + NOT-COVERED গ্যাপ তালিকা; প্রতিটি
  ফ্যাক্টে সোর্স URL, কোনো প্রতিযোগী-প্রোজ কপি নেই।
- **Scope extension (owner 2026-10-16):** fill ALL categories + ALL features (polls,
  quizzes, live blogs, fact-checks, deadlines, scholarships, institutions, study-abroad
  guides, result links, citizen submissions) → docs/editorial/content-matrix.md
  (coverage plan + sample Bengali titles per category × type + first-week batch).
  Plus editorial/visual-prompts-ai.md — AI cover-image prompt pack with the
  editorial-illustration house style (no fake photorealism, no AI text, credit
  "চিত্র: AI" mandatory).
- **PUBLISHED 2026-10-16 (desk-reporter run, owner-granted):** all six articles are
  live in the CMS (ids 23–28) and on the site:
  `/admission/23/admission-policy-2027`, `/jobs-career/24/45th-bcs-appointment-notice`,
  `/scholarship/25/madrasah-scholarship-exam-centres-2026`,
  `/university/26/nu-masters-admission-2024-25`,
  `/education-news/27/hsc-result-2026-possible-date`,
  `/admission/28/ju-admission-exam-2026-27` — each HTTP 200, one H1, zero template
  images; `/latest` + homepage show all six; news sitemap carries 6 URLs (was 0).
  Tooling: `scripts/publish-batch-1.mjs` + `-content.json` (login → desk author →
  lexical bodies → published; idempotent by slug).
- **Demo purge completed by me via API** (owner's UI bulk delete missed them):
  `demo-hsc-result-2026` (id 1), `demo-teacher-recruitment-2026` (id 22) deleted
  HTTP 200; `demo-madrasa-new-syllabus` (id 20) is gone from the CMS entirely.
  CMS now holds exactly the six real articles. The only remaining "demo" strings on
  the site are the intentional `DemoAd` ad placeholders (replaced by AdSense at S7).
- **Imageless rule shipped (owner 2026-10-16):** the category-archetype fallback was
  removed from `ArticleCard`, the homepage rail and the article hero. The template
  visuals the owner could not find in (or delete from) the media gallery were
  `frontend/src/assets/categories/*.jpg` — repo assets, not CMS media; the demo
  plates in the media library were uploads of those same visuals.
- **⚠️ OWNER ASSISTANCE NEEDED (covers):** REST multipart upload is broken on the
  live host — its proxy drops non-file form fields, so `alt` never arrives
  (proven 2026-10-16 with curl AND Node; file-only reaches validation, alt-only
  reports "No files were uploaded"). Upload pack is ready for pure clicking:
  `editorial/assets-batch-1/upload-ready/` (6 covers renamed per article + README
  with the exact Bengali alt text and `চিত্র: AI` credit). After the owner uploads,
  I PATCH `featuredImage` onto ids 23–28. Unlocks automatically at P4 (Render).
- After publish: watcher carries them live automatically (T-19); GSC picks up via
  sitemap.

### T-24 — Performance hardening: every Lighthouse category 95+ (owner requested 2026-10-16)
- **Status:** 🟢 `partly done, deployed` — accessibility/SEO/best-practices complete;
  performance remains. 2026-10-16.
- **DONE and live (commits `0fa038d`, `bfa91b3`):**
  | template | a11y | best-practices | SEO | color-contrast | heading-order |
  |---|---|---|---|---|---|
  | `/` | 96 → **100** | 96 → **100** | 100 | fail → **pass** | pass |
  | `/latest/` | 95 → **100** | 96 → **100** | 100 | fail → **pass** | fail → **pass** |
  | article | 97 → **100** | 96 → **100** | 100 | fail → **pass** | pass |
  | `/category/*`, `/author/*` | → **100** | | | | fail → **pass** |
  Verified live in production CSS: `--color-ink-subtle:#707070`,
  `--color-brand-red-on-tint:#c4161e`, `--color-brand-red-on-tint-dark:#f87171`,
  share buttons `#075e54`/`#166fe5`. CI + Deploy both green.
- **REMAINING — performance ≥95:** measured 93 (`/`), 96 (`/latest/`), 91 (article);
  LCP 2.55–3.16s vs the 1.5s target. `render-blocking-insight` scores 0.5/0.
- **Counter-proved:** inlining all CSS (`inlineStylesheets: 'always'`, 49 KB inline)
  made it **worse** — perf 98 → 97, FCP 1.21 → 1.38s, LCP 2.33 → 2.41s. Reverted;
  the bytes cost more than the blocking round-trip they save.
- **DONE 2026-10-16 (commit `0d69a1a`) — render blocking eliminated by a targeted
  inline:** Astro 7 has no critical-CSS extractor, so `assetsInlineLimit` is now a
  predicate that inlines **only `.css` under 4 KB** (1,893 bytes inlined; the 47 KB
  shared `Layout.css` stays external and cacheable). The `.css`-only guard is
  load-bearing — `public/.htaccess` is `script-src 'self'`, so inlining a `<script>`
  breaks every control (the S8 trap); verified the build emits **0** executable
  inline scripts.
  | template | perf | LCP | render-blocking |
  |---|---|---|---|
  | `/` | 93 → **94** | 3.00 → **2.85s** | 0.5 → **0** |
  | `/latest/` | 96 → 96 | 2.55s | 0 → **0** |
  | article | 91 → 91 | 3.16 → 3.15s | 0 → **0** |
  Payload 307 KB vs the 1,229 KB budget; CLS 0.000; a11y/SEO/BP 100.
- **DIAGNOSED 2026-10-16 — the real remaining bottleneck is Style & Layout, not
  network.** From the optimised build's own audits:
  - `mainthread-work-breakdown` 2.5 s, of which **`styleLayout` = 2,454 ms (98 %)**;
    script evaluation is only 18 ms and there is a single **1,223 ms long task**.
  - Both Bengali fonts load in **3 ms** (preloaded) — the "font-gated paint"
    hypothesis is **disproved**. Server responds in 2 ms. Third-party blocking: 0 ms.
  - Page has **622 DOM elements, 15 levels deep**; `Layout.css` carries **157
    `.dark` selectors**, each generated as `:where(.dark, .dark *)` by
    `@custom-variant dark`, i.e. a **descendant match re-tested against every
    element's ancestor chain**.
- **ATTEMPTED AND REVERTED (do not repeat):** rewriting the dark variant to be
  root-scoped. Both forms tried — `(&:where(.dark) &)` and `(&:where(.dark, .dark *)
  &)` — compiled to **self-descendant selectors**
  (`.dark\:x:where(.dark) .dark\:x`), which require a *nested duplicate* element and
  would silently break dark mode on most nodes. Caught by reading the built CSS, not
  by trusting the build exit code; reverted both times. **The correct fix needs
  proper research into Tailwind 4's `@custom-variant` semantics before another
  attempt** — do not guess at this syntax again.
- **INVESTIGATED 2026-10-16 — a CSS split has no headroom left.** Measured the
  composition of `Layout.css` (47,360 B) by layer:
  | layer | bytes | share |
  |---|---|---|
  | `properties` | 1,250 | 3% |
  | `theme` (tokens) | 2,941 | 6% |
  | `base` (preflight) | 4,318 | 9% |
  | `components` | 1,106 | 2% |
  | **`utilities`** | **33,933** | **72%** |
  The obvious idea — ship `theme`+`base` first and defer the utilities — dies on
  **`unused-css-rules` scoring 1.0**: Lighthouse finds no material unused CSS, so the
  utilities layer is essentially all in use and splitting it removes no bytes, only
  adds a round trip. Dark-mode rules are only **4,813 B** of the 47 KB, so stripping
  them would break dark mode for a ~10% byte cut that the ×4-slowdown math says is
  worth ~100 ms at best. **There is no cheap CSS win left.**
- **DONE 2026-10-16 (commit `8e7d7b9`) — the styleLayout bottleneck is gone.**
  `content-visibility: auto` (+ `contain-intrinsic-size: auto 24rem`, which is
  mandatory or the skipped subtrees collapse and CLS goes red) on the homepage
  category sections past the first. Measured, median of 3, mobile:
  | metric | before | after |
  |---|---|---|
  | `styleLayout` | 2,454 ms | **227 ms** (−91%) |
  | longest task | 1,223 ms | **174 ms** (−86%) |
  | TBT | passing | 0 ms |
  | CLS | 0.000 | **0.000** |
  | perf / LCP | 94 / 2.85s | **unchanged** |
  ⚠️ **The negative half is the useful half:** LCP did *not* move, which proves the
  styleLayout cost was running **after** the LCP paint. With TBT now 0 ms and the
  long task gone, **the binding constraint is FCP (2.1s)** — LCP is only 0.8s behind
  it, and the LCP element is a text headline, so LCP ≈ "when text can paint at all".
  That is a round-trip/CSS problem, not a main-thread one.
- **MEASURED LIVE 2026-10-16 (the authoritative number; Brotli on, Cloudflare):**
  `/` → perf **94**, FCP **1.81s**, LCP **2.73s**, TBT **0ms**, CLS **0.000**,
  `uses-text-compression` **1**. ⚠️ **Local `python3 -m http.server` does not
  compress, so local FCP/LCP read ~0.15-0.3s worse than production** (local FCP 2.10
  vs live 1.81) and `uses-text-compression` fails locally for that reason alone —
  production serves `content-encoding: br` for both HTML and CSS, verified with
  `curl -I`. Do not "fix" compression: there is nothing wrong with it, and woff2
  needs none.
- **REMAINING — the honest picture:** render blocking is fixed, but LCP is still
  2.55–3.15s. LCP breakdown says **TTFB 451 ms (15 %) + render delay 2,552 ms
  (85 %)**, and the LCP element is a Bengali **card headline** — so the cost is
  font-gated text paint plus host latency, not round trips. The 4 KB threshold is
  also CI-specific and should be re-derived if the CI runner's throttling changes.
  Both `/` (94) and the article (91) are still short of the ≥95 bar.
- **Owner's bar (confirmed 2026-10-16):** **all four Lighthouse categories ≥95**
  (performance, accessibility, best practices, SEO) on **mobile**, on **every**
  measured template — in CI (CI is the only authoritative measurement per the
  constraints block). Current thresholds in `lighthouserc.json` are 0.9; T-24 ends
  with them raised to 0.95.
- **First blocker — article-template CLS 0.036 vs budget (owner chose: fix properly,
  not relax):** the `articleTop` ad box (`div.mt-6 flex justify-center`, 380×90)
  moves 90px during load on `/education-news/20/demo-madrasa-new-syllabus/`, which
  is the seeded CI fixture — so the deploy gate stays red until the shifting
  element's space is reserved. Deploys (incl. T-23 batch 1) are blocked on this.
- **Known gaps at queue time (evidence: `docs/seo/cwv-live-2026-10-16.md` + CI logs):**
  - LH performance 67 `/`, 71 `/latest`, 56 `/contact`, 55 `/` desktop (target 95)
  - LCP 12.95s home — hero = the CMS original at ~1.56 MB; needs resized variants,
    `srcset`, `fetchpriority`, and a CMS-side image pipeline decision (P3/R2 coupled)
  - Render-blocking CSS chain + `theme-init.js` (2.4s wasted in the desktop trace)
  - Edge MISS on HTML (`max-age=0 must-revalidate`) → origin latency spikes reach LCP
  - CI gate: article-page sidebar `div.mt-6` CLS 0.036 vs 0.02 budget (ad-card rail)
  - Initial payload 1.92 MB home / 1.86 MB `/latest` vs 1.2 MB budget
- **Scope:** fix each contributor with before/after numbers from the CI Lighthouse
  artifacts, then hold all four categories ≥95 across the template list in
  `.sps/plan.md`. Bundle-size work: trim/inline critical CSS, defer the rest, ship
  sized WebP/AVIF covers, preload/subset the Bengali font, guarantee image boxes
  (width/height) everywhere so CLS stays under budget.
- **DoD:** CI Lighthouse gate green (all four categories ≥95) on the whole template
  list, with the pre-fix numbers recorded in `.sps/handoff.md` as the counter-proof.

### T-25 — CMS media files are gone from disk: every image 500s (owner reported 2026-10-16)
- **Status:** 🔴 `open` — root cause found, fix needs the owner (no SSH/cPanel Terminal).
- **Owner's report:** all 12 supplied images display
  `{"errors":[{"message":"Something went wrong."}]}` instead of the picture.
- **Evidence (2026-10-16, live):**
  | URL | Result |
  |---|---|
  | `/api/media/file/2.jpg` | **500**, 48 B `{"errors":[{"message":"Something went wrong."}]}` |
  | `/api/media/file/demo-plate-8.webp` | **500**, 48 B — same body |
  | `/api/media/file/9.svg` | **500**, 48 B |
  | `/api/media/file/icon-maskable.svg` | **200**, 899 B ✅ |
  | `/api/media?limit=12` | **200** — records intact (id 2: `demo-plate-8.webp`, 11 KB, 1600×1067) |
  | `/api/media/2` | **200** — record fine, `url` correct |
- **Diagnosis:** Payload serves the **record** from SQLite but cannot read the **file
  bytes** — they are missing/moved on disk. It is not a UI bug, not a permissions
  bug in the admin, and not a code bug: the record↔file pair is broken at the
  filesystem level. Both the demo plates (ids 1–6) and the owner's uploads are hit;
  only files that still exist on disk (favicon/icon) serve correctly.
- **Consequence for T-23:** uploading covers to THIS host would fail identically, so
  the cover upload is blocked on either (a) the owner restoring the upload directory
  on the host, or (b) P3/P4 (media to R2 / CMS to Render) which replaces the file
  store. The `upload-ready/` pack stays queued for whichever comes first.
- **Sharpened evidence (2026-10-16, all 8 media records probed):**
  | created | file | HTTP | bytes |
  |---|---|---|---|
  | 2026-10-13 | `icon-maskable.svg` | **200** | 899 |
  | 2026-10-13 | `apple-touch-icon.png` | **200** | 2334 |
  | 2026-10-04 | `demo-plate-7…12.webp` (ids 1–6) | **500** | 48 (error body) |
  → **Everything uploaded 2026-10-13 serves; everything from 2026-10-04 is gone.**
  The two working files live in the CMS `public/` output; the six broken ones are all
  in the **media upload directory** — so that directory was lost/emptied, it is not a
  per-file or per-record problem.
- **The owner's 12 images are NOT in the CMS at all** — only 8 media records exist and
  none is newer than 2026-10-13, so their admin upload never completed either (same
  host-level upload problem the REST API hits). Nothing of theirs is lost on the
  server; the files are still in `editorial/assets-batch-1/`.
- **Owner action required (one of):**
  1. cPanel → File Manager → the CMS app directory → find Payload's upload dir
     (`upload.staticDir`; typically `media/` beside the app) → confirm it exists and
     is writable, and restore its contents from the T-03 backup if it is empty.
     Then a fresh upload from `upload-ready/` will tell us in one attempt whether the
     directory is healthy again.
  2. Or tell me to treat media as broken-until-P4 and keep publishing text-only
     (current live state — fully readable, just imageless).
- **DoD:** an image URL returns 200 with image bytes, and the covers from
  `editorial/assets-batch-1/upload-ready/` can be attached to articles 23–28.

- **SHARPENED 2026-10-16 — the records are intact, the *files* are gone.** All 8
  media documents read fine from the API, and each one reports its **correct
  filesize** (e.g. `demo-plate-7.webp` = 13,482 bytes) — so the uploads originally
  succeeded and the metadata is specific, not stubbed. Only the **file-serve** route
  fails, and it fails per-file, not per-route:
  | path | HTTP |
  |---|---|
  | `/api/media/file/icon-maskable.svg` (2026-10-13) | **200** |
  | `/api/media/file/demo-plate-7.webp` (2026-10-04) | **500** |
  | `/media/demo-plate-7.webp`, `/uploads/…` | 404 (wrong path, expected) |
  Both working and failing files use the **identical route**, so this is not a
  routing, config or permission-profile difference — it is that the 2026-10-04
  files are absent from `upload.staticDir` on the host while their database rows
  survive. `{"errors":[{"message":"Something went wrong."}]}` (48 B) is Payload's
  generic wrapper over the underlying `ENOENT`.
  **Conclusion: nothing further can be diagnosed without host access.** The owner
  needs to look at Payload's `upload.staticDir` (see `.sps/owner-assistance.md`
  O-1); if the directory is empty, the T-03 backup is the recovery source. The
  owner's 12 images never reached the CMS at all and are safe in the repo.
### T-26 — CMS admin UI/UX: buttons read as flat text, not as buttons (owner requested 2026-10-16)
- **Status:** 🟡 `code complete, not yet live` — implemented and verified 2026-10-16,
  committed `b711eb3`. **Needs a CMS deploy on DianaHost to appear**: the Cloudflare
  workflow deploys only the storefront; the CMS is not built by it.
- **Implemented:** `cms/src/app/(payload)/custom.scss` (Payload's supported override
  point, already imported by `app/(payload)/layout.tsx`; `node_modules` untouched).
  Radius, 600 weight, 44px min block-size, resting/hover/active shadows, press
  settle, `:focus-visible` ring; primary hover lifts instead of fading; secondary /
  subtle / `style-none` get a real surface so plain-text actions stop looking like
  body text; `.delete-document__toggle` (which Payload strips to
  `border:0; background:none; box-shadow:none; border-radius:0`) becomes a visible
  control with an error-red hover; list/bulk-action controls included.
- **Verified:** `next build` succeeds; rules present in the emitted admin CSS
  (`.next/static/chunks/0b_6tkjnsmwlc.css`). Every selector checked against the
  compiled `@payloadcms/ui/dist/styles.css` — that caught two dead rules
  (`btn--color-error` does not exist; `--theme-error-700` is not in Payload's scale).
- **Owner's words:** "improve the UI and UX of the CMS specially the button are too
  flat unable to understand that it's a button to use".
- **Scope:** Payload admin visual language — real affordance on every interactive
  control (fill/border/shadow/hover/active/focus-visible states), primary vs
  secondary vs destructive hierarchy, ≥48×48px touch targets, clear disabled and
  loading states, Bengali labels stay as they are (labels are already localized),
  consistent spacing, and a contrast pass on the admin theme (WCAG AA). No change to
  the reader-facing storefront.
- **Constraint:** implement via Payload's supported admin customisation
  (`admin.components` / `admin.css` custom SCSS), not by patching `node_modules`.
- **DoD:** every button, link-button, tab, bulk-action and pagination control has an
  unmistakable affordance with visible hover/focus/active states; a11y contrast pass;
  owner confirms by eye in the admin (this is a visual gate — it needs their check).

### T-27 — Local build flakiness on Node 26 (developer machine only) (found 2026-10-16)
- **Status:** `open`, low priority — **does not affect CI or production.**
- **Symptom:** `npx astro build` fails intermittently with `ERR_MODULE_NOT_FOUND`
  (`dist/.prerender/chunks/<x>.mjs`) or a Tailwind module-loader crash. When it
  "succeeds" it is not silent-degrading: a failed CMS fetch yields 52 pages instead
  of 89 (no article/category dirs), which is how a wrong dist went unnoticed once.
- **Measured (2026-10-16):** **4 pass / 1 fail in 5 consecutive builds = ~20 % flake**
  on this machine.
- **Root cause:** this machine runs **Node v26.10.0**; `.nvmrc` pins **24**. No
  nvm/fnm is installed, so 24 cannot be selected locally.
- **CI is NOT affected:** every workflow pins `node-version: 24`
  (`ci.yml:48`, `deploy-cloudflare.yml:109`, `deploy.yml:166`, `backup-db.yml:104`,
  `host-health.yml:109`). Verified 2026-10-16.
- **Consequence for agents:** a local build failure is retryable; do not treat it as
  a regression, and **always check the page count** (89 with a reachable CMS vs 52
  without) before measuring or concluding anything from `dist/`.
- **Fix when convenient:** install nvm/fnm and run builds on Node 24 locally, or
  upgrade the repo to Node 26 deliberately (would need a CI matrix change too).

### T-20 — Full security audit with the Cloudflare `security-audit` skill (owner requested 2026-10-15)
- **Status:** `queued` — deliberately NOT started: T-19 arming (owner PAT) and the
  T-15 publish test come first, per the owner.
- **Skill installed this session:** cloudflare/security-audit-skill @ c1c8a8c
  (~/.claude/skills/security-audit-skill, registers as `security-audit`).
- **Scope when run:** the full checkout — CMS (Payload admin surface, auth, seed
  diagnostics), the Astro storefront build + Workers (headers/CSP dispatch,
  custom-domain serving), the publish watcher (T-19: token handling, dispatch
  path, KV), CI workflows and their secrets surface. Defensive, source-first;
  findings need a concrete trust boundary + affected principal.
- **Deliverable:** prioritised findings with source evidence + smallest fix;
  anything exploitable through the public site or CMS goes straight to a T-task.


### T-15 — CMS edits do not appear on the live site (owner reported 2026-10-12)
- **Status:** ✅ CLOSED 2026-10-15. The original T-15 edit is live, and the
  owner's newest publish (article + contact emails) flowed CMS → watcher →
  rebuild → https://shikkha24.com with zero manual steps (T-19 evidence).
  All turns of the cPanel extraction rabbit hole are superseded by the
  Workers publish pipeline (T-18).
- **Reported:** "CMS changes are not reflecting on the site live — after edit, adding
  anything, those are not showing in the site."
- **ROOT CAUSE — proven, not inferred.** The storefront is **static HTML built in
  CI**; the CMS write and the storefront publish are two separate steps, and the
  second one is not happening. Three independent breaks in the chain, each
  measured this session:
  1. **The content is in the CMS.** `GET /api/articles/27` → title `টেস্ট - 2`,
     `updatedAt 2026-10-12T07:38:09Z`, `_status: published`. The edit landed.
  2. **The live site serves the pre-edit page.** The same URL on the storefront
     returns `<title>টেস্ট - ১ — শিক্ষা২৪.কম</title>` — the **old** title. The
     homepage's `last-modified` is `05:52:35Z`, **1h46m before** the edit.
  3. **`AUTO_DEPLOY` is unset**, so every webhook/push deploy resolves to
     `dry-run` and uploads nothing (`deploy.yml:198` `MODE="${AUTO_DEPLOY:-dry-run}"`,
     `gh variable list` shows no variable).
  4. **The webhook that would fire it is unconfigured on the host.**
     `lib/rebuild-trigger.ts:84` returns early when `DEPLOY_WEBHOOK_URL` is empty —
     silently, by design, with the only clue being a Bengali admin notice.
  5. **CI is red**, so even a push deploy is now refused by the T-11 gate
     ("Wait for CI to pass" → failure on the last three runs).
- **This is T-14's finding, now observed as a user-facing symptom.** The host has
  no working API extraction mechanism (probed live: `Fileman::extract_files`,
  `unzip`, `Extract::extract_archive`, `Fileman::extract` all fail with real
  cPanel errors). A deploy uploads a zip and **cannot expand it**.
- **FIX APPLIED — manual live static deploy, proven to work today.** Run
  `38209765693` (05:51) did exactly this: `mode=live target=static skip-ci-gate=true`,
  `Extracted via api2-fileop`, `.htaccess` written explicitly, and the site's
  `last-modified` moved to `05:52:35Z`. That mechanism works — it is the *trigger*
  that is missing, not the transport. Re-running that same dispatch publishes the
  pending edit.
- **⚠️ THE ABOVE IS WRONG — hypothesis refuted, do not act on it.** Kept visible
  rather than silently corrected, because the error is the lesson. `cb61eb7` (the
  extraction-confirmation check) is **not** an ancestor of the 05:51 run's SHA
  `490c7a8` — verified with `git merge-base --is-ancestor`. So the 05:51 "success"
  **predates the check that would have caught a no-op**. It proves the upload
  worked; it proves nothing about extraction. The mechanism was never proven.
- **WHAT ACTUALLY HAPPENED on the three live runs this session:**
  | Run | Time | Result |
  |---|---|---|
  | `38221385908` | 08:04 | **Cancelled** at the 25-min job timeout — the harness hung (M32) |
  | `38226497825` | 08:55 | **Failed correctly**: "Extraction reported success … but pagefind/pagefind.bn_7c722f2aa5.pf_meta is not on the host" |
  | `38228086708` | 09:07 | **Failed correctly**: same, different pagefind hash |
  The last two are **the gate working as designed**, not failing. Before
  `cb61eb7` both would have reported `success` while the site stayed stale —
  precisely the T-14 defect. Two archives are staged on the host, un-extracted:
  `public_html/frontend-38226497825.zip` and `public_html/frontend-38228086708.zip`.
- **The one real code fix this session: M32.** `verify-cpanel-deploy.mjs`
  section 10b opened a fake cPanel server at line 816 and never closed it. A
  listening socket keeps the Node event loop alive, so the suite printed
  `✅ 79 passed` and hung **forever** — burning the job's 25-minute budget and
  cancelling the deploy it was gatekeeping. Found by counting
  `startFakeCpanel` vs `.close()` across the file's brace structure (20 opened,
  19 closed), not by reading. Fixed in `97312a6`: local repro went from
  `exit null` at 60s to `exit 0` in **0.6s**, 79/79 unchanged. All three deploy
  suites now exit: 79 + 47 + 10 = **136 checks**.
- **STATUS: `blocked` on extraction — a host property, not a code one.** The
  build is correct, the upload works, the gate is honest. The break is the last
  mile: `api2-fileop` answers success and writes nothing. Two retries both
  no-opped. The 05:52 `last-modified` does prove one real write landed today, so
  extraction is **flaky rather than dead** — but a coin flip is not a deploy.
- **Owner action to publish the pending edit (~1 minute, the only working path):**
  cPanel → File Manager → `public_html` → select **`frontend-38228086708.zip`**
  (the newest) → **Extract** → into `public_html`, overwrite everything → delete
  both zips. Then confirm
  `https://shikkha24.com/education-news/27/post-8x9lfi/` reads `টেস্ট - ২`.
- **Loop block, updated for the refutation.**
  - **Hypothesis (revised):** extraction is flaky on this host, not broken; but
    "sometimes works" is not a deploy mechanism.
  - **Asset:** none in-repo. The remaining failure is the host's `fileop`.
  - **Metric:** the live `<title>` reads `টেস্ট - ২`. **Not yet met.**
  - **Budget:** exhausted (2 live attempts + 1 hang). Per `.sps/loop.md`, stop and
    record rather than poke a third time.
  - **Degraded when:** already degraded — a green deploy that publishes nothing.

### T-16 — Full feature-by-feature audit (owner requested 2026-10-12)
- **Status:** `todo` · queued behind T-15 per the owner's instruction: *"write it
  to the task file and continue working on the current task; no immediate
  execution."*
- **Request:** enumerate every feature and module exhaustively, then audit each
  **strictly sequentially** — one at a time, fully completing each before the
  next, never multiple at once. For each: purpose, implementation status, all
  issues found; then implement and verify fixes. Parallel subagents per feature,
  each returning one consolidated report that the lead verifies before any push
  or deploy. **Present findings per feature and wait for explicit owner approval
  before the next feature.**
- **Not started.** T-15 comes first.
- **⚠️ Karpathy's Loop is already installed here** — `.sps/loop.md` is the
  project's adaptation of it, and `.sps/mistakes.md` records the loop violations.
  No internet research or installation needed; the method is in-repo.

### T-17 — Fully automatic push-to-deploy (owner requested 2026-10-12)
- **Status:** `doing` · **the code is built and counter-proved; it stays INERT until
  the owner confirms `tar` on the host and installs the cron.** Owner approved the
  full auto-deploy: *"verify unzip on the host and build the full auto-deploy (set
  DEPLOY_WEBHOOK_URL + cron extract script). Goal: publish in CMS → live with zero
  manual steps."*
- **🆕 2026-10-13 — the extractor switched from `unzip`/`.zip` to `tar`/`.tar.gz`.**
  The owner pointed at a sibling project already deployed on DianaHost
  (`al-marsus` / almarsus.com, repo `SHAHID8142/AI-Marsus2026-Final-Production`),
  and its deployment proves the better mechanism. Its cron watcher
  (`diana-deploy-watcher-prod.sh`) extracts a `.tar.gz` with `tar -xzf` **every
  minute**, and its CI (`diana-prod.yml`) uploads over **FTPS port 21**. `unzip`,
  the original choice, was **never verified** anywhere and was T-17's only open
  unknown; `tar` is demonstrated on this platform. The switch retires that
  unknown rather than depending on it.
  ⚠️ **Correction 2026-10-13 (owner-raised, then verified):** almarsus is a
  **different cPanel account** (`/home/almarsus`, not our `/home/shikkhac`), so
  its watcher is *platform*-level evidence only — it does not prove `tar` is
  installed on ours. And the second half of the earlier claim, "our own backup
  cron's `tar -czf`", is false: `.sps/opencodereport.md` C3 records that
  `host-backup-dump.sh` has **never run** on the host, and `backup-db.yml` CI is
  still failing today (2026-10-13). So `tar` is **unverified on the shikkhac
  account**, which is exactly why `host-extract.sh` guards with `command -v tar`
  before touching anything. Owner action O-1 is a genuine prerequisite, not a
  formality. See M34.
- **How the extraction ceiling (previously T-14, "no API mechanism works") is now
  surmounted — the API still can't extract, but a host-side shell `tar` run by
  CRON can.** So the last manual link (Extract in File Manager) moves from a
  human to a 2-minute cron.
  ⚠️ **Cron itself is not yet proven on this account** — the CloudLinux fork
  limit that has blocked the backup cron since 2026-10-04 was checked on
  2026-10-10 only through cPanel UAPI, not through a cron run. That is the larger
  open risk to this mechanism; see handoff.
- **Built, each counter-proved:**
  1. `scripts/host-extract.sh` — the cron extractor. Finds the newest
     `frontend-*.tar.gz` in `public_html`, waits for the upload size to settle
     (20s, the same guard almarsus's watcher uses), `tar -xzf`s it, proves
     `index.html` landed, deletes every archive, logs to
     `~/shikkha24-deploy/extract.log`, and writes a **heartbeat**
     (`extract-heartbeat.txt`) *only after* confirming `tar` exists. Counter-proved
     by `scripts/verify-host-extract.mjs` (22 checks): fails loud + touches nothing
     when `tar` is absent; never trusts a lying `tar` (exit 0, writes nothing);
     writes **no** heartbeat when it cannot extract; skips a still-uploading
     archive rather than extracting a half-written one.
  2. `scripts/deploy-static.mjs` — the CI handoff. Packs `frontend-<run>.tar.gz`
     with `tar -czf` (was `zip`) and uploads it under a per-run name. When the API
     extract no-ops, CI reads the heartbeat: **fresh → it waits (polling the
     *site*, not the API) for a page that is new in this build to return 200, and
     goes green only then; stale/absent → it fails loud exactly as before** (the
     T-15 guard is preserved verbatim). Counter-proved in
     `scripts/verify-cpanel-deploy.mjs` section 10c (the "goes green" check went
     **red** when the branch was disabled, proving it is not vacuous).
  3. **`verify-cpanel-deploy.mjs` §10d — the CI↔cron name contract (new,
     7 checks).** CI and the cron are two files that never meet at runtime; the
     *only* thing connecting them is the archive filename. A prior session
     converted the cron half to `tar`/`.tar.gz` and left CI emitting `.zip` — a
     total publishing outage that all 85 existing checks certified as healthy,
     because none of them compared the two halves. §10d reads both files at the
     strings that decide it and asserts they agree. **Counter-proved in both
     directions:** reverting CI to `.zip` → 91 pass / **1 fail** naming the
     mismatch; reverting the cron to `unzip`/`.zip` → 89 pass / **3 fail**
     (glob mismatch, wrong extractor, stale `unzip`). Suite is now **92 checks**.
- **Why this is fail-safe and not the T-15 bug again.** The handoff is gated on
  *evidence* (a fresh heartbeat the cron writes only when it can extract), and CI
  verifies the *reader-visible end state*, not the mechanism. A host with no
  `tar` never heartbeats, so CI falls straight through to today's loud failure.
  The automation is **inert until the cron genuinely works** — it cannot ship a
  green deploy on a stale site.
- **⚠️ The two things only the owner can do (I cannot — no SSH):**
  1. **Confirm `tar` on the host — and confirm cron can fork at all.** In cPanel
     Terminal, or a one-off cron running
     `/bin/sh -c 'command -v tar && tar --version | head -1; touch ~/public_html/.w && rm ~/public_html/.w && echo WRITABLE'`
     — read the result. **Do not treat this as a formality** (M34): neither `tar`
     nor a forking cron had ever been shown to work on the *shikkhac* account —
     almarsus is a different account, and our backup cron has never produced an
     archive because every run dies at the CloudLinux fork limit. The fork limit
     was only checked via cPanel UAPI on 2026-10-10, never through a real cron
     run, so **a one-off cron that runs a real command is the test that matters
     most** — if that command's output appears in a log, both `tar` and forking
     are settled at once. If `tar` is missing, install it (`yum install tar`) or
     this approach is dead and the honest scope reverts to T-15's one-step manual
     extract. If a one-off cron cannot fork, the whole cron-extract mechanism is
     blocked and the backup cron's O-1 blocker is the same blocker.
     **⚠️ 2026-10-13 status: this is now a host ticket, not a code task.** The
     owner installed the cron and uploaded `shikkha24-extract.sh`; **no
     `extract.log` was ever created**. A builtin-only probe (`echo` + `command -v`
     — chosen deliberately because it needs **no `fork()`**) produced **no file at
     all**, so nothing under the owner's control executed. But the owner also
     recovered the old `cron-test.txt` from the host containing one line,
     `Fri Oct 9 23:00:02 +06 2026` — **one real successful cron run**, at 23:00,
     a quiet hour. So the account can fork intermittently; it is a load/contention
     condition, not a permanent block. **DianaHost ticket #0590191 (escalated to
     L2, Critical, open since 2026-10-04) is the fix.** Until it is resolved,
     T-17 stays inert, the backup cron cannot be trusted either, and **T-15's
     manual extract remains the only way to publish.** Nothing further to build
     here — the next action is DianaHost's.
  2. **Install the cron** (once `tar` is confirmed): upload `host-extract.sh`
     to `~/bin/` as `shikkha24-extract.sh`, then cPanel → Cron Jobs → every 2 min:
     `/bin/sh /home/shikkhac/bin/shikkha24-extract.sh`. (`/bin/sh` reads the file,
     so no execute bit is needed.) Read `~/shikkha24-deploy/extract.log` to
     confirm it runs and writes a heartbeat.
- **Then flip the two switches (owner, in GitHub):** set the `DEPLOY_WEBHOOK_URL`
  secret (CMS publish → rebuild) and `AUTO_DEPLOY=live` (push/webhook → publish
  instead of dry-run). Both are documented in `docs/hosting-and-deployment.md`.
- **Still gated on:** T-10 (CI red on the dependency audit — the T-11 gate will
  refuse to publish until that is resolved) and T-15 (the currently-pending edit).
- **Request:** *"Implement a fully functional, bug-free push-to-deploy system,
  completely automatic — trigger a build and deployment on every push, handle
  the pipeline end-to-end without manual steps, ensure reliability: error
  handling, rollbacks, failure cases."*
- **⚠️ Pre-existing, unrelated failure:** `verify:prayer-times` fails (Asr drifts
  ~3–4 min from the independent Hanafi value in 5 cities) on committed HEAD too —
  an owner decision on the prayer method, not a deploy issue. It aborts
  `pnpm verify` before the deploy gates, so those must be run by name.

### T-01 — CMS admin rejects all edits, uploads and creates
- **Status:** ✅ **CLOSED 2026-10-16 — writes work; the `roles` root cause was fixed by
  the Payload 3.90.2 migration (T-10).** Evidence: **6 articles were created and
  published through this live CMS on 2026-10-16** (`scripts/publish-batch-1.mjs`,
  author → Lexical body → `_status: published`) and **3 demo articles were deleted**
  via the API in the same session. All three are authenticated *writes*; they cannot
  succeed while "the CMS rejects all edits" is true. The `roles` column now exists
  in the migrated databases (`cms/data/seedtest.db`, `cms/data/migrate-tmp.db` both
  report `roles present = True`), and the protected read path answers 200.
  ⚠️ **Residual, not re-tested:** this proves the **API** write path. The **admin UI**
  path (browser session, in-context editing) was not re-exercised this session,
  because no credentials are stored locally and the owner is rotating the password.
  If the owner still sees "You are not allowed to perform this action." **in the
  browser**, this reopens — but as a UI/session issue, not a schema one.
  Original diagnosis kept below as the record of the root cause.
- **Originally:** `todo` (root cause found; fix needs an owner decision) · 🔴 production
- **Reported:** 2026-10-10 — "You are not allowed to perform this action." on every
  create/edit/upload; logout shows a success toast but the session survives.
- **ROOT CAUSE — proven from data, not inferred:**
  **The `users` table has no `roles` column, in any environment.**
  - Production (verified backup `2026-10-10-PROD-payload.db`): columns are
    `id, name_bn, author_profile_id, phone, updated_at, created_at, email,
    reset_password_token, reset_password_expiration, salt, hash, login_attempts,
    lock_until`. No `roles`.
  - Local dev DB `cms/data/payload.db`: **identical** — also no `roles`.
  - `20261003_155252_initial.json` (the only migration touching `users`): identical
    column list. No `roles`.
  - `Users.ts:101` declares `roles` as a real field — `type: 'select'`,
    `hasMany`, **`required: true`**, `defaultValue: ['reporter']`, indexed.
- **Why that denies every write — the deadlock:**
  `rolesOf()` reads `user.roles`; the column does not exist, so it returns `[]`;
  `hasRole()` then returns `false` for **every** role; `isEditorialUser` is
  therefore `false`, so `isEditorial` denies all writes. Worse, granting the field
  is itself guarded by `access: { create/update: ({req}) => hasRole(req.user,
  'superAdmin') }` (`Users.ts:113-116`) — the **same** missing column. Nobody can
  ever acquire a role, so nobody is ever authorised to grant one. Bootstrap is
  impossible through the API by construction.
- **Why CI never caught it.** `scripts/verify-payload-migrations.sh` PASSES. It runs
  `payload migrate:create` and checks whether a new file appeared. The generator
  diffs against the **newest committed snapshot**, and that snapshot is equally
  missing `roles`, so it correctly reports "no change since last snapshot" and
  writes nothing. The gate is comparing the migrations to themselves and cannot
  see a column that is absent from both sides. Running migrations on the host would
  **not** fix this.
- **Ruled out along the way — do not re-investigate:**
  - Session/`PAYLOAD_SECRET` rotation. A fresh incognito login fails identically.
  - The `5bca852`/`6653570` access rules. `serverManagedField` guards 3 reader
    fields; `update` is `isSelfIn('readers')`.
  - Database driver. `stderr.log` shows `ERR_MODULE_NOT_FOUND: @libsql/core` but is
    **frozen at 18,234 bytes** across two reads 40 minutes apart, and
    `@libsql/core` is present and readable on the host (2,434 bytes, v0.14.0).
    Historical noise from a boot before cPanel's `npm install`.
  - The cPanel entry-key bug (`a18816f`) — delete-set only.
- **FIX PREPARED AND COMMITTED — awaiting deploy.** `480b3d2`, `166138d`.
  - `cms/src/migrations/20261010_120000_users_roles.ts` adds the column and
    backfills existing users to `['reporter']` — enough to restore editing
    immediately, and the least privilege that does it. Uses `ALTER TABLE ADD
    COLUMN`, which is metadata-only in SQLite and therefore cannot lose user rows;
    the table-rebuild pattern the other migrations use is only needed when
    *changing* a column.
  - `cms/src/bootstrap/admin.ts` + an `onInit` hook grants `superAdmin` to
    `PAYLOAD_BOOTSTRAP_ADMIN_EMAIL`. Deliberately an **operation**, not a line in
    the migration: a migration would hard-code "this row is an administrator" into
    permanent history and re-apply to every future environment and every restored
    backup. Env-gated means a new host, a staging box or a disaster recovery needs
    one variable and no SQL. Additive, so promotion never strips an existing role.
  - **Evidence:** the migration SQL was applied to a copy of the production backup
    (26 articles, 64 districts, 8 categories intact, `integrity_check` ok), then
    applied again through `payload migrate` itself. Access behaviour is asserted
    with no database in the path, including the exact pre-migration state that
    caused the bug. Idempotency across repeated boots, an unknown address, and a
    throwing update are all covered.
- **Deploy steps, owner (no Terminal exists — all three are cPanel):**
  1. Deploy the CMS as usual.
  2. In `~/shikkha24-cms/.env`, set **both** on one restart:
     `PAYLOAD_BOOTSTRAP_SCHEMA=true` and
     `PAYLOAD_BOOTSTRAP_ADMIN_EMAIL=shahiddesignhouse@gmail.com`
  3. Confirm the owner can create and edit an article, then **remove
     `PAYLOAD_BOOTSTRAP_SCHEMA`**. Leave `PAYLOAD_BOOTSTRAP_ADMIN_EMAIL` if
     wanted — unlike the schema flag it is idempotent and safe to keep.
- **Still open after this:** the migration gate is still blind. It compares
  `migrate:create`'s output against a snapshot that shares the same blind spot, so
  it cannot detect a field the config declares and the schema lacks. It must
  compare the **runtime config's** fields against the newest snapshot directly.
  Until then, adding a Payload field does not reliably produce a migration — which
  is how `roles` went missing in the first place.
- **Separate, still open:** the admin's CSP sends `img-src 'self' data: blob:`
  without naming the CMS media host, so cross-origin media is blocked. Not
  reproduced; tracked, not folded in.

---

## 🔵 Proposed — awaiting the owner

### T-18 — Hosting migration off DianaHost (owner requested 2026-10-14)
- **Status:** `proposed — recorded, not started; awaiting owner answers + approval`
- **Why:** **DianaHost has stopped responding entirely** (ticket #0590191, L2/Critical,
  now 10+ days unresolved). The owner asked for the best alternative setup,
  explicitly including Cloudflare R2 — reversing two standing decisions (below).
  Four research agents verified everything live on 2026-10-14; no facts assumed.
  Full design lives here; `.sps/handoff.md` has the one-paragraph session version.
- **Verified facts that decide this (researched, not assumed):**
  1. **DianaHost is a RESELLER, not the registrar.** `shikkha24.com`'s registrar
     of record is **OwnRegistrar, Inc.** (IANA ID 1250, US — abuse@ownregistrar.com).
     Domain is unlocked, expires **2027-09-12**, and a 60-day post-creation
     transfer lock runs to **2026-11-11** (ICANN §3.7.5). §5.2 obliges the
     registrar to hand over the auth code within 5 calendar days of a request;
     §3.9.5 forbids denying a transfer over the reseller's debts. Nameservers are
     `ns1/ns2/ns3.dianadns.com` — a DianaHost outage kills resolution entirely.
  2. **The publish chain (T-15/T-17) is unfixable on this host and is ABANDONED,
     not repaired** — extraction no-ops, cron cannot fork, the host will not
     answer. The fix is to host the storefront somewhere whose job is automatic
     rebuild-and-serve, not to fix DianaHost.
  3. **Neon free Postgres** — no card, no time limit, 1 GB/project (we need
     3.3 MB), suspend-not-delete on limits, sub-second wake. Use an **AWS
     region** (Azure regions deprecated; inactive DBs there get deleted).
     Payload+Neon is mainstream; migrations run on the **direct**
     (non-`-pooler`) connection string, runtime traffic on the pooled one.
  4. **Cloudflare R2 free** — 10 GB, zero egress, but **card-gated**: the owner
     has now added a card and activated R2 (`abdullahalmamunmay@gmail.com`).
     R2 BILLS rather than caps on overshoot → billing alerts are mandatory.
  5. **Cloudflare free plan (DNS/CDN/Workers) needs no card.** Pages free =
     500 builds/month — too tight for 15–20 articles/day; the target is Workers
     static assets via `wrangler` from CI (no documented monthly deploy
     ceiling). Build cost then = Actions minutes; measure before committing to
     a rebuild cadence (private repo = 2,000 min/mo; public = unlimited).
  6. **Vercel is DISQUALIFIED on terms** — Hobby is "personal, non-commercial use
     only" in their own words, and this is an AdSense-funded business. **Render
     free** is the CMS host: sleeps after 15 min idle (admin-only impact;
     readers hit static Cloudflare), ephemeral disk, no SMTP ports → Brevo HTTP
     API, already the documented email plan. Never use Render's free Postgres —
     it **deletes itself after 30 days**. Supabase pauses after a week idle —
     inferior to Neon.
  7. **Changing the CMS is REJECTED** (Strapi/Directus/Keystone/Sanity all
     checked): no benefit, weeks of rewrite; Sanity's free plan has only 2 user
     roles against our reporter/editor/admin need. Payload stays. SQLite→Postgres
     has no built-in tooling — a one-off script moves 26 articles + 64 districts
     + 8 categories + 6 media docs.
- **Target (all $0/month):** storefront → Cloudflare static with webhook-triggered
  rebuild (zero Actions minutes; retires the adaptive-batching compromise and the
  whole cPanel upload machinery); DB → Neon AWS ap-southeast-1; media + rotating
  backups → R2 served from `media.shikkha24.com` (**the frontend CSP must be
  widened to allow it** — small code change, part of P3); CMS app → Render free;
  DNS → Cloudflare free; domain → a registrar the owner controls. **Recommended
  registrar: Porkbun ($11.08 transfer, includes a 1-year renewal, free WHOIS
  privacy)** — deliberately NOT Cloudflare Registrar, so one company never holds
  domain + DNS + hosting together. **DianaHost becomes a cold archive only.**
- **DianaHost email stays** (owner decision: unlimited free mailboxes). This is
  independent of the *registration* — email lives on the *hosting* account and
  keeps working via MX records set from Cloudflare DNS. Fallback if DianaHost
  ever dies outright: Zoho Mail free tier (5 users, custom domain).
- **Phases — each ends with something working; publishing fixed in P1:**
  - **P0** owner gets the domain auth code + downloads a full copy of the DB and
    media (this week).
  - **P1** storefront → Cloudflare + the publish webhook (`lib/rebuild-trigger.ts`
    finally points somewhere). T-15's symptom dies here; T-17's cron machinery is
    retired, not wired.
  - **P2** DB → Neon; one-off data script. **T-01 dies structurally** — the fresh
    Postgres schema is generated from config, so the missing `users.roles` column
    exists from day one.
  - **P3** media → R2 + CSP widening.
  - **P4** CMS → Render. **Unblocks T-10** — the 3-critical Payload upgrade can
    finally deploy somewhere.
  - **P5** nightly Neon pg_dump → R2 rotation, run from GitHub Actions (not any
    host's cron) + uptime monitor.
  - **P6** transfer the domain after 2026-11-11, repoint DNS, close DianaHost.
    **RE-SEQUENCED 2026-10-15 (owner decision):** the DNS move happens **now**,
    in front of P2–P5. Rationale: the DianaHost shell cannot fork — the second
    `cagefs_enter: Unable to fork` hit (saving a cPanel Node env var blocks the
    CMS publish webhook; the first broke extraction and cron), so the public
    shikkha24.com is frozen at its 2026-10-12 content with no working rebuild
    path; the whole migration plan exists to decouple from this host, and DNS
    is the step that does it. The sequence swap is safe because (1) the storefront
    is live and verified on Workers; (2) pointing the domain at Workers needs no
    registrar TRANSFER — changing nameservers is not blocked by the 2026-11-11
    lock; (3) the CMS (`cms.shikkha24.com`) keeps its A record to DianaHost, so
    the editor keeps working unchanged until P4 moves it to Render; (4) rollback
    becomes a one-toggle dashboard action. **Owner statement recorded the same
    day: nothing in the CMS database needs backing up (demo-stage content;
    re-usable via `seed:demo`) — the P0 data-preservation requirement is waived
    by the owner.** The 60-day lock only holds the registrar transfer (2026-11-11),
    not nameservers.
- **Standing decisions reversed (rule 13 — docs parity built BEFORE code):** rule
  7's "no international card, ever" (owner has one; activated R2) and the
  2026-09-14 "no Cloudflare services" decision. **Budget is unchanged: $0/month.**
- **P0 unverified (owner asked 2026-10-15, answered "I don't know"):** whether the
  auth code and the off-host DB/media copies exist is unknown. **Every cutover step
  (DNS, domain transfer, closing DianaHost) stays gated on P0; Phase-1 code and
  preview-URL testing do not.**
- **🆕 P1 `doing` (2026-10-15) — storefront publishes via GitHub Actions → Cloudflare
  Workers.** Owner approved continuing P1 this session ("we have recently changed the
  deploy system so we need to work on it").
  - **⚠️ Deviation recorded (rule 13/14):** a previous session left uncommitted P1
    files (`frontend/wrangler.toml` — since found to use the **retired Workers Sites
    `[site]` pattern**, which cannot deploy; + `frontend/package.json` wrangler deps)
    with **no task entry and no docs update**. Owner chose: keep and fix, recorded
    properly. The mistake is recorded in `.sps/handoff.md` (M35).
  - **Design, proven against today's platform docs (researched 2026-10-15, see
    handoff):** Workers static assets (`[assets]`: `directory = ./dist`,
    `not_found_handling = "404-page"`) + **`run_worker_first = true`** with a small
    Worker that owns security headers, the CSP route dispatch and the `/verify/*`
    rewrite. **Why the Worker and not `_headers`/`_redirects`:** (1) `_headers`
    matching is glob-only — it cannot express the S11 article rule ("exactly three
    segments, middle is not `page`"), and `/latest/page/2` would then stop being
    strict, the exact silent-failure class S11 fixed; (2) multiple `_headers` rules
    matching one request **comma-join** repeated headers — on CSP that is the
    precise Cloudflare bug this project removed Cloudflare to escape on 2026-09-14;
    (3) with `run_worker_first`, `_redirects`/`_headers` are documented as **not
    applied to worker-served requests**, so the Worker owning both is the only
    coherent single-mechanism design. The Worker's CSP strings are asserted
    **byte-identical** to `frontend/public/.htaccess` by a contract check, so the
    Apache rollback path and the Workers path cannot drift.
  - **Files (this session):** `frontend/wrangler.toml` (rewritten modern config),
    `frontend/worker/` (CSP profiles + route dispatch + entry), `frontend/public/.assetsignore`
    (keeps `.htaccess` out of the upload), `scripts/verify-cloudflare.mjs` (route
    matrix + contracts, counter-proved), `.github/workflows/deploy-cloudflare.yml`
    (push/dispatch/manual; wait-for-ci gate first; dry-run default via `AUTO_DEPLOY`),
    `deploy.yml` loses `repository_dispatch` (the rebuild webhook now drives the
    Cloudflare workflow only — prevents a double build per publish and a dead-host
    upload attempt).
  - **Loop block.** Hypothesis: the publish chain that cannot land on DianaHost lands
    on Workers where deploys are atomic. Asset: the files above, nothing else. Metric
    (before any cutover): `wrangler deploy --dry-run` exits 0 and
    `verify:cloudflare` passes its route matrix; **after owner secrets:** a live
    `*.workers.dev` URL serves 200 with exactly one CSP header matching the
    verify:apache profile. Budget: 3 attempts. Degraded when: any built page gets the
    wrong profile, or two CSP headers.
  - **Owner actions for P1 live:** ✅ **account confirmed 2026-10-15 by the owner
    (`wrangler whoami` → Abdullahalmamunmay@gmail.com's Account, id
    `0e2e4a6986f91edabe1dae4945a9b88b`)**; `CLOUDFLARE_ACCOUNT_ID` secret set by the
    agent via `gh` the same day. Remaining owner action: create the API token
    ("Edit Cloudflare Workers" template) → GitHub secret `CLOUDFLARE_API_TOKEN`;
    first manual live dispatch; then `AUTO_DEPLOY=live`. Custom domain waits for
    the DNS step (P6); DNS switching before the preview URL is verified is
    explicitly **out of order**.
  - **🔴 NEW FINDING 2026-10-15 — CI red is the real P1 blocker.** gh checks: the
    last three `ci.yml` runs on `main` (2026-10-12/13) failed, and the deploy.yml
    comment attributes it to the dependency audit alone (T-10, Payload advisory).
    Consequence: every automatic deploy path (push AND the CMS rebuild webhook)
    dies at the wait-for-ci gate while CI is red — so `AUTO_DEPLOY=live` must NOT
    be set until T-10 lands. The interim path (manual dispatch with
    `skip-ci-gate: true`, dispatch-only by design) proves the P1 transport.
  - **🔴 NEW FINDING 2026-10-15 — finished work was not being pushed.** Local
    `main` was 6 commits ahead of `origin/main` (the migration-plan commit from
    the 13:08 session included). The Oct-15 pushes produced **zero** workflow
    runs because the commits were local-only. Rule 4 extended: a commit that
    never reaches `origin` did not finish a deploy-system change.
  - **✅ Evidence 2026-10-15 (P1 code complete, built and gated; NOT yet live):**
    commits `f7387d5` (docs parity) → `f72dade` (worker+config+harness) →
    `33d12c3` (workflows). Gates, all green in-session: `verify:cloudflare` **75/75**
    (incl. runtime negative controls); `verify:workflows` **5 parsed, 0 problems**;
    `verify:cpanel-deploy` **92/92** after the trigger move; `verify:deploy-mode`
    **47/47**; `verify:deploy-inputs` **10/10**; `verify:apache` PASS (parity base
    untouched); lint **0 errors** (16 pre-existing warnings, none new); typecheck
    (frontend + cms) **0 errors**; `wrangler deploy --dry-run` **exit 0 on the real
    dist** (527 assets; debug log shows `.htaccess` excluded from upload).
  - **✅✅ LIVE 2026-10-15 — P1 transport proven end-to-end (the first three live
    deploys are real):** **https://shikkha24-frontend.abdullahalmamunmay.workers.dev**
    (owner-confirmed account). Run `38765868214` (and the two before it) green in
    ~2 min each. Live-verified from outside: homepage 200 with **exactly one CSP**
    (relaxed profile), `/latest/page/2` **strict**, article + `/live-tv` carry the
    media frames, unknown paths answer 404, `X-Robots-Tag: noindex` on the
    preview host, `_astro/*` immutable, and `/verify/<unknown-id>` serves 200 in
    place (URL unchanged — S14 contract).
    **Three live lessons, each now a gate:** (1) platform default
    `html_handling` 307-redirected every directory URL site-wide →
    `drop-trailing-slash` (harness-checked); (2) the live probe raced edge
    propagation (404 at +27s, 200 at +61s) → the verify step now retries ~2 min;
    (3) the `/verify` rewrite target needed the un-slashed form after (1).
    Commits `c800acf`, `09798a8`; `CLOUDFLARE_ACCOUNT_ID` secret set; token
    created by the owner.
  - **P1 remainder — one step + one prerequisite:** T-10 (CI red: dependency
    audit) must land **before** `AUTO_DEPLOY=live`, else every automatic deploy
    (push / CMS publish webhook) dies at the wait-for-ci gate. With T-10 green:
    set `AUTO_DEPLOY=live` → the real exit test: the owner edits in the CMS →
    Publish → the site updates with zero manual steps (that also publishes the
    edit waiting since T-15). Until then, publishes are manual dispatches
    (`mode=live`, skip-ci-gate) — proven above.
- **Open, needs the owner (T-18):** who is listed as the *registrant* of record (check
  the original purchase email from DianaHost) — it decides how easy the transfer is.
- **Loop block.** Hypothesis: the root of "publish and nothing happens" is the
  host, not the code — so the fix is moving where things run. Asset: none yet
  (planning). Metric: admin publishes → the live site updates with **zero**
  manual steps. Budget: n/a. Degraded when: any phase leaves the site stale or
  unavailable.

---

## 🟠 Queued

> Each task carries a **loop block** (`.sps/loop.md`): hypothesis, the single
> asset it may touch, one scalar metric fixed **before** the edit, an attempt
> budget, and the condition that sends it back. Filling these in is the point —
> a task with no metric is how M24 happened.

### T-02 — Fix the article-template CLS (the one red CI step)
- **Status:** ✅ **CLOSED 2026-10-16 — resolved, evidence below.** The metric
  overrides it asked for are implemented (`size-adjust: 99.2%` plus
  ascent/descent/line-gap overrides in `frontend/src/styles/global.css`, with the
  x-height ratio against GitHub's Liberation Sans-derived `sans-serif` documented
  inline), **and** a second, different CLS cause was found and fixed on
  2026-10-16: the article-top ad box moved 626 px because `ArticleAudio` was
  revealed by a deferred module — moved to a classic parse-blocking script.
  Measured CLS is now **0.000** on all three measured templates (was 0.036).
  CI is green. Original text follows, kept as history.
- **Originally:** `todo` · **Blocks:** CI green, and T-05
- **Hypothesis:** `font-display: swap` with a generic system-font fallback and
  **no metric overrides** reflows Bengali text on load. `grep -c size-adjust
  fonts.css` → **0**. Additionally only weight 400 was preloaded while the
  article H1 is bold, so the largest text on the page swapped last.
- **Asset:** `frontend/src/styles/global.css` — **only the `@font-face` block and
  the two font tokens.** The `Layout.astro` preload is a *separate* task, because
  it is a separate hypothesis and M25 is the lesson.
- **Metric:** Lighthouse CLS on `/education-news/20/demo-madrasa-new-syllabus/`
  ≤ **0.02**. Currently **0.0439**.
- **Budget:** 3 hypotheses. On exhaustion: revert and record.
- **Degraded when:** CLS rises, or any other Lighthouse sub-metric regresses.
- **Fix already prepared, uncommitted** (see the working tree): a
  `SolaimanLipi Fallback` family carrying the font's real vertical metrics read
  from the vendored file — ascent 95.3125%, descent 28.418%, line-gap 8.9844%,
  `size-adjust: 99.2%`.
- ⚠️ **Measure in CI only.** Local Lighthouse passes while CI fails; it is not
  representative. A local green here is the trap M24 describes.

### T-03 — Preload the 700 weight
- **Status:** ✅ **CLOSED 2026-10-16 — implemented.** `frontend/src/layouts/Layout.astro`
  lines 170-171 preload **both** weights:
  `<link rel="preload" href="/fonts/solaimanlipi-400.woff2" …>` and
  `…/solaimanlipi-700.woff2`. (Measured later: the fonts themselves arrive in
  ~3 ms, so this was never the LCP bottleneck — see T-24.)
- **Originally:** `todo`
- **Hypothesis:** the article H1 is `font-bold` and 700 is not preloaded, so the
  largest text on the page swaps last.
- **Asset:** `frontend/src/layouts/Layout.astro` — the one `<link rel=preload>`.
- **Metric:** same CLS number as T-02, read independently.
- **Budget:** 1 hypothesis (it is a binary: preloaded or not).
- **Degraded when:** initial payload exceeds the budget — the two files are
  154 KB together against a 200 KB budget.

### T-04 — Deploy the frontend once CI is green
- **Status:** ✅ **CLOSED 2026-10-16 — superseded.** This predates the Cloudflare
  migration. The storefront now deploys automatically: `deploy-cloudflare.yml`
  waits on CI (`scripts/wait-for-ci.mjs`) and runs `wrangler deploy` from
  `frontend/`. Its blockers T-02 and T-03 are both closed. Current deploys are
  gated only by the GitHub Actions budget (see `.sps/owner-assistance.md`).
- **Originally:** `blocked` by T-02 and T-03
- **Metric:** `shikkha24.com` serves the new build; Lighthouse gate green.
- Nothing frontend-side is pending today: `git log ff195bb..HEAD -- frontend/`
  is empty. **Do not deploy to "catch up" — there is nothing to catch up to.**

### T-06 — Close the migration-gate blind spot (🔴 systemic)
- **Status:** `todo` · **Why it matters more than T-01's symptom**
- **Hypothesis:** `scripts/verify-payload-migrations.sh` asks
  `migrate:create` whether anything changed. The generator diffs against the
  newest committed snapshot, and when a field is missing from **both** the
  snapshot and the database it reports "No schema changes detected" — so the gate
  passes. Measured: the gate passes today with `users.roles` absent from every
  migration.
- **Asset:** `scripts/verify-payload-migrations.sh`.
- **Metric:** the gate **fails** when a collection field exists in
  `payload.config.ts` and in no snapshot — proved by adding a throwaway field and
  watching it go red, then removing it.
- **Budget:** 2 hypotheses.
- **Degraded when:** the gate starts failing on a tree where config and migrations
  genuinely agree.
- ⚠️ This is how `roles` went missing in the first place. Until it is closed, no
  newly added Payload field is reliably migrated, and the failure mode is silent.

### T-07 — ✅ Image upload works; compression moved to the browser
- **Status:** `resolved 2026-10-11` — sharp path abandoned (owner decision); uploads
  confirmed working on the host ("Media successfully created"), compression now done
  client-side.
- **Owner decision.** Rule 7 rules out Vercel/Cloudflare and any paid host. The owner
  chose **Option B** (drop sharp) **plus** a client-side optimiser, after the storage
  maths was put to them: a 6 MP phone photo is ~4 MB, and at 15/day that is
  1.8 GB/month against ~3 GB free — roughly **50 days** of runway. Compressing to
  ~300 KB in the browser makes it ~4.5 MB/month, about **22 months**. This was the
  binding constraint, not LCP.
- **How it is wired.** Payload registers a custom admin component by *string path*
  (`Upload: '@/components/media/OptimisedUpload#OptimisedUploadServer'`). Payload's
  docs are explicit that a bare `<input type="file">` does not connect to the upload
  API, so `OptimisedUpload.client.tsx` renders Payload's own `<Upload>` unmodified and
  only rewrites what that control's hidden input hands over: a **capture-phase**
  listener runs before Payload's reader, compresses via Canvas, and replaces
  `input.files` through a `DataTransfer`.
- **🆕 M29 — the import map silently disabled it, and nothing caught it.**
  `importMap.js` is how Payload resolves that string path, and it is generated by
  `generate:importmap` and **committed**. `cms/package.json` runs `next build`, not
  `generate:importmap`, so nothing regenerates it and a stale map **bundles and ships
  cleanly**. Symptom: upload succeeded, typecheck/lint/build/CI all green, and the
  feature did not exist — Payload falls back to the default component *without
  error*. Fixed in `2340088`; gate added in `a38054b` (`scripts/verify-payload-importmap.sh`).
  **Lesson: the third instance of the F-14 shape** (generated + committed + imported
  = can go stale silently). The other two were `payload-types.ts` and `cms/src/migrations`.
- **🆕 M30 — removing `imageSizes` left no migration.** Commit `70e1266` changed the
  schema (drops `sizes_thumbnail_*`, `sizes_card_*`, `sizes_hero_*` from `media`) with
  no migration committed. Caught by the drift gate one commit later; fixed in `d2d963a`.
  Verified first: 6 production media docs, all `.webp`, **none carries a populated
  `sizes` object** — the columns were created by config and never filled, because sharp
  never ran. No data lost.
- **Storage still watchable.** No 2000px cap is enforced server-side any more. If a
  non-browser client ever posts to `/api/media` it can bypass compression entirely.

<details><summary>Original investigation (kept: do not retry the sharp path)</summary>

- **Status at the time:** `blocked` — Conclusive as of 2026-10-11.
- **Measured, not inferred.** `POST /api/media` unauthenticated returns **403**;
  the 503 appears only once Payload processes the file. Every upload attempt
  writes to `stderr.log`:
  ```
  /home/***/nodevenv/shikkha24-cms/24/bin/node: fork: retry: Resource temporarily unavailable
  Error: Server is not running.  { code: 'ERR_SERVER_NOT_RUNNING' }
  ```
- **Occupancy was ruled out as the cause.** The backup cron (every minute since
  2026-10-04) and the staging Node app were both deleted; the upload still fails
  identically. The fork canary passes 12/12 throughout — cPanel API calls fork
  fine. **The limit applies to the Node process specifically, not the account
  generally**, which is why a green health check and a failing upload coexist.
- **Ruled out along the way, so nobody repeats it:** stale client chunks (fails
  on a never-used browser), mixed old/new build files (`.next` rebuilt, 178 → 174
  chunks, still fails), missing permissions (`403` unauthenticated is correct),
  `sharp.concurrency(1)` (deployed, confirmed on the host, does not help).
- **The trade-off, stated plainly.** `frontend/src/lib/media.ts:buildSrcset` uses
  the **original** file as its first candidate and treats `media.sizes` as extras
  (`if (candidates.length < 2) return undefined`). So the frontend **renders
  correctly with no variants at all** — it just loses `srcset`.
  - **Option A — wait for the host.** No code. DianaHost raises the CloudLinux
    limit and the full pipeline (WebP, 2000px cap, thumbnail/card/hero) works as
    designed. They have been unresponsive; there is no card-free alternative host
    inside rule 7.
  - **Option B — drop the sharp pipeline.** `formatOptions`, `resizeOptions` and
    `imageSizes` removed from `Media.ts`. Uploads work today. **Cost:** no WebP,
    no 2000px cap, no `srcset` — so a 6000px phone photo is served in full to
    every device, against the payload and LCP budgets in
    `docs/performance-budget.md`. A working CMS with heavy images beats a CMS
    that cannot accept images, but it is a real regression and should be a
    deliberate choice, not a default.
- **Do not retry the sharp path.** Two hypotheses spent, both measured.
</details>

### T-14 — 🔴 The storefront cannot be updated automatically on this host
- **Status:** ✅ **CLOSED 2026-10-16 — superseded by the Cloudflare migration, not by
  a cPanel fix.** The diagnosis below stands and was correct: on DianaHost there is
  **no API extraction mechanism**, so an archive can never be expanded automatically.
  Rather than keep asking the owner to extract `frontend-<run>.zip` by hand for every
  publish, the storefront was moved to **Cloudflare Workers** (T-18 P1/P6), which
  deploys the built assets directly and needs no extraction step at all.
  **Verified live 2026-10-16:** `https://shikkha24.com/` answers with
  `server: cloudflare` + `cf-ray`, i.e. Workers is the publisher, and the served
  stylesheet hash matches the `bfa91b3` deploy — so publishing is automatic and
  current. The cPanel path is rollback-only.
  **This entry remains the record of why the migration was necessary.** The DianaHost
  limitation still applies to the CMS, which continues to deploy by hand.
- **Originally:** `open — owner action required for every publish` · proven 2026-10-12
- **Measured, not inferred.** The site had not been rebuilt since **2026-10-04**. Every
  deploy since reported success. Three independent causes, all now understood:
  1. **Extraction silently no-ops.** `Fileman::fileop op=extract` returns a success
     envelope and writes nothing. A deploy built 161 correct pages, logged
     `Extracted via api2-fileop`, deleted 3 stale paths, verified `GET / → 200`, and
     concluded `success` — while `public_html/education-news/27` did not exist.
  2. **The post-deploy check could not fail.** It was `GET / → 200`, which the
     **stale** site satisfies perfectly. Fixed in `cb61eb7`.
  3. **No API extraction mechanism exists on this host.** Probed live against
     `Fileman::extract_files`, `Fileman::unzip`, `Extract::extract_archive` and
     `Fileman::extract` — all four fail with real cPanel errors, and none writes a
     file. `api2-fileop` answers success and does nothing. **This is a host
     limitation, not a bug.** Extraction by hand in cPanel File Manager is the only
     path, for the frontend exactly as for the CMS.
- **What still works without a human:** build, upload, `.htaccess` via
  `save_file_content` (which overwrites), and stale-file deletion. So CI still does
  the work and stages a correct archive; only the final expansion is manual.
- **Owner action, ~1 minute:** cPanel → File Manager → `public_html` → extract the
  newest `frontend-<run>.zip` **into `public_html`** → overwrite everything.
- **Follow-on (not blocking):** with extraction manual, `DEPLOY_WEBHOOK_URL` (E-02)
  would fire a build that still cannot land. Set it anyway so the archive is fresh and
  waiting, but publishing still needs the extract. Decide whether that is worth it
  before wiring it.

### T-13 — ✅ External audit verified claim-by-claim (2026-10-12)
- **Status:** `done` — report at `docs/audit-verification-2026-10-11.md`
- ~50 claims from `~/Desktop/NewsPortal-Fix-Guide.md` were each verified against the code with
  file:line evidence. Roughly two-thirds hold. **The guide must not be worked top-to-bottom.**
- **Seven of its fixes would break things** (see the report table). Worst is C-02: restricting the
  quiz `correctAnswer` makes the browser-side grader mark every option wrong, and `verify-s8.mjs`
  still passes — the breakage would ship undetected.
- **Two of its 🔴 items were already fixed the same day it was written** (the CLS regression and
  T-01), so "CI red on CLS" is stale — the Lighthouse gate passes at CLS 0.0084.
- **🔴 Found during verification, absent from the guide:** CI is failing on artifact storage quota
  (`38203976878`), which **masks the dependency audit** — the job fails before that step, so it
  reports `skipped` rather than red. Clear it before reading T-10's status from CI at all.
- **Most severe real finding, understated by the guide:** the photocard/ID-card endpoints call
  sharp, which cannot load on this host (T-07) — expected to 500 per request, and the photocard is
  the `og:image` fallback and sits in the share row. *Inference, not measured: one `curl` of
  `/api/photocard/:id.png` settles it.*
- **Corrected order** is in the report; it deliberately re-ranks by real impact rather than by the
  guide's own severity labels.

### T-12 — 🔴 Media count dropped 8 → 6; unexplained, must not be assumed away
- **Status:** ✅ **CLOSED 2026-10-16 — merged into T-25, which found the mechanism.**
  The count is now **8** media docs (not 6), and T-25 established the real pattern:
  the **2 documents uploaded 2026-10-13 serve 200**, while **all 6 demo plates
  uploaded 2026-10-04 return HTTP 500**. So this was never a deletion mystery — the
  *file bytes* for the 2026-10-04 uploads are missing from disk while their database
  records survive, which is exactly T-25. Carrying two entries for one fault would
  mean fixing it twice. **T-25 is the live entry**; it needs the owner to check
  Payload's `upload.staticDir` on the host.
  Original observation kept below for the record.
- **Originally:** `open · needs one owner action` · observed 2026-10-11
- **Observed.** At ~11:05 the API reported **8** media docs, including
  `Untitled-2.jpg` (image/jpeg, 344.2 KB, 1176x1080) and `ERP-LOGO.png`. Later the
  same day it reported **6**, all `demo-plate-*.webp` created 2026-10-04, and
  **nothing created today**. `GET /api/media/file/Untitled-2.jpg` → **HTTP 500** —
  gone from the database *and* from disk.
- **Ruled out before asking the owner, so the question is narrow:**
  - **No data loss.** Articles intact at 25; the 6 demo plates still serve HTTP 200.
    A database reset or truncation would have taken the articles too.
  - **No overwrite by a deploy.** `cms/.next/standalone` ships **no** database;
    `data/` is excluded when the bundle is assembled and is deliberately not in the
    clear set. `data/` on the host holds exactly one file, `payload.db`.
  - **The new migration is not the cause.** `d2d963a` drops columns; `ALTER TABLE …
    DROP COLUMN` deletes no rows.
- **Most likely:** the owner deleted the test uploads. Payload's delete removes the
  row and the file together, which is exactly this pattern. **This is a hypothesis,
  not a finding** — rule 14 forbids closing a task on belief.
- **Decisive test (≈30 seconds of owner time):** upload one image, do **not** delete
  it, and say "done". Then read `GET /api/media?limit=50&depth=0`.
  - Doc persists → the 8→6 drop was manual deletion; close as **not a bug**, with
    the evidence recorded.
  - Doc vanishes → something is silently deleting media. That is a serious bug:
    reopen as 🔴 and investigate before any further upload testing.
- **Note for whoever runs it:** `?limit=0` returns an inconsistent `totalDocs`, and
  `?sort=-createdAt` is ignored — both were tried first and gave wrong answers. Use
  `?limit=50&depth=0` and sort client-side.

### T-11 — 🔴 deploy.yml can publish a build that CI rejected
- **Status:** `in progress` · started 2026-10-11
- **Measured, not inferred.** `grep -n 'workflow_run|needs:.*ci' .github/workflows/deploy.yml`
  returns nothing. Deploy triggers on `push`/`workflow_dispatch` and never waits on
  CI. **Two builds reached the host today carrying code that did not do what it claimed.**
- **The pattern, because it is the actual finding.** On 2026-10-11:
  | Bug | Reached the host? | Caught by |
  |---|---|---|
  | Image optimiser inert (stale import map, M29) | yes | nothing — a browser console log |
  | `imageSizes` removal left no migration (M30) | yes | CI, on the *next* push |
  Both gates now exist, so the next occurrence is stopped — but only *after* the deploy
  that carried it. A missing control, not two unlucky bugs.
- **The control.** Gate the CMS half on a passing CI run for the same SHA. The frontend
  half already has a verify step inside `deploy.yml`, so the gap is specifically "CI as
  a gate", not "verification at all".
- **Known tension — state it rather than hide it.** CI is currently **red** on the
  dependency audit alone (T-10). A strict gate would block every CMS deploy until T-10
  lands. That is correct behaviour, not a reason to weaken it, but the owner must accept
  the freeze or accept a documented carve-out. **Decision needed from the owner.**
- **Metric:** a push whose CI fails produces zero archive uploads to the host.
  **Met and observed live** on run 38138306945: CI concluded `failure` for
  `5b441e3`, the gate refused, and the job reached **0** build or upload steps.
- **Counter-proof:** force the gate to read a failing CI conclusion and watch a CMS
  deploy refuse to upload; then a green one and watch it proceed. All four paths
  verified locally (green 0, red 1, no-run 1, bad-token 0s) and the refusal path
  verified live in a real workflow run.
- **🆕 M31 — the first live run of the gate failed for the wrong reason, and local
  testing could not have caught it.** `deploy.yml` declares `permissions: contents: read`,
  which *restricts* `GITHUB_TOKEN` and withholds `actions: read`. Every poll returned
  **403**, so the gate sat for its full 15-minute deadline and only then concluded
  "no CI run exists". It failed closed — the right outcome by luck, from a cause that had
  nothing to do with CI's verdict. Two fixes: `actions: read` added to the workflow's
  permissions, and 401/403/404 now abort immediately instead of being treated as
  transient like a 5xx. A local test with a personal token has full scope and passes, so
  **only a real run on the real workflow can prove this class of gate.**
- **Status:** `done 2026-10-11`.
- **⚠️ Consequence the owner must know.** While CI stays red (T-10), **every
  push-triggered deploy now fails at the gate and uploads nothing.** That is
  intended — red CI must never publish — but it means a CMS deploy now requires
  `workflow_dispatch` with `skip-ci-gate: true` (the override emits a warning
  annotation saying the tree is unverified). Until T-11's root cause — the
  dependency audit — is fixed, that is the only way to ship.

### T-08 — CSP console warnings in the admin: investigated, not a content bug
- **Status:** `investigated 2026-10-11` · our own images are **not** blocked · low priority
- **Measured from the live headers, not assumed:**
  - Frontend `https://shikkha24.com/*` → `img-src 'self' data: https://cms.shikkha24.com`
    (+ ad domains on pages that serve ads). **CMS media is explicitly allow-listed.**
  - Admin `https://cms.shikkha24.com/admin` → `img-src 'self' data: blob:`. Media is
    served from `/api/media/file/...`, which is **same-origin**, so `'self'` covers it.
  - Conclusion: no CMS or uploaded image can be what these violations describe.
- **What the console actually shows** is `Permissions-Policy` complaints for
  `attribution-reporting`, `private-aggregation`, `join-ad-interest-group` and
  `run-ad-auction` — **all four are Google ad features**. So an ad script was running
  on that page, and the blocked images are third-party ad/social assets, not ours.
- **Not fully closed:** the pasted log elided the offending URLs as `<URL>`, so the
  exact origins were not read. If any blocked URL turns out to start with
  `https://cms.shikkha24.com` this task reopens immediately.
- **Cosmetic leftovers, not tracked as tasks:** `GET /favicon.ico` 404s on the CMS.
- **Still open from before, same defect shape (M20 — allow-list missing a real origin):**
  Gravatar (`https://www.gravatar.com/avatar/…`) is blocked by the admin's
  `img-src 'self' data: blob:`, which shows as a broken avatar. **Metric:** admin loads
  its avatar with zero CSP violations. Note this is a *third-party* profile image; the
  alternative fix is to stop loading it rather than widen `img-src`.

### T-10 — ✅ Payload 3.90.2 upgrade: DONE 2026-10-15 — CI green, seed passes, chain live
- **Status:** `done` — CI run `38769941213` conclusion **success** on commit `13b9194`
  (first fully green `main` since 2026-10-12); `AUTO_DEPLOY=live` set the same day
  and a `rebuild` dispatch (the exact event the CMS publish webhook sends) deployed
  **live** with the CI gate passing and no skip flag — watch exit 0, probe "Live and
  correct".
- **Why it matters:** the dependency audit had never run — it sits after the
  Lighthouse gate, which had been red since the CLS regression. Fixing the CLS
  revealed **3 critical + 20 high**:
  - `CRITICAL payload` — **field access control bypass on auth collections**
  - `CRITICAL @payloadcms/db-sqlite` — SQL injection in SQLite/Postgres
  - HIGH payload — password-update restriction not enforced; token refresh and
    password reset expose tokens; API key disclosure; ReDoS; polymorphic join
  - HIGH next — SSRF in Image Optimization
  The first is the same failure mode we spent 2026-10-10 patching around
  (`5bca852`, `6653570`): a field-level access rule on an auth collection that
  does not hold. Those were fixed in our code; this one is in the framework.
- **What the upgrade achieved, measured:** 44 → 21 vulnerabilities, **3 critical
  → 0**, high 20 → 8. `next` 16.4.0 and `sharp` 0.35.5 also land. Everything
  remaining is transitive build-time tooling plus one sharp/librsvg advisory
  with no fixed release.
- **⚠️ Why it is not on `main`:** 3.90 tightens validation and the seed breaks
  in two places, both found by running it rather than reading it:
  1. `ValidationError: This relationship field has the following invalid
     relationships: undefined` — the seed passed `[undefined]` for unresolved
     slugs. **Fixed** (`7c8b711`): seven call sites filtered through
     `resolvedList`/`resolvedOne`.
  2. `list node failed to validate: List tag must be one of ol, ul` — a Lexical
     list's `format` field carries the HTML tag, and the seed wrote `''`.
     **Fixed** (`a6aa265`, `format: 'ul'`).
  Both fixes are verified against a fresh migrated database, and both still do
  **not** make the seed pass. A third probe showed every list in the submitted
  payload already carrying `ul`, so the failure is inside a path not reached by
  inspecting `data.body` — not yet located.
- **Budget:** two hypotheses spent on the upgrade, then reverted per `.sps/loop.md`.
  **Do not retry blindly.** Resume by catching `payload.create` and logging the
  *whole* document on failure, so the offending node is captured rather than
  inferred.
- **Resolution (2026-10-15, three findings):**
  1. **The tag property.** The bullets() builder never carried a list tag at
     all — the 2026-10-11 fix (`a6aa265`) wrote it into `format` (the
     text-alignment slot), which silenced nothing. `@payloadcms/richtext-lexical`
     validates `node.tag` against {ol, ul} (`features/lists/shared/validate.js`);
     `tag: 'ul'` fixed the seed in one run.
  2. **The diagnostic that made luck unnecessary.** `cms/src/seed/diagnostics.ts`
     shadows `payload.create` in all three runners (collection + whole document +
     `data.errors` on failure) — exactly the recorded resume method. It is a
     permanent seed feature now.
  3. **The burden the revert left in the migration folder.** 092820's UP SQL
     adds `reset_password_requested_at` (users, readers) but its committed
     drizzle snapshot — and 110259's after it — lacks the column, so replay and
     snapshots disagreed in BOTH directions: the drift gate demanded a duplicate
     migration, and replay of it crashed with `duplicate column` (CI run
     `38768828568`). Repair: the two column definitions were copied into 110259's
     snapshot (14 added lines, zero deleted), the interim migration dropped, and
     every migration NAME preserved so recorded databases keep replaying. Fresh
     replay migrate=0 seed=0 demo=0; `verify:payload-migrations` PASS.
- **Deployment note:** the production CMS on DianaHost still runs 3.89.0 — the
  upgrade is in the repo. The schema change lands on the host on the next CMS
  deploy (`PAYLOAD_BOOTSTRAP_SCHEMA=true` + restart, then remove the flag), which
  is exactly what **P4 (CMS → Render)** is for. CI's audit gate now watches the
  codebase, which is what it was red about.
- **When it does land,** the host needs the schema migration applied —
  `reset_password_requested_at` is added to `users` and `readers`
  (`20261011_092820_payload_3_90_schema`, generated by payload). That is the
  `PAYLOAD_BOOTSTRAP_SCHEMA=true` + restart procedure, and the flag must be
  removed afterwards.

## ✅ Done

| ID | Task | Evidence |
|---|---|---|
| D-01 | CMS security fixes live in production | deploy `38046872887`, 590 files, 200 on first probe; harness green on deployed `e319227`; both fix commits are ancestors of it |
| D-02 | `PAYLOAD_SECRET` no longer leaks into CI artifacts | `b011876` sanitiser + 16 counter-proofs |
| D-03 | Fork ceiling diagnosed and cleared | canary 15/15, then 9/9 as a pre-deploy gate — measured, not inferred |
| D-04 | Reader PII leak closed in code | `5bca852` |
| D-05 | `providerId` account takeover closed in code | `6653570` |
| D-06 | `deploy-cms.mjs` made runnable (syntax, `await`, `??`→`||`) | `c4c6ac5` |
| D-07 | Cloudflare Pages deployment removed | `ff195bb` |
| D-08 | cPanel entry key bug — stale-file cleaner never fired | `a18816f`, regression-proved 70/2 → 72/0 |
| D-09 | `verify:sync` fails on a truncated fetch (audit D-03) | `3483ab5`; counter-proved — original exits 0 `PASS 100/100` on 100/724, change exits 1 `TRUNCATED`, clean corpus both exit 0 |

---

## Owner actions (cPanel — the agent cannot do these)

| # | Action | Why |
|---|---|---|
| O-1 | Set the backup cron to `0 23 * * *` running `/bin/sh /home/shikkhac/bin/shikkha24-backup-dump.sh` | **the owner confirmed 2026-10-13 that no cron job exists in cPanel now** — the `* * * * *` diagnostic probe recorded on 2026-10-04 is gone, so there is nothing parked to fix and nothing is forking 1,440×/day. This is a clean install, not a schedule change |
| O-2 | Restart the production CMS app | so the rotated `PAYLOAD_SECRET` takes effect (T-03) |
| O-3 | Tomorrow, read `~/shikkha24-backup/dump.log` in File Manager | the only place a backup failure is visible — no Terminal, cron output goes to email |

---

## Owner assistance — running list

Anything that needs the owner's hands, account, or a decision is collected in
**`.sps/owner-assistance.md`** — check it before reporting a task blocked, and add
to it rather than stopping work.

## Hard constraints — do not re-litigate

- **No cPanel Terminal or SSH.** Disabled by DianaHost; ports 22/2222/222/2200/2022
  all reject. Every workaround must go through the cPanel UI, the cPanel API, or
  **"Run JavaScript Script"** (runs a `package.json` script — this is what retires
  runbook §3.4's Terminal-only venv symlink loop).
- **No international credit/debit card. No paid service, ever.** Budget: the
  existing DianaHost plan + the domain.
- **Budget figures in rule 7 of the root mirrors are stale** — the plan is
  "DH 5GB SSD NVMe", not "PNR 2 GB". Do not quote rule 7's numbers.
- **Never deploy Cloudflare.** Removed 2026-10-14 by owner decision.
- **CI is the only authoritative performance measurement.** Local Lighthouse is
  not representative.
- **Counter-prove every fix.** A check that has never been seen to fail is not
  evidence. Revert the fix, watch it go red, restore, watch it go green.