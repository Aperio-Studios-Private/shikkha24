# Shikkha24 — CMS Content Model

**Status:** schema drafted from the original plan-approval checklist; **field lists must be re-scoped to education in S1** before implementation.
**Populated:** 2026-09-11 (restored from `docs/task-checklist-original.md`, which the operative checklist had reduced to a bare collection list)

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
name · position (enum) · ad_type (enum) · code_snippet · image · target_url · campaign_start · campaign_end · is_active · click_count

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
article (relation) · user_name · user_email · user_avatar · body · is_approved · social_provider

### Live Blogs
title · slug · is_active · entries[] (timestamp, content, is_key_event)

### Newsletter Subscribers
email · subscribed_at · is_active
*(restored by the audit — required by the self-built Payload newsletter decision)*

### Photo Galleries
title · images[] (with caption)
*(restored by the audit — required by the gallery feature)*

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
