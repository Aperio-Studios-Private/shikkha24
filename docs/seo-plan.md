# SEO Plan — Shikkha24

**Created:** 2026-09-11 · **Status:** S11 input. Consolidates what was scattered across `docs/master-plan.md` §"Google News & SEO Battle Plan", `docs/competitive-analysis.md` Part 3, and `docs/education-feature-inventory.md`.
**Why this exists:** the SEO strategy existed in three fragments and had no per-template plan, no keyword mapping and no redirect policy.

---

## 1. Goal and honest expectation

Rank for high-intent Bangladesh education queries, and be eligible for Google News and Discover.

**What to expect:** a new domain has no authority. Shikkha24 will not outrank Prothom Alo or Dainik Shiksha on breaking education news for a long time. The winnable ground is **long-tail, high-intent, structured queries** — results, admission dates, scholarship deadlines, routines, circulars — where the current ranking pages are thin SEO aggregators with slow, ad-heavy sites (see `docs/education-competitors.md`).

---

## 2. URL architecture

**Decided** (`.sps/plan.md`): `/:category/:subcategory/:id/:slug` — lowercase, no trailing slash, plus an automated shortlink for social sharing.

### Slug language — OPEN DECISION

Bengali slugs percent-encode to unreadable strings when shared on WhatsApp or Facebook (`/%E0%A6%B6%E0%A6%BF...`). Two options:

| Option | Pro | Con |
|---|---|---|
| **ASCII/transliterated slug** (recommended) | Clean in sharing, no percent-encoding degradation, ASCII-safe in every tool | Slightly less keyword-relevant in the URL |
| Bengali slug | Exact keyword in URL | Ugly and long when percent-encoded; breaks in some sharing tools |

Recommendation: **ASCII slugs**, with the Bengali headline always in the `<title>`, `<h1>` and schema — where keyword weight actually matters. The shortlink covers the remaining sharing edge cases.

---

## 3. Per-template metadata matrix

| Template | `<title>` pattern | Schema |
|---|---|---|
| Homepage | শিখা২৪ — শিক্ষার খবর, সুযোগ ও সম্ভাবনা | `Organization` + `WebSite` + `ItemList` |
| Article | {headline} — Shikkha24 | `NewsArticle` + `BreadcrumbList` + `Person` |
| Live blog | {headline} — লাইভ আপডেট | `LiveBlogPosting` + `BreadcrumbList` |
| Category | {category} সংবাদ — Shikkha24 | `CollectionPage` + `BreadcrumbList` + `ItemList` |
| Institution profile | {institution} — ভর্তি তথ্য, ঠিকানা | `CollegeOrUniversity` + `BreadcrumbList` |
| Scholarship | {scholarship name} — বৃত্তি | `ItemList` + `BreadcrumbList` |
| Job circular | {organisation} নিয়োগ বিজ্ঞপ্তি | `JobPosting` |
| Study-abroad guide | {country} — পড়াশোনার খরচ, ভিসা | `Article` + `FAQPage` + `BreadcrumbList` |
| Guide / explainer | {topic} — সম্পূর্ণ গাইড | `Article` + `FAQPage` + `HowTo` (where applicable) |
| Author | {name} — Shikkha24 | `Person` + `ProfilePage` |
| Search | Search results (noindex) | none |

**`inLanguage: "bn-BD"` on every template.** Do **not** use `hreflang` — this is a single-language site (removed by the audit).

---

## 4. Schema inventory

**News:** `NewsArticle` (headline ≤110 chars matching the visible `<h1>`, image ≥1200px wide and ≥800,000px², `datePublished`/`dateModified` in ISO 8601 with `+06:00`, `author` as `Person` with `sameAs`, `publisher` as `Organization` with logo, `isAccessibleForFree: true`, `speakable`), `LiveBlogPosting`, `BreadcrumbList`.

**Education-specific — a differentiator most competitors ignore:**
- `CollegeOrUniversity` for institution profiles
- `JobPosting` for job circulars (eligible for Google Jobs)
- `Course` / `EducationalOccupationalProgram` where a program is described
- `FAQPage` on guides — strong for AI answer extraction
- `HowTo` on step-by-step guides (how to check a result, how to apply)

**Site-level:** `Organization` (name, logo, sameAs, contactPoint), `WebSite` with `SearchAction`.

**Validation:** every template must pass Google's Rich Results Test in CI or at S12.

---

## 5. Sitemaps, feeds, robots

| Asset | Spec |
|---|---|
| News sitemap | `/news-sitemap.xml` — **48-hour rolling window only**, ≤1,000 URLs, `<news:news>` namespace, `<news:name>` must exactly match the Publisher Center brand name, `<news:language>` = `bn` |
| Standard sitemap | `/sitemap.xml` — everything else, including the education hub pages |
| RSS | `/rss.xml` + per-category `/category/[slug]/rss.xml` |
| `robots.txt` | Allow all, **including AI crawlers** (GPTBot, PerplexityBot, ClaudeBot, Google-Extended) — this is deliberate GEO/AEO strategy |
| `llms.txt` | At domain root, describing the portal structure for AI search |

---

## 6. Google News — the honest position

Per the research in `docs/competitive-analysis.md`: **Publisher Center does not grant inclusion.** In 2026 inclusion is fully algorithmic. Publisher Center is an identity, branding and reader-revenue tool. Do not plan around it as a gate.

What actually drives eligibility: **freshness, velocity, original reporting, real bylines, transparent ownership, and clean technical SEO.** The E-E-A-T pages are therefore load-bearing, not decoration:

- `/about` — legal entity, Trade License, TIN, **Ministry of Information registration**, physical address
- `/editorial-team` — real names, photos, bios. **No anonymous bylines** ("অনলাইন ডেস্ক" is filtered out)
- `/corrections-policy` and `/fact-checking-policy`
- `/contact` — physical address, map, phone

⚠️ **Owner dependency:** these pages cannot be written without your legal and company details (see the open questions list).

---

## 7. Internal linking

The ten education features (`docs/education-feature-inventory.md` §4) are the link magnets. Structure:

- Every article links to its category and, where relevant, to the relevant hub (a result story → the results hub; a scholarship story → the scholarship tracker)
- Hub pages link out to every related article — this is how a new domain builds topical clusters fast
- Institution profiles link to admission and result pages for that institution
- District pages link to district-filtered news and local opportunities
- Breadcrumbs everywhere, with `BreadcrumbList` schema
- Related-articles module on every article

---

## 8. Keyword clusters to target

Map each cluster to a template and a hub. **Keyword research is a follow-up task** — these are the clusters, not a validated keyword list.

| Cluster | Primary intent | Owning template |
|---|---|---|
| SSC/HSC result, marksheet, GPA | Transactional | Results hub |
| XI class admission, college admission, merit list, migration | Transactional | Admission + results hub |
| University admission, ভর্তি পরীক্ষা | Transactional | Admission |
| Scholarship, বৃত্তি, foreign scholarship | Research → transactional | Scholarship tracker |
| Exam routine, syllabus, model test | Informational | Routine hub |
| Job circular, নিয়োগ বিজ্ঞপ্তি, BCS | Transactional | Circular tracker |
| Study abroad, visa, cost of study | Research | Study-abroad guides |
| Institution names (university/college + ভর্তি) | Navigational | Institution directory |

---

## 9. Redirects and URL stability

- **Never change a published URL.** The research lists "changing article URLs without 301 redirects" among its fatal mistakes.
- If a URL must change, a 301 is mandatory, recorded in a redirect map.
- Shortlinks are stable and never reused.
- Canonical tags self-reference on every page; `fbclid` and `utm_*` are stripped.

---

## 10. Measurement

- Google Search Console (verify the domain) + Bing Webmaster Tools
- Cloudflare Web Analytics for traffic
- Manual rank checks on the §8 clusters until traffic supports better tooling

---

## 11. Open items

- [ ] **Slug language decision** (§2)
- [ ] Validate the §8 clusters with real keyword research
- [ ] Legal/company details for the E-E-A-T pages — **owner dependency**
- [ ] Decide the news-sitemap generation approach (build-time vs serverless)
- [ ] Confirm the Publisher Center brand name once the display name is decided
- [ ] Confirm `speakable` selectors survive the article template implementation
