# Shikkha24 — CMS Content Model

**Status:** ✅ **implemented in S1** (2026-09-12). This document is the inventory; the code is in `cms/src/collections/` and `cms/src/globals/`.
**Populated:** 2026-09-11 (restored from `docs/task-checklist-original.md`, which the operative checklist had reduced to a bare collection list)

## Naming convention (decided 2026-09-12)

Field names below are written in `snake_case`, which is how they appear as **database columns**. In code they are **`camelCase`** — the JavaScript convention, and what Payload expects. Payload's Drizzle layer converts between the two, so `name_bn` in the DB is `nameBn` in `Articles.ts`.

## Implemented — 30 collections + 1 global

| Group (admin sidebar) | Collections |
|---|---|
| সম্পাদকীয় (Editorial) | `articles` · `categories` · `levels` · `districts` · `tags` · `authors` · `pages` · `fact-checks` |
| শিক্ষা (Education) | `scholarships` · `deadlines` · `institutions` · `circulars` · `result-links` · `study-abroad-guides` · `jobs` |
| ইন্টারঅ্যাকটিভ (Interactive) | `live-blogs` · `polls` · `quizzes` |
| মিডিয়া (Media) | `media` · `photo-galleries` |
| বিজ্ঞাপন (Advertising) | `ad-units` |
| পাঠক (Readers) | `comments` · `newsletter-subscribers` · `newsletter-campaigns` · `saved-deadlines` · `bookmarks` · `citizen-submissions` · `push-subscriptions` · `readers` · `poll-votes` |
| প্রশাসন (Administration) | `users` · global `site-settings` |

*(`newsletter-campaigns`, `bookmarks`, `citizen-submissions` and `push-subscriptions` added in S9 — 2026-09-13.)*

### Two structural decisions taken in S1

1. **`subcategories` is NOT a separate collection.** The approved tree
   (`docs/education-feature-inventory.md` §1) is flat — 8 top-level categories with
   no subcategories, because স্কুল-কলেজ was rejected as a category and replaced by
   the level filter. The **mechanism** exists as an optional self-relation
   (`categories.parent`), and the seed is the approved flat tree. A parallel
   collection would duplicate the hierarchy and give two ways to express the same
   thing. ⚠️ `.sps/task.md` still lists `Subcategories` — it should be amended.

2. **`readers` is an ADDITION to this inventory.** The retained feature set
   includes comments with Facebook/Google login, bookmarks, saved deadlines and
   push notifications — all four need a persistent reader identity, and
   `SavedDeadlines.reader` is modelled as a relation, which requires a collection
   to relate to. Readers are kept in a **separate auth collection from `users`**
   so a reader account is never one field-level mistake away from editorial access.

---


## Collections

### Articles
title · slug · body (blocks) · excerpt · featured_image · category · subcategory · tags · author · status · is_breaking · is_lead · key_takeaways · correction_notice · timeline_milestones · scheduled_publish_date · reading_time_minutes

### Categories
name_bn · slug · parent_category · icon · color_accent · sort_order · is_active
*(subcategories are modelled via `parent_category` — restored as an explicit collection in S1 per the audit)*

### Authors
name_bn · slug · bio · photo · designation · email · facebook · twitter · linkedin · press_card_no

### Tags
name_bn · slug

### Ad Units
name · position (enum) · ad_type (enum) · image · target_url · adsense_slot_id · campaign_start · campaign_end · is_active
*(`code_snippet` and `click_count` were **removed in S7** — see below.)*

### Site Settings *(global)*
site_name · logo · favicon · social_links · footer_text · contact_info · about_text

### Polls
question_bn · options[] (with vote_count) · is_active · expires_at

### Quizzes
date · questions[] (options, correct_answer, explanation)

### Fact Checks
claim · verdict (enum: false / misleading / true) · evidence · source_urls · comparison_images

### Jobs
title · organization · deadline · category (enum) · circular_image · apply_url · description

### Comments
article (relation) · reader (relation, optional) · user_name · user_email · user_avatar · body · is_approved · social_provider

### Live Blogs
title · slug · is_active · entries[] (timestamp, content, is_key_event)

### Newsletter Subscribers
email · subscribed_at · is_active · confirmed_at · unsubscribed_at · consent_source · confirmation_token · confirmation_expires_at · unsubscribe_token
*(restored by the audit — required by the self-built Payload newsletter decision)*
*(S9 added the double-opt-in fields. The confirmation and unsubscribe tokens are **deliberately different values**: the confirmation token is single-use and expires in 3 days, the unsubscribe token is long-lived and appears in every mail.)*

### Newsletter Campaigns
subject · preheader · body (richText) · status (draft / sending / sent / failed) · sent_at · recipient_count · sent_count · deferred_count · sent_through_id · last_error
*(added S9. The counters are **stored, not computed**, because a send legitimately spans several hours under the hourly cap and cPanel offers no delivery reporting. `sent_through_id` is the sweep cursor — ids are monotonic, so it cannot skip a subscriber if one is inserted mid-send.)*

### Bookmarks
reader (relation) · kind (article / deadline) · article (relation, conditional) · deadline (relation, conditional)
*(added S9. Kept separate from `saved-deadlines`: that one carries the N7 reminder state, this one is a plain saved-item list that also covers articles.)*

### Citizen Submissions
title · body · district · media · reporter_name · reporter_email · reporter_phone · status (new / reviewing / published / rejected) · editor_note
*(added S9. A **queue, not a publishing surface** — nothing here reaches the site without an editor. `reporter_email` and `reporter_phone` are field-level restricted to authenticated users.)*

### Push Subscriptions
endpoint (unique) · p256dh · auth · reader (optional relation) · reminders[] (deadline, remind_at, notified)
*(added S9, backs N7. One row per **browser**, not per reader — `reader` is optional because the audience N7 targets has not signed in. **A subscription is a capability**: `endpoint` plus the two keys is enough to push to that browser, so `read`/`update`/`delete` are super-admin only and readers act through `/api/push/*`, keyed on the endpoint string the browser presents rather than an enumerable row id. No IP, no user agent, no referrer is stored.)*

### Photo Galleries
title · slug · images[] (with caption) · description
*(restored by the audit — required by the gallery feature)*

---

## S9 changes to existing collections (2026-09-13)

**`media` — storage on the DianaHost disk.** Media was moved off Cloudflare
R2 onto the DianaHost disk (2026-09-12), and all Cloudflare services were
removed entirely (2026-09-14). Consequences, all
enforced in `cms/src/collections/Media.ts`:

- every upload is **converted to WebP and the original is discarded** — a
  conversion, not an extra copy, so it does not double disk use
- retained dimensions are **capped at 2000px** (`resizeOptions.withoutEnlargement`)
- **EXIF is stripped** (`withMetadata: false`) — geolocation in a reader's
  submitted photo is a privacy leak
- a **per-day upload cap** (`MEDIA_DAILY_UPLOAD_CAP_BYTES`, default 250 MB) is
  enforced in a `beforeValidate` hook and fails **open** if the count query errors

⚠️ Media is now part of the backup problem: the off-host backup must include
`data/media/`, not just the SQLite file (`docs/backup-and-recovery.md`).

**`ad-units` — two fields removed in S7, recorded here because this document
still listed them.** `code_snippet` was a raw-HTML field rendered verbatim, which
is stored XSS and would let a compromised Ad Manager account poison every page;
markup is now generated from structured fields instead. `click_count` was removed
because a static site cannot count clicks, and beaconing to the CMS from the
browser would break the "a CMS outage cannot take the site down" property.

### Pages
title · slug · body
*(restored by the audit — required by the E-E-A-T pages: /about, /contact, /corrections-policy, /fact-checking-policy, /editorial-team, /privacy-policy, /terms)*

---

## Education collections (added 2026-09-11 — approved inventory)

These are the data models behind the ten new education features in `docs/education-feature-inventory.md` §4. **Most are editorially curated, not API-fed** — which is why S10's technical risk dropped.

### Scholarships
title · provider · level (relation: Level) · country · funding_type (enum: full / partial / tuition) · amount · deadline (date) · eligibility · apply_url · description · is_international · is_active
*(backs N1 scholarship tracker — deadline-sorted, filterable by level/country/funding)*

### Deadlines / Academic Calendar
title · type (enum: admission / result / exam_routine / scholarship_deadline / holiday / circular) · date_start · date_end · level (relation) · district (optional relation) · description · related_article (optional relation)
*(backs N2 academic calendar and N5 exam routine hub — one dated-events model serves both)*

### Institutions
name_bn · name_en · slug · type (enum: public / private / madrasa / college) · level_offered (relation, multiple) · district (relation) · established · website · logo · address · description · is_verified
*(backs N4 institution directory — Day 1 ships a starter set: public universities + top private, marked "growing")*

### Circulars
title · organisation · type (enum: education / bcs / government_job / private_job) · level (relation, optional) · published_date · deadline · vacancy_count · circular_image · apply_url · description
*(backs N8 circular tracker — education + BCS/job circulars, now in scope)*

### Result Links
title · exam_name · board_or_institution · level (relation) · publication_date · official_url · how_to_steps (rich text) · merit_list_url · is_published
*(backs N3 results & merit lists hub — the "explain the official system" layer around the government portals)*

### Study Abroad Guides
country · slug · visa_requirements (rich text) · tuition_range · living_cost_range · intakes · application_steps · scholarship_notes · is_featured
*(backs N10 — Day 1 ships 8 destinations: UK, USA, Canada, Australia, Malaysia, Japan, South Korea, Germany)*

### Level (taxonomy collection)
name_bn · slug · sort_order
Values: প্রাথমিক · মাধ্যমিক · উচ্চ মাধ্যমিক · স্নাতক · স্নাতকোত্তর
*(the cross-cutting audience filter — deliberately NOT a category, to avoid overlapping শিক্ষা সংবাদ / ভর্তি / পরীক্ষা ও ফলাফল)*

### Saved Deadlines (reader-owned)
reader (relation) · deadline (relation) · remind_at · notified (bool)
*(backs N7 deadline reminders — reuses the push + bookmark infrastructure already planned in S9)*

---

## RBAC roles

| Role | Scope |
|---|---|
| Super Admin | Everything |
| Editor-in-Chief | All editorial + homepage control + breaking news |
| Section Editor | Own section articles + review queue |
| Reporter | Own articles only; draft + submit for review |
| Ad Manager | Ad units + campaigns only |

Field-level restriction: reporters cannot change publish date, status, or `is_breaking`.

---

## Editorial workflow (Payload built-in)

Reporter → Draft → Submit for Review → Section Editor approves/rejects with feedback → Publish.
Editor-in-Chief may publish directly.

---

## Open items for S1

- [x] ~~Confirm the education category tree~~ — ✅ approved 2026-09-11 (8 categories + level filter)
- [ ] Re-scope remaining general-news fields on the legacy collections (e.g. `press_card_no` on Authors, `comparison_images` on Fact Checks)
- [ ] Bengali admin labels (i18n bundle) — Payload ships no pre-built Bengali locale; write it
- [ ] Seed the 8 education categories + the 5 levels + 64 districts
- [ ] Seed a handful of Bengali test articles
- [ ] Decide whether `Subcategories` is a separate collection or a self-relation on `Categories` (currently modelled as `parent_category` on Categories)
