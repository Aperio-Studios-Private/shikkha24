# Design-Gate Measurements (H3)

**Created:** 2026-10-19 · **Mode:** read-only audit + this one report file.
**Scope:** the nine gates in `AGENTS.md` rule 9, measured against the built static output in `frontend/dist/`.

**Why this document exists.** A read-only audit scored H3 *"Design-gate risks were not
exhaustively checked"* **0/4 — purely because nobody had measured it**. This document
measures what is measurable in this environment, and names precisely what is not. Where a
metric could not be measured, it says so and gives the reason. **No number below is
estimated, inferred, or carried over from another document** unless the row explicitly says
`(cited, re-derived)`. Every measured row names the command or script that produced it.

---

## 1. Method

### 1.1 Browser check (run first — it decides whether runtime metrics are measurable)

```bash
which chromium google-chrome chromium-browser     # → exit 1, nothing found
ls /Applications | grep -i chrom                  # → Google Chrome.app
pnpm list --depth 0 | grep -iE "lighthouse|playwright"   # → (no direct dep; @lhci/cli is a devDep)
```

**Result: a browser IS present.** `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
exists and is executable, and `@lhci/cli@0.15.1` is a declared root `devDependency`
(`package.json`). The task permitted running the repo's own Lighthouse script **only** in
that case, and only after reading it — done: `scripts/verify-lighthouse.sh` was read in full
before execution, including its CLS-diagnostic helper and its self-test.

Consequence: **Lighthouse performance, accessibility, LCP, CLS and total byte weight ARE
measurable here.** INP is not (see §3.7).

### 1.2 Build freshness

`frontend/dist` already existed and was **fresh** — no file under `frontend/src` was newer
than it, so no rebuild was required:

```bash
find frontend/src -newer frontend/dist -type f   # → no output
stat -f "%Sm %N" frontend/dist                   # → Oct 19 00:51:08 2026
```

### 1.3 The Lighthouse run (the only runtime measurement)

```bash
cd /Volumes/SSD/CODES/NewsPortal && pnpm verify:lighthouse
```

The script serves `frontend/dist/` and measures **3 templates × 3 runs (median)** under the
mobile preset (412×823, DPR 1.75, simulated 4G). The article URL is resolved from the built
`sitemap.xml` rather than hardcoded — this run selected `/education-news/32/post-ujepgq`.
It exits `0` **and** passes its own counter-proof self-test ("confirming the gate can
actually fail"), so the assertions were genuinely evaluated rather than silently skipped.
Per-request byte counts and the LCP node come from the LHR JSON this run wrote to
`.lighthouseci/`.

### 1.4 Static scripts written for this audit (in `/tmp/h3/`, not in the repo)

| Script | Measures |
|---|---|
| `measure-payload.mjs` | HTML + render-blocking CSS/JS + preloaded fonts + LCP image per template |
| `measure-type.mjs` | text roles in built HTML, resolved against the compiled stylesheet |
| `measure-touch.mjs` | interactive controls whose class-implied box is < 48 px |

All are read-only. This report is the only file created in the repository.

---

## 2. Per-gate results

| Gate | Target | Measured | Verdict | Evidence |
|---|---|---|---|---|
| Lighthouse mobile performance | ≥ 95 | **96 / 97 / 95** (home / latest / article) | **PASS on 2 of 3** — homepage 96 and `/latest/` 97 pass; article **95 is exactly at the floor**, a 1-point margin | `pnpm verify:lighthouse`, median of 3 |
| Lighthouse accessibility | ≥ 90 | **100 / 100 / 100** | **PASS** | same run |
| LCP | < 1.5 s | **2631 / 2480 / 2856 ms** | **FAIL** — every template, by 0.98–1.36 s | same run; median of 3 |
| INP | < 100 ms | **not measurable here** | **NOT MEASURABLE** | needs field data or a real interaction trace; see §3.7 |
| CLS | < 0.02 | **0.0007 / 0.0003 / 0.0030** | **PASS** (7–66× under the ceiling) | same run; median of 3 |
| Initial payload | < 1.2 MB | **215.8 / 244.0 / 220.0 KiB** transferred; critical path 292–311 KB uncompressed | **PASS**, ~5× headroom | LHR `network-requests` `transferSize`; `measure-payload.mjs` |
| Data-saver | < 30 KB | **not implemented — nothing to measure** | **FAIL (not built)** | no toggle, no `Save-Data` handling anywhere in `frontend/src`; `docs/performance-budget.md` §8.4 |
| Touch targets | ≥ 48 × 48 px | **24 controls below 48 px on ≥ 1 axis** (class proxy) | **FAIL** | `measure-touch.mjs`; file:line in §4 |
| Bengali typography (body size) | ≥ 17 px | **17 px** for `.text-base`; `.text-sm` **15 px** and `.text-xs` **13 px** also carry reader prose | **FAIL for specific roles** | §3.2 |
| Bengali typography (line-height) | ≥ 1.65 | **1.65** only for `.text-base`; every other step is 1.3–1.6 | **FAIL for specific roles** | §3.2 |

### 2.1 Raw Lighthouse output (median of 3, mobile, simulated 4G)

```
/                                 perf=0.96 a11y=1.00 seo=1.00 bp=0.96  LCP=2631ms FCP=1362ms CLS=0.0007 TBT=0ms bytes=220,968 ttfb=8ms
/latest/                          perf=0.97 a11y=1.00 seo=1.00 bp=1.00  LCP=2480ms FCP=1134ms CLS=0.0003 TBT=0ms bytes=249,863 ttfb=8ms
/education-news/32/post-ujepgq/   perf=0.95 a11y=1.00 seo=1.00 bp=1.00  LCP=2856ms FCP=1662ms CLS=0.0030 TBT=0ms bytes=225,298 ttfb=8ms
```

Note on the `lighthouserc.json` thresholds versus the `AGENTS.md` targets — the gate is
**looser than the stated rule**, which is itself an H3 finding: ≤ 0.95 perf is asserted as
`minScore: 0.95`, CLS is asserted at `0.03` (not `0.02`), and **LCP is not asserted at all**.
A green `verify:lighthouse` therefore does **not** mean the rule-9 gates pass. That is
documented deliberately in `docs/performance-budget.md` §8.2 and is not a hidden failure —
but it means the CI gate cannot be used as evidence that H3 passes.

---

## 3. Per-gate detail

### 3.1 Critical-path payload (homepage + one real article page)

Measured with `node /tmp/h3/measure-payload.mjs / /education-news/30/weekly-digest-2026-10-17/ /education-news/32/post-ujepgq/`.

**Homepage `/`**

| Component | Uncompressed | On the critical path? |
|---|---|---|
| HTML | 108,301 B | yes |
| `/_astro/Layout.DUboYw4F.css` | 48,394 B | yes — single render-blocking stylesheet |
| inline `<style>` in `<head>` | 1,332 B | yes |
| `/theme-init.js` | 2,427 B | yes — parser-blocking (no `async`/`defer`) |
| `/fonts/solaimanlipi-400.woff2` | 69,912 B | yes — preloaded |
| `/fonts/solaimanlipi-700.woff2` | 87,820 B | yes — preloaded |
| LCP image | **0 B** | **none — see §3.5** |
| **Total** | **318,186 B = 310.7 KiB** | |

**Article `/[category]/[id]/[slug]`** (`/education-news/32/post-ujepgq/`)

| Component | Uncompressed |
|---|---|
| HTML | 79,638 B |
| CSS | 48,394 B |
| inline `<style>` | 7,973 B |
| `theme-init.js` + `article-audio.js` | 5,266 B |
| fonts (preloaded) | 157,732 B |
| LCP image | 0 B |
| **Total** | **299,003 B = 292.0 KiB** |

**Against the 1.2 MB (1,228,800 B) gate: PASS with ~4× headroom**, and PASS on the
compressed figure the reader actually pays. Transferred bytes from the LHR are far smaller
than the uncompressed sum because the server gzips:

```
home     total-byte-weight = 220,945 B (JS 18,158 B, fonts 158,344 B, CSS 9,801 B)
article  total-byte-weight = 225,298 B (JS 27,663 B, fonts 158,344 B, CSS 9,801 B)
```

⚠️ **The dominant cost is fonts**: 158 KB of the ~221 KB homepage — **72 % of the entire
transferred payload is the two preloaded Bengali faces**, and *both* are preloaded although
only one is needed for the LCP text. `Layout.DUboYw4F.css` itself is 48,394 B raw → 9,801 B
gzipped.

**Article pages that are redirect stubs.** The brief's "19 of 114 built pages are stubs"
is **confirmed**: 19 pages contain `<meta http-equiv="refresh">` — 9 under `/article/*`,
9 under `/a/*`, plus `/about-us`. Those are ~700–960 B and carry no template weight. The
brief's "/article/* are not the article template" is correct and was honoured: the article
columns above come from the real `[category]/[id]/[slug]` template. My own count: **114
built HTML pages = 19 stubs + 95 real**, and **9** of those real pages use the
`[category]/[id]/[slug]` article template (`/a/[id]` is itself a stub tier). The
`/education-news/30/weekly-digest-2026-10-17/` page is a real article page.

### 3.2 Bengali typography — the gate FAILS for several reader-facing roles

Tokens (`frontend/src/styles/global.css:143-161`) and the **compiled** values are identical,
so the source of truth and the shipped CSS agree:

```
--text-base: 1.0625rem (17px)  lh 1.65   <-- the stated floor
--text-sm:   0.9375rem (15px)  lh 1.6
--text-xs:   0.8125rem (13px)  lh 1.6
--text-lg:   1.1875rem (19px)  lh 1.6
--text-xl:   1.375rem  (22px)  lh 1.5
--text-2xl:  1.625rem  (26px)  lh 1.45
```

Confirmed in `frontend/dist/_astro/Layout.DUboYw4F.css` (`@layer theme`) — identical numbers.

Per role, against **≥17 px / ≥1.65**:

| Role | Class | Size | Line-height | Verdict |
|---|---|---|---|---|
| Body prose (`body`, `.prose-bn` paragraphs) | `.text-base` | 17 px | **1.65** | **PASS** |
| **Card summary / excerpt** | `.text-sm` | **15 px** | 1.6 | **FAIL — both** |
| **Metadata (date, reading time)** | `.text-xs` | **13 px** | 1.6 | **FAIL — both** |
| **Caption / ad label** | `.text-[10px]`, `.text-[11px]` | 10–11 px | inherited | **FAIL — both** |
| Section lead headline | `.text-2xl` | 26 px | 1.45 | size PASS, **lh FAIL** |
| Headline h2/h3 | global `h1..h6` rule | — | **1.35** | **lh FAIL** |

**The failure is concrete and in the source:**

- `frontend/src/components/ArticleCard.astro:226` — card excerpt is `'line-clamp-2 text-sm'`
  (**15 px**). The iterator at `:215-227` also allows `text-base sm:text-lg` for the lead
  variant, so only the lead card meets the floor; every non-lead card summary does not.
- `frontend/src/components/ArticleCard.astro:242` — metadata row is `'gap-x-2 text-xs'`
  (**13 px**) for non-lead cards.
- `frontend/src/styles/global.css:199` — headings are pinned to `line-height: 1.35`, below
  the 1.65 floor, and `global.css:148,146,153-161` set every non-base step at 1.3–1.6.

**Honest reading of the gate.** Read literally, "body ≥17 px, line-height ≥1.65" applies to
*body*. The base body rule **passes exactly** (17 px / 1.65). But the gate's *intent* is
Bengali legibility, and the token comment at `global.css:143-145` says so explicitly —
"Bengali conjuncts and vowel signs collide below 17px, so `--text-base` IS the floor".
**Card summaries are reader-facing prose, not chrome**, and they ship at 15 px. So this is a
genuine partial failure, not a technicality, and it is reported as such rather than as an
unqualified pass or fail.

**Mitigating measurement:** Lighthouse's own `font-size` audit scores **1** on both pages
(98.12 % / 99.14 % legible text) because it counts text ≥12 px as legible. That audit tests a
*legibility* threshold, **not** the project's 17 px Bengali floor — it cannot be cited as
evidence that this gate passes.

### 3.3 Touch targets — 24 candidates below 48 px (class proxy)

`node /tmp/h3/measure-touch.mjs` scanned 139 source files. **This is a proxy**: it reads
Tailwind sizing classes and multiplies by `--spacing` (4 px). It is **not** a measurement of
rendered hit area — padding, `min-height`, flex stretching and CSS outside Tailwind can all
change the real box. It is reported as a triage list, not as a verdict on rendered geometry.

| Control | Size implied | Note |
|---|---|---|
| `frontend/src/components/TextResizer.astro:15,24,33` | **32 × 32** | three buttons — the accessibility control itself is the smallest target on the page |
| `frontend/src/components/Header.astro:90` | **32 × 32** | search input, collapses to a 32 px icon box |
| `frontend/src/components/SocialLinks.astro:58` | **28 × 28** | header social icon links |
| `frontend/src/components/SocialLinks.astro:83` | **16 × 16** | footer social links — smallest in the report |
| `frontend/src/components/SocialLinks.astro:109` | 44 px high | `min-h-11` = 44 px, 4 px short |
| `frontend/src/components/Header.astro:157,210` | **40 × 40** | mobile menu toggle + close |
| `frontend/src/components/ThemeToggle.astro:18` | **40 × 40** | dark-mode toggle |
| `frontend/src/components/Pagination.astro:53,78,89` | **40** high | prev / page number / next |
| `frontend/src/pages/404.astro:48,54` | **40** high | two recovery CTAs |
| `frontend/src/components/ArticleAudio.astro:43,55` | **36** high | play / stop |
| `frontend/src/pages/deadlines.astro:164,172` | **32** high | two `<select>` filters |
| `frontend/src/components/LiveBlogTimeline.astro:74` | **20 × 20** | checkbox |
| `frontend/src/components/PollWidget.astro:79` | **20 × 20** | radio |
| `frontend/src/pages/cgpa.astro:101` | 16 × 16 | checkbox |

Two entries from the raw scan are **not defects** and are excluded: `InteractiveStrip.astro:38`
pairs `h-2 w-2` with `min-h-12` on the same `<a>` (the 8 px span is the decorative dot), and
`TrendingList.astro:54` matched on `w-0` plus `flex-1` (the `w-0` is a flex-basis trick).

**Important limitation:** Lighthouse's `target-size` audit scores **1** on both pages. That
audit tests the **24 × 24 CSS px** WCAG 2.2 AA minimum with spacing, **not** this project's
stricter 48 × 48 requirement. A perfect `target-size` score is therefore **not** evidence
that the 48 px gate passes. The 48 px gate is a project policy with **no automated
enforcement anywhere in CI** — which is the reason it was never checked.

### 3.4 CLS protections — no defect found

I counted `<img>` elements without `width`/`height` across all 114 built pages: **308 images,
43 without both attributes**, and **all 43 sit inside a wrapper that owns the aspect ratio**
(`aspect-16/9`, `aspect-square`, or an `absolute inset-0` layer inside such a wrapper). Per
template: home 7, article 6, category 6, latest 6, other 12.

**No false positive is reported.** The pattern is deliberate — the wrapper carries the ratio
and the image fills it — so the absence of `width`/`height` on those nodes does not shift
layout. Confirmed independently by Lighthouse: `unsized-images` = **1.00** on both templates
and CLS measured **0.0007 / 0.0003 / 0.0030**, all far under 0.02.

⚠️ One caveat worth recording: `docs/performance-budget.md` §8.3a documents CLS **0.0436** on
the shared GitHub runner for the same commit where a laptop measures 0.0069, attributed to
`KeyTakeaways.astro`. This local run cannot reproduce that (TBT = 0 ms on all three
templates, so this machine is not reproducing runner-class CPU contention). **The runner
number is the environment that ships**, so CLS should be treated as *passing here* but
*unresolved on CI* — not as conclusively green.

### 3.5 LCP element — the premise in the brief is wrong, and that matters

The brief expected the hero `<img>` to be the LCP element and asked whether it carries
`fetchpriority="high"`. **It is not the LCP element.** Lighthouse names it directly:

```
/                               LCP node: <p class="text-ink-muted dark:text-dark-ink-muted line-clamp-3 text-base sm:text-lg">
/latest/                        LCP node: <h3 class="font-headline font-bold text-ink transition-colors group-hover:text-brand-red …">
/education-news/32/post-ujepgq/ LCP node: <p>   selector: div.grid-12 > div.col-span-4 > div.prose-bn > p
                                nodeLabel: "পৃথিবীর ডিজিটাল আকাশে নতুন এক আবির্ভাব…"
```

**The LCP element on all three measured templates is text, not an image.** The homepage's
LCP node is the lead card's excerpt `<p>` — the very element that `ArticleCard.astro:226`
renders at **15 px**, tying §3.2 and §3.5 to the same line of code. On the article page it is
the opening paragraph of the body prose.

Consequences:

- **`fetchpriority="high"` on the LCP element is impossible** — priority hints apply to
  images and iframes, not to a block of text. The nearest real lever is the font: the text
  cannot paint until the webfont resolves, and **both weights are preloaded** (§3.1).
- Since **every** content `<img>` in the built output carries `loading="lazy"` and
  `fetchpriority="auto"` — verified on the homepage and both article pages — **no image is
  competing for LCP and the `priority` mechanism is simply unused.** The plumbing exists at
  `frontend/src/components/CategoryImage.astro:77` (`priority ? 'high' : 'auto'`) and
  `frontend/src/components/ArticleCard.astro:181-182` (`isLead ? 'eager'/'high' : ...`), but
  the `priority` prop is **never passed** and the homepage lead uses `variant="lead"`
  (`frontend/src/pages/index.astro:241`) while section leads use `variant="feature"`
  (`frontend/src/components/CategorySection.astro:78`). So `isLead` is false everywhere on
  the homepage, and the hero renders `fetchpriority="auto"` inside `loading="lazy"`.
- **This is not the cause of the LCP failure.** LCP is gated by **FCP** (1362–1662 ms against
  LCP 2631–2856 ms), i.e. first paint, which is a critical-path problem — 158 KB of fonts,
  48 KB of CSS, and a parser-blocking `theme-init.js`. `docs/performance-budget.md` §8.3
  reaches the same conclusion independently. Optimising the hero image would not fix it.

**The real, concrete LCP violations are therefore:**

1. `frontend/src/components/Layout.astro` (preload block, emitted at `dist/index.html`) —
   **both** Bengali weights are preloaded, so 158 KB of the 221 KB payload competes before
   first paint. Only the weight used by the LCP text is needed above the fold.
2. `frontend/src/components/ThemeToggle.astro`/`theme-init.js` (2,427 B, **parser-blocking**,
   in `<head>`) and the 48,394 B single stylesheet — together the render-blocking cost that
   sets FCP, and therefore LCP.
3. `frontend/src/pages/index.astro:241` + `frontend/src/components/ArticleCard.astro:181-182`
   — the `priority`/`isLead` path is dead code in practice: the homepage hero is lazy. Low
   impact **today** (text is LCP) but it will become the LCP defect the moment a real hero
   image sits above the fold.

### 3.6 Initial JS — PASS, but the rule's stated mechanism is not what ships

| Page | Transferred JS | Files |
|---|---|---|
| `/` | **18,158 B** | 14 |
| `/education-news/32/post-ujepgq/` | **27,663 B** | 24 |

Against `docs/performance-budget.md` §3's `< 100 KB` first-load JS budget: **well inside**.

The rule-9 wording is "Astro islands with `client:visible`/`client:idle`". **There are zero
`client:*` directives in the repository**, and **zero framework components** — no `.tsx`,
`.jsx`, `.vue` or `.svelte` anywhere under `frontend/src`, and `astro.config.mjs` declares no
framework integration. So **no framework JS ships for static content at all** — which is a
*stronger* result than the rule demands. Every script is a plain Astro `<script>`, which
Astro bundles as `type="module"` (deferred, non-blocking). The rule's mechanism is
inapplicable rather than violated; the rule's *intent* (no framework JS on static content)
is satisfied more completely than written.

### 3.7 INP — not measurable here

**Not measurable in this environment.** Reasons, in order of importance:

1. **INP is a field metric.** It is computed from real user interactions with real
   hardware; Lighthouse is a lab tool and **does not compute INP at all** — it reports
   **TBT** as the nearest proxy. `docs/performance-budget.md` §1 records this itself
   ("Lab proxy: TBT") and §8.2 lists INP as "not asserted — field-only".
2. **There is no field data.** The site is pre-launch on DianaHost, so there is no CrUX
   report and no RUM endpoint. Even with a browser, INP cannot be produced here.

What *is* measured, and is the strongest available evidence: **TBT = 0 ms on all nine
Lighthouse runs across all three templates**. With no main-thread blocking and only
18–28 KB of JS, INP is *very likely* well under 100 ms — but **this is an inference, not a
measurement**, and it is recorded as such. `INP < 100ms` must stay marked unmeasured until
real field data exists after launch.

---

## 4. Source locations for every failure

| # | Gate | File:line | What is wrong |
|---|---|---|---|
| 1 | Typography (size) | `frontend/src/components/ArticleCard.astro:226` | `'line-clamp-2 text-sm'` → card excerpts at **15 px** |
| 2 | Typography (size + lh) | `frontend/src/components/ArticleCard.astro:242` | `'gap-x-2 text-xs'` → metadata at **13 px** |
| 3 | Typography (line-height) | `frontend/src/styles/global.css:199` | headings pinned to `1.35` |
| 4 | Typography (line-height) | `frontend/src/styles/global.css:146,148,153-161` | every non-base step 1.3–1.6, below 1.65 |
| 5 | Typography (size) | `frontend/src/components/DemoAd.astro` | `.text-[10px]` / `.text-[11px]` labels |
| 6 | Touch target | `frontend/src/components/TextResizer.astro:15,24,33` | 32 × 32 buttons |
| 7 | Touch target | `frontend/src/components/Header.astro:90` | search input 32 × 32 |
| 8 | Touch target | `frontend/src/components/SocialLinks.astro:58` | 28 × 28 header icons |
| 9 | Touch target | `frontend/src/components/SocialLinks.astro:83` | 16 × 16 footer icons |
| 10 | Touch target | `frontend/src/components/SocialLinks.astro:109` | `min-h-11` = 44 px |
| 11 | Touch target | `frontend/src/components/Header.astro:157,210` | 40 × 40 menu + close |
| 12 | Touch target | `frontend/src/components/ThemeToggle.astro:18` | 40 × 40 |
| 13 | Touch target | `frontend/src/components/Pagination.astro:53,78,89` | 40 px high |
| 14 | Touch target | `frontend/src/pages/404.astro:48,54` | 40 px high |
| 15 | Touch target | `frontend/src/components/ArticleAudio.astro:43,55` | 36 px high |
| 16 | Touch target | `frontend/src/pages/deadlines.astro:164,172` | 32 px high `<select>` |
| 17 | Touch target | `frontend/src/components/LiveBlogTimeline.astro:74` | 20 × 20 checkbox |
| 18 | Touch target | `frontend/src/components/PollWidget.astro:79` | 20 × 20 radio |
| 19 | Touch target | `frontend/src/pages/cgpa.astro:101` | 16 × 16 checkbox |
| 20 | LCP | `frontend/src/components/Layout.astro` (font preload) | both weights preloaded = 158 KB before FCP |
| 21 | LCP | `frontend/dist/theme-init.js`, 48,394 B stylesheet | render-blocking, sets FCP → LCP |
| 22 | LCP (latent) | `frontend/src/pages/index.astro:241` + `ArticleCard.astro:181-182` | `priority`/`isLead` path dead; hero is lazy |
| 23 | Data-saver | *(none — feature absent)* | no toggle, no `Save-Data` handling |
| 24 | CI gate honesty | `lighthouserc.json` | asserts CLS ≤ 0.03 (not 0.02) and **does not assert LCP** |

---

## 5. Not measurable in this environment

| Gate | Why it is not measurable here |
|---|---|
| **INP < 100 ms** | Field-only metric. Lighthouse does not compute INP — it reports TBT as a proxy. No CrUX/RUM data exists pre-launch. **TBT = 0 ms is reported as a proxy and is not INP.** |
| **Data-saver < 30 KB** | **The feature does not exist**, so there is nothing to measure. No toggle button, no `Save-Data` request-header handling anywhere in `frontend/src`; `docs/performance-budget.md` §8.4 records it as unimplemented. Not a measurement gap — a build gap. |
| **TTFB < 200 ms** | Hosting property, measured once at S12 in production on DianaHost (`AGENTS.md` rule 9). The **8 ms** above is a local static file server and is meaningless as a gate result — it must not be cited as passing TTFB. |
| **Real-device/field LCP, INP, CLS** | Requires real traffic and Symphony/Walton-class hardware on Bangladeshi networks (`docs/performance-budget.md` §5). Lab scores are indicative only. |
| **Rendered hit-area geometry** | Would need a DOM layout pass. §3.3 is explicitly a **class-value proxy**; the true rendered boxes are unverified. Lighthouse's `target-size` audit passes but tests the 24 px WCAG minimum, not the project's 48 px. |
| **Lighthouse accessibility on the full template set** | Only 3 templates were measured. `/search/` is deliberately excluded (its SEO score is penalised by its own correct `robots.txt` disallow). The other templates in §2 of `docs/performance-budget.md` are unmeasured. |

---

## 6. Top fixes, ordered by reader impact

1. **Cut LCP by fixing FCP, and stop preloading both font weights** —
   `frontend/src/components/Layout.astro`. LCP misses by ~1.0–1.4 s on every template and the
   bottleneck is first paint, not the image (§3.5). 158 KB of fonts (72 % of the payload) plus
   a 48 KB stylesheet plus a parser-blocking `theme-init.js` all sit before FCP. Preload only
   the 400 weight, inline the critical above-the-fold CSS, and make `theme-init.js` non-blocking.
   Rationale: this is the **only** failing gate that directly degrades the reader's first second.
2. **Raise card-excerpt and metadata typography to the Bengali floor** —
   `ArticleCard.astro:226` (`text-sm` → `text-base`) and `:242` (`text-xs` → at least
   `text-sm`, plus `leading` ≥ 1.65). Rationale: this is the text that *is* the LCP element on
   the homepage; 15 px Bengali collides conjuncts and is the gate's stated reason for existing.
3. **Fix the touch targets readers actually use, worst first** —
   `SocialLinks.astro:83` (16 px), `SocialLinks.astro:58` (28 px), the three
   `TextResizer.astro` buttons (32 px), `Header.astro:90` (32 px), `deadlines.astro:164,172`
   (32 px). Rationale: 24 undersized controls on a phone-first portal, and the accessibility
   control is the smallest of all. Cheap class-only change, high reach.
4. **Make the 48 px and typography gates actually enforced** — add assertions so they fail CI
   rather than living only in a document. Rationale: the LCP/anchor of this whole audit is
   that H3 scored 0/4 *because nothing measured it*. An unenforced gate regresses silently.
   Until this exists, H3 cannot be claimed as continuously verified.
5. **Build data-saver ultra-lite mode, or formally descope it** — either ship the <30 KB mode
   (strip ads, defer images behind tap placeholders) or amend `.sps/plan.md` and
   `AGENTS.md` rule 9 to remove/replace the gate. Rationale: it is currently a permanently
   unmet gate that inflates the apparent failure count and cannot be measured at all (§5).

**Also worth recording (not in the top 5, but an H3-relevant honesty defect):** LCP is
**not asserted** in `lighthouserc.json`, and CLS is asserted at 0.03 rather than the rule-9
0.02. A green `verify:lighthouse` therefore does not demonstrate compliance with
`AGENTS.md` rule 9. This is deliberate and documented (`docs/performance-budget.md` §8.2),
but any future H3 score must read the gate result as "the gate's thresholds pass", never as
"rule 9 passes".

---

## 7. Bottom line

| | Count |
|---|---|
| **PASS** | accessibility (100), CLS (0.0007–0.0030), initial payload (216–244 KB), JS (18–28 KB), performance (95–97), CLS-protection review (no defect) |
| **FAIL** | LCP (2631–2856 ms vs 1500), typography for card summary/metadata/caption roles, touch targets (24 controls), data-saver (not built) |
| **NOT MEASURABLE** | INP, TTFB-as-gate, rendered hit-area geometry, field Core Web Vitals |

Evaluation of the nine gates as written: **4 pass** (Lighthouse perf ≥95 on 2 of 3 templates
— the article sits exactly at 95; accessibility; CLS; initial payload), **4 fail** (LCP,
typography for non-body roles, touch targets, data-saver), **1 not measurable** (INP).
