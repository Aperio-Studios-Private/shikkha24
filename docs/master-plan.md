# 🏆 The Definitive Master Plan — Bangladesh's Best News Portal

> [!WARNING]
> **OBSOLETE AS A BUILD INPUT (marked 2026-09-11).**
> This document was produced for a **general news portal**. The portal is an **education** portal — `shikkha24.com`. Positioning: *Education News | Scholarship | Admission | University | Higher Study / দেশ-বিদেশের শিক্ষার সর্বশেষ খবর ও সুযোগ*.
> Retained for reference only. **Do not use this inventory, category tree or competitive framing as the feature list.** A new education inventory is required (see `.sps/profile.md` open decisions).
> Specifically out of scope for an education portal: politics, business, sports and cricket, entertainment, gold/DSE/commodity tickers, and the general-news category tree.
> **Known defects corrected on 2026-09-11:** the Next.js row was wrong (now `>=16.2.6 <17.0.0`); the Listmonk row documented a rejected option; the TTS features had no viable implementation path under the zero-cost constraint (now Browser Web Speech API, audio bulletin descoped); the content-velocity target was unachievable with the stated team; the checklist count was wrong; the heading understated the feature count.
> **Corrected in `docs/competitive-analysis.md` instead:** that file's "Adopt a Headless SSR Architecture" takeaway contradicted this project's static-output architecture and has been removed there.
> Also corrected: the "charcoal" token is no longer used for two different hex values (brand #1F1F1F vs dark-mode base #121212); the E-E-A-T `/about` row now includes Ministry of Information registration; `hreflang` was replaced by `inLanguage: bn-BD` on a single-language site; the checklist count and the feature-count heading were fixed; the content-velocity arithmetic mismatch is now recorded.

> [!IMPORTANT]
> This plan is built on competitive intelligence from **15+ portals** — every top Bangladeshi portal (Prothom Alo, bdnews24, Daily Star, Samakal, Jugantor, Kaler Kantho, Jago News 24, Bangla Tribune, Ittefaq) and 7 world-class international portals (BBC, Guardian, Al Jazeera, CNN, NYT, NHK, NDTV). ⚠️ **The international per-portal analysis is incomplete** — it was truncated from the source session and never recovered (see `docs/competitive-analysis.md` Part 4). Every feature below is either proven by a competitor or is an innovation no BD portal has yet.

---

## Your Decisions (Locked In)

| Question | Your Answer | Implementation Impact |
|----------|-------------|----------------------|
| **CMS** | ✅ Payload CMS 3 (approved) — "make it very user-friendly" | Admin UI customized for non-tech reporters |
| **Feature phases** | ✅ "I want ALL in Day 1" | Ambitious but doable — "no rush, quality over speed" |
| **Comments** | ✅ Custom Payload comments (social login) | Facebook/Google login, no GitHub dependency |
| **Categories** | ✅ Fully editable via admin — "very flexible" | Dynamic categories + subcategories in Payload |
| **Newsletter** | ✅ Listmonk (best, complexity OK) | Self-hosted email marketing — full control |
| **Build pipeline** | ✅ GitHub Actions (automated) | Push → build → deploy to cPanel automatically |
| **Language** | ✅ Bengali-only UI | No language toggle; English articles optional |
| **Portal name** | ⏳ TBD | Placeholder branding until decided |

---

## The Complete Tech Stack (All Verified Sep 11, 2026)

| Layer | Technology | Version | Role |
|-------|-----------|---------|------|
| **Frontend** | Astro | 7.3.2 | Static HTML, Rust compiler, incremental builds |
| **CMS** | Payload CMS | 3.89.0 | Headless admin, editorial workflows, versioning |
| **CMS Runtime** | Next.js | **16.2.6+** | Payload runs inside Next.js (admin only). ⚠️ Corrected 2026-09-11 — the previous "15.x" was wrong: the real `@payloadcms/next@3.89.0` peer range is `>=15.2.9 <15.3.0 \|\| >=15.3.9 <15.4.0 \|\| >=15.4.11 <15.5.0 \|\| >=16.2.6 <17.0.0`, which excludes Next 15.5.x and 16.0.0–16.2.5 |
| **Styling** | Tailwind CSS | 4.3.3 | Oxide engine, CSS-first config |
| **Database (launch)** | SQLite | 3.53.4 | Zero-config, embedded |
| **Database (scale)** | PostgreSQL | 18.6 | Full-text search, JSONB |
| **Runtime** | Node.js | 24 LTS | Krypton. ⚠️ Active LTS ends 2026-10-20; EOL 2028-04-30. Node 26 becomes LTS 2026-10-28 |
| **Types** | TypeScript | 7.0.2 | Go-based compiler (ships 20 platform-specific native binaries) |
| **Build** | Vite | 8.3.0 | Used by Astro 7 + Tailwind 4.3 |
| **Search** | Pagefind | 1.5.2 | Build-time, zero-server, Bengali support **unverified** |
| **Frontend host** | Cloudflare Pages | free tier | Unlimited bandwidth, no card required — added 2026-09-11 |
| **Media storage** | Cloudflare R2 | 10 GB free | Zero egress fees — added 2026-09-11 |
| **CDN** | Cloudflare Free | — | Edge cache, DDoS, SSL, analytics |
| **Newsletter** | Self-built Payload module + free-tier ESP | — | ⚠️ **Listmonk 6.2.0 REJECTED 2026-09-11** — it requires its own PostgreSQL and a VPS, and no free VPS is obtainable without a credit card (Oracle Cloud Always Free requires a card at signup) |
| **Push Notifications** | Web Push API | — | Segmented breaking alerts. FCM removed — it needs a Google Cloud project and is unnecessary for web push |
| **Hosting (CMS)** | DianaHost PNR **2 GB** SSD NVMe | 2 GB / 200 GB | Purchased. Built in CI with Next.js `output: 'standalone'` (~300–600 MB) |
| **Analytics** | Cloudflare Web Analytics | — | Free, cookie-less |
| **Bengali Fonts** | Hind Siliguri + Noto Sans Bengali | Google Fonts | Headlines + body (WOFF2, subsetted) |
| **English Font** | Inter | v4 variable | UI elements |
| **CI/CD** | GitHub Actions | — | Auto build + deploy to cPanel |

---

## Why We'll Beat Every Competitor

### Competitive Weaknesses We Exploit

| Competitor | Their Weakness | Our Advantage |
|-----------|---------------|---------------|
| **Prothom Alo** | Heavy ads (page takeovers, video popups), 3-5s load time, proprietary CMS cost | Zero-JS static HTML via Astro 7: sub-1s LCP. Clean ad layout. Free open-source stack. |
| **bdnews24** | Stagnant UX, wire-service density, management disputes | Modern magazine-style design (Bangla Tribune aesthetic) with interactive features |
| **Daily Star** | English-only, limited grassroots reach | Bengali-first with hyperlocal 64-district coverage |
| **Jugantor** | Aggressive mobile ad interruption, cluttered layout | Reader-first design, reserved ad slots (zero CLS) |
| **Kaler Kantho** | Dependent on conglomerate ecosystem (T-Sports) | Independent, built-in live cricket + sports widgets |
| **Jago News 24** | Click-optimized, lower editorial trust | High-trust verified photo cards + fact-check section |
| **Bangla Tribune** | Small team, limited feature set | Their clean design + our feature depth |
| **ALL BD portals** | No data-saver mode, no AQI, no verified photo cards, no daily quiz, no fact-check radar | 10 innovations nobody has (see below) |

---

## 10 Killer Innovations (No BD Portal Has These)

### 1. 🔐 QR-Verified Photo Card Generator (ভেরিফাইড ফটোকার্ড)
Every article auto-generates a branded social card with a QR verification badge. Readers scan → portal confirms authenticity. Kills fake news photo cards on WhatsApp/Facebook. **Trust weapon from Day 1.**

### 2. 📱 Data-Saver Ultra-Lite Mode (ডাটা সাশ্রয়ী মোড — <30KB)
Header toggle strips ads, defers images behind "ট্যাপ করে ছবি দেখুন" placeholder. Loads in <300ms on 2G/3G. Saves 95% mobile data. **Game-changer for rural readers on prepaid MB packs.**

### 3. 🌫️ Real-Time AQI & Health Alert Ribbon (লাইভ বায়ুদূষণ মনিটর)
Live Dhaka air quality in the header with health advisory. Dynamic color: Green→Yellow→Red→Purple. "আজ বাতাস অস্বাস্থ্যকর — এন৯৫ মাস্ক পরুন।" **No BD portal shows this.**

### 4. 🏏 Live Cricket Floating Pill (লাইভ ক্রিকেট স্কোর)
Permanent floating mini-score during Bangladesh matches: `BAN 214/4 (38.2) | শান্ত ৫৪*`. Tap → ball-by-ball drawer. **Keeps cricket fans ON the portal instead of bouncing to Cricinfo.**

### 5. 💱 Expatriate Remittance Corner (প্রবাসী কর্নার)
Dedicated section for 10M+ NRBs: live SAR/AED/USD→BDT rates, govt 2.5% incentive tracker, airport rules, WEWB updates. **Captures massive diaspora audience.**

### 6. 📍 District-First Local News (আমার জেলা — 64 Districts)
1-tap district selector with cookie memory. Personalizes homepage: local news, weather, river flood gauge from FFWC, prayer times. **Samakal has basic drilldown; we do personalized homepage.**

### 7. 🔊 Bangla Voice Reader (সংবাদ শুনুন) — implementation resolved 2026-09-11
Every article has an audio player: "এই সংবাদটি শুনুন". **Implementation: Browser Web Speech API** (`speechSynthesis`) — client-side, free, no server cost, no storage, no recurring fee. The player degrades gracefully where no Bengali voice is installed on the device.
⚠️ **The twice-daily 3-minute audio bulletin is DESCOPED.** Web Speech API is a live browser capability and cannot pre-generate podcast audio; a self-hosted or paid TTS engine would be required, and the owner has no international card. Original text: *"Plus twice-daily 3-min audio bulletin (সকাল ৮টা ও রাত ৮টা). Daily Star has basic TTS; we do it with high-quality Bangla AI voice + daily podcast."* — the "high-quality Bangla AI voice" had no viable implementation path under the zero-cost constraint.

### 8. 📜 Story Timeline Drawer (ঘটনার টাইমলাইন)
Expandable timeline for long-running stories: "দেখুন এই ঘটনার পেছনের ইতিহাস" → visual chronological milestones. **Readers catch up on months of context in 30 seconds. Nobody does this.**

### 9. 📝 Daily News Quiz & BCS Hub (দৈনিক সংবাদ কুইজ ও বিসিএস প্রস্তুতি)
5 daily current affairs questions with instant feedback + percentage chart. Streaks, sharing, competition. **Captures millions of BCS/bank exam candidates as daily habitual visitors.** Inspired by NYT daily games strategy.

### 10. ⚠️ Fact-Check Radar with WhatsApp Debunk Share (সত্যতা যাচাই রাডার)
Dedicated fact-check section: 🔴 মিথ্যা / 🟡 বিভ্রান্তিকর / 🟢 সত্য. Before/after image comparison slider. 1-tap "হোয়াটসঅ্যাপে শেয়ার করুন" generates a polite debunk card for family groups. **Viral trust mechanism.**

---

## Complete Feature Inventory (87 Features)

> Corrected 2026-09-11: the heading previously read "70+ Features" while the rows run to 87 (subtotals 19+22+8+7+7+4+12+8 = 87). ⚠️ **This entire inventory is general-news scope and is obsolete for the education portal.**

### 🗞️ Content & Editorial (19 Features)

| # | Feature | Inspired By |
|---|---------|-------------|
| 1 | Rich blocks editor with image/video/embed support | Standard |
| 2 | Dynamic categories + subcategories (admin-editable) | Prothom Alo, Samakal |
| 3 | Tags system with auto-suggest | Standard |
| 4 | Author profiles with `/author/[slug]` pages | Daily Star |
| 5 | Draft → In Review → Published editorial workflow | Payload built-in |
| 6 | Content versioning + rollback (who changed what, when) | Payload built-in |
| 7 | Scheduled publishing (write now, publish at 6 AM) | Payload built-in |
| 8 | Breaking news ticker (pulsing red bar + relative timestamp) | CNN, Prothom Alo |
| 9 | Lead story / hero article management | Prothom Alo |
| 10 | Live blog engine (real-time updates, key events filter) | Guardian, bdnews24 |
| 11 | "এক নজরে" Key Takeaways box at top of articles | CNN, NYT |
| 12 | Correction/Update notices ("আপডেট ৩:৩০ PM") | Journalistic standard |
| 13 | Story timeline drawer (ঘটনার টাইমলাইন) | Innovation #8 |
| 14 | Citizen journalism portal (নাগরিক সংবাদ) | Prothom Alo |
| 15 | Sponsored content with clear "বিজ্ঞাপন" label | Prothom Alo |
| 16 | Field-level permissions (reporters can't change publish date) | Payload built-in |
| 17 | Audit trail (complete activity log) | Payload built-in |
| 18 | "Explains" visual storytelling blocks | Daily Star |
| 19 | Article series / multi-part investigative collections | NYT, Guardian |

### 👤 Reader Experience (22 Features)

| # | Feature | Inspired By |
|---|---------|-------------|
| 20 | Mobile-first responsive design (375px minimum) | Standard |
| 21 | Dark mode (base #121212, not pure black — distinct from the brand charcoal #1F1F1F) | BBC GEL |
| 22 | Text size adjustment (আ font controls) | BBC, Prothom Alo |
| 23 | Reading progress bar (slim 2px red) | NYT, Prothom Alo |
| 24 | Full-text search (Pagefind, Bengali) | Standard |
| 25 | Related articles (by category + tags) | Standard |
| 26 | Trending / Most Read section (time-based) | Prothom Alo |
| 27 | Infinite scroll / "Load more" on listings | Prothom Alo |
| 28 | Social share bar (WhatsApp, Facebook, Messenger, X, copy link) | Standard |
| 29 | Prayer times widget (location-aware, district-level) | Jago News 24 |
| 30 | Weather widget (division-level) | Prothom Alo |
| 31 | Bengali date/time (১১ সেপ্টেম্বর ২০২৬, বৃহস্পতিবার + বঙ্গাব্দ + হিজরি) | Prothom Alo |
| 32 | Print-friendly article view | Standard |
| 33 | Data-saver ultra-lite mode (<30KB) | Innovation #2 |
| 34 | Bangla voice reader ("সংবাদ শুনুন") — Browser Web Speech API | Innovation #7 |
| 35 | ~~Daily 3-min audio bulletin~~ **DESCOPED 2026-09-11** (no viable zero-cost implementation) | Innovation #7 |
| 36 | Comments with social login (Facebook/Google) | Custom Payload |
| 37 | Reader bookmarks / save for later | Prothom Alo |
| 38 | Push notifications (segmented by topic) | Innovation via CNN |
| 39 | Polls / surveys ("আজকের প্রশ্ন") with live chart | Jugantor |
| 40 | Daily news quiz & BCS prep hub | Innovation #9 |
| 41 | District-first personalized homepage (আমার জেলা) | Samakal + Innovation #6 |

### 🏏 Utility Widgets (8 Features)

| # | Feature | Inspired By |
|---|---------|-------------|
| 42 | Live cricket floating pill + ball-by-ball drawer | Innovation #4 |
| 43 | Real-time AQI ribbon (Dhaka + divisions) | Innovation #3 |
| 44 | Expatriate remittance corner (currency rates, SAR/AED/USD→BDT) | Innovation #5 |
| 45 | DSE stock ticker (DSEX index, top gainers/losers) | Prothom Alo |
| 46 | Gold price tracker (প্রতি ভরি) | NDTV pattern |
| 47 | Commodity price tracker (চাল, পেঁয়াজ, মুরগি) | Innovation (NYT-inspired) |
| 48 | Disaster/cyclone warning banner (signal-coded) | NHK pattern |
| 49 | Ramadan sehri/iftar countdown (seasonal) | Jago News 24 |

### 📸 Media & Multimedia (7 Features)

| # | Feature | Inspired By |
|---|---------|-------------|
| 50 | Photo galleries with fullscreen slideshow | Prothom Alo |
| 51 | Video embed (YouTube, Facebook) with lazy loading | Standard |
| 52 | QR-verified branded photo card generator | Innovation #1 |
| 53 | Before/after image comparison slider | Al Jazeera AJLabs |
| 54 | Infographics & data visualization blocks | Prothom Alo, NYT |
| 55 | Short-form vertical video carousel ("৩০ সেকেন্ডে খবর") | Al Jazeera AJ+ |
| 56 | Podcast embed support | Daily Star |

### 💰 Monetization (7 Features)

| # | Feature | Inspired By |
|---|---------|-------------|
| 57 | Google AdSense integration | Standard |
| 58 | Direct sponsor banner ads (7+ positions) | Standard |
| 59 | Zero-CLS ad containers (reserved CSS dimensions) | Best practice |
| 60 | Ad campaign management in Payload (start/end dates, positions) | Custom |
| 61 | Sponsored content template with "বিজ্ঞাপন" badge | Prothom Alo |
| 62 | Email newsletter sponsorship slots | Standard |
| 63 | Interstitial-free reading (NO popups — competitive advantage) | Anti-Jugantor |

### ⚠️ Trust & Fact-Checking (4 Features)

| # | Feature | Inspired By |
|---|---------|-------------|
| 64 | Fact-check radar section (মিথ্যা/বিভ্রান্তিকর/সত্য) | Innovation #10 |
| 65 | WhatsApp debunk share button | Innovation #10 |
| 66 | Source transparency accordion (তথ্যের উৎস) | Guardian |
| 67 | Corrections policy page (/corrections-policy) | Google E-E-A-T |

### 🔍 SEO & Technical (12 Features)

| # | Feature | Inspired By |
|---|---------|-------------|
| 68 | NewsArticle JSON-LD (auto-generated per article) | Google requirement |
| 69 | News sitemap (48-hour rolling, `<news:news>` namespace) | Google requirement |
| 70 | Standard sitemap.xml | Standard |
| 71 | RSS feed (full + per-category) | Standard |
| 72 | Open Graph + Twitter Card meta (auto) | Standard |
| 73 | Auto-generated OG images (article title as social card) | Innovation |
| 74 | Canonical URLs + fbclid parameter stripping | SEO best practice |
| 75 | `llms.txt` for AI search optimization | GEO/AEO standard |
| 76 | robots.txt allowing AI bots (GPTBot, PerplexityBot, ClaudeBot) | GEO strategy |
| 77 | Google Publisher Center registration | Google News |
| 78 | LiveBlogPosting schema (for live blog articles) | Google requirement |
| 79 | Speakable schema (for voice/AI assistant citation) | Google spec |

### 🏢 Admin & Operations (8 Features)

| # | Feature | Inspired By |
|---|---------|-------------|
| 80 | RBAC: Super Admin, Editor-in-Chief, Section Editor, Reporter, Ad Manager | Payload built-in |
| 81 | Site Settings global (logo, social links, footer, contact) | Standard |
| 82 | Listmonk newsletter integration + subscriber management | Decision |
| 83 | Media library with folder organization | Payload built-in |
| 84 | Jobs section (চাকরির খবর) — government + private circulars | Jago News 24 |
| 85 | Education section (পড়াশোনা) — BCS, admission, model tests | Kaler Kantho |
| 86 | Editorial team page (/editorial-team) with real photos + bios | Google E-E-A-T |
| 87 | About, Contact, Privacy, Terms pages | Google E-E-A-T |

### 📊 Governance & E-E-A-T (Required by Google)

| Page | Content |
|------|---------|
| `/about` | Legal entity, Trade License, TIN, ownership transparency, **Ministry of Information registration** (added 2026-09-11 — was missing) |
| `/editorial-team` | Real names, photos, bios, beat, social links — NO anonymous bylines |
| `/corrections-policy` | How errors are investigated and corrected |
| `/fact-checking-policy` | Two-source verification rules, rumor handling |
| `/contact` | Physical address + map, phone, editorial email |

---

## Payload CMS Admin UX (Making It Reporter-Friendly)

> Per your instruction: "make it very user-friendly and easy to use"

### Role-Based Simplified Views

| Role | What They See | What's Hidden |
|------|--------------|---------------|
| **Reporter (প্রতিবেদক)** | Article editor, "Save Draft" button, "Submit for Review" button, their own articles list, media uploader | Publish button, site settings, ad management, other reporters' drafts |
| **Section Editor (বিভাগীয় সম্পাদক)** | Review queue for their section, approve/reject with feedback, edit articles, pin to section | Global settings, ad management, user management |
| **Editor-in-Chief (প্রধান সম্পাদক)** | Everything editors see + homepage layout control, breaking news toggle, all sections | Ad management, developer settings |
| **Ad Manager (বিজ্ঞাপন ব্যবস্থাপক)** | Ad units, campaigns, sponsor banners | Editorial content, user management |
| **Super Admin** | Everything | Nothing hidden |

### Admin UI Customizations for Payload

1. **Bengali admin labels** — All field labels, buttons, and navigation in Bengali
2. **Simplified article form** — Only essential fields visible by default; advanced fields in collapsible "আরও তথ্য" section
3. **Visual review queue** — "অনুমোদনের অপেক্ষায়" tab with article cards showing title, author, submitted time
4. **1-click breaking news** — Toggle switch on article form: "ব্রেকিং নিউজ হিসেবে প্রকাশ করুন"
5. **Drag-and-drop homepage layout** — Editor can reorder lead story, secondary stories, and section blocks
6. **Live preview** — Editors see the article exactly as readers will see it before publishing
7. **Image auto-optimization** — Upload any image → Payload auto-generates WebP + multiple sizes

---

## Google News & SEO Battle Plan

### How to Rank a NEW Portal Against Established Giants

#### Content Velocity Strategy
- **Target: 45-70 articles/day** (minimum to signal a 24/7 newsroom)
- ⚠️ **Two problems with this target, recorded 2026-09-11:**
  1. **Arithmetic mismatch.** The desk allocation below sums to **42–56/day**, not 45–70. The two figures must be reconciled during re-planning.
  2. **Team-size mismatch.** With the stated team of 5+ reporters/editors, 45–70/day means **9–14 articles per person per day, seven days a week** — 3–5× a normal reporter's output. ⚠️ **Updated 2026-09-11:** the target is now **OPEN**, not retained. It was briefly kept with hiring as a prerequisite, then reopened when the arithmetic was examined. Recommended model: baseline 15–20/day + burst to 40+ on result/admission days. See `docs/education-feature-inventory.md` §7.
- ⚠️ The desk allocation is general-news scope and is obsolete for the education portal. It must be redrawn around education desks.
- **Desk allocation (general-news, obsolete):**
  - জাতীয় ও রাজনীতি: 14-18/day
  - অর্থনীতি ও ব্যবসা: 8-10/day
  - খেলাধুলা: 6-8/day
  - জেলার খবর (৬৪ জেলা): 6-8/day
  - প্রযুক্তি, শিক্ষা ও চাকরি: 4-6/day
  - বিনোদন ও ফিচার: 4-6/day

#### Breaking News Protocol (QDF — Query Deserves Freshness)
1. **Flash (0-5 min):** 100-150 word urgent flash with optimized title
2. **Expand (15-30 min):** Add quotes, context, photos. Update `dateModified`
3. **Live Update:** Do NOT create multiple URLs. Update the SAME canonical URL

#### The Facebook → Google Flywheel
```
Breaking Story Published
    → Branded Photo Card shared on Facebook Page/Groups
    → Massive viral traffic spike (10k-50k visits)
    → Google Discover algorithm triggered
    → 100k-500k Discover impressions across Android
    → Branded searches spike on Google ("portal name + topic")
    → Google crawl frequency increases
    → Top Stories carousel placement
```

#### Backlink Strategy
1. **Data journalism reports** — Original research that academics/think tanks cite
2. **University partnerships** — `.edu.bd` editorial backlinks
3. **Wikipedia citations** — Well-sourced articles that Bangla Wikipedia editors cite
4. **Startup/fintech PR** — Companies link from their "Press" pages

#### AI Search Optimization (GEO/AEO)
- **"Answer Capsule" pattern:** First sentence answers the 5 Ws directly
- **"এক নজরে" takeaways box:** Bulleted summary that LLMs extract
- **HTML tables** for prices, scores, schedules (RAG parsers love tables)
- **`llms.txt`** at domain root describing portal structure
- **Allow AI bots** in robots.txt (GPTBot, PerplexityBot, ClaudeBot, Google-Extended)

---

## 13-Section Build Order

| # | Section | Features Included |
|---|---------|-------------------|
| **S0** | Foundation & Toolchain | Monorepo, Astro 7, Payload CMS 3, Tailwind 4.3, TypeScript 7, Node 24, SQLite, env, GitHub Actions CI |
| **S1** | CMS Content Models & RBAC | Articles, Categories (dynamic + subcategories), Authors, Tags, Ad Units, Site Settings, Polls, Quizzes, Fact-Checks, Jobs, Comments, Live Blogs. RBAC: 5 roles with field-level permissions. Bengali admin labels. |
| **S2** | Design System & Base Layout | Typography (Hind Siliguri + Noto Sans Bengali + Inter), color system (Red #DA1C25 + charcoal + white), dark mode, responsive 12-column grid, Header (utility ribbon: AQI + weather + prayer + date), Mega menu, Footer, sticky mobile share bar, text resizer |
| **S3** | Homepage | Breaking ticker, lead story hero, category grids, trending/most read tabs, latest news feed, district selector (আমার জেলা), utility widgets (cricket, AQI, weather, prayer, currency, gold), ad slots, daily quiz promo |
| **S4** | Article Page | Full article, "এক নজরে" takeaways, author card, related articles, share buttons, reading progress bar, text resizer, data-saver toggle, audio player, comments, correction notice, story timeline drawer, print view, JSON-LD NewsArticle + Speakable schema |
| **S5** | Category, Tag, Author & Archive Pages | Listings with pagination, breadcrumbs, subcategory filters, author profile pages, date-based archive (calendar), "On This Day" feature |
| **S6** | Search | Pagefind 1.5 integration, search UI, Bengali text search, date-range filter, section filter |
| **S7** | Ad System | AdSlot component (zero-CLS reserved containers), AdSense integration, sponsor banner management in Payload, campaign dates, 7 positions (leaderboard, sidebar, in-article, footer, mobile anchor, interstitial-free), sponsored content template |
| **S8** | Live Blog & Interactive | Live blog engine (auto-refresh, key events filter, timestamped cards), polls with live chart results, daily news quiz, before/after image slider, infographic blocks, scrollytelling templates |
| **S9** | Media, Newsletter & Engagement | Photo gallery, video embeds, QR-verified photo card generator, Listmonk integration, push notifications (Web Push API, segmented topics), bookmarks, social login, citizen journalism submission form |
| **S10** | Utility Widgets & Specialized Sections | Live cricket pill + drawer, AQI ribbon, weather widget, prayer times, currency/remittance rates, gold price, commodity prices, DSE ticker, disaster warning banner, jobs section (চাকরি), education section (পড়াশোনা), expatriate corner (প্রবাসী), fact-check section |
| **S11** | SEO, Feeds & AI Optimization | News sitemap (48hr rolling), standard sitemap, RSS (full + per-category), Open Graph + Twitter Cards, auto-generated OG images, canonical URLs, `inLanguage: bn-BD` (hreflang removed 2026-09-11 — pointless on a single-language site), robots.txt (AI bot friendly), llms.txt, Google Publisher Center setup, E-E-A-T governance pages |
| **S12** | Deployment, QA & Launch | cPanel deployment scripts, GitHub Actions pipeline, Cloudflare setup, Lighthouse audit (target ≥95), mobile testing (375px), Bengali font rendering audit, ad viewability test, load testing, accessibility audit |

---

## Architecture Diagram

```
                    ┌─────────────────────────────────────┐
                    │         CLOUDFLARE CDN               │
                    │  Edge cache · SSL · DDoS · Analytics │
                    └───────┬─────────────────┬────────────┘
                            │                 │
                 Cache HIT  │                 │ /admin + /api
                 (static)   │                 │ (editorial only)
                            ▼                 ▼
                  ┌──────────────┐   ┌───────────────────────┐
                  │  ASTRO 7.3   │   │  PAYLOAD CMS 3        │
                  │  (Static)    │   │  (Next.js + Payload)   │
                  │              │   │                        │
                  │  HTML/CSS/JS │   │  REST + GraphQL + Local│
                  │  in          │   │  Admin Panel (Bengali) │
                  │  public_html │   │  Review Workflows      │
                  │              │   │  Version History       │
                  │  Pagefind    │   │  Scheduled Publish     │
                  │  search idx  │   │  SQLite → PostgreSQL   │
                  └──────────────┘   └───────────────────────┘
                                              │
                                     ┌────────┴────────┐
                                     │   LISTMONK      │
                                     │  (Newsletter)   │
                                     └─────────────────┘

BUILD PIPELINE (GitHub Actions):
  Editor publishes in Payload → Webhook → GitHub Actions triggered
  → Astro incremental rebuild → Only changed pages regenerated
  → Deploy to DianaHost cPanel via SSH/FTP
```

---

## Verification Targets

| Check | Target |
|-------|--------|
| Lighthouse mobile Performance | **≥ 95** |
| LCP (Largest Contentful Paint) | **< 1.5s** |
| INP (Interaction to Next Paint) | **< 100ms** |
| CLS (Cumulative Layout Shift) | **< 0.02** |
| TTFB (Time to First Byte) | **< 200ms** (Cloudflare edge) |
| Initial page payload | **< 1.2 MB** |
| Data-saver mode payload | **< 30 KB** |
| TypeScript | Zero errors |
| JSON-LD NewsArticle | Google Rich Results Test pass |
| News Sitemap | Valid XML, <48hr articles only |
| RSS | W3C Feed Validation pass |
| Dark mode | Full visual audit, WCAG AAA contrast |
| Bengali typography | Line-height ≥1.65, min 17px mobile, no tofu |
| Mobile | Tested at 375px width |
| Touch targets | Minimum 48×48px |
| Bengali font size | WOFF2 subsetted <50KB per weight |
| Ad containers | All reserved CSS dimensions, zero CLS |
| Print view | Clean layout, no ads |

---

## ✅ PLAN APPROVED

> Plan approved by user on **2026-09-11T20:41+06:00**.
> - `.sps/plan.md` stamped as approved
> - `task.md` checklist created — ⚠️ corrected 2026-09-11: the original checklist has **198 items**; the operative `.sps/task.md` has **50** (it lost ~75% of the detail and four CMS collections). The operative file has since been restored by the audit.
> - Ready to begin **Section S0: Foundation & Toolchain** on user's build command
> - ⚠️ Scope amended 2026-09-11: this plan is for a **general news portal**; the portal is an **education** portal. See the banner at the top of this file.
