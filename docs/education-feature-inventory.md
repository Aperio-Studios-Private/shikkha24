# Education Feature Inventory — APPROVED

**Created:** 2026-09-11 · **Approved:** 2026-09-11 · **Status:** ✅ **APPROVED — this is the S1 build input**
**Replaces:** the obsolete general-news inventory in `docs/master-plan.md`

> **Provenance.** Nothing here was invented. The original 87 approved features were reclassified into **retained unchanged**, **re-scoped to education** and **descoped as general-news-only**. A small set of new education features was added, explicitly marked `[NEW]`. The owner delegated the two open structural choices to the agent on 2026-09-11 and answered three others directly; every decision is recorded below with its rationale.

---

## 0. Owner decisions recorded 2026-09-11

| Question | Decision | Decided by |
|---|---|---|
| 8 categories, or split out স্কুল-কলেজ? | **8 categories + a cross-cutting level filter.** স্কুল-কলেজ is an audience segment, not a topic — splitting it out would overlap three categories and split SEO authority. | Agent (delegated) |
| Which `[NEW]` features for Day 1? | **All 10** (12 proposed, 2 pairs merged). Two ship with a curated starter dataset. | Agent (delegated) |
| Weather and prayer times? | **Keep** as light header utilities. | Owner |
| BCS / job-circular content? | **In scope.** High traffic, and it matches the direct competitor's own positioning. | Owner |
| 45–70 articles/day target? | **Still open** — see §7. The target implies 15–23 editorial staff; the plan says 5. | Pending |

---

## 1. Category tree — APPROVED

Eight top-level categories. Derived from the owner's positioning (*Education News | Scholarship | Admission | University | Higher Study* + *দেশ-বিদেশের*), with চাকরি confirmed in scope.

| # | Category (Bengali) | English | Primary intent |
|---|---|---|---|
| 1 | শিক্ষা সংবাদ | Education News | Policy, institutions, general education news |
| 2 | বৃত্তি ও স্কলারশিপ | Scholarship | Funding opportunities, domestic + international |
| 3 | ভর্তি | Admission | XI class, honours, masters, madrasa |
| 4 | বিশ্ববিদ্যালয় | University | Public + private university affairs |
| 5 | উচ্চশিক্ষা | Higher Study | Postgraduate, research |
| 6 | বিদেশে পড়াশোনা | Study Abroad | The *দেশ-বিদেশের* half of the positioning |
| 7 | পরীক্ষা ও ফলাফল | Exams & Results | Routines, results, merit lists |
| 8 | চাকরি ও ক্যারিয়ার | Jobs & Career | Circulars, BCS, recruitment *(owner-approved in scope)* |

### Why there is no স্কুল-কলেজ category

স্কুল-কলেজ is an **audience segment**, not a topic. A school-admission story belongs to both স্কুল-কলেজ and ভর্তি; a school-exam result belongs to both স্কুল-কলেজ and পরীক্ষা ও ফলাফল. Making it top-level creates three overlaps, splits internal linking, and puts two of your own pages in competition for the same query.

Instead, the two axes are kept separate — this is the standard structure for large education publishers:

| Axis | Purpose | Values |
|---|---|---|
| **Category** | What the reader wants | The 8 above |
| **Level** | Who the reader is | প্রাথমিক · মাধ্যমিক · উচ্চ মাধ্যমিক · স্নাতক · স্নাতকোত্তর |
| **District** | Where the reader is | 64 districts (আমার জেলা) |

The level filter is applied **across the whole site** (listing pages, search, calendar, trackers), so a school/college reader gets exactly the slice they want without a duplicate category. If a dedicated স্কুল-কলেজ hub page is wanted later, it is a **special section** built on the filter — not a ninth category.

---

## 2. Retained unchanged — scope-independent platform features

Carried over from the approved plan with no change. Infrastructure, not editorial.

**Editorial & CMS:** rich blocks editor · tags with auto-suggest · author profiles · draft → review → publish workflow · versioning + rollback · scheduled publishing · field-level permissions · audit trail · article series / multi-part investigations · sponsored content with "বিজ্ঞাপন" label · media library with folders · Site Settings global · RBAC (5 roles)

**Reader experience:** mobile-first responsive (375px) · dark mode · text size adjustment · reading progress bar · full-text search (Pagefind) · related articles · trending / most read · load more · social share bar · Bengali date/time (বঙ্গাব্দ + হিজরি) · print-friendly view · **data-saver ultra-lite mode (<30KB)** · reader bookmarks · push notifications · district-first personalised homepage · photo galleries · video embeds · before/after comparison slider · infographics · podcast embeds · comments with Facebook/Google login · citizen journalism submission

**Trust:** QR-verified photo card generator · fact-check radar (মিথ্যা / বিভ্রান্তিকর / সত্য) · WhatsApp debunk share · source transparency accordion · corrections policy page

**Monetisation:** AdSense · direct sponsor banners · zero-CLS ad containers · ad campaign management in Payload · sponsored content template · newsletter sponsorship slots · interstitial-free reading

**SEO & technical:** NewsArticle JSON-LD · news sitemap (<48h) · standard sitemap · RSS (full + per-category) · Open Graph + Twitter Cards · auto-generated OG images · canonical URLs + parameter stripping · `llms.txt` · AI-bot-friendly robots.txt · Google Publisher Center · LiveBlogPosting schema · Speakable schema · E-E-A-T governance pages (about, editorial team, corrections policy, fact-checking policy, contact, privacy, terms)

**Header utilities (owner-approved to keep):** weather (Open-Meteo) · prayer times + Hijri date (Aladhan). Both fetched **server-side and cached**, deferred so they never affect LCP, and must not shift layout.

---

## 3. Re-scoped to education

Same feature, education subject matter. No new approval needed — only the content changes.

| Feature | General-news version | Education version |
|---|---|---|
| Dynamic categories | Politics, business, sports… | The 8-category tree in §1 |
| Breaking news ticker | Any breaking story | Result publication days, admission circular releases, exam postponements |
| Live blog engine | Elections, crises | **Result-day live coverage**, admission lottery day |
| Story timeline drawer | Long-running political saga | Admission-policy changes, a university crisis, an exam-scandal timeline |
| "Explains" visual storytelling | Policy explainers | How the XI admission system works; how to read a merit list |
| Polls | Political opinion | "Is the new admission policy fair?" |
| **Daily quiz** | General current affairs | **Admission + BCS current affairs** — targets the exam-candidate habit loop directly |
| Expatriate remittance corner | Diaspora remittance rates | **Study-abroad cost calculator** — tuition + living + FX per country |
| Jobs section | General jobs | **Education-sector jobs + BCS/job circulars** (owner-approved in scope) |

---

## 4. New education features — APPROVED (10, all Day 1)

Two pairs were merged to avoid two of your own pages competing for the same query.

| # | Feature | Why it wins | Effort | Day-1 note |
|---|---|---|---|---|
| N1 | **Scholarship tracker** — deadline-sorted, filterable by level / country / funding type | Highest-intent, evergreen, and no competitor does it well. Editorially maintained in Payload — **no external API.** | Medium | Full |
| N2 | **Academic calendar & deadlines** *(merges the proposed N2 + N9)* | One dated-events model serving admission windows, result dates, exam routines, holidays. Becomes a bookmarked, linked-to reference. | Medium | Full |
| N3 | **Results & merit lists hub** *(merges the proposed N3 + N7)* | Captures the highest-volume education queries in BD, and owns the "how do I use this" layer around the government portals. | Low | Full |
| N4 | **Institution directory** — public and private universities/colleges with profiles | Evergreen SEO surface; underpins internal linking across every other feature. | High | **Starter set** — public universities + top private, marked "growing" |
| N5 | **Exam routine & syllabus hub** | Recurring, high-intent, low-maintenance. Shares the dated-events model with N2. | Low | Full |
| N6 | **GPA / grade calculator** — SSC/HSC GPA from marks | Genuinely useful, attracts links, zero backend. | Low | Full |
| N7 | **Deadline reminders** — reader saves a deadline, receives a push notification | Converts one-off search traffic into a returning audience. Reuses the push + bookmark infrastructure already planned. | Medium | Full |
| N8 | **Circular tracker** — education + BCS/job circulars | High volume, editorially maintainable, and now squarely in scope. | Medium | Full |
| N9 | **District-first opportunities** — local scholarships, admission news, district exam centres | No competitor personalises education by district. Reuses the district-first homepage already planned. | Medium | Full |
| N10 | **Study-abroad country guides** — visa, cost, intake dates per country | The *দেশ-বিদেশের* half of the positioning; strong long-tail SEO. | High | **Starter set** — 8 destinations: UK, USA, Canada, Australia, Malaysia, Japan, South Korea, Germany |

---

## 5. Descoped — general-news-only

| Feature | Reason |
|---|---|
| Live cricket floating pill | Out of scope; no free data source |
| AQI / air-quality ribbon | Out of scope |
| DSE stock ticker | Out of scope; no public API |
| Gold price tracker | Out of scope; no free API |
| Commodity price tracker | Out of scope; no API |
| Disaster / cyclone warning banner | Out of scope |
| Daily 3-min audio bulletin | No zero-cost TTS path (Browser Web Speech API cannot pre-generate audio) |

**Not descoped:** weather and prayer times — the owner elected to keep both as light header utilities (§2).

---

## 6. Effect on the build order

The S0→S12 technical sequence in `.sps/plan.md` still holds. Three sections change materially:

- **S3 (Homepage)** — education desks: lead education story, scholarship/admission deadline strip, result-day banner, grids for the 8 categories, level filter, district selector, header utilities.
- **S9 (Media, Newsletter & Engagement)** — plus deadline reminders (N7), which depend on push + bookmarks already planned here.
- **S10 (Utility Widgets)** — the general-news widget set is replaced by the data-driven parts of N1–N10. **Technical risk drops**: most of these are editorially curated in Payload rather than dependent on external APIs, which removes the ten-API dependency the audit flagged. Only the two header utilities still need external data, and both are verified free with no key.

---

## 7. The one open question — publishing velocity

**This is the only item still unresolved, and it needs you.** Explained in plain language.

### What the plan currently says

- Target: **45–70 articles every day**
- Editorial team: **5 people**

### Why that does not add up

45–70 articles ÷ 5 people = **9 to 14 articles per person, every day, seven days a week.**

A typical news reporter files **2–4 articles a day**. So the plan asks each person to produce **3 to 5 times** a normal workload. With 5 people the realistic output is **15–20 articles/day**.

There is also an internal contradiction: the plan's own desk-by-desk breakdown adds up to **42–56/day**, not 45–70.

### A second problem specific to education

Education publishing is **spiky, not flat**. Result days, admission circular days and scholarship deadlines produce enormous traffic bursts; the off-season is much quieter. A single flat daily number is the wrong shape for this subject.

### Recommendation

**A baseline + burst model, with the number tied to actual headcount:**

- **Baseline:** 15–20 articles/day (achievable with 5 people)
- **Burst:** 40+ on result days, admission days and circular days
- **If 45–70/day is kept as the baseline**, the honest consequence is a team of roughly **15–23 editorial staff**

### Options

| Option | What it means |
|---|---|
| **A. Baseline + burst (recommended)** | Baseline 15–20/day with 5 people; surge on event days. Honest, matches the subject, no hiring prerequisite. |
| **B. Keep 45–70/day and hire** | Requires ~15–23 editorial staff before launch. Ambitious; makes hiring a hard prerequisite. |
| **C. Middle** | Hire to ~10 people and target 30–35/day baseline. |

Everything else in this inventory is approved and ready. Answer this one and S1 is fully unblocked.
