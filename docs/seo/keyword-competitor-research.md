# Keyword & Competitor Research — Bengali Education Vertical

**Site:** shikkha24.com · **Research date:** 2026-10-16 (Asia/Dhaka) · **Method:** direct HTTP fetches of competitor pages, robots.txt and sitemaps; cluster counts grepped from fetched HTML/XML verbatim (Bengali). Every claim below cites the fetched URL it came from (evidence IDs `P1…AR3` map to the Fetch Log, Appendix). Nothing in this file is copied from other project docs.

**Scope note:** `web_search` was broken in this environment; competitors were discovered by iterating known seeds and their sitemaps/nav. Site status: `edubd.info` = DNS dead, ignored; `eboardresults.com` + `educationboardresults.gov.bd` = JS bot-challenge, only generic evidence available.

---

## 1. Competitor matrix

Sites: **P** = prothomalo.com (general news, education desk) · **DS** = dainikshiksha.com (pure-play education portal) · **SS** = shikshasangbad.com (pure-play education portal) · **AR** = allresultbd.com (results/admission info aggregator) · **ER** = eboardresults.com (results web app).

| Dimension | P — prothomalo.com | DS — dainikshiksha.com | SS — shikshasangbad.com | AR — allresultbd.com | ER — eboardresults.com |
|---|---|---|---|---|---|
| **Clusters in recent items (Bengali verbatim, count)** | 616 news-sitemap titles (&lt;48 h): শিক্ষা 124 · পরীক্ষা 48 · প্রশ্ন 37 · বৃত্তি 29 · ভর্তি 14 · নিয়োগ 3 · বিজ্ঞপ্তি 1 · রুটিন 0 · ফলাফল 0 [P3]. Sample: "প্রাথমিক বৃত্তি পরীক্ষা ২০২৬", "জাহাঙ্গীরনগর বিশ্ববিদ্যালয়ে ভর্তি পরীক্ষা শুরু হতে পারে জানুয়ারিতে", "১৯তম বিজেএস প্রিলিমিনারির সময়সূচি প্রকাশ" [P3] | 300 news-sitemap titles (2026-10-12→15): সিলেবাস 103 · পরীক্ষা 59 · ভর্তি 52 · বিজ্ঞপ্তি 35 · বৃত্তি 9 · শিক্ষা 377 · ফলাফল 0 · রুটিন 0 [DS4]. Sample: "কাদিরদী কলেজে ভর্তি বিজ্ঞপ্তি", "উৎকর্ষ পাবলিক স্কুল অ্যান্ড কলেজে নিয়াোগ বিজ্ঞপ্তি" (mojibake), "ইবতেদায়ি ৫ম ও দাখিল ৮ম শ্রেণির বৃত্তি পরীক্ষার কেন্দ্র তালিকা দেখুন" [DS4] | 121 news-sitemap titles (last 48 h): শিক্ষা 24 · পরীক্ষা 13 · বৃত্তি 5 · ফি 4 · ভর্তি 3 · ফরম 3 · নিয়োগ 1 · রুটিন 0 · ফলাফল 0 [SS4]. Sample: "ডিগ্রি পরীক্ষার বিল পরিশোধে জাতীয় বিশ্ববিদ্যালয়ের নতুন নির্দেশনা" [SS4] | Homepage evergreen topics: ভর্তি 6 · পরীক্ষা 4 · রুটিন 2 · ফলাফল 2 · বৃত্তি 2; headlines: "Junior Scholarship 2026 Routine \| জুনিয়র বৃত্তি পরীক্ষার রুটিন", "XI Class Admission Result 2026 (কলেজ ভর্তি ফলাফল)", "DU Admission Test Date 2026-27 \| ঢাবি ভর্তি পরীক্ষা কবে" [AR1] | Not crawlable: homepage redirects to a JS challenge, `&lt;title&gt;Verifying you are not a robot&lt;/title&gt;` [ER1] |
| **JSON-LD `@type`s observed** | Article page: **NewsArticle**, Article, **BreadcrumbList**, NewsMediaOrganization, WebPage ×4, Person ×2, ImageObject ×6, ContactPoint ×8, SearchAction ×2, ListItem ×4 [P6]. Education hub: only BreadcrumbList + ListItem ×2 (no CollectionPage) [P5] | Homepage: Organization + ContactPoint ×3 + ImageObject + SearchAction, **plus two EMPTY ld+json blocks** `[]` and `{}` [DS1]. Tag page: same + BreadcrumbList [DS2]. Article: **NewsArticle**, **BreadcrumbList**, NewsMediaOrganization, Organization, WebPage ×2, Person, ListItem ×3 [DS3] | Homepage (Yoast @graph): Organization, WebSite, WebPage, BreadcrumbList, ListItem, SearchAction, ReadAction, EntryPoint, ImageObject, PropertyValueSpecification [SS1]. Article (Yoast @graph): **NewsArticle + Article**, WebPage ×2, **BreadcrumbList**, Person ×2, Organization ×2, WebSite, ImageObject ×5, CommentAction, ReadAction [SS3] | Homepage (Yoast @graph): WebSite, WebPage, Organization, BreadcrumbList, ListItem, SearchAction, ReadAction, ImageObject, EntryPoint — article-level schema not fetched [AR1] | Unknown (challenge page, octet-stream to plain HTTP clients) [ER1] |
| **News sitemap (Google News namespace)?** | **YES, valid**: `news_sitemap.xml` with `xmlns:news`, `news:name` "প্রথম আলো", `news:language bn`, `news:title` + `news:keywords`, image namespace, amphtml; robots.txt declares it [P1][P2] | **PRESENT BUT MALFORMED**: `news-sitemap.xml` declares `news="http://…"` (missing `xmlns:`) and uses `&lt;news&gt;` instead of `&lt;news:news&gt;`; 300 items with publication_date/title/keywords [DS4]. www robots.txt declares it [DS5] | **YES, valid structure, broken fields**: wpseo-news sitemap, `xmlns:news` OK, 121 items, CDATA titles — but `&lt;news:name&gt;&lt;/news:name&gt;` is **empty** and `&lt;news:language&gt;en&lt;/news:language&gt;` on Bengali content [SS4] | **NO**: sitemap_index.xml lists only post/page/category sitemaps, no news sitemap [AR3]; robots.txt = Yoast block [AR2] | Unknown [ER1] |
| **Title-tag pattern** | Article: `{headline} \| প্রথম আলো`; education hub: "দৈনিক শিক্ষা খবর: আজকের সংবাদ ও আপডেট প্রতিবেদন \| প্রথম আলো" — keyword front, brand suffix, consistent [P5][P6] | Article: `{headline} \| চাকরির খবর নিউজ ` (section-named suffix, trailing space, brand-drift) [DS3]; homepage: "Dainik Shiksha \| দৈনিক শিক্ষা \| দেশ বিদেশের শিক্ষা…সকল সংবাদ" + keyword-stuffed meta description (100+ terms) [DS1]; tag page titled just "school" [DS2] | Article: `{headline} - শিক্ষা সংবাদ` (brand suffix) [SS3]; homepage brand-first: "শিক্ষা সংবাদ - শিক্ষা বিষযক পরিপূর্ণ ডিজিটাল সংবাদমাধ্যম" [SS1] | Homepage: "All Result BD - Bangladesh Education Board SSC / HSC Result 2026" (English, year-front); headlines bilingual "…\| জুনিয়র বৃত্তি পরীক্ষার রুটিন" [AR1] | Unknown [ER1] |
| **URL structure** | `/{section}/{subsection}/{10-char random id}` e.g. `/education/higher-education/umu2aye7xr` — no keywords in slug [P4 in P6]. Sections: /education + admission, campus, examination, higher-education, scholarship, science-tech, study; separate /chakri + chakri-news, chakri-suggestion [P4] | `/bn|en/{news,page,category,tag}/{english-slug}-{numeric-id}` e.g. `/bn/news/question-paper-leak-…-387665` [DS3]; categories: ssc-dakhil-12, university-46, textbook-176, **syllabus-40**, **teacher-registration-73**, technical-80, medical… (12,770 URLs in sitemap incl. every tag, `/bn/page/search`, and mojibake Bengali tag slugs like `/en/tag/বশষ-বসএস-3036`) [DS6] | `/{category}/{numeric-id}/` e.g. `/madrasa/23103/`, `/university/national/23107/`, `/technology/4446/` — flat, trailing slash, meaningless id slugs [SS2][SS4] | Flat evergreen pages: `/hsc-result-using-mobile-sms/`, `/hsc-result-dhaka-board/`, `/hsc-result-publish-date/`, `/xi-class-admission-result/`, `/college-admission/`, `/national-university-masters-part-1-exam-result/`, `/admit-card/`, `/notice-board/`, `/job-circular/` [AR1] | JS app; internal structure unknown [ER1] |
| **Canonical / hygiene** | Article canonical = self, no trailing slash; AMP present, page HTML 2.8 MB, hub 3.3 MB [P6][P5] | **Empty canonicals** `&lt;link rel="canonical" href=""&gt;` on homepage [DS1] and tag page [DS2]; apex-host robots.txt (`https://dainikshiksha.com/robots.txt`) serves the HTML app shell instead of robots.txt [DS7] | Canonical points to a *different category-trail with trailing slash*: fetched `/lifestyle/78/` → canonical `https://shikshasangbad.com/others/78/` [SS3]; homepage static 320 KB [SS1] | Sitemap index has no news sitemap [AR3]; pages flat `/…-slug/` with trailing slash [AR1] | Same challenge engine also protects educationboardresults.gov.bd (`_challenge-engine?goto=…`, same 11.5 KB page) [ER2] |

**Frequency read:** every live competitor published admission/notice content inside the last 48 hours (ভর্তি/বিজ্ঞপ্তি in P3, DS4, SS4). Result/routine terms were at zero in the Oct 12–15 window on P/DS/SS — that content is event-driven and will surge when SSC/HSC publication dates approach; AR carries it **permanently** as evergreen flat pages [AR1].

---

## 2. Recommended Bengali keyword targets for shikkha24

12 targets, justified by live evidence:

| # | Target (Bengali verbatim) | Intent note | Evidence |
|---|---|---|---|
| 1 | এসএসসি রুটিন (এসএসসি পরীক্ষার সময়সূচি) | Routine-page intent, seasonal spike at publication | DS keeps a dedicated সিলেবাস/exam category (syllabus-40), publishes exam logistics daily [DS4][DS6]; P covers "১৯তম বিজেএস…সময়সূচি প্রকাশ" [P3] |
| 2 | এইচএসসি রুটিন | Same as #1, HSC cohort | Same sources [DS4][P3]; none of P/DS/SS had a routine page live in the sampled window — a freshness first-mover slot |
| 3 | এসএসসি ফলাফল / বোর্ডভিত্তিক ফলাফল (e.g. ঢাকা বোর্ড) | Result-check intent, huge surge days | AR's whole business is board/result flat pages [AR1]; official portals are bot-walled and offer a poor user experience to many students [ER1] |
| 4 | ফলাফল দেখার নিয়ম (SMS + ওয়েবসাইট পদ্ধতি) | How-to intent, durable evergreen | AR dedicated page `/hsc-result-using-mobile-sms/` [AR1]; official portal unusable for many [ER1][ER2] |
| 5 | ভর্তি বিজ্ঞপ্তি (স্কুল–কলেজ–মাদ্রাসা) | Notice/lifecycle intent, near-daily demand | DS: ভর্তি 52 + বিজ্ঞপ্তি 35 in 300 items [DS4]; P: ভর্তি 14 [P3] |
| 6 | একাদশ শ্রেণিতে ভর্তি / কলেজ ভর্তি ফলাফল | XI-admission season intent | AR pages `/xi-class-admission-result/`, "একাদশ শ্রেণি ভর্তি আবেদন" [AR1] |
| 7 | বিশ্ববিদ্যালয় ভর্তি বিজ্ঞপ্তি (ঢাকা বিশ্ববিদ্যালয় ভর্তি পরীক্ষা কবে) | University-admission date queries | P education desk story "জাহাঙ্গীরনগর…ভর্তি পরীক্ষা শুরু হতে পারে জানুয়ারিতে" [P3]; AR "ঢাবি ভর্তি পরীক্ষা কবে" [AR1] |
| 8 | জাতীয় বিশ্ববিদ্যালয় তথ্য (ভর্তি, ফরম, বিল, ফলাফল) | NU is a distinct high-volume institution cluster | SS "ডিগ্রি পরীক্ষার বিল পরিশোধে জাতীয় বিশ্ববিদ্যালয়ের নতুন নির্দেশনা" [SS4]; AR `/national-university-masters-part-1-exam-result/` [AR1] |
| 9 | নিয়োগ বিজ্ঞপ্তি (শিক্ষক নিয়োগ, স্কুল/কলেজ/মাদ্রাসা) | Teacher-recruitment intent, near-daily postings | DS publishes them daily [DS4]; DS category teacher-registration-73 (এনটিআরসিএ in meta) [DS6]; P printed only নিয়োগ 3 [P3] — big papers underserve it |
| 10 | বৃত্তি পরীক্ষা (প্রাথমিক / জুনিয়র) | Scholarship-exam routine/center-list intent now | P runs a "প্রাথমিক বৃত্তি পরীক্ষা ২০২৬" prep series, বৃত্তি 29 [P3]; DS "…বৃত্তি পরীক্ষার কেন্দ্র তালিকা দেখুন" [DS4]; AR "জুনিয়র বৃত্তি পরীক্ষার রুটিন" [AR1] |
| 11 | সিলেবাস (পরীক্ষার সিলেবাস) | Syllabus/distribution-document download intent, evergreen per exam | The single densest DS cluster: 103 mentions in 300 items [DS4]; dedicated category [DS6] |
| 12 | পরীক্ষার কেন্দ্র তালিকা ও ফরম পূরণ (+ ফি) | Logistics micro-queries around every exam | SS recent items carry ফরম 3, ফি 4 [SS4]; DS কেন্দ্র-তালিকা headline [DS4] |

---

## 3. Technique conclusions — where shikkha24 can rank better

All claims traceable to fetched evidence:

1. **Ship a spec-valid Google News sitemap from day 1.** P's `news_sitemap.xml` is the only correct one in the set [P2]; SS's declares `news:language=en` and an empty `news:name` on Bengali content [SS4]; DS's uses `news=` and `&lt;news&gt;` syntax that Google's spec does not define [DS4]; AR has none [AR3]. A correct one (plus `news:language bn`, a named publication, +06:00 dates) makes shikkha24 the cleanest Google News citizen in this vertical.
2. **Own the schema types nobody emits.** Across every fetched page: no `FAQPage`, no `HowTo`, no `JobPosting`, no `CollectionPage` on hubs [P5][P6][DS1–3][SS1–3][AR1]. DS/SS/P publish recruitment notices and how-to-check-result content constantly — emitting `JobPosting` on circular pages and `FAQPage`/`HowTo` on result guides is eligibility none of them has.
3. **Keyword-bearing URLs with ASCII slugs.** P: opaque ids (`/education/higher-education/umu2aye7xr`) [P6]; SS: meaningless ids (`/madrasa/23103/`) [SS4]; DS: English slugs + id suffix [DS3]. Bengali slugs demonstrably corrupt in the wild (DS ships mojibake `/en/tag/বশষ-বসএস-3036` [DS6]) — supports the project's ASCII-slug decision, keyword carried in title/h1/schema instead.
4. **Never ship empty or drifting canonicals.** DS serves `&lt;link rel="canonical" href=""&gt;` on its homepage and tag pages [DS1][DS2]; SS canonicals trail to a different category with a slash (`/lifestyle/78/` → canonical `/others/78/`) [SS3]. One canonical form, self-referencing, no trailing slash — matches P's article behavior [P6].
5. **SSR crawlable HTML under ~300 KB.** P pages weigh 2.8–3.3 MB of HTML [P5][P6]; DS's homepage is a client-rendered shell with **zero article links** in initial HTML [DS1] and its apex-host robots.txt serves the app shell [DS7]. A statically rendered light page is both faster (project performance gates) and faster for crawlers.
6. **Disciplined title pattern.** Front-load the Bengali keyword (+ year where relevant), end with one consistent brand suffix. Evidence of the opposite: DS's suffix drifts per section ("\| চাকরির খবর নিউজ ", trailing space) and tag pages resolve to title "school" [DS2][DS3]; SS puts brand first on the homepage [SS1]; AR front-loads the year "SSC / HSC Result 2026" [AR1] — year-stamping works, follow it on seasonal pages.
7. **Board/year-structured evergreen pages, junk-free sitemaps.** AR's flat evergreen pages (`/hsc-result-dhaka-board/`, `/xi-class-admission-result/`) rank against bot-walled official portals [AR1][ER1]. DS, by contrast, stuffs 12,770 URLs into its sitemap including every tag, `/bn/page/search`, and duplicates [DS6]. shikkha24: page-per-board/routine/notice evergreen templates + a sitemap that contains only indexable URLs.
8. **Curated llms.txt for AI citation.** None of P/DS/AR serves `llms.txt` (404) [P:llms 404; DS:llms 404; AR:llms 404]; SS ships a Yoast-generated one that leaks "Demo Blog Page"/"Demo Front Page" [SS5]. A hand-curated llms.txt listing the four desks + evergreen hubs is a differentiator no major competitor does properly.

---

## 4. Data gaps — what could NOT be determined

1. **No search-volume data.** `web_search` was broken here and no keyword API was used; target priority above is inferred from competitors' publication frequency and the existence of dedicated pages — not from volume numbers.
2. **SERP holders unknown.** Without SERP access (and with no GSC data — the site hasn't launched), current #1 rankers per query are unverified.
3. **eboardresults.com / educationboardresults.gov.bd internals** (schema, canonicals, sitemaps, content inventory) sit behind a JS bot-challenge (`_challenge-engine`, "Verifying you are not a robot") [ER1][ER2]; only their non-crawlability is evidenced.
4. **edubd.info is DNS-dead** (`Could not resolve host`, bare + www, 2026-10-16) — could not be analyzed.
5. **allresultbd.com article-level schema** unverified (homepage, robots.txt and sitemap index fetched only) [AR1–AR3].
6. **Cluster frequencies are a 1–4 day October window** (2026-10-12→16). Routine/result peaks (SSC Jan/Feb + May, HSC Jun–Aug, university admission Oct–Dec) were not directly observed, only inferred.
7. **DS internal-link depth** unmeasured — its homepage link graph loads via JS post-render [DS1].
8. **No backlink/authority metrics** (no Ahrefs/Majestic access) — domain-strength comparisons are not evidence-based in this report.

---

## Appendix — Fetch log (evidence)

| ID | Fetched URL | What it evidenced |
|---|---|---|
| P1 | https://www.prothomalo.com/robots.txt | Declares sitemap.xml + news_sitemap.xml |
| P2 | https://www.prothomalo.com/news_sitemap.xml | Valid `xmlns:news`, news:name "প্রথম আলো", bn titles/keywords, ×616, image+amphtml |
| P3 | https://www.prothomalo.com/sitemap/sitemap-daily-2026-10-15.xml (301 locs) + P2 title/keyword greps | URL pattern, cluster counts, sample education headlines |
| P4 | https://www.prothomalo.com/sitemap.xml + https://www.prothomalo.com/sitemap/sitemap-section.xml | Sitemap index (daily/section); /education subsections incl. scholarship, examination, admission; /chakri desk |
| P5 | https://www.prothomalo.com/education | Hub title, BreadcrumbList+ListItem only, 3.3 MB HTML |
| P6 | https://www.prothomalo.com/education/higher-education/umu2aye7xr | Article title pattern, NewsArticle stack, canonical/AMP, 2.8 MB HTML |
| DS1 | https://www.dainikshiksha.com/ | SPA shell, keyword-stuffed meta, empty ld+json blocks + Organization, empty canonical |
| DS2 | https://www.dainikshiksha.com/bn/tag/tag-1-1 | Title "school", empty canonical, thin 18 KB page |
| DS3 | https://www.dainikshiksha.com/bn/news/question-paper-leak-for-youth-development-recruitment-exam-6-arrested-387665 | Title suffix drift, NewsArticle+BreadcrumbList+NewsMediaOrganization, self-canonical |
| DS4 | https://www.dainikshiksha.com/news-sitemap.xml | Malformed news sitemap (news=/&lt;news&gt;), 300 items 10-12→10-15, cluster counts, sample headlines |
| DS5 | https://www.dainikshiksha.com/robots.txt (www) | Valid robots: sitemap.xml + news-sitemap.xml |
| DS6 | https://www.dainikshiksha.com/sitemap.xml | 12,770 URLs; category/tag/page slugs incl. mojibake Bengali slugs, /page/search |
| DS7 | https://dainikshiksha.com/robots.txt (apex) | Serves HTML app shell, not robots.txt |
| SS1 | https://shikshasangbad.com/ | Brand-first title, Yoast @graph types, cluster counts, 320 KB |
| SS2 | https://shikshasangbad.com/robots.txt + https://shikshasangbad.com/sitemap_index.xml | Yoast robots; post-sitemap1..6 index |
| SS3 | https://shikshasangbad.com/lifestyle/78/ | Yoast NewsArticle+Article stack; canonical = /others/78/ (category drift) |
| SS4 | https://shikshasangbad.com/news-sitemap.xml + https://shikshasangbad.com/post-sitemap.xml | Valid ns but language=en + empty name; 121 items/48 h; /{category}/{id}/ URLs; cluster counts |
| SS5 | https://shikshasangbad.com/llms.txt | Yoast-generated llms.txt incl. demo pages |
| AR1 | https://allresultbd.com/ | English/year title, flat evergreen slugs, bilingual headlines, Yoast homepage schema |
| AR2 | https://allresultbd.com/robots.txt | Yoast robots, single sitemap |
| AR3 | https://allresultbd.com/sitemap_index.xml | post/page/category only — no news sitemap |
| ER1 | https://eboardresults.com/ (+ /v2/home, /app/home via web_fetch) | Bot-challenge page "Verifying you are not a robot"; octet-stream to plain fetch |
| ER2 | http://educationboardresults.gov.bd/ | Same challenge engine (redirect to `_challenge-engine`) |
| EDUBD1 | https://edubd.info/ + https://www.edubd.info/ | DNS: "Could not resolve host" — dead |
| AUX | https://www.prothomalo.com/llms.txt, https://www.dainikshiksha.com/llms.txt, https://allresultbd.com/llms.txt | All 404 → no competitor publishes llms.txt except SS5 |
