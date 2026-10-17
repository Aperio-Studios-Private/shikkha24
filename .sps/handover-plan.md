# Handover Phase Plan — SEO first, then the package

> Approved-gate document (rule 13). Owner approval required before execution.
> Written 2026-10-18 ~02:30 Dhaka. Nothing in here silently rewrites plan.md;
> this is the bridge phase between the build plan and handover (T-41).

## 0. Where we already are (verified tonight)

- Storefront: 64 URLs in sitemap · robots.txt correct · per-article
  `NewsArticle` + `NewsMediaOrganization` JSON-LD · OG/canonical clean ·
  news-sitemap + RSS live · 7 articles published · deployed at
  Cloudflare Workers, agent-deployable.
- CMS: Payload on DianaHost, agent self-serve publishing proven (JWT flow),
  30-tag library curated, breaking ticker live (id 29 মাউশি).
- SEO automation: IndexNow key served + pinger script (Bing/Yandex batch in
  flight — 63×202, retry scheduled once key-file challenge clears).
- GSC: `google-site-verification` TXT exists in DNS. **Nothing submitted,
  nothing verified through GSC UI yet (owner-side step).**

## 1. SEO plan (T-40) — four phases

### P1 — Indexing bootstrap (Day 0–1, owner 10 min + agent support)
| # | action | who |
|---|--------|-----|
| 1.1 | GSC: open/verify Domain property shikkha24.com (TXT already in DNS → instant) | owner |
| 1.2 | GSC → Sitemaps: submit `sitemap.xml` + `news-sitemap.xml` | owner |
| 1.3 | GSC → URL Inspection → Request indexing for home + top 3 articles | owner |
| 1.4 | Bing Webmaster Tools: sign-in → import/submit sitemap (cross-links with IndexNow key) | owner, 3 min |
| 1.5 | Agent: confirm sitemap ping coverage incl. article 29 (retry loop running) | agent |

**Exit criterion:** GSC shows "Processing"/URL submitted; IndexNow retry
returns 200/202 (reminder set at +2h).

### P2 — Content velocity (Day 1–14, the real ranking lever)
Google indexes a 3-day-old site fast only if it sees **fresh, complete URLs**
repeatedly. Without new URLs there is nothing to index.
| # | action | who | note |
|---|--------|-----|------|
| 2.1 | Publish cadence ≥1/day for 14 days (articles or deadline/circular items) | owner supplies source links or CMS access stays with agent | agent composes from cited sources only (integrity rule — no fabricated numbers) |
| 2.2 | Each publish → frontend redeploy + sitemap + IndexNow ping (agent runbook, 2 min) | agent | sitemap `lastmod` is real, never build-stamped |
| 2.3 | 84-পদ circular piece + 2nd candidate — blocked only on source link | owner supplies link | |
| 2.4 | Tag coverage: every article carries 2–4 library tags (30 ready) so /tag/* pages accumulate | agent at publish time | |

**Exit criterion:** 15+ articles live, every one in sitemap + pinged.

### P3 — Technical SEO backlog (Day 1–7, agent, code-only)
| # | action | note |
|---|--------|------|
| 3.1 | Add `Article` schema fields completeness check (dateModified, imageObject size) via sps-seo audit run | scheduled Day 14 |
| 3.2 | hreflang/lang attributes sanity (bn-BD) | audit item |
| 3.3 | 404/soft-404 sweep: demo URLs gone (verified); monitor GSC "Pages" report for exclusions | Day 7+ |
| 3.4 | Core Web Vitals checkpost with Lighthouse on home + article + deadlines (budget rule 9 targets) | Day 7 |

### P4 — Measurement (Day 7 · Day 14 · Day 30 checkpoints)
| checkpoint | what we read | expected |
|-----------|--------------|----------|
| Day 3 | GSC Pages: "Submitted and indexed" count | ≥ home + 3–5 articles |
| Day 7 | Search "shikkha24"/"শিক্ষা২৪" | brand result appears |
| Day 14 | GSC Performance: impressions | first non-brand impressions |
| Day 30 | full sps-seo audit delta + decide handover readiness | gate for §3 |

## 2. Other pre-handover streams

| stream | plan | owner need |
|--------|------|-----------|
| T-42 EditorialSnippets collection | specced; ships in NEXT CMS bundle (one Codespace cycle) | approval to include tonight's batch |
| T-37 logo | file given → agent uploads via CMS API → settings + favicon cache-bust → redeploy | the file |
| T-32 close-out | done (verify visually once) | — |
| Infra debts | VAPID key into frontend/.env; host cleanup `.broken-1792132158` after 7 stable days | none |
| Deploy automation | GitHub Actions `deploy.yml` auto-revives when minutes reset (arm ~Oct 25); agent verifies once then ping-at-publish becomes cron | none |
| Handover doc (T-41) | written AFTER §1 P1+P2 start, so it documents true state + runbooks + accounts matrix + revocation list | decide who receives handover |

## 3. Handover package (T-41) — contents fixed now
1. `HANDOVER.md`: stack map, folder map, deploy runbooks (storefront one-paste
   + CMS Codespace cycle), accounts matrix (names not secrets), where secrets
   live, open debts, revocation list (cPanel password roll, glab token revoke,
   Codespace, GitLab mirror access),IndexNow/GSC/DNS records inventory.
2. `.sps/` docs already suffice for agent-to-agent; HANDOVER.md is the
   human/next-team layer.

## 4. Decisions needed from owner (blocking items)
1. ☐ Run the GSC steps (P1) — the single Google unlock.
2. ☐ Logo file for T-37.
3. ☐ Source link(s) for pending news (84-পদ or any circular/notice).
4. ☐ Approve/modify: content cadence ≥1/day ×14 days (section 2.2).
5. ☐ Include EditorialSnippets in the next CMS bundle (T-42)?
6. ☐ Handover recipient + preferred depth (agent-to-agent vs human team).

---

## 5. The 30-day SEO plan (owner-requested expansion of §1)

**Assumptions:** new-domain Google lag ≈ 3–14 days for brand terms, 2–4 weeks
for long-tail; everything free-tier/self-hosted (rule 7); content requires
cited sources — the pipeline scales only as fast as links/access arrive.

### Week 1 (Day 1–7) — index + foundation
| day | actions |
|-----|---------|
| Daily | ≥1 publish (mix below) → deploy → sitemap → IndexNow ping (agent runbook ≈2 min/piece) |
| Day 1 | GSC property + sitemaps + request-indexing (P1 list) · Bing Webmaster submit |
| Day 2 | Collect GSC "All messages"; confirm sitemap status = Success |
| Day 3 | Coverage check: Pages report first numbers; fix anything Excluded unexpectedly (soft-404, duplicates) |
| Day 4 | On-page pass: title ≤60 chars + unique meta description on ALL articles (agent sweep) |
| Day 5 | Internal links: every article links ≥1 related (existing rail + inline); tag pages accumulate |
| Day 6 | Weekly digest #1 ("সাপ্তাহিক শিক্ষা সংবাদ একনজরে") — 8–10 items, cited |
| Day 7 | Checkpoint A: brand query test; GSC pages indexed count; Lighthouse home+article (≥95) |

**W1 exit:** ≥15 live URLs indexed or "processing"; brand result visible or imminent.

### Week 2 (Day 8–14) — keyword depth + distribution
| day | actions |
|-----|---------|
| Daily | ≥1 publish (mix) + ping; request-index each new URL |
| Day 8 | Evergreen hub #1: "২০২৬–২৭ ভর্তি বিজ্ঞপ্তি একনজরে" (links every admission article + tag pages) |
| Day 9 | Calculator pages keyword pass: /gpa /cgpa title+H1+intro to match "GPA calculator বাংলা"-type intents |
| Day 10 | Evergreen hub #2: "বৃত্তি ২০২৬: চলমান সুযোগ ও সময়সীমা" (updates as deadlines move — reusable) |
| Day 11 | Distribution: publish links to the site's FB/social channels (referral + brand signal); footer links already wired |
| Day 12 | GSC Coverage review #2; spot-check indexed vs sitemap count |
| Day 13 | Weekly digest #2 |
| Day 14 | Checkpoint B: Performance report first impressions (expect news long-tail); top-queries read |

**W2 exit:** ≥25 URLs; first non-brand impressions logged; 2 evergreen hubs live.

### Week 3 (Day 15–21) — authority + structure
| day | actions |
|-----|---------|
| Daily | publish + ping (mix); keep tags on every piece (tag hubs thicken) |
| Day 15 | Deadlines collection fill: every live admission/exam deadline of the month (rail + /deadlines depth) |
| Day 16 | Circulars collection fill (official notices w/ source links — boosts E-E-A-T) |
| Day 17 | Hub #3: "চলমান নিয়োগ বিজ্ঞপ্তি একনজরে" (jobs-career hub) |
| Day 18 | External free listings only (education directories / BD gov lists where applicable — no paid links, rule 7) |
| Day 19 | GSC review #3 + IndexNow coverage audit (all URLs submitted; retry anything missed) |
| Day 20 | Weekly digest #3 |
| Day 21 | Checkpoint C: Core Web Vitals field data pre-check (Lighthouse + GSC CWV if available) |

**W3 exit:** 3 evergreen hubs + full deadlines/circulars depth; crawl errors ≈ 0.

### Week 4 (Day 22–30) — audit, calibrate, hand over
| day | actions |
|-----|---------|
| Daily | publish + ping |
| Day 22–24 | Full sps-seo technical audit run; fix schema/title/OG gaps it finds |
| Day 25 | GSC deep read: top queries → write 2 targeted follow-ups for whatever is gaining |
| Day 26 | 404 sweep + demo-tag deadlink check (already 404 — keep dropped) + redirects if any needed |
| Day 27 | Weekly digest #4 + month recap post ("এক মাসে শিক্ষা২৪") |
| Day 28 | Checkpoint D: full KPI table (below) vs targets |
| Day 29 | SEO annex for HANDOVER.md: cadence, runbooks, tools, credentials-to-rotate, next-month plan |
| Day 30 | **Handover gate**: only when P1–P4 exit criteria are green |

### Content mix (owner-supply-permitting, rotated daily)
ভর্তি/বিজ্ঞপ্তি → ফলাফল/রুটিন → বৃত্তি → চাকরি/নিয়োগ → মেডিকেল-ইঞ্জিনিয়ারিং →
সাপ্তাহিক ডাইজেস্ট → এভারগ্রিন গাইড (tag library: 30 labels ready for all)

### 30-day KPI table
| metric | Day 7 | Day 14 | Day 30 |
|--------|-------|--------|--------|
| sitemap URLs | ≥20 | ≥30 | ≥40 |
| GSC indexed | ≥10 | ≥25 | ≥40 (or "processing" on the rest) |
| brand search visible | likely | yes | yes + sitelinks start |
| non-brand impressions | 0–50 | 100–1k | 1k+ |
| evergreen hubs | 0 | 2 | 4 |
| tag pages live | ~30 | 30+ | 30+ (with article depth) |
| Lighthouse (home/article) | ≥95 | ≥95 | ≥95 |
