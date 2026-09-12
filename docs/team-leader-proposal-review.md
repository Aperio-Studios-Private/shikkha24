# Team Leader Proposal — Review Against the Approved Plan

**Reviewed:** 2026-09-12 · **Reviewer:** agent · **Status:** ⏳ **awaiting owner decision — nothing in this document has been built**

**Source:** the 17-point proposal supplied by the team leader (header, slogan, homepage
layout, 15 categories, top/breaking/featured news, category sections, editor's pick,
most-read, footer, header widgets, sidebar dashboard, daily quotes/tips/quiz, notifications,
design, timeline).

**Why this document exists.** The proposal was checked line by line against
`docs/education-feature-inventory.md`, `.sps/profile.md` and `.sps/plan.md` — all
**owner-approved on 2026-09-11**. Two of the 17 points contradict a decision the owner
already made and recorded with a rationale. Under agent rule 13 (plan ↔ build parity) a
recorded decision cannot be quietly overwritten, so those two need an explicit owner
re-decision before any code changes.

---

## 1. Verdict at a glance

| # | Proposal item | Status |
|---|---|---|
| 1 | Header — শিক্ষা২৪ + subtitle | ⚠️ name approved & built; **third slogan phrase is new** |
| 2 | Slogan «সব শিক্ষার খবর, এক ঠিকানায়।» | ⚠️ near-duplicate of an approved line — pick one |
| 3 | Homepage layout order | ❌ **breaking ticker moved below top news** — conflicts |
| 4 | **15 categories** | ❌ **conflicts: 8 approved; স্কুল-কলেজ explicitly rejected; উচ্চশিক্ষা dropped** |
| 5 | Top news (5–6) | ✅ already built (masthead block) |
| 6 | Breaking news | ✅ already built |
| 7 | Featured news | 🆕 new label, no CMS field yet |
| 8 | Category sections | ✅ already built (8 sections) |
| 9 | Editor's pick | 🆕 needs a new `isEditorPick` CMS flag |
| 10 | Most read | ⚠️ built but **provisional** — static site cannot count views |
| 11 | Footer | ✅ already built |
| 12 | Header: prayer · weather · date | ✅ **all three built and verified** |
| 13 | Sidebar dashboard, live updates | 🆕 new — **perf-budget risk** |
| 14 | Daily quotes · tips · BCS Q · grammar · class routine | ⚠️ BCS quiz approved; quotes/tips/grammar are new + daily content cost |
| 15 | Notifications / trending | ✅ approved (S9 push; S3 trending) |
| 16 | Design — red & white, Bengali font, mobile | ✅ matches approved brand |
| 17 | «৫–১০ দিনে পুরো পোর্টাল প্রস্তুত» | ❌ **not achievable at the approved quality bar** |

**Summary:** roughly **10 of 17 items are already built or already approved**. Two items
(4 and 17) need the owner to decide. The rest are additive and low-risk.

---

## 2. Item 4 — the 15-category list (the significant conflict)

### Approved (owner, 2026-09-11): 8 top-level categories

শিক্ষা সংবাদ · বৃত্তি ও স্কলারশিপ · ভর্তি · বিশ্ববিদ্যালয় · উচ্চশিক্ষা ·
বিদেশে পড়াশোনা · পরীক্ষা ও ফলাফল · চাকরি ও ক্যারিয়ার

Plus two **cross-cutting** axes: **Level** (প্রাথমিক · মাধ্যমিক · উচ্চ মাধ্যমিক · স্নাতক ·
স্নাতকোত্তর) and **District** (64).

### Mapping the proposed 15

| # | Proposed | Against the approved tree |
|---|---|---|
| 1 | শিক্ষা সংবাদ | ✅ matches #1 |
| 2 | ভর্তি ও পরীক্ষা | ⚠️ **merges** approved #3 ভর্তি + #7 পরীক্ষা ও ফলাফল |
| 3 | চাকরি ও ক্যারিয়ার | ✅ matches #8 |
| 4 | স্কলারশিপ | ✅ approved as #2 (বৃত্তি ও স্কলারশিপ) — shortened |
| 5 | **স্কুল-কলেজ** | ❌ **explicitly rejected 2026-09-11** — see §3 |
| 6 | বিশ্ববিদ্যালয় | ✅ matches #4 |
| 7 | শিক্ষা প্রযুক্তি | 🆕 new |
| 8 | অনলাইন শিক্ষা | 🆕 new — overlaps #7 |
| 9 | শিক্ষা সেবা | 🆕 new — vague |
| 10 | পরামর্শ ও গাইডলাইন | 🆕 new — overlaps several |
| 11 | শিক্ষা বাতায়ন | 🆕 new — vague; overlaps শিক্ষা সংবাদ |
| 12 | গবেষণা ও প্রকাশনা | 🆕 new — thin-content risk |
| 13 | বিদেশে পড়াশোনা | ✅ matches #6 |
| 14 | শিক্ষা সেমিনার ও ইভেন্ট | 🆕 new — thin-content risk |
| 15 | শিক্ষা সংস্থা ও প্রতিষ্ঠান | 🆕 new — overlaps #6 + #9 |

**Two structural problems:**

1. **উচ্চশিক্ষা is missing.** It is approved category #5, and it is one of the five words in
   the owner's own positioning line (*Education News | Scholarship | Admission | University |
   **Higher Study***). The proposal drops it.
2. **Eight of the fifteen are new**, and five of those overlap each other or an existing
   category. The exact failure mode the approved decision was written to avoid.

### Why 15 is worse than 8 here — the numbers

At the **approved velocity of 15–20 articles/day**:

| | 8 categories | 15 categories |
|---|---|---|
| Articles per category per day | ~2.1 | ~1.1 |
| Realistic spread (8 new categories get less) | — | 3–4 categories get **0–1/day** |
| Category page after 30 days | ~60 stories — healthy | thin pages of 5–30 |

A category page holding a handful of stories is a **thin page**. Google's helpful-content
system discounts them, they dilute internal linking, and they multiply the
**Cloudflare Pages 20,000-file ceiling** faster (`docs/hosting-and-deployment.md`). The
approved competitor analysis says the winnable opening is *high-intent queries with fast
pages* — thin category pages work against exactly that.

### Recommendation — give the team leader the granularity without the cost

**Keep the 8 top-level categories. Add the extra topics as subcategories and tags.**

This is not a compromise that needs new code: the `Categories` collection already has a
**self-relation `parent` field** (built in S1), and `getSubcategories()` plus the S5
subcategory filter are **already written and working** — they render nothing today only
because the approved tree is flat. So:

| Proposed topic | Where it belongs |
|---|---|
| স্কুল-কলেজ | **Level filter** (প্রাথমিক/মাধ্যমিক/উচ্চ মাধ্যমিক) — the approved answer |
| শিক্ষা প্রযুক্তি, অনলাইন শিক্ষা | Subcategory of শিক্ষা সংবাদ |
| শিক্ষা সেবা, শিক্ষা সংস্থা ও প্রতিষ্ঠান | Subcategory of শিক্ষা সংবাদ / বিশ্ববিদ্যালয় |
| পরামর্শ ও গাইডলাইন | Subcategory (or tags) across several parents |
| গবেষণা ও প্রকাশনা | Subcategory of উচ্চশিক্ষা |
| শিক্ষা সেমিনার ও ইভেন্ট | **Deadlines / Academic Calendar collection** (already built) |
| ভর্তি ও পরীক্ষা | **Keep separate** — these are the two highest-volume education query clusters in Bangladesh; merging them costs more than it saves |

Net effect: the team leader's topics all survive, the SEO structure stays sound, and the
S5 subcategory filter finally renders instead of sitting empty.

**If the owner prefers the literal 15**, that is the owner's call — but it requires
amending `docs/education-feature-inventory.md` §1 and `.sps/profile.md` **first** (rule 13),
and the seed + navigation + S3 category sections rebuild after.

---

## 3. Why স্কুল-কলেজ is the one item to be firm about

It is not an oversight — it was **raised and rejected on 2026-09-11**, with the reasoning
recorded in `docs/education-feature-inventory.md` §1:

> স্কুল-কলেজ is an **audience segment**, not a topic. A school-admission story belongs to
> both স্কুল-কলেজ and ভর্তি; a school-exam result belongs to both স্কুল-কলেজ and
> পরীক্ষা ও ফলাফল. Making it top-level creates three overlaps, splits internal linking,
> and puts two of your own pages in competition for the same query.

The approved alternative — the **Level filter, applied site-wide** — is already built into
the homepage filter bar. A স্কুল-কলেজ *hub page* is still possible later as a special
section built on that filter. That was the recorded position and nothing has changed it.

---

## 4. Item 3 — homepage order

**Proposed:** হেডার → টপ নিউজ (৫–৬) → ব্রেকিং নিউজ → ফিচার্ড → ক্যাটাগরি → এডিটর'স পিক → মোস্ট রিড → ফুটার

**Problem:** the **breaking ticker sits below the top-news block.** A breaking ticker exists
to be seen instantly — result-day publication, an exam postponement, a circular release.
Buried under nine headlines it loses its entire purpose. The approved S3 order puts it first.

**Built today** (all verified): breaking ticker → filter bar → lead + 3 medium + 5 small →
leaderboard ad → deadline strip → 8 category sections → latest feed → sticky right rail
(trending + 2 ad cards) → footer.

**Suggested order** — keeps the team leader's intent, fixes the ticker:

```
ব্রেকিং টিকার → হেডার ফিল্টার → টপ নিউজ (lead + 2–3 medium + small strip)
→ ডেডলাইন স্ট্রিপ → ক্যাটাগরি সেকশন (৮টি) → এডিটর'স পিক → সর্বশেষ/মোস্ট রিড → বিজ্ঞাপন → ফুটার
```

Two genuinely new pieces: **এডিটর'স পিক** needs an `isEditorPick` field on the Articles
collection (a small S1 change — `isLead` and `isBreaking` already exist), and **ফিচার্ড**
would be a renamed presentation of the existing lead/medium block rather than a new section.

---

## 5. Item 17 — the 5–10 day timeline

**Not achievable, and worth saying plainly.**

Completed so far: S0–S6 — foundation, CMS with 26 collections + RBAC, design system,
homepage, article page, category/archive, search. That is **6 of 13 sections**, and it took
two days of continuous work. Remaining:

| Section | What is left |
|---|---|
| S7 | Ad system — needs the owner's **AdSense IDs** |
| S8 | Live blog engine, polls, quizzes, infographics, scrollytelling |
| S9 | Gallery, video, **push notifications**, bookmarks, social login, **newsletter + ESP deliverability**, citizen journalism, R2 media pipeline |
| S10 | **10 education features (N1–N10)** — scholarship tracker, calendar, results hub, institution directory, exam routine hub, GPA calculator, deadline reminders, circular tracker, district-first, study-abroad guides |
| S11 | News sitemap ✅ · sitemap ✅ · RSS ✅ · robots ✅ — **still to do:** OG/Twitter cards, auto OG images, canonical, `llms.txt`, Google Publisher Center, E-E-A-T pages |
| S12 | Deployment, **WCAG 2.2 AA manual keyboard + screen-reader pass**, browser matrix incl. **Opera Mini**, Bengali conjunct audit, load test, **timed restore drill** |

Two further realities:

- **Several blockers are owner-side, not agent-side** — DNS for shikkha24.com, the R2 usage
  alert, the DianaHost support ticket, AdSense IDs, E-E-A-T legal details (Trade Licence,
  TIN, Ministry registration), the real logo, and the **Meta app review** (free, but slow by
  nature — it cannot be compressed by working faster).
- The owner's own bar is **Lighthouse ≥95, LCP <1.5s, CLS <0.02, data-saver <30KB, WCAG 2.2
  AA**. That bar is what makes the portal competitive against the slow, ad-heavy
  aggregators. Compressing the schedule means giving it up.

A 5–10 day *demo* is realistic. A 5–10 day *launch* is not.

---

## 6. Items that are already done (no decision needed)

| Proposal | Evidence |
|---|---|
| শিক্ষা২৪ name, Bengali-only, mobile-first | Built — S2 |
| Red & white brand, Bengali font | Brand red `#DA1C25` + white + charcoal; **SolaimanLipi** (owner-chosen) |
| Prayer times in header | Built — next-prayer countdown, all five + Hijri, verified |
| Weather in header | Built — Open-Meteo, verified |
| আজকের তারিখ | Built — বঙ্গাব্দ + হিজরি + Gregorian, verified |
| Breaking news | Built — `BreakingTicker`, renders only when something is flagged |
| Top news block | Built — lead + medium + small newspaper hierarchy |
| Category sections | Built — all 8 render |
| Most read | Built — but **provisional**: a static site cannot accumulate view counts |
| Footer | Built — contact, E-E-A-T legal block, social |
| Notifications | Approved — S9 push notifications |
| BCS daily question | Approved — the re-scoped "Daily quiz (Admission + BCS)" |

**One live detail:** the CMS `siteName` is currently **«শিক্ষা২৪.com»**, which flows into the
RSS channel title and the Google News `news:name`. The Publisher Center name must match
exactly, so this should be set deliberately (probably «শিক্ষা২৪» without the domain) — owner input.

---

## 7. Items needing the owner's decision

1. **Categories — 8 (recommended, with subcategories) or the literal 15?** If 15, the
   feature inventory and profile are amended first, then the seed and navigation rebuild.
2. **One slogan.** Three are now in circulation — the two approved positioning lines plus the
   proposal's «সব শিক্ষার খবর, এক ঠিকানায়।». Recommend keeping the approved
   «শিক্ষার খবর, সুযোগ ও সম্ভাবনা—এক ঠিকানায়।» (it names both value props) as the brand line
   and «দেশ-বিদেশের শিক্ষার সর্বশেষ খবর ও সুযোগ» as the site tagline.
3. **এডিটর'স পিক** — approve the new `isEditorPick` field on Articles?
4. **Sidebar dashboard + daily quotes/tips/grammar** — approve, knowing each widget is a
   fetch and a layout-shift risk against the CLS/LCP/data-saver budgets, and that daily
   quotes/tips/grammar add **4 new daily content commitments** to a 5-person team already
   publishing 15–20 articles/day.
5. **Timeline expectation** — reset the team leader's expectation to the S0→S12 gate model.
