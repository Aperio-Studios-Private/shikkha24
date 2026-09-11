# Education Feature Inventory — PROPOSED

**Created:** 2026-09-11 · **Status:** ⚠️ **PROPOSAL — requires owner approval. Not yet approved.**
**Purpose:** replace the obsolete general-news inventory in `docs/master-plan.md` as the S1 build input.

> **How this was built.** Nothing here was invented from nothing. The original 87 approved features were reclassified into four buckets — **retained unchanged**, **re-scoped to education**, **descoped as general-news-only** — and a small set of genuinely new education features was added and explicitly marked `[NEW]`. Every `[NEW]` item needs your approval; everything else carries an approval you have already given.

---

## 1. Proposed category tree

Derived from your positioning: *Education News | Scholarship | Admission | University | Higher Study* + *দেশ-বিদেশের*.

| # | Category (Bengali) | English | Notes |
|---|---|---|---|
| 1 | শিক্ষা সংবাদ | Education News | General education news desk |
| 2 | বৃত্তি ও স্কলারশিপ | Scholarship | Domestic + international |
| 3 | ভর্তি | Admission | XI class, honours, masters, madrasa |
| 4 | বিশ্ববিদ্যালয় | University | Public + private |
| 5 | উচ্চশিক্ষা | Higher Study | Postgraduate, research |
| 6 | বিদেশে পড়াশোনা | Study Abroad | From *দেশ-বিদেশের* |
| 7 | পরীক্ষা ও ফলাফল | Exams & Results | Routines, results, merit lists |
| 8 | চাকরি ও ক্যারিয়ার | Jobs & Career | Circulars, BCS, recruitment |

**Question for you:** is 8 categories right, or do you want **স্কুল-কলেজ** (school/college) split out from শিক্ষা সংবাদ? Dainik Shiksha separates এমপিও/ভর্তি/বিশ্ববিদ্যালয় — a similar split may serve you better.

---

## 2. Retained unchanged — scope-independent platform features

These carry over from the approved plan with no change. They are infrastructure, not editorial.

**Editorial & CMS:** rich blocks editor · tags with auto-suggest · author profiles · draft → review → publish workflow · versioning + rollback · scheduled publishing · field-level permissions · audit trail · article series / multi-part investigations · sponsored content with "বিজ্ঞাপন" label · media library with folders · Site Settings global · RBAC (5 roles)

**Reader experience:** mobile-first responsive (375px) · dark mode · text size adjustment · reading progress bar · full-text search (Pagefind) · related articles · trending / most read · load more · social share bar · Bengali date/time (বঙ্গাব্দ + হিজরি) · print-friendly view · **data-saver ultra-lite mode (<30KB)** · reader bookmarks · push notifications · district-first personalised homepage · photo galleries · video embeds · before/after comparison slider · infographics · podcast embeds · comments with Facebook/Google login · citizen journalism submission

**Trust:** QR-verified photo card generator · fact-check radar (মিথ্যা / বিভ্রান্তিকর / সত্য) · WhatsApp debunk share · source transparency accordion · corrections policy page

**Monetisation:** AdSense · direct sponsor banners · zero-CLS ad containers · ad campaign management in Payload · sponsored content template · newsletter sponsorship slots · interstitial-free reading

**SEO & technical:** NewsArticle JSON-LD · news sitemap (<48h) · standard sitemap · RSS (full + per-category) · Open Graph + Twitter Cards · auto-generated OG images · canonical URLs + parameter stripping · `llms.txt` · AI-bot-friendly robots.txt · Google Publisher Center · LiveBlogPosting schema · Speakable schema · E-E-A-T governance pages (about, editorial team, corrections policy, fact-checking policy, contact, privacy, terms)

---

## 3. Re-scoped to education

Same feature, education subject matter. No new approval needed — only the content changes.

| Feature | General-news version | Education version |
|---|---|---|
| Dynamic categories | Politics, business, sports… | The education tree in §1 |
| Breaking news ticker | Any breaking story | Result publication days, admission circular releases, exam postponements |
| Live blog engine | Elections, crises | **Result day live coverage**, admission lottery day, budget-day education impact |
| Story timeline drawer | Long-running political saga | Admission-policy changes, a university crisis, an exam-scandal timeline |
| "Explains" visual storytelling | Policy explainers | How the XI admission system works; how to read a merit list |
| Polls | Political opinion | "Is the new admission policy fair?" |
| **Daily quiz** | General current affairs | **Admission + BCS current affairs** — directly targets the exam-candidate habit loop |
| Expatriate remittance corner | Diaspora remittance rates | **Study-abroad cost calculator** — tuition + living + FX for target countries |
| Jobs section | General jobs | **Education-sector jobs** — MPO, teacher recruitment, university vacancies |
| Education section | One of twelve categories | Becomes the portal's core |

---

## 4. New — education-specific `[NEW]`, all require your approval

| # | Feature | Why it wins | Effort |
|---|---|---|---|
| N1 | **Scholarship tracker** — deadline-sorted, filterable by level / country / funding type | Highest-intent, evergreen, and no competitor does it well. Editorially maintained in Payload — **needs no external API.** | Medium |
| N2 | **Admission deadline calendar** — XI, honours, masters, madrasa | Drives repeat visits on a known annual cycle | Medium |
| N3 | **Result publication hub** — dates + step-by-step guides to the official portals | Captures the highest-volume education queries in BD without competing with the government portals themselves | Low |
| N4 | **Institution directory** — public and private universities/colleges with profiles | Evergreen SEO surface; underpins internal linking | High |
| N5 | **Exam routine & syllabus hub** | Recurring, high-intent, low-maintenance | Low |
| N6 | **GPA / grade calculator** — SSC/HSC GPA from marks | Genuinely useful tool; attracts links; zero backend | Low |
| N7 | **Merit list & migration explainer hub** | Where the SEO aggregators are weakest | Low |
| N8 | **Deadline reminders** — reader saves a deadline, gets a push notification | Converts one-off search traffic into a returning audience; reuses the push infrastructure already planned | Medium |
| N9 | **Annual academic calendar** — one page, all key dates | Becomes a bookmarked, linked-to reference | Low |
| N10 | **Education circular tracker** — MPO, recruitment, policy notices | High volume, editorially maintainable | Medium |
| N11 | **District-first opportunities** — re-scoped "আমার জেলা": local scholarships, admission news, district exam centres | No competitor personalises education by district | Medium |
| N12 | **Study-abroad country guides** — visa, cost, intake dates per country | The `দেশ-বিদেশের` half of your positioning; strong long-tail SEO | High |

---

## 5. Descoped — general-news-only

Removed because they belong to a news portal, not an education portal, and several had no free data source anyway.

| Feature | Reason |
|---|---|
| Live cricket floating pill | Out of scope; no free data source |
| AQI / air-quality ribbon | Out of scope |
| DSE stock ticker | Out of scope; no public API |
| Gold price tracker | Out of scope; no free API |
| Commodity price tracker | Out of scope; no API |
| Disaster / cyclone warning banner | Out of scope |
| Daily 3-min audio bulletin | Already descoped (no zero-cost TTS path) |
| Weather widget | Out of scope — **unless** you want it retained as a light header utility. Your call. |
| Prayer times widget | Out of scope — **unless** retained as a light utility. Your call. Note Aladhan also returns the Hijri date, which your calendar requirement needs anyway. |

---

## 6. What this means for the build order

The S0→S12 technical sequence in `.sps/plan.md` still holds. Two sections change materially:

- **S3 (Homepage)** — re-planned around education desks: lead education story, scholarship/admission deadline strip, result-day banner, category grids for the 8 categories, district selector.
- **S10 (Utility Widgets)** — the general-news widget set is replaced by **N1–N12**, most of which are editorially curated rather than API-driven. This materially **reduces** the technical risk the audit flagged, because it removes the dependency on ten external APIs.

---

## 7. Approval checklist

Please confirm or amend:

- [ ] The 8-category tree in §1 (and whether to split out স্কুল-কলেজ)
- [ ] Which `[NEW]` features (N1–N12) are in for Day 1 — all of them, or a subset
- [ ] Whether to keep **weather** and/or **prayer times** as light header utilities
- [ ] Whether BCS/job-circular content is in scope (it is high traffic but sits adjacent to "education")
- [ ] Whether the 45–70 articles/day target should be revised now that the subject is narrower than general news

Once you confirm, I will fold this into `.sps/plan.md` as the approved inventory, rewrite `.sps/task.md` per section, and clear the S1 entry gate.
