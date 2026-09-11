# 📋 News Portal — Build Checklist (Original at Plan Approval)

> [!WARNING]
> **ARCHIVE ONLY — do not build from this file (marked 2026-09-11).** The operative checklist is `.sps/task.md`.
> This is the 198-item checklist created at plan approval. The operative checklist had been reduced to 50 items and lost four CMS collections; the audit restored them. Both checklists are **general-news scope** and must be re-scoped to education.
> One item from this file was promoted into the operative plan by the 2026-09-11 audit: **Lighthouse accessibility ≥ 90** (previously present only here).

> Plan approved: 2026-09-11 | Status: **Ready to build**
>
> **Note:** This is the original checklist created at plan approval time (2026-09-11T20:47+06:00).
> ⚠️ Corrected 2026-09-11: the note below previously claimed "a post-approval audit added items (Bengali date utilities in S2, Listmonk deployment tasks in S12)" — **those items do not appear anywhere in this file**. The claim was inaccurate and has been removed.
> The live working copy is `.sps/task.md` — use that for build tracking.

---

## S0: Foundation & Toolchain
- [ ] Initialize monorepo structure (`/frontend` Astro, `/backend` Payload, `/shared` types)
- [ ] Initialize Astro 7.3 project in `/frontend`
- [ ] Initialize Payload CMS 3 project in `/backend` (Next.js + Payload)
- [ ] Configure Tailwind CSS 4.3 in Astro
- [ ] Configure TypeScript 7.0 (strict mode, shared tsconfig)
- [ ] Set up SQLite database for Payload
- [ ] Create `.env` files (`.env.example` + `.env.local` for secrets)
- [ ] Configure Node.js 24 LTS (`.nvmrc` or `.node-version`)
- [ ] Initialize Git repo + `.gitignore`
- [ ] Set up GitHub Actions CI (lint + type-check on PR)
- [ ] Create `README.md` with project setup instructions
- [ ] Verify: Astro dev server starts clean
- [ ] Verify: Payload admin panel accessible at `/admin`
- [ ] Verify: TypeScript compiles with zero errors

---

## S1: CMS Content Models & RBAC
- [ ] **Articles** collection (title, slug, body blocks, excerpt, featured_image, category, subcategory, tags, author, status, is_breaking, is_lead, key_takeaways, correction_notice, timeline_milestones, scheduled_publish_date, reading_time_minutes)
- [ ] **Categories** collection (name_bn, slug, parent_category, icon, color_accent, sort_order, is_active)
- [ ] **Subcategories** — nested under Categories (parent relationship)
- [ ] **Authors** collection (name_bn, slug, bio, photo, designation, email, facebook, twitter, linkedin, press_card_no)
- [ ] **Tags** collection (name_bn, slug)
- [ ] **Ad Units** collection (name, position enum, ad_type enum, code_snippet, image, target_url, campaign_start, campaign_end, is_active, click_count)
- [ ] **Site Settings** global (site_name, logo, favicon, social_links, footer_text, contact_info, about_text)
- [ ] **Polls** collection (question_bn, options array with vote_count, is_active, expires_at)
- [ ] **Daily Quizzes** collection (date, questions array with options + correct_answer + explanation)
- [ ] **Fact Checks** collection (claim, verdict enum [false/misleading/true], evidence, source_urls, comparison_images)
- [ ] **Jobs** collection (title, organization, deadline, category enum, circular_image, apply_url, description)
- [ ] **Comments** collection (article relation, user_name, user_email, user_avatar, body, is_approved, social_provider)
- [ ] **Live Blogs** collection (title, slug, is_active, entries array with timestamp + content + is_key_event)
- [ ] **Newsletter Subscribers** collection (email, subscribed_at, is_active)
- [ ] **Photo Galleries** collection (title, images array with caption)
- [ ] **Pages** collection (title, slug, body — for About, Contact, Policies)
- [ ] Configure 5 RBAC roles:
  - [ ] Super Admin (full access)
  - [ ] Editor-in-Chief (all editorial + homepage control)
  - [ ] Section Editor (own section articles + review queue)
  - [ ] Reporter (own articles only, draft + submit)
  - [ ] Ad Manager (ad units + campaigns only)
- [ ] Field-level permissions (reporters can't change publish date, status, is_breaking)
- [ ] Bengali admin labels (i18n config for Payload admin)
- [ ] Seed initial categories + subcategories
- [ ] Seed test articles (5-10 with Bengali content)
- [ ] Verify: All collections CRUD works in admin
- [ ] Verify: RBAC — reporter can't publish directly
- [ ] Verify: Version history tracks changes
- [ ] Verify: Scheduled publishing works

---

## S2: Design System & Base Layout
- [ ] Bengali font setup (Hind Siliguri WOFF2 subset, Noto Sans Bengali WOFF2 subset)
- [ ] English font setup (Inter v4 variable, WOFF2)
- [ ] Font loading strategy (`font-display: swap`, `size-adjust` fallbacks)
- [ ] Tailwind theme config (colors: red #DA1C25, charcoal #1F1F1F, surface grays)
- [ ] Typography scale (Bengali: min 17px body, line-height ≥1.65)
- [ ] Dark mode system (charcoal #121212 base, #1E1E1E surface, coral-red #E53935 accent)
- [ ] 12-column responsive grid (375px → 768px → 1024px → 1280px)
- [ ] **Header component:**
  - [ ] Utility ribbon (date বঙ্গাব্দ+হিজরি, weather, AQI, prayer times, currency rates)
  - [ ] Main nav bar (logo + search + categories + dark mode toggle + data-saver toggle)
  - [ ] Mega menu (categories + subcategories + special sections)
  - [ ] Mobile hamburger drawer
  - [ ] Breaking news ticker (pulsing red bar + relative timestamp)
- [ ] **Footer component** (about, categories, social links, copyright, app store badges placeholder)
- [ ] **Sticky mobile bottom share bar** (WhatsApp, Facebook, Messenger, copy link)
- [ ] **Text resizer widget** (আ font size controls, saved to localStorage)
- [ ] **Reading progress bar** (slim 2px red at top of articles)
- [ ] **Base page layout** (Header + main + Footer wrapper)
- [ ] Verify: Dark mode toggles cleanly with WCAG AAA contrast
- [ ] Verify: Bengali renders correctly at all sizes (no tofu, no clipping)
- [ ] Verify: Mobile layout at 375px width
- [ ] Verify: Font files < 50KB per weight

---

## S3: Homepage
- [ ] Breaking news ticker section (latest 5 breaking articles, auto-scroll)
- [ ] Lead story hero (full-width image + headline + excerpt + author + timestamp)
- [ ] Secondary lead stories (2-4 flanking cards)
- [ ] সর্বশেষ / পঠিত tabs (Latest / Most Read toggle)
- [ ] Category grid sections (each category → 4-6 article cards)
- [ ] "আমার জেলা" district selector (64 districts, cookie memory, personalized local news)
- [ ] Utility widgets sidebar:
  - [ ] Prayer times widget
  - [ ] Weather widget
  - [ ] Live cricket pill (conditional — only during matches)
  - [ ] AQI ribbon
  - [ ] Currency/remittance rates
  - [ ] Gold price
- [ ] Ad slots (leaderboard top, sidebar 300x250, in-feed, footer)
- [ ] Daily quiz promo card ("আজকের কুইজ — ৫টি প্রশ্নে নিজেকে পরীক্ষা করুন")
- [ ] Infinite scroll / "আরও খবর" load more
- [ ] Verify: LCP < 1.5s on mobile
- [ ] Verify: CLS < 0.02 (all ad slots reserved)
- [ ] Verify: All sections render with Bengali content

---

## S4: Article Page
- [ ] Full article body (blocks renderer — text, image, video, quote, embed, code)
- [ ] "এক নজরে" key takeaways box (bulleted summary at top)
- [ ] Author card (photo, name, designation, social links, "আরও পড়ুন" link)
- [ ] Related articles section (by category + tags, 4-6 cards)
- [ ] Social share bar (WhatsApp, Facebook, Messenger, X, copy link — sticky on mobile)
- [ ] Reading progress bar (2px red top bar)
- [ ] Text resizer controls
- [ ] Data-saver mode toggle
- [ ] AI audio player ("সংবাদটি শুনুন" — TTS integration point)
- [ ] Comments section (social login with Facebook/Google, load on interaction)
- [ ] Correction/update notice block ("[আপডেট ৩:৩০ PM]...")
- [ ] Story timeline drawer ("ঘটনার টাইমলাইন দেখুন" — expandable)
- [ ] Print-friendly view (clean stylesheet, no ads)
- [ ] JSON-LD NewsArticle schema (auto-generated)
- [ ] Speakable schema (headline + summary selectors)
- [ ] Open Graph + Twitter Card meta tags
- [ ] Canonical URL (stripped of fbclid/utm params)
- [ ] Breadcrumbs (Home → Category → Subcategory → Article)
- [ ] "এই বিভাগের আরও খবর" section at bottom
- [ ] Ad slots (in-article, sidebar, bottom)
- [ ] Verify: JSON-LD passes Google Rich Results Test
- [ ] Verify: OG image renders correctly in Facebook debugger
- [ ] Verify: Print view is clean and ad-free

---

## S5: Category, Tag, Author & Archive Pages
- [ ] Category listing page (`/category/[slug]`)
- [ ] Subcategory filter within category page
- [ ] Tag listing page (`/tag/[slug]`)
- [ ] Author profile page (`/author/[slug]`) — bio, photo, social, article archive
- [ ] Date-based archive page (`/archive/[year]/[month]`)
- [ ] "On This Day" feature (articles from same date in previous years)
- [ ] Pagination (numbered pages, not just next/prev)
- [ ] Breadcrumbs on all listing pages
- [ ] JSON-LD BreadcrumbList schema
- [ ] Verify: Pagination works correctly
- [ ] Verify: Author pages show correct articles

---

## S6: Search
- [ ] Pagefind 1.5 build-time index generation
- [ ] Search UI component (modal or dedicated page)
- [ ] Bengali text search verification
- [ ] Date-range filter
- [ ] Section/category filter
- [ ] Search results with article cards (thumbnail, title, excerpt, date)
- [ ] "কোনো ফলাফল পাওয়া যায়নি" empty state
- [ ] Verify: Bengali search returns correct results
- [ ] Verify: Search index size is reasonable

---

## S7: Ad System
- [ ] `AdSlot` component (zero-CLS reserved CSS containers)
- [ ] 7 ad positions: leaderboard (728x90), sidebar (300x250), in-article, mobile anchor (320x50), footer, half-page (300x600), sponsored content
- [ ] Google AdSense script integration (deferred loading)
- [ ] Direct sponsor banner rendering from Payload Ad Units
- [ ] Campaign date logic (show only between start/end dates)
- [ ] Sponsored content article template (with "বিজ্ঞাপন" badge)
- [ ] Ad viewability optimization (lazy load below-fold ads)
- [ ] Verify: Zero CLS from ad containers
- [ ] Verify: Ads load without blocking main content

---

## S8: Live Blog & Interactive Features
- [ ] Live blog template (`/live/[slug]`)
- [ ] Live blog entry cards (timestamp, content, key event badge)
- [ ] "মূল ঘটনাগুলো" key events filter toggle
- [ ] Auto-refresh with "৩টি নতুন আপডেট" toast notification
- [ ] Polls component (question, options, 1-click vote, animated chart results)
- [ ] Daily news quiz page (`/quiz`)
- [ ] Quiz: 5 questions, instant feedback, percentage chart, streak counter
- [ ] Before/after image comparison slider component
- [ ] Infographic block component (embedded within articles)
- [ ] Scrollytelling template (CSS scroll-driven animations)
- [ ] LiveBlogPosting JSON-LD schema
- [ ] Verify: Live blog updates without page refresh
- [ ] Verify: Poll votes persist correctly

---

## S9: Media, Newsletter & Engagement
- [ ] Photo gallery component (fullscreen slideshow, swipe, caption overlay)
- [ ] Video embed component (YouTube, Facebook — lazy loaded)
- [ ] QR-verified photo card generator (auto-generate branded card per article)
- [ ] Photo card verification endpoint (`/verify/[hash]`)
- [ ] Listmonk integration (subscriber form → Listmonk API)
- [ ] Newsletter subscription form component
- [ ] Web Push notification setup (service worker, permission prompt)
- [ ] Segmented push topics (breaking, cricket, politics, traffic/weather)
- [ ] Bookmarks / Save for later (localStorage or authenticated)
- [ ] Social login integration (Facebook OAuth, Google OAuth)
- [ ] Citizen journalism submission form (নাগরিক সংবাদ)
- [ ] Short-form video carousel component ("৩০ সেকেন্ডে খবর")
- [ ] Verify: Newsletter subscription flows end-to-end
- [ ] Verify: Push notifications deliver on Chrome/Firefox

---

## S10: Utility Widgets & Specialized Sections
- [ ] Live cricket floating pill (SSE/fetch, bottom dock, expand to scorecard)
- [ ] AQI ribbon (OpenAQ API, color-coded, health advisory)
- [ ] Weather widget (division-level, API-driven)
- [ ] Prayer times widget (location-aware, district-level, Ramadan sehri/iftar)
- [ ] Currency/remittance rates (SAR, AED, USD, GBP, EUR → BDT)
- [ ] Gold price tracker (per bhori)
- [ ] Commodity price tracker (rice, onion, chicken, oil — TCB data)
- [ ] DSE stock ticker (DSEX index, top gainers/losers)
- [ ] Disaster/cyclone warning banner (signal-coded, safety checklist)
- [ ] Jobs section page (`/jobs`) — government + private circulars
- [ ] Education section page (`/education`) — BCS prep, admission, model tests
- [ ] Expatriate corner (`/expatriate`) — currency, WEWB, airport rules
- [ ] Fact-check section (`/fact-check`) — verdict badges, comparison slider, WhatsApp share
- [ ] "Daily Citizen Utility Hub" modal (aggregates AQI + prayer + currency + cricket)
- [ ] Verify: All API widgets gracefully degrade on failure
- [ ] Verify: Widgets don't block main content rendering

---

## S11: SEO, Feeds & AI Optimization
- [ ] News sitemap (`/news-sitemap.xml`) — 48hr rolling, `<news:news>` namespace
- [ ] Standard sitemap (`/sitemap.xml`)
- [ ] RSS feed — full site (`/rss.xml`) + per-category (`/category/[slug]/rss.xml`)
- [ ] Open Graph meta tags (auto-generated per page)
- [ ] Twitter Card meta tags
- [ ] Auto-generated OG images (article title rendered as 1200x630 social card)
- [ ] Canonical URLs (self-referencing, parameter-stripped)
- [ ] hreflang tag (`bn-BD`)
- [ ] `robots.txt` (allow all including AI bots: GPTBot, PerplexityBot, ClaudeBot, Google-Extended)
- [ ] `llms.txt` (portal structure for AI search bots)
- [ ] Google Publisher Center registration guide (documentation for user)
- [ ] E-E-A-T governance pages:
  - [ ] `/about` (legal entity, ownership, Trade License, TIN)
  - [ ] `/editorial-team` (real names, photos, bios, social links)
  - [ ] `/corrections-policy`
  - [ ] `/fact-checking-policy`
  - [ ] `/contact` (physical address, map embed, phone, email)
  - [ ] `/privacy-policy`
  - [ ] `/terms`
- [ ] Verify: News sitemap validates (W3C)
- [ ] Verify: RSS validates (W3C Feed Validator)
- [ ] Verify: Google Rich Results Test passes for all templates
- [ ] Verify: `llms.txt` accessible at domain root

---

## S12: Deployment, QA & Launch
- [ ] GitHub Actions deploy pipeline (push to main → Astro build → upload to cPanel)
- [ ] cPanel Passenger config for Payload CMS
- [ ] Cloudflare DNS + SSL setup documentation
- [ ] Cloudflare page rules (cache static HTML, bypass admin)
- [ ] Lighthouse audit: mobile performance ≥ 95
- [ ] Lighthouse audit: accessibility ≥ 90
- [ ] Lighthouse audit: SEO ≥ 95
- [ ] Mobile testing at 375px, 390px, 414px widths
- [ ] Bengali font rendering audit (all conjuncts, vowel signs)
- [ ] Dark mode full visual audit
- [ ] Ad slot CLS verification (zero layout shift)
- [ ] Load test simulation (concurrent users)
- [ ] Print view audit
- [ ] Social share debug (Facebook Sharing Debugger, Twitter Card Validator)
- [ ] Cross-browser testing (Chrome, Firefox, Samsung Internet)
- [ ] Verify: GitHub Actions pipeline runs clean end-to-end
- [ ] Verify: Site loads correctly from DianaHost
- [ ] Create launch checklist documentation
