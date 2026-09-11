# Education Competitor Landscape — Bangladesh

**Created:** 2026-09-11 · **Status:** research complete, ready for owner review
**Replaces:** the general-news competitor set in `docs/competitive-analysis.md` (now reference-only)

> **Method:** live web search on 2026-09-11. Every site below was found in search results and is listed with its URL. **Site features were not individually audited** — treat the "observed" column as search-result evidence (title, meta description, visible section names), not as a hands-on feature audit. A proper audit requires opening each site; that is a follow-up, not something to assume.

---

## Why the old competitor set does not apply

`docs/competitive-analysis.md` analysed Prothom Alo, bdnews24, Daily Star and similar **general news** portals. Shikkha24 competes in a different market with a different SEO surface. The overlap is only in the education sections of those portals.

---

## Group A — Dedicated education news portals (direct competitors)

These are the closest thing to Shikkha24's direct competition.

| Site | URL | Observed positioning |
|---|---|---|
| **দৈনিক শিক্ষা (Dainik Shiksha)** | `dainikshiksha.com` | "দেশ বিদেশের শিক্ষা, পড়ালেখা ও চাকরি সম্পর্কিত সকল সংবাদ". Sections observed: **এমপিও নিউজ, ভর্তি নিউজ, বিশ্ববিদ্যালয় নিউজ**. This is the strongest direct competitor — it already owns the "education + jobs + admission" positioning Shikkha24 is targeting. |
| **শিক্ষা সংবাদ (Shiksha Sangbad)** | `shikshasangbad.com` | Education news, dated Dhaka datelines, university-focused reporting (e.g. DU teaching-quality stories). Traditional news-portal format. |
| **বাংলাদেশের খবর — Education** | `bangladesherkhabor.net/Education` | A general portal's education section: "প্রাইমারি, মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষা, স্কুল–কলেজ–বিশ্ববিদ্যালয় আপডেট". |
| **ঢাকা পোস্ট — শিক্ষা topic hub** | `dhakapost.com/topic/শিক্ষা` | A topic hub on a general portal, ranking for education queries. Shows that topic hubs, not just categories, win education search traffic. |

**Read:** Dainik Shiksha is the benchmark. It has been established longer, so Shikkha24 cannot win on news volume alone. The wedge has to be **speed, mobile experience and structured opportunity data** — not more articles.

---

## Group B — Education sections of general news portals (indirect)

| Portal | Angle |
|---|---|
| Prothom Alo | Largest Bengali reach; strong on policy and exam news |
| bdnews24 | Fast breaking coverage of board results and admissions |
| Jago News 24 | **চাকরি (jobs) is its traffic engine** — the closest thing to a habit-forming education-adjacent vertical in BD media |
| Kaler Kantho | **পড়াশোনা** section — BCS, admission, model tests |

**Read:** these portals have the domain authority Shikkha24 lacks. They will outrank it on breaking education news for a long time. Shikkha24 must target the **long-tail, high-intent, structured queries they serve badly** — deadlines, circulars, result links, admission timelines.

---

## Group C — Official government portals (traffic magnets and data sources)

| Site | URL | Role |
|---|---|---|
| Education Board Results | `educationboardresults.gov.bd` | Official JSC/JDC/SSC/DAKHIL/HSC/ALIM result publication |
| Education Board Bangladesh | `educationboard.gov.bd` | Ministry of Education |
| XI Class Admission | `xiclassadmission.gov.bd` | Official college admission system |

**Read:** these are where the traffic *wants* to go. Shikkha24 cannot replace them — but it can own the **"how do I use this"** layer around them (guides, deadline reminders, merit-list explainers, result-check walkthroughs), which is where the aggregators currently make their money.

---

## Group D — Third-party SEO aggregators (the real search competition)

These are thin, high-intent pages that outrank official sites on exam queries. They are the sites Shikkha24 must beat in search.

| Site | URL | What it does |
|---|---|---|
| XI Admission | `xiadmission.bd` | College finder, circular guides, merit list, migration instructions |
| XI Class | `xiclass.bd` | "Everything SSC passed students and their parents need to know" |
| Edu Board Results | `eduboardresults.bd` | Result lookup wrapper |
| SSC Result | `sscresult.govt.bd` | Result pages with marksheet |
| Govt.bd | `govt.bd` | Result aggregation |

**Read — this is the clearest opening.** These sites rank on extremely high-intent queries with **low-quality, ad-heavy pages**. A fast, zero-CLS, Bengali-first, genuinely useful page on the same queries is a winnable fight. This is exactly the "cleaner, faster, lower-noise" wedge the original research identified against Prothom Alo, applied to a market where the incumbents are much weaker.

---

## Group E — Exam preparation platforms (adjacent, not direct)

| Site | URL |
|---|---|
| BCS Study | `bcsstudy.com` |
| BCS Our Goal | `bcsourgoal.com.bd` |
| XAM | `xam.bd` |
| BD Job Prep | `bdjobprep.com` |
| BCS Prep | `bcs-prep.vercel.app` |

**Read:** these own "বিসিএস প্রস্তুতি" and model-test intent. Shikkha24 should **not** try to out-build them on question banks — that is a product, not a news portal. But **BCS/job circular news** and **exam-result news** sit adjacent and belong to Shikkha24's editorial remit.

---

## Where Shikkha24 can actually win

1. **Speed and mobile quality.** Every site in Group A and Group D is a conventional, ad-heavy, JS-heavy site. The original plan's Astro-static + zero-CLS + data-saver architecture is a genuine, measurable differentiator here — and unlike the general-news market, the incumbents are weak on Core Web Vitals.
2. **Structured opportunity data, not just news.** Deadline-driven content (scholarship deadlines, admission windows, result dates, circular deadlines) is high-intent, evergreen-ish, and **editorially maintainable in Payload** — it needs no external API. This is the single biggest gap in Groups A and D.
3. **"Explain the official system" content.** The government portals (Group C) are authoritative but hostile to use. Guides that explain them are what the aggregators monetise badly.
4. **Trustworthy news with real bylines.** Group D is anonymous SEO content. Group A is credible but slow. Real editorial standards (E-E-A-T, editorial team page, corrections policy) are a differentiator against Group D specifically.
5. **District-first education.** No competitor personalises education news by district, despite admission and scholarship opportunities being intensely local.

## Where Shikkha24 should not fight

- **Breaking education news volume** — Prothom Alo and Dainik Shiksha will win. Shikkha24 should aim for *completeness on structured topics*, not raw speed on every story.
- **Question banks and model tests** — Group E owns this and it is a product build, not a news portal.
- **Replacing government portals** — never compete with `educationboardresults.gov.bd` for the transaction itself; own the explanation around it.

---

## Follow-ups

- [ ] Hands-on audit of `dainikshiksha.com` and `shikshasangbad.com` — actual feature inventory, page speed, mobile behaviour, ad density
- [ ] Keyword research on the high-intent queries Group D ranks for, to size the opportunity
- [ ] Confirm whether Shikkha24 will publish **BCS/job circular** content (adjacent, high traffic) or stay purely education
- [ ] Identify the top 20 education queries in Bangladesh and map each to a Shikkha24 page template
