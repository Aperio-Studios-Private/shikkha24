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

- [ ] Re-scope every collection's fields to education (the list above still carries general-news fields such as `press_card_no` and `comparison_images`)
- [ ] Confirm the education category tree before seeding
- [ ] Bengali admin labels (i18n bundle) — no pre-built Bengali locale exists in Payload; write it
- [ ] Seed initial education categories + a handful of Bengali test articles
