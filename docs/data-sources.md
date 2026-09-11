# Data Sources — Live Widgets

**Created:** 2026-09-11 (fixes audit finding H1 — ten Day-1 widgets had no identified data provider)
**Status:** draft for S10. **Every row must be re-confirmed at S10** — free tiers change without notice.

## The rule

Every live widget must have a **free, no-card** data source with a documented fallback. The owner has no international credit card, so any provider requiring a card at signup is unusable. **A widget with no free source is descoped, not assumed.** No widget may be built on an unidentified provider.

Two implementation rules apply to all of them:
1. **Fetch server-side and cache.** Never call these APIs from the reader's browser — it leaks quota, breaks data-saver mode, and adds third-party latency to LCP. Fetch in the Astro build (or a scheduled job), cache the result, and render it statically.
2. **Degrade gracefully.** If a provider is down or rate-limited, the widget renders its last cached value or disappears. It must never block render or shift layout (zero CLS).

---

## 1. Verified working (tested 2026-09-11, no API key required)

These were called live during the audit and returned valid data.

| Widget | Provider | Endpoint tested | Result | Notes |
|---|---|---|---|---|
| Prayer times (নামাজের সময়সূচি) | **Aladhan** | `api.aladhan.com/v1/timings/DD-MM-YYYY?latitude=..&longitude=..&method=1` | HTTP 200, real Dhaka timings | Also returns the **Hijri date**, which partially covers the হিজরি calendar requirement. Free, no key. |
| Prayer calendar (Ramadan sehri/iftar) | **Aladhan** | `api.aladhan.com/v1/calendar/YYYY/M?latitude=..&longitude=..` | HTTP 200 | Use to pre-generate a month at build time. |
| Weather (আবহাওয়া) | **Open-Meteo** | `api.open-meteo.com/v1/forecast?latitude=..&longitude=..&current=temperature_2m` | HTTP 200 | Free for non-commercial use, no key. Supports 64-district coordinates. |
| Air quality / AQI ribbon | **Open-Meteo Air Quality** | `air-quality-api.open-meteo.com/v1/air-quality?latitude=..&longitude=..&current=pm2_5,us_aqi` | HTTP 200 (`pm2_5`, `us_aqi`) | Same provider family as weather — one integration, two widgets. **Preferred over OpenAQ**, which needs a key. |
| Currency / remittance rates | **open.er-api.com** (ExchangeRate-API free) | `open.er-api.com/v6/latest/USD` | HTTP 200 | Returns BDT and major pairs. Attribution required. |
| Currency (fallback) | **exchangerate.host** | `api.exchangerate.host/latest?base=USD` | HTTP 200 | Keep as the second source. |
| Currency (fallback 2) | **Frankfurter** (ECB reference rates) | `api.frankfurter.dev/v1/latest?from=USD` | HTTP 200 | No key, no attribution requirement. ECB rates — reliable but does not include BDT. |

**Action at S10:** confirm each provider's current rate limits and terms of use, and record them here. None of these limits was independently verified in this audit.

---

## 2. Education widgets — data source to be determined

These are the widgets an education portal actually needs. None has a provider identified yet, and most BD education data has **no public API at all**.

| Widget | Candidate approach | Status |
|---|---|---|
| Exam / admission calendar | **Editorially maintained** in Payload — a dated events collection, not an API | Recommended |
| Result publication links | **Editorially maintained** links to the official board/university result portals | Recommended — the boards publish no API |
| Scholarship deadline tracker | **Editorially maintained** collection, sorted by deadline | Recommended |
| University / institution directory | **Editorially maintained** collection | Recommended |
| Study-abroad cost calculator | Local arithmetic + the FX APIs above | No external dependency |

**Recommendation:** treat the education data layer as **editorially curated content in Payload**, not as API integrations. That is more accurate for BD education (no authoritative APIs exist) and costs nothing. (Publishing volume is an open decision — see `docs/education-feature-inventory.md` §7.)

---

## 3. Descoped — no credible free source

Flagged by the audit as having no identified provider. All are **general-news widgets and are out of scope** after the education re-scope; recorded here so the reasoning is not lost.

| Widget | Why descoped |
|---|---|
| Live cricket score pill | No free tier with real ball-by-ball data; CricAPI and similar are paid. Owner has no card. |
| DSE stock ticker | The Dhaka Stock Exchange publishes no public API; scraping is fragile and legally uncertain. |
| Gold price (প্রতি ভরি) | No authoritative free API for BD gold prices. |
| Commodity prices (চাল, পেঁয়াজ, মুরগি) | TCB data is published as documents, not an API. Would need editorial entry. |
| Flood gauge (FFWC) | No public API. |
| Ramadan sehri/iftar countdown | **Not descoped** — derivable from the Aladhan calendar above. |

---

## 4. Open items

- [ ] Re-confirm all providers at S10 and record rate limits + terms
- [ ] Decide the caching strategy (build-time fetch vs scheduled job) — note that build-time fetching couples widget freshness to the rebuild schedule, which is itself debounced for CI minutes
- [ ] Confirm whether `open.er-api.com` attribution is acceptable in the footer
- [ ] Decide the education data layer (editorially curated vs API) — recommendation above
- [ ] Confirm the Hijri date from Aladhan covers the calendar requirement, or find a Bangla-calendar (বঙ্গাব্দ) source
