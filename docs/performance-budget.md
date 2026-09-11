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
| TTFB | **< 200ms** | **S12 only, production** | Hosting/CDN property — cannot be measured meaningfully before Cloudflare is live |
| Initial page payload | **< 1.2 MB** | CI | Per page template |
| Data-saver payload | **< 30 KB** | CI | Ultra-lite mode |

**Honest caveat — AdSense versus Lighthouse ≥95.** Google's own ad script is third-party, render-blocking, and unpredictable. A page carrying AdSense will rarely hold ≥95. Mitigation: load ads **after** LCP, never above the fold in the initial payload, and measure **two profiles** — "no ads" (must be ≥95) and "with ads" (must be ≥85). If a single ≥95 across all pages is a hard requirement, AdSense must be excluded from the measured templates. **This is an open decision** (§7).

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
| Third-party scripts (analytics) | < 10 KB | Cloudflare Web Analytics is tiny |
| **Data-saver mode** | **< 30 KB total** | Strips ads, defers images behind a tap placeholder |

### The font problem

The stack-research estimates are: Hind Siliguri 25–40 KB/weight, Noto Sans Bengali 30–45 KB/weight, Inter ~100 KB as a variable font. Naively that is **240 KB+** — over the entire font budget before a single image.

**Strategy:**
- Self-host. No Google Fonts CDN (extra DNS + connection, and a third-party dependency on the critical path).
- **Two weights maximum per Bengali family** (400 + 700). Drop 300/500/600.
- Subset to Bengali (`U+0980–09FF`) + basic Latin. Drop everything else.
- `font-display: swap` with `size-adjust` and `ascent-override` to match fallback metrics and hold CLS at zero.
- **Preload the headline font only.** Body font loads normally.
- Consider dropping Inter entirely and using a system UI stack for the small amount of English/UI text.

---

## 4. Runtime strategies

| Concern | Approach |
|---|---|
| JavaScript | Astro islands. `client:visible` / `client:idle` for everything non-critical. No framework JS in the initial payload for static content. |
| Images | R2 + Cloudflare. AVIF with WebP fallback, explicit `width`/`height` on every `<img>` (zero CLS), `fetchpriority="high"` on the hero only, `loading="lazy"` below the fold. |
| Fonts | See §3. |
| Ads | Reserved containers with fixed dimensions. Ad scripts load **after** LCP via `requestIdleCallback`. Never block render. |
| Widgets | Weather + prayer times are fetched **server-side at build time** and rendered statically. Never client-fetched. |
| Analytics | Cloudflare Web Analytics (cookieless, tiny) or none. No GA4 — it is ~50 KB+ and would blow the JS budget. |
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

Fail the build if any measured page misses its budget. Implementation is an S0/S12 task:

- [ ] Lighthouse CI configured with per-page budget assertions
- [ ] Byte budgets enforced (build output size check)
- [ ] Runs inside the debounced build, not per publish
- [ ] Two profiles: no-ads (≥95) and with-ads (≥85)

---

## 7. Open items

- [ ] **Decide the AdSense-vs-≥95 trade-off** (§1) — either accept ≥85 on ad-bearing pages, or exclude AdSense from measured templates
- [ ] Validate every byte budget in §3 against a real build
- [ ] Decide whether Inter is needed at all, or a system UI stack suffices
- [ ] Choose the free uptime/monitoring tool — must not require a card (see `docs/reliability.md`)
- [ ] Confirm Bengali font subsetting actually covers every conjunct used in production copy (subsetting can silently drop যুক্তাক্ষর)
