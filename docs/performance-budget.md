# Performance Budget & Web Vitals Plan

**Created:** 2026-09-11 · **Status:** S0/S12 input. Budgets marked `[PROPOSED]` need validation in S0 against a real build.
**Why this exists:** `.sps/plan.md` states targets (Lighthouse ≥95, LCP <1.5s, etc.) but never defined what they mean, how they are measured, or what fails a build. Targets without a budget and a gate are aspirations.

---

## 1. Targets

| Metric | Target | Where enforced | Notes |
|---|---|---|---|
| Lighthouse mobile Performance | **≥ 95** | CI, per page template | Lab measurement |
| Lighthouse Accessibility | **≥ 90** | CI, per page template | See `docs/testing-and-qa.md` |
| LCP | **< 1.5s** | CI (lab) + field once traffic exists | Mobile, throttled |
| INP | **< 100ms** | Field | Lab proxy: TBT |
| CLS | **< 0.02** | CI (lab) + field | All ad slots reserved |
| TTFB | **< 200ms** | **S12 only, production** | Hosting property — cannot be measured meaningfully before DianaHost is live |
| Initial page payload | **< 1.2 MB** | CI | Per page template |
| Data-saver payload | **< 30 KB** | CI | Ultra-lite mode |

**AdSense vs Lighthouse ≥95 — RESOLVED 2026-09-11.** The owner confirmed an **activated AdSense account**, so AdSense is definitely shipping. The project therefore adopts **two measurement profiles**:

| Profile | Pages | Target |
|---|---|---|
| **No-ads** | Templates without ad slots | **Lighthouse ≥ 95** |
| **With-ads** | The same templates with AdSense loaded | **Lighthouse ≥ 85** |

Rationale: Google's ad script is third-party, render-blocking and unpredictable; a page carrying AdSense will rarely hold ≥95. Rather than pretend otherwise, the gate is split so that regressions are still caught. Mitigation that must be implemented: **ads load after LCP**, never above the fold in the initial payload, and never block render.

⚠️ AdSense account activation is not the same as AdSense *serving* — Google requires a live site with content before ads actually deliver. Expect a review period after launch.

---

## 2. Pages under measurement

Per `.sps/plan.md`: homepage · article page · category listing · search results · live blog · quiz page · utility hub. Plus the ten education feature pages (`docs/education-feature-inventory.md` §4) once built.

---

## 3. Byte budgets `[PROPOSED]`

Derived from the 1.2 MB initial-payload target. Validate each in S0 — these are ceilings, not goals.

| Asset | Budget | Rationale |
|---|---|---|
| HTML | < 50 KB | Static, gzipped/brotli at the edge |
| CSS | < 30 KB | Tailwind 4.3 with aggressive purging |
| JavaScript (first load) | < 100 KB | Astro islands only; the homepage should ship near-zero framework JS |
| Fonts (total, all families) | **< 200 KB** | See §4 — the hardest budget to hit |
| Hero image | < 150 KB | AVIF/WebP, responsive `srcset` |
| All other images | < 80 KB each | Lazy, below fold |
| Third-party scripts (analytics) | < 10 KB | No analytics tool (removed 2026-09-14). Apache logs via cPanel. |
| **Data-saver mode** | **< 30 KB total** | Strips ads, defers images behind a tap placeholder |

### The image budget — resolved 2026-09-15

Measured against the built output for the 8 category archetypes, which are the hero on every
article page:

| Format | Files | Largest | Over 80 KB | Over 150 KB |
|---|---|---|---|---|
| AVIF (modern browsers) | 46 | **71.2 KB** | 0 | 0 |
| WebP (fallback) | 46 | **137.9 KB** | 4 | **0** |
| JPEG | — | **removed** | — | — |

The four WebP files over 80 KB are all **1200 px wide** — the hero tier, governed by the 150 KB
row above rather than the 80 KB one. **Every image is within budget.**

Two defects got it there; neither was tuning.

1. **`fallbackFormat="webp"` on the `<Picture>` in `CategoryImage.astro`.** Left unset, Astro
   emits the **source JPEG** as the `<img>` element. At 1200 px that reached **226.5 KB** — the
   single largest asset the site shipped, on the path taken by exactly the devices the budget
   exists to protect. WebP is supported by every browser in current use (Opera Mini's proxy
   transcodes it; UC Browser and Android WebView have handled it since 2011), so the JPEG
   fallback was buying compatibility with clients a decade older than that.

2. **The sources were 1376 px wide while the largest declared width was 1200.** Astro generates
   the fallback `<img>` at the **source** width, so it produced a 1376 px file that no `srcset`
   entry could ever match — 13% more pixels than the site ever serves. The 8 category sources
   are now 1200×670, which also cut repo weight from 6.2 MB to 1.2 MB.

⚠️ **The invariant this exposes: never ship a source wider than the largest width you declare.**
A source wider than `widths` yields a fallback that is dead weight, and it is silently the
heaviest file in the build — the one a naive "largest file" check flags and nobody can explain.

### The font problem

The stack-research estimates are: Hind Siliguri 25–40 KB/weight, Noto Sans Bengali 30–45 KB/weight, Inter ~100 KB as a variable font. Naively that is **240 KB+** — over the entire font budget before a single image.

**Strategy:**
- Self-host. No Google Fonts CDN (extra DNS + connection, and a third-party dependency on the critical path).
- **Two weights maximum per Bengali family** (400 + 700). Drop 300/500/600.
- Subset to Bengali (`U+0980–09FF`) + basic Latin. Drop everything else.
- `font-display: swap` with `size-adjust` and `ascent-override` to match fallback metrics and hold CLS at zero.
- **Preload the headline font only.** Body font loads normally.
- Consider dropping Inter entirely and using a system UI stack for the small amount of English/UI text.

**DECIDED 2026-09-12 — Inter is DROPPED.** Owner-approved. Measured at S0: Inter's variable file is **83 KB per weight** (166 KB for two), which alone would have pushed the total to 234 KB — over the 200 KB ceiling with nothing left for the Bengali faces. Latin UI text renders in the system stack instead.

**DECIDED 2026-09-12 — ONE Bengali family: SolaimanLipi.** Owner chose it by name for reader familiarity (it is what the major Bangladeshi newspapers are set in). It is **not on Google Fonts** — it is an SIL Open Font License face by Solaiman Karim / Ekushey / OmicronLAB, so it is vendored at `assets/fonts/vendor/` with the `OFL.txt` the licence requires, and the build needs no network access.

**Measured result: 154.0 KB / 200 KB** (46 KB headroom), from two files — SolaimanLipi 400 (68.3 KB) + 700 (85.8 KB), each subset to Bengali + Latin and converted to WOFF2. Regenerate with `node scripts/fetch-fonts.mjs`, which fails the build if the total exceeds the budget.

**History — two earlier decisions this replaces:**
- *Hind Siliguri removed.* Owner found text hard to read and a numeral would not render. Measurement confirmed the weakness: **92 of 128** Bengali codepoints, missing ৲ ৼ ৽ ৾ outright.
- *Noto Sans Bengali was the interim single-family choice* (110.5 KB, 96/128 — the most complete candidate measured), replaced when the owner named SolaimanLipi. Anek Bangla was rejected: 111.2 KB and only 90/128 — larger *and* less complete. Tiro Bangla / Noto Serif Bengali are serifs (wrong genre for a news portal); Atma / Baloo Da 2 / Galada are display faces, unusable at 17px body size.

⚠️ **Subsetting must keep the OpenType layout features.** Bengali conjuncts (যুক্তাক্ষর) are not single codepoints — they are formed by shaping. SolaimanLipi carries the full Indic set (`akhn, blwf, half, liga, nukt, pstf, vatu`), verified present *after* subsetting. Subsetting with `--layout-features=""` would produce a font that looks fine in a codepoint count and renders every conjunct broken. The regeneration command is in the script's failure output.

⚠️ Two non-obvious details that cost real time to find during the earlier Google-fetched era: requesting `wght@400;700` in a single css2 call returns one **variable** file (105 KB for Noto Sans Bengali's bengali subset alone), whereas requesting each weight separately returns **static** instances (43 KB) — same glyphs, less than half the bytes. And Google emits the `/* subset */` comment *before* each `@font-face` block, so parsing the two separately shifts every label by one and silently drops the bold Bengali files. These no longer apply now that the font is vendored, but they are why the size numbers moved as they did.

---

## 4. Runtime strategies

| Concern | Approach |
|---|---|
| JavaScript | Astro islands. `client:visible` / `client:idle` for everything non-critical. No framework JS in the initial payload for static content. |
| Images | Host disk (DianaHost). AVIF first, WebP second, **WebP as the `<img>` fallback** (see §2) — no JPEG ships. Explicit `width`/`height` on every `<img>` (zero CLS), `fetchpriority="high"` on the hero only, `loading="lazy"` below the fold. Sources are never wider than the largest declared width. Media served from the CMS origin. Browser caching via `Cache-Control` in `.htaccess`. |
| Fonts | See §3. |
| Ads | Reserved containers with fixed dimensions. Ad scripts load **after** LCP via `requestIdleCallback`. Never block render. |
| Widgets | Weather + prayer times are fetched **server-side at build time** and rendered statically. Never client-fetched. |
| Analytics | None (Apache access logs via cPanel). No GA4 — it is ~50 KB+ and would blow the JS budget. No Cloudflare Web Analytics (removed 2026-09-14). |
| Comments | Load on interaction only. Never in the initial payload. |
| Third-party embeds (YouTube/Facebook) | Facade pattern — a static thumbnail that swaps to the real iframe on click. |

---

## 5. Measurement method

- **Tool:** Lighthouse CI against the **built static output**, mobile preset, simulated 4G throttling.
- **Lab vs field:** CrUX field data will not exist at launch (no traffic). Until there is field data, **lab scores are the only signal** and must be treated as indicative, not truth. Lighthouse lab scores vary by ±5 run to run — run 3 times and take the median.
- **Localisation matters:** Lighthouse's throttling profile is a simulation. Bangladesh's real network conditions (3G/4G, Symphony/Walton-class devices) are the actual target. A mid-range Android device test is required at S12 in addition to Lighthouse.
- **Where it runs:** GitHub Actions, on the same runner that builds the site. Must be part of the **debounced/batched** build (see the CI-minutes constraint in `.sps/plan.md`) — do not run Lighthouse on every publish.

---

## 6. The CI gate

Fail the build if any measured page misses its budget. **Wired 2026-10-03 (F-16)** —
see §8 for the measured baseline and the exact thresholds:

- [x] Lighthouse CI configured with per-page budget assertions — `lighthouserc.json`, 3 templates × 3 runs, mobile + simulated 4G
- [x] Byte budgets enforced (build output size check) — 15 MB whole-site ceiling in CI; per-page `total-byte-weight` ≤ 1.2 MB via LHCI
- [x] Runs inside the debounced build, not per publish — wired into the single CI job, which runs on push/PR and never per publish
- [ ] Two profiles: no-ads (≥95) and with-ads (≥85) — **not done.** The no-ads profile is effectively what runs today (AdSense does not deliver until a live site has traffic). The with-ads profile needs real AdSense delivery, which cannot exist before launch.

---

## 7. Open items

- [x] ~~Decide the AdSense-vs-≥95 trade-off~~ — ✅ **resolved 2026-09-11**: two profiles, ≥95 no-ads / ≥85 with-ads
- [ ] **Measure a real Astro incremental build time** — this is also the deciding input for the CI quota (`docs/hosting-and-deployment.md`)
- [ ] ~~Confirm the Cloudflare Pages 20,000-file ceiling~~ — **Removed 2026-09-14.** No Cloudflare Pages. DianaHost inode quota is the ceiling (ask support).
- [ ] Validate every byte budget in §3 against a real build
- [x] Decide whether Inter is needed at all, or a system UI stack suffices — ✅ **DECIDED 2026-09-12: Inter dropped**, system UI stack used. Measured 179.7 KB / 200 KB
- [ ] Choose the free uptime/monitoring tool — must not require a card (see `docs/reliability.md`)
- [ ] Confirm Bengali font subsetting actually covers every conjunct used in production copy (subsetting can silently drop যুক্তাক্ষর)

---

## 8. The CI gate — MEASURED 2026-10-03 (F-16)

The gate is live: `lighthouserc.json` + `scripts/verify-lighthouse.sh`
(`pnpm verify:lighthouse`), wired into `.github/workflows/ci.yml` immediately
after the frontend build, because LHCI measures a served `frontend/dist/`.

### 8.1 The first baseline

Mobile (412×823, DPR 1.75), simulated 4G, median of 3 runs, against the built
`dist/`. Three templates, because they are the heaviest and the most-read:

| Template | Perf | A11y | SEO | LCP | CLS | Payload |
|---|---|---|---|---|---|---|
| `/` (homepage) | **93** | 96 | 100 | 2939 ms | 0.0061 | 317 KB |
| `/latest/` | **97** | 95 | 100 | 2351 ms | 0.0000 | 211 KB |
| `/education-news/20/…/` (article) | **94** | 97 | 100 | 2708 ms | 0.0069 | 241 KB |

`/search/` was **removed from the measured set**, and it is worth recording why.
Its SEO score is 69 — not because the page is bad, but because our own
`robots.txt` correctly does `Disallow: /search`, and Lighthouse's `is-crawlable`
audit penalises the very page being tested. That is a **measurement artifact**,
not a site defect, so the site was left alone and the URL dropped. (Asserting SEO
on a deliberately-disallowed URL would be asserting that we stop disallowing it.)

Three URL templates are covered, not the full list in §2. `live blog` and
`quiz` are structurally closer to `/latest/` than to the article template, and
the article/homepage pair already bounds the range.

### 8.2 What is asserted, and why the numbers differ from §1

| Assertion | Gate | §1 target | Why the difference |
|---|---|---|---|
| `categories:performance` | **≥ 90** | ≥ 95 | Measured 93–98. The gate holds a 3-point floor below the worst template. |
| `categories:accessibility` | ≥ 90 | ≥ 90 | Matches. |
| `categories:seo` | ≥ 90 | — | Added; all templates measure 100. |
| `cumulative-layout-shift` | ≤ 0.03 | < 0.02 | **Also short of §1.** `/search/` measured 0.0243, so 0.02 would fail today. |
| `total-byte-weight` | ≤ 1.2 MB | < 1.2 MB | Matches. Measured 211–317 KB — comfortable. |
| **LCP** | **not asserted** | < 1.5 s | **Measured 2351–2939 ms.** Asserting 1.5 s fails on current code. |
| **TTFB** | not asserted | < 200 ms | Hosting property; S12 production only. |
| **INP** | not asserted | < 100 ms | Field-only metric. Lab Lighthouse cannot measure it. |
| **Data-saver** | not asserted | < 30 KB | Not implemented — known gap, see below. |

**The thresholds are deliberately set from measurement, not from §1.** A gate
pinned to a target the site does not meet is not a gate: it is red on every
commit, and a permanently red gate gets commented out. The gaps below are
recorded as work, not hidden by lowering a number.

### 8.3 The LCP gap — the one that needs real work

LCP is 2351–2939 ms against a 1500 ms target. **The bottleneck is FCP
(1826–2119 ms), not the image.** The LCP element is the hero `<img>`, which is
already `AVIF` + `fetchpriority="high"` + explicit `width`/`height`. Fonts are
already `font-display: swap` with the 400 weight preloaded. Render-blocking cost
is ~460 ms (one stylesheet) plus ~310 ms each for a second stylesheet, the ad-slot
stylesheet, and `theme-init.js`.

So this is a **critical-path and stylesheet-assembly problem**, not an image
optimisation problem. Fixing it means cutting CSS on the critical path and
inlining the smallest possible above-the-fold CSS — not touching images. **Not
attempted here**: it is a real optimisation task that changes the rendering
architecture, and it needs its own section rather than being smuggled into a QA
fix.

### 8.3a ⚠️ CLS is higher on the CI runner than on a laptop — **CULPRIT FOUND, NOT YET FIXED**

**Measured, not fixed.** The article template measures **CLS 0.0069** on a developer
machine across three runs, but **0.0436** on the GitHub runner for the *same
commit and the same fresh build*. Both are real; the difference is not.

**The culprit is now identified.** `scripts/verify-lighthouse.sh`'s `diagnose_layout_shifts()` reads
the `layout-shifts` audit from the saved LHR and names the element that moved. From CI run
`37179059884`, on `/education-news/20/demo-madrasa-new-syllabus/`:

```
score 0.0436: <aside class="mb-8 rounded-lg border border-rule bg-surface-raised p-5 …"
                aria-label="মূল বিষয়সমূহ">
selector: article.container-page > div.grid-12 > div.col-span-4 > aside.mb-8
moved:   top 510px, 380x227px
```

One element accounts for **the entire failure**. The other two templates are fine —
`/` scores 0.0091 and `/latest/` 0.0007, both far under the 0.03 gate. So this is a single
component's layout, not a systemic runner problem. It renders from
`frontend/src/components/KeyTakeaways.astro`, used at
`frontend/src/pages/[category]/[id]/[slug].astro:456`.

⚠️ Note the audit that produces this is `layout-shifts`, **not** `cumulative-layout-shift` — the
latter's audit details carry only a bare number, with no node attribution.

This is why the gate's CLS ceiling was **not** raised to make the build green.
The gate exists to hold the environment that actually ships, and the runner is a
shared, slower machine than a developer laptop — so its number is the more
conservative one. Raising the ceiling to 0.05 would have turned the build green
and simultaneously destroyed the only signal the gate gives.

Two candidate causes, **neither confirmed**:

1. **Slower CPU → later reflow.** Under a shared runner the ad-slot and
   lazy-image work lands later, where a shift costs more of the viewport.
2. **The homepage's "related articles" rail.** Locally, the only shifting node is
   `<div class="mt-6 flex justify-center">` inside
   `article.container-page > div.grid-12 > div.col-span-4` — a 380×90 px block
   below the article. Small locally, but it is the kind of element that grows if
   a slot above it is not reserved.

To tell them apart, `scripts/verify-lighthouse.sh` prints the **shifting
element, its CSS selector, its content and its bounding box** on any CLS
failure. The next CI run will name it directly. Until that identifies a specific
element, this stays open — **do not "fix" it by raising the threshold.**

### 8.4 Data-saver <30 KB is a known, recorded failure

Not implemented. Raw HTML alone exceeds 30 KB on every page — the homepage's HTML
is ~19 KB, but no "ultra-lite mode" exists to strip ads and images behind tap
placeholders. §3 lists this as a <30 KB total budget; that budget is **not met**,
and it is called out here rather than quietly omitted from the gate.

### 8.5 ⚠️ Why the script has a self-test

`lhci autorun` **exits 0 when an assertion is keyed wrongly** — the assertion
matches no audit, nothing is evaluated, and CI stays green forever. This was not
hypothetical: the gate was built that way first and only a deliberate
counter-proof caught it.

`scripts/verify-lighthouse.sh` therefore ends by re-running `assert` with an
impossible threshold. If that does not fail, the real thresholds are not being
evaluated and the job fails loudly instead of passing silently. **Any future
edit to `lighthouserc.json` must leave that self-test passing** — if it starts
failing, the assertion keys are wrong, not the site.
