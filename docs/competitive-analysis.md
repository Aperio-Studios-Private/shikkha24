# Competitive Analysis — 15+ News Portals

> Compiled from 4 parallel research subagents (2026-09-11).
> Source conversation: `f20130b8-a34c-4c80-af5c-19e1aa38859c`

---

## Part 1: Prothom Alo Deep-Dive (Bangladesh's #1 Portal)

**Source subagent:** `e4dea9ed-366f-46ff-96c0-b4f729e109c0` (Prothom Alo analyst)

### Executive Summary & Vital Metrics

| Metric | Figure / Detail |
| :--- | :--- |
| **Monthly Visits (Web)** | **~30.4 Million** total monthly visits (Similarweb); Semrush organic search: **~6.2M - 19.8M** |
| **Global & National Rank** | Global Rank: **~2,161**; #1 News & Media domain in Bangladesh |
| **Traffic Split** | Mobile: **~51%**, Desktop: **~49%** (Direct + Organic Search dominate over 70% of acquisition) |
| **Pageviews & Reach** | **260–280 Million** monthly pageviews; **12.5M+** monthly unique users (Prothom Alo Digital) |
| **Social Media Moat** | Facebook: **20M+** followers (one of the largest news media pages globally); YouTube: **5.96M+** subscribers |
| **Core CMS Architecture** | **Quintype Bold CMS** (Headless API-driven publishing platform) |
| **Frontend Framework** | **React / Next.js (SSR)** via Quintype Malibu/Ahead framework on Node.js |
| **Proprietary Typography** | Bespoke typefaces **Shurjo** (18 styles) and **Prokriti** (4 display styles) by Bangla Type Foundry |

### 1. Why They Rank #1 on Google Bangladesh

#### A. Topical Authority & Knowledge Graph Entity
* **The "Bengali De Facto Standard" Entity**: Google's Knowledge Graph recognizes Prothom Alo as the primary canonical authority for news and current affairs in Bangladesh. For almost any news query in Bengali, Google's algorithms treat Prothom Alo as a ground-truth source.
* **Topical Completeness**: Every beat is covered with deep topical clusters — Politics, Economy, Crime, Education, 64 Districts, International, Sports, Science, and Lifestyle. The internal linking structure clusters related news (e.g., tags, topics like `/topic/জাতীয়-সংসদ-নির্বাচন`) passing PageRank seamlessly down to leaf articles.

#### B. Domain Authority & Historical Backlink Moat
* **26+ Year Domain Age**: Founded November 4, 1998, online pioneer since the early 2000s.
* **Global Backlink Profile**: Thousands of high-authority editorial citations from international media (BBC, Reuters, CNN, Al Jazeera, NYT, The Guardian), international bodies (UN, World Bank, Amnesty International), and `.gov.bd` / `.edu` domains.
* **Wikipedia Dominance**: Prothom Alo is cited thousands of times across both the Bengali Wikipedia (bn.wikipedia.org) and English Wikipedia as primary secondary literature, providing immense semantic backlink trust.

#### C. Content Velocity & Freshness (QDF - Query Deserves Freshness)
* **24/7 Continuous Publishing Engine**: An estimated **300–500+ unique articles, reports, and briefs published per day**.
* **Instant QDF Triggering**: Whenever breaking news occurs in Bangladesh, Prothom Alo's newsroom publishes within 60–120 seconds. This triggers Google's QDF algorithm, instantly placing them at the top of SERPs and Google Top Stories.

#### D. Automated Structured Data (Schema.org JSON-LD via Quintype)
Quintype Bold CMS natively injects rich, standardized JSON-LD schema into every story page:
* `NewsArticle`: Includes `headline`, `image` (high-res 1200px+ 16:9), `datePublished`, `dateModified`, `description`, `publisher` (Organization with logo), and `mainEntityOfPage`.
* `Person` (Author): Rich author schema including writer bio, designation, and verified social profiles (enhancing Google EEAT score).
* `LiveBlogPosting`: Injected on breaking event live-blogs (elections, budget, sports matches, political crises), allowing Google to show live timeline badges in SERPs.
* `BreadcrumbList`: Clear category navigation paths indexed by Google.
* `FAQPage` & `VideoObject`: Automatically generated for Q&A interviews, explainer videos, and YouTube embeds.

#### E. Google News, Google Discover & Top Stories
* **Google News Whitelist Priority**: Full RSS/News sitemap integration.
* **Google Discover Engine**: Prothom Alo generates massive mobile traffic from Google Discover. They format hero images with high-resolution 1200px+ landscape banners, emotive headlines, and optimized OpenGraph cards that Google Discover's recommendation system favors.
* **AMP & Google Web Stories**:
  * Quintype's built-in AMP generation ensures ultra-fast mobile loading cached directly on Google's CDN edge.
  * Native Web Stories builder creates tap-through visual cards indexed in Google Discover and dedicated mobile story carousels.

#### F. Branded Search Moat
* Millions of Bangladeshi users bypass search engines by typing branded queries: *"prothom alo"*, *"প্রথম আলো"*, *"আজকের প্রথম আলো"*, *"প্রথম আলো পত্রিকা"*, *"prothom alo live"*, *"prothom alo epaper"*. Google uses these navigational queries as a primary signal of site authority and trustworthiness.

### 2. Complete Feature List

#### A. Navigation & Header Systems
* **Edition Switcher**: Multi-edition picker in the top bar:
  * বাংলাদেশ (Bangladesh Main Edition - Bangla)
  * English Edition (`en.prothomalo.com`)
  * উত্তর আমেরিকা সংস্করণ (North America Edition for US/Canada diaspora)
  * ই-পেপার (e-Paper replica digital edition)
* **Triple Calendar Display**: Shows today's date in Gregorian (English), traditional Bengali calendar (বঙ্গাব্দ), and Islamic Hijri calendar.
* **Sticky Navigation Bar**:
  * Primary categories: সর্বশেষ, বিশেষ সংবাদ, রাজনীতি, বাংলাদেশ, অপরাধ, বিশ্ব, বাণিজ্য, মতামত, খেলা, বিনোদন, চাকরি, জীবনযাপন, প্রযুক্তি.
* **Mega Menu / Hamburger Drawer**: Complete hierarchical directory revealing 50+ subcategories, district drilldowns, special magazines (*Kishor Alo, Bigganchinta*), archive tools, and editorial policies.
* **Site Search**: Live search bar with query autocompletion, date-range filtering, and section filtering.
* **Single Sign-On (SSO) Profile Bar**: Login/Register button powered by Quintype Bridgekeeper, supporting phone number, email, and social login.

#### B. Widgets & Utility Tools
* **Namaz / Prayer Time Widget (নামাজের সময়সূচি)**: Displays upcoming prayer timings based on user division/district.
* **Weather Widget (আবহাওয়া)**: Real-time temperature, condition icon, and city-level forecasts.
* **Stock Market / DSE Widget (শেয়ার বাজার)**: Real-time ticker for Dhaka Stock Exchange (DSEX index, volume, top gainers/losers).
* **Currency Exchange Rate (মুদ্রা বিনিময় হার)**: Daily conversion rates for BDT against USD, EUR, GBP, SAR, AED, MYR.
* **Live Sports / Cricket Scorecard Widget**: Ball-by-ball updates, live commentary, scorecard tabs, and tournament points tables (BPL, ICC tournaments, bilateral series).
* **Online Reader Polls (অনলাইন মতামত জরিপ / ভোট দিন)**: Daily single-question poll with instant percentage results display.
* **Meril-Prothom Alo Voting Platform**: Annual portal allowing millions of public votes for film, TV, and OTT artists.

#### C. Reading & Interactive Features
* **Audio Listen / Text-to-Speech ("শুনুন")**: Built-in voice player allowing readers to listen to the narrated article.
* **Font Size Adjuster**: One-click typography zoom controls (A- / A / A+) for enhanced elderly/accessibility reading.
* **Article Bookmarking / Save for Later**: Personal saved list linked to user account.
* **Live Blog Feed (লাইভ আপডেট)**: Real-time auto-refreshing timeline for ongoing crisis/election coverage with timestamped entries.
* **Reading Progress Bar**: Subtle top progress indicator showing scroll completion percentage.
* **Print Friendly View**: Formatted clean print stylesheet stripping ads and navigation.

#### D. Multimedia Suite
* **Dedicated Video Portal (`video.prothomalo.com`)**: Segmented by Talk Shows, Ground Reports, Explainers, Interviews, and Entertainment.
* **Photo Galleries & Fullscreen Slideshow**: High-resolution image essays with caption overlay and fullscreen carousel view.
* **Google Web Stories Carousel**: 9:16 mobile-friendly visual stories with auto-advancing slides and audio.
* **Podcasts**: Audio journalism programs and editorial interviews available on-site and syndicated to Spotify/Apple Podcasts.
* **Infographics & Data Journalism**: High-impact statistical visuals, maps, and election outcome charts.

#### E. Community & Reader Engagement
* **Nagorik Sangbad (নাগরিক সংবাদ)**: Citizen journalism portal where grassroots contributors submit local news and photos for editorial review.
* **Moderated Comments Section**: Readers can comment, upvote, and reply; filtered through automated and manual moderation tools.
* **Letters to Editor (চিঠিপত্র)**: Reader opinion forum published digitally and in print.
* **Bondhushava Network**: Community integration showcasing activities of Prothom Alo's nationwide youth volunteer clubs.
* **Email Newsletters**: Daily morning briefing, weekly opinion digest, and weekend special editions.

#### F. Social Sharing & Viral Loops
* **Sticky Social Share Bar**: WhatsApp button (primary engagement driver in Bangladesh), Facebook, Messenger, X, LinkedIn, and Native Copy Link.
* **Embedded Social Players**: Direct embedding of Facebook posts, YouTube videos, X threads, and Instagram reels.

### 3. Design Patterns & UI/UX Analysis

#### A. Layout Structure & Grid System
* **12-Column Responsive Grid**: Flexible layout transitioning from 1-column on mobile to 3-column / magazine layout on wide desktop (1280px+).
* **Above-the-Fold Hero Hierarchy**:
  * **Lead Story (প্রধান সংবাদ)**: Massive prominent headline, lead hero image (16:9), and bold excerpt deck.
  * **Flanking Secondary Leads**: 2 to 4 adjacent stories with medium thumbnails.
  * **Latest / Most Read Sidebar (সর্বশেষ / পঠিত)**: Tabbed widget updating constantly to keep readers on the page.
* **Modular Category Cards**: Consistent card component structure:
  * Eyebrow category tag (in brand red or subtle grey)
  * Headline in bold display font
  * Publication timestamp (relative format: "১০ মিনিট আগে")
  * Thumbnail with lazy loading and placeholder blur
* **Infinite Scroll / Continuous Reading**: On article pages, scrolling past the end automatically loads the next recommended story, slashing bounce rates.

#### B. Typography: Custom Bespoke Typefaces
Unlike competitors who rely on standard open fonts (SolaimanLipi, Kalpurush), Prothom Alo commissioned **Bangla Type Foundry** (designed by Jacob Thomas) to engineer exclusive corporate typefaces:
1. **Shurjo Family (সূর্য)**:
   * 18 fonts across 9 weights with Latin script pairing.
   * Open counters, modern geometric stroke modulation, eliminating ink-traps for crystal-clear screen rendering.
   * Used for body copy, subheadlines, navigation, and captions.
2. **Prokriti Family (প্রকৃতি)**:
   * 4 display weights.
   * Condensed, bold, high-contrast display face optimized for punchy, impactful news headlines.
3. **Bengali Typographic Considerations**:
   * Generous line-height (`1.65` to `1.85`) to ensure complex vowel modifiers (হ্রস্ব-ই কার, দীর্ঘ-উ কার, র-ফলা, য-ফলা) never collide or clip across lines.

#### C. Color Palette & Visual Language
* **Primary Brand Red (`#DA1C25` / `#E31B23`)**: Used for the iconic sun logo, live breaking badges, category highlights, and active states.
* **Body Charcoal (`#1F1F1F` / `#222222`)**: Softer than harsh `#000000` to prevent eye strain during extended reading.
* **Card & Section Backgrounds (`#F7F7F8`, `#FFFFFF`)**: Ample whitespace and subtle 1px dividers create a clean, uncluttered Scandinavian-like editorial layout.
* **Breaking News Crimson Alert**: High-visibility banner across the header during national emergencies.

### 4. Unique Differentiators (vs. Competitors)

| Competitor | Competitor Weaknesses / Characteristics | Prothom Alo's Decisive Edge |
| :--- | :--- | :--- |
| **The Daily Star** | English-language only; smaller domestic reach despite being under the same Transcom media group. | #1 Bengali reach; penetrates all demographics from rural upazilas to high-ranking state leadership. |
| **BDNews24** | First online-only portal (2005), but suffered management disputes, stagnant UX, and lack of print legacy. | Combines massive print legacy (top circulation) with cutting-edge headless digital infrastructure. |
| **Dhaka Tribune** | Modern, urban-focused, English-first. Limited national grassroots penetration. | Hyperlocal bureau network in all 64 districts; unmatched breaking news speed. |
| **Jugantor / Kaler Kantho / Samakal** | Print-heavy traditional dailies. Websites suffer from cluttered layouts, slow loading speeds, intrusive popups, and generic fonts. | Bespoke typography (Shurjo/Prokriti), clean visual hierarchy, fast SSR performance, modern headless architecture. |
| **Jagonews24 / Banglanews24 / Dhaka Post** | Digital clickbait-heavy portals. High syndicated volume but lower brand trust and editorial authority. | High journalistic credibility, winner of Ramon Magsaysay Award, 11+ INMA awards, and GNI partner. |

#### Key Intangible Assets:
1. **Youth & Intellectual Ecosystem**: Operating *Kishor Alo* (teen magazine), *Bigganchinta* (science magazine), and the *National Math Olympiad (BdMO)* nurtures generations of loyal readers from childhood.
2. **Grassroots Bondhushava**: Over 100,000 volunteer club members across Bangladesh conducting social and cultural initiatives under the Prothom Alo banner.
3. **Cultural Preeminence**: The *Meril-Prothom Alo Purashkar* is the undisputed cultural equivalent of the Oscars in Bangladesh.
4. **Group Synergies**: Part of Transcom Group with sister entities like *Chorki* (leading Bengali OTT streaming platform), *The Daily Star*, and FMCG/pharma networks.

### 5. Monetization Strategy

#### A. Display & Programmatic Advertising
* **Google Ad Manager (DFP)**: Enterprise-grade ad delivery across desktop, mobile web, and apps.
* **Header Bidding (Prebid.js)**: Maximizes yield across global demand partners and Google Ad Exchange (AdX).
* **Placement Hierarchy**:
  * Top Leaderboard (970x250 billboard or 728x90)
  * In-article mid-content display (responsive fluid units)
  * Right-rail sticky banner (300x250, 300x600 Half Page)
  * Bottom sticky mobile anchor banner

#### B. High-Impact Rich Media (Prothom Alo Digital)
Sold directly to top brands (Telcos: Grameenphone, Robi, Banglalink; Banks/Fintech: bKash, Nagad; FMCG: Unilever, PRAN):
* **Page Takeovers & Roadblocks**: Skinning the homepage and background wallpapers for major launches.
* **Flip Card Ads & Round Ads**: Interactive HTML5 rich media units with custom animations (commanding premium CPMs of 100–250+ BDT).
* **Outstream Video Units**: Autoplay video expanding within news feed articles.

#### C. Native Advertising & Brand Studio
* **Sponsored Articles / Advertorials**: Clear labeling ("স্পনসরড" / "বিজ্ঞাপন") following ethical guidelines while delivering high organic reach.
* **Prochito & Content Solutions**: Prothom Alo's internal creative agency producing branded videos, whitepapers, roundtables, and co-branded digital campaigns.

#### D. Subscription Model (e-Paper & Premium)
* **e-Paper Paywall (`epaper.prothomalo.com`)**: Digital replica of the print paper monetized via recurring subscription:
  * Monthly: **BDT 50** (~\$0.42 USD)
  * 6-Month: **BDT 250**
  * Yearly: **BDT 400** (~\$3.40 USD)
  * International diaspora pricing: **\$1/mo, \$5/6mo, \$8/yr**
  * Frictionless local payments via **bKash, Nagad, cards**.

#### E. Events, Roundtables & Intellectual Properties
* **Roundtable Discussions (গোলটেবিল বৈঠক)**: Policy and business roundtables sponsored by development agencies (UNDP, UNICEF, USAID) and commercial banks.
* **Event Title Sponsorships**: Meril-Prothom Alo Purashkar, Math Olympiad (Dutch-Bangla Bank sponsored), Health Olympiads.

### 6. Technology Stack Details

* **Headless CMS**: **Quintype Bold CMS** (Digital experience platform designed specifically for high-velocity digital publishers).
* **Frontend Layer**: **React.js**, **Next.js**, **Node.js**, **Express**, built on the Quintype Malibu/Ahead SSR framework.
* **User Authentication & SSO**: **Quintype Bridgekeeper** (manages multi-site single sign-on across `prothomalo.com`, `kishoralo.com`, `epaper.prothomalo.com`).
* **CDN & Edge Security**: **Cloudflare Enterprise** (Edge caching, Web Application Firewall, DDoS mitigation, SSL termination).
* **Real-Time Newsroom Analytics**: **Chartbeat** (integrated on-screen monitors in the newsroom tracking real-time concurrents, scroll depth, and headline A/B tests) + **Google Analytics 4 (GA4)** + **Comscore**.
* **Ad Technology**: **Google Publisher Tag (GPT)**, **Google Ad Manager / DFP**, **Prebid.js** (Header bidding), MGID.
* **Push Notifications**: **PushEngage** (web browser push) + **Firebase Cloud Messaging (FCM)** for native apps.
* **Asset & Image Pipeline**: Dynamic image transformation, resizing, and next-gen WebP/AVIF compression hosted via **AWS S3** and **Gumlet CDN**.
* **Fonts**: Proprietary webfonts `Shurjo` and `Prokriti` delivered via optimized WOFF2 font files.

### 7. Content Strategy & Publishing Workflow

#### A. 24/7 Editorial Velocity
* **Continuous Cycle**: Newsdesk operates in 3 shifts 24/7/365. Breaking news desks, night editors, and morning print-to-web synchronizers ensure freshness at all hours.
* **Hyperlocal Bureau Network**: Over **64 district bureaus and upazila correspondents** feed ground-level reporting directly into the central CMS.

#### B. Content Classification & Mix
1. **Hard Breaking News**: Government, politics, law and order, geopolitics, regional administration.
2. **Investigative Journalism**: Special in-depth reports exposing corruption, banking irregularities, healthcare crises, environmental destruction.
3. **Opinion & Editorial (মতামত)**: The most influential op-ed section in the country, featuring economists, civil society leaders, and former diplomats.
4. **Youth & Aspiration**: Campus news, BCS and government job preparation, career counseling, mental health (*Swapno Niye*).
5. **Lifestyle & Pop Culture**: Entertainment gossip, cinema reviews, recipes, fashion, literature (*Sahitya*).

#### C. Multimedia-First Repurposing
* **One Story, Multiple Formats**: A single major story is simultaneously produced as:
  1. A quick text alert (breaking banner + push notification)
  2. A detailed web report with photos
  3. A 60-second video reel / YouTube Short / Facebook Reel
  4. An infographic card for Facebook and Instagram
  5. An in-depth follow-up video report or talk show discussion for YouTube

### 8. Mobile Experience & App Architecture

#### A. Mobile Web & PWA
* **Mobile-First Responsive Layout**: Lightweight CSS, minimal cumulative layout shift (CLS), touch-optimized cards.
* **Bottom Navigation Bar**: Fixed bottom tab bar on mobile browsers giving instant access to: Home (হোম), Latest (সর্বশেষ), Video (ভিডিও), e-Paper (ই-পেপার), Menu Drawer (মেনু).
* **PWA & Offline Service Workers**: Enables background asset caching, push alert registration, and instantaneous second-page transitions.

#### B. Native Mobile Apps (Android & iOS)
* **Separate Bangla & English Apps**: Dedicated apps on Google Play and Apple App Store for both linguistic audiences.
* **Key Native Features**:
  * **Configurable Push Notification Engine**: Breaking news alerts delivered directly to the lockscreen with instant tap-to-open article routing.
  * **Offline Reading**: Articles cached locally for reading without internet connectivity.
  * **Dark Mode**: OLED-optimized dark theme for night reading.
  * **In-App e-Paper Viewer**: Integrated pinch-and-zoom digital print replica viewer.
  * **Font Size & Reading Preferences**: Native slider adjusting type size across all screens.

### Key Strategic Takeaways for Our New Portal

1. **Adopt a Headless SSR Architecture**: Emulate their **React/Next.js + Headless CMS** model to guarantee sub-second LCP.
2. **Commission / License a Distinctive Bengali Typeface**: Crisp Bengali typography with correct line-height is fundamental to perceived quality.
3. **Automate Schema.org Rigorously**: Implement automated JSON-LD schemas (`NewsArticle`, `LiveBlogPosting`, `Author`, `BreadcrumbList`) from day one.
4. **Capitalize on Push Notifications**: Deploy segmented web push notifications with breaking news and topic subscriptions.
5. **Hyperlocal Strategy**: Build dedicated divisional and district sub-portals.
6. **Solve Ad Fatigue**: Prothom Alo's heavy programmatic ad clutter creates user frustration. Offering a cleaner, faster, lower-noise reading experience provides an immediate competitive wedge.

---

## Part 2: Top 8 Bangladeshi News Portals (Excluding Prothom Alo)

**Source subagent:** `64a95848-bb1e-4d72-bd83-154f6c0bdf30` (BD portals competitor analyst)

### Executive Overview & Industry Context
The Bangladeshi digital news ecosystem is divided into three distinct operational archetypes:
1. **Digital-First Pure Plays** (*bdnews24.com*, *Jago News 24*, *Bangla Tribune*): Highly nimble, optimized for breaking news velocity, intent-driven SEO (jobs, utility, viral topics), and modern lightweight UI.
2. **Legacy Broadsheet Powerhouses** (*Jugantor*, *Samakal*, *Kaler Kantho*, *The Daily Ittefaq*): Possess massive brand equity, nationwide district correspondent networks, and high-traffic interactive e-papers with social clipping tools.
3. **English Authority & Editorial Flagship** (*The Daily Star*): The undisputed leader in diplomatic, economic, and policy journalism, setting the benchmark for longform investigative packages, multimedia explainers, and international credibility.

---

### 1. bdnews24.com (Bangladesh's First 24/7 Online Newspaper)

#### Key Features & Reader Engagement
- **Live Coverage / Breaking News Timeline (Liveblog)**: Chronological, real-time updates for high-stakes developing news (elections, court trials, disasters, protests) with auto-refresh and timestamped cards.
- **Bilingual Language Switcher**: Fast 1-click header toggle between Bengali and English versions, often linking directly to corresponding translations of the same story.
- **"Hello" (hello.bdnews24.com)**: Groundbreaking youth and child journalism platform run in partnership with UNICEF, training teen journalists across Bangladesh.
- **"Kidz" Vertical**: Dedicated creative and educational corner for children with science stories, literature, and art.
- **Wire-Service Lead Highlights**: Key bullet points at the top of lead stories for fast mobile skimming.
- **Audio News Capsules**: Short audio news summaries and podcast episodes embedded in articles.

#### Design Approach
- **Layout**: High-density news agency / wire-service grid. Prioritizes informational throughput over whitespace.
- **Color Palette**: Signature bold red (`#b30000`), deep black (`#111111`), cool grays (`#f4f4f4`), and pure white.
- **Typography**: Clean Bengali Unicode web font (SolaimanLipi-style) with strong visual hierarchy; built-in article font-size scaling buttons (`A+ / A-`).

#### SEO Strengths
- **Massive Domain Authority (DA 80+)**: First-mover advantage since 2005. Millions of authoritative backlinks from global outlets.
- **Lightning-Fast Google News Indexation**: New articles index in under 2 minutes.
- **Dual-Language Ranking**: Ranks simultaneously for high-volume Bengali and English Bangladesh-related search queries.

#### Best Feature Worth Copying
> **The Real-Time Breaking News Liveblog Engine** with auto-refresh, chronological micro-updates, key takeaway bullets, and an instant Bengali ⇄ English article toggle.

---

### 2. The Daily Star (thedailystar.net — Top English Portal)

#### Key Features & Reader Engagement
- **"Star Explains" & Multimedia Video Storytelling**: High-production animated and video explainers dissecting economic policy, international geopolitics, climate change, and constitutional questions.
- **"Star Special" Interactive Longform Reads**: Scrollytelling articles featuring embedded data visualizations, full-width photo breaks, infographics, and pull quotes.
- **Text-to-Speech (TTS) Audio Reader**: Embedded audio player allowing readers to listen to the entire article via AI narration.
- **Cultured Youth & Culture Verticals**: "Shout" (premier youth/campus magazine), "Star Lifestyle", "Campus", and "Byte" (technology).
- **Curated Newsletters & Podcasts**: Daily morning briefings and thematic podcast series with distinguished analysts and economists.
- **Author Bio Cards & Series Hubs**: Rich journalist profiles with follower feeds and themed column archives.

#### Design Approach
- **Layout**: Broadsheet sophistication translated to digital. Generous whitespace, asymmetric card layouts, elegant featured-story hero blocks.
- **Color Palette**: Deep maritime navy blue (`#0f233d`), crimson red accent (`#c00`), off-black charcoal text (`#222222`), light gray separation borders.
- **Typography**: Classic serif headlines (Georgia/Merriweather-style) providing an authoritative "newspaper of record" tone, paired with clean sans-serif body copy with comfortable line height (1.7).

#### SEO Strengths
- **Total Dominance of English Bangladesh Search**: Top rankings for almost every query related to Bangladesh's economy, RMG/garments, banking sector, diplomatic affairs.
- **International Authority & Quotation**: Primary source cited by foreign embassies, the World Bank, IMF, international think tanks.
- **Structured Data Mastery**: Extensive Schema.org implementation (`NewsArticle`, `VideoObject`, `LiveBlogPosting`, `Author`, `Organization`).

#### Best Feature Worth Copying
> **"Star Explains" Multimedia Explainer Blocks + Integrated Article TTS Audio Player**, paired with author profile cards that showcase investigative columnists.

---

### 3. Samakal (samakal.com)

#### Key Features
- **"Saradesh" (সারাদেশ) Granular 64-District Filter**: Interactive regional navigation allowing readers to drill down from Division → District → Upazila for hyperlocal news.
- **"Kaler Kheya" (কালের খেয়া) Literary Hub**: Dedicated digital home for one of the most respected cultural and literary supplements in modern Bengali literature.
- **Interactive E-Paper (epaper.samakal.com)**: Comprehensive digital print edition with date archives, zoomable vector pages, and high-resolution clipping.

#### SEO Strengths
- **Hyperlocal District SEO**: High visibility for regional queries across all 64 districts and upazilas.
- **Cultural and Literary Long-Tail Traffic**: Unmatched organic keyword footprint for Bengali poetry, literary criticism, book reviews.

#### Best Feature Worth Copying
> **Hyperlocal 64-District & Upazila Filter Dropdown / Interactive Map** that instantly serves localized news.

---

### 4. Jugantor (jugantor.com)

#### Key Features
- **"Pathok Jorip" (পাঠক জরিপ - Reader Survey / Poll)**: Mass-engagement interactive opinion poll on burning daily political and social controversies, featuring real-time percentage charts and thousands of daily votes.
- **E-Paper 1-Click Social Clipping Tool**: Readers can select and crop any article directly from the e-paper layout, automatically watermarking it with the Jugantor date and masthead, ready for 1-click sharing to Facebook or image download.
- **"Shob Khobor" (সব খবর - All News Live Stream)**: Reverse-chronological minute-by-minute live feed of every article published.

#### SEO Strengths
- **Google Discover Dominance**: Expertly tuned for Google Discover traffic with emotionally compelling, curiosity-driven headlines.
- **Enormous Publishing Volume**: Publishing hundreds of stories daily creates continuous crawler activity.

#### Best Feature Worth Copying
> **"Pathok Jorip" (Interactive Reader Opinion Poll with Live Chart Feedback)** and the **E-Paper Watermarked Clipping & Social Share Tool**.

---

### 5. Kaler Kantho (kalerkantho.com)

#### Key Features
- **Cross-Media Broadcast Synergy**: Seamless integration with sibling TV channels (News24) and sports channels (T-Sports) under the Bashundhara East West Media Group.
- **"Doctor Achen" (ডাক্তার আছেন - Health & Wellness)**: Reader-submitted medical Q&A, telemedicine guides, and verified advice from top physicians.
- **"Porashona" (পড়াশোনা - Education & BCS Prep)**: Model test papers, BCS exam routines, university admission tips, and academic guides.
- **Multi-Edition E-Paper**: Separate editions for Dhaka, countrywide regions, and overseas readers.

#### Best Feature Worth Copying
> **Integrated Live Sports Scorecard Widget with Video Highlights** and the **"Porashona / Education & Career Guide" Section**.

---

### 6. Jago News 24 (jagonews24.com)

#### Key Features
- **"Chakri" (চাকরি - Jobs & Career) Megahub**: The single largest jobs section in Bangladeshi digital media. Comprehensive daily coverage of government circulars, BCS syllabus/model tests, bank recruitment, and private job listings. Generates tens of millions of monthly pageviews independently.
- **"Islam & Life" (ইসলাম ও জীবন)**: Expansive religious lifestyle section with daily prayer times (নামাজের সময়সূচি), Ramadan Sehri/Iftar schedules, Hadith explainers, and Islamic Q&A.
- **"Probash" (প্রবাসী - NRB & Diaspora)**: Dedicated hub for Bangladeshi expatriates in the Middle East, Europe, and North America.
- **"Krishi o Krishok" (কৃষি ও কৃষক - Agriculture & Farming)**: Granular reporting on crop prices, farming innovations, and rural economic developments.

#### SEO Strengths
- **The Undisputed King of Intent-Based Organic Search in Bangladesh**: Dominates high-volume queries such as *"আজকের চাকরির খবর"*, *"সরকারি চাকরির নিয়োগ বিজ্ঞপ্তি"*, *"নামাজের সময়সূচি"*.

#### Best Feature Worth Copying
> **The Dedicated "Chakri" (Jobs & Career Circular) Vertical & Prayer Times Utility Widget**, converting occasional news readers into daily habitual visitors.

---

### 7. Bangla Tribune (banglatribune.com)

#### Key Features
- **"অল্প কথায় সব কথা" (Concise Journalism Approach)**: Prioritizes succinct, fluff-free writing, bulleted takeaways, and fast-read summaries.
- **Built-in Bijoy-to-Unicode / Unicode-to-Bijoy Converter Tool**: Free browser-based typographic conversion tool that attracts thousands of daily visits from journalists, students, and government workers.
- **Urban Civic & Dhaka Lifestyle Coverage**: Exceptional coverage of Dhaka city infrastructure, transport, heritage, food, and modern youth culture.

#### Design Approach
- **Layout**: Elegant digital magazine aesthetic. Generous whitespace, refined padding, distraction-free reading containers.
- **Color Palette**: Sophisticated teal / sea green (`#00897b` / `#00796b`), dark charcoal body text (`#2a2a2a`).
- **Typography**: The gold standard in modern Bengali digital typography. Perfect line-height (1.75+), elegant font weighting.

#### Best Feature Worth Copying
> **The Minimalist Modern Magazine Aesthetic & Reader-First Typography**, paired with **Practical Daily Web Utilities (Bijoy-Unicode Converter Tool)**.

---

### 8. The Daily Ittefaq (ittefaq.com.bd)

#### Key Features
- **Historic Archive & Independence Heritage**: Commemorative historical packages, archives of founding editor Tofazzal Hossain Manik Miah's legendary "Musafir" columns, and retrospectives on the 1971 Liberation War.
- **Dual Language Edition**: Dedicated English portal (en.ittefaq.com.bd) mirroring national developments.
- **Southern Regional Stronghold**: Traditional journalistic dominance across Barishal, Khulna, and southern coastal Bangladesh.

#### Best Feature Worth Copying
> **"On This Day in History / National Archive" Retrospective Feature** and the **High-Trust Legacy Authority Visual Packaging**.

---

### Cross-Portal Comparative Matrix

| Portal | Primary Audience | Typography Rating | Mobile UX | Top SEO Traffic Driver | Monetization Model |
|---|---|---|---|---|---|
| **bdnews24.com** | General / Urban bilingual | 8.5 / 10 | A- | Fast breaking news indexation | Programmatic + Direct telco/bank |
| **The Daily Star** | Diplomatic / Elite / Youth | 9.5 / 10 | A+ | Longform English policy & economy | Premium corporate direct + Sponsored |
| **Samakal** | Intellectual / Regional | 8.0 / 10 | B+ | Hyperlocal 64-district queries | Programmatic + Local business/garments |
| **Jugantor** | Grassroots / Mass-market | 7.5 / 10 | B | Google Discover + Crime/Politics | High-density programmatic + Classifieds |
| **Kaler Kantho** | Sports / General | 8.0 / 10 | B+ | Sports (T-Sports) + Education (BCS) | Conglomerate direct + Video pre-rolls |
| **Jago News 24** | Job seekers / Rural & Urban | 8.5 / 10 | A- | Jobs (চাকরি) + Religious utility | Programmatic + Job listings + FMCG |
| **Bangla Tribune** | Modern urban / Educated | 10 / 10 | A+ | Core Web Vitals + Utility tool (Bijoy) | Clean programmatic + Premium native |
| **Ittefaq** | Bureaucrats / Traditionalists | 8.0 / 10 | B+ | Heritage keywords + Direct traffic | Govt/tender ads + Programmatic |

### Synthesis: The BEST Features Across ALL Portals We Should Copy

#### 1. Daily Habit & Utility Engines (Traffic & Retention Multipliers)
- **The "Chakri" (Jobs & Career) Vertical (from Jago News 24)**
- **Daily Utility Widgets (from Jago News 24 & Bangla Tribune)**: Prayer Times, Unicode ⇄ Bijoy Converter, Live Cricket/Football score, Currency exchange rates & gold prices.

#### 2. Reader Engagement & Interactivity
- **"Pathok Jorip" (Interactive Reader Opinion Poll) (from Jugantor)**
- **E-Paper Smart Clipping & Social Share Tool (from Jugantor & Samakal)**

#### 3. Editorial & Storytelling Innovations
- **Live Coverage / Breaking News Timeline Engine (from bdnews24)**
- **"Explains" Visual Storytelling & Scrollytelling (from The Daily Star)**
- **Text-to-Speech (TTS) "Listen to Article" Player (from The Daily Star)**
- **Hyperlocal 64-District Granular Selector (from Samakal)**

#### 4. Design, Typography & UI/UX (The Anti-Slop Benchmark)
- **The Minimalist Magazine Typography & Whitespace (from Bangla Tribune & The Daily Star)**
- **Responsive reading toolbar** with font resizer, reading progress bar, dark mode toggle, and sticky share buttons.

#### 5. SEO Architecture & Core Web Vitals
- **Sub-directory Authority Structure**: Clean URLs (`/jobs`, `/country/dhaka`, `/opinion`, `/sports`).
- **Comprehensive Schema.org Markup**: Full implementation of `NewsArticle`, `LiveBlogPosting`, `VideoObject`, `BreadcrumbList`, and `Author`.
- **Core Web Vitals Optimization (from Bangla Tribune)**: Zero CLS, lightweight WebP/AVIF images, page load under 1.5s on 4G mobile.

---

## Part 3: Google News SEO Strategy for a New Portal

**Source subagent:** `960ba79e-f777-4937-a9b4-81888db5e2a9` (Google News SEO analyst)

### 1. Google News Publisher Center (2026 Reality)

**Critical distinction in 2026:** Google Publisher Center does NOT grant or guarantee inclusion in Google News or Top Stories. In 2026, inclusion is **100% automated and algorithmic**.

Google Publisher Center (`publishercenter.google.com`) is an **identity, branding, and monetization tool**:
1. **Branding & Visual Assets:** Controls how your logo, publication name, and brand styling appear in the Google News App.
2. **Reader Revenue Manager:** Manages reader contributions, subscriptions, or paywalls natively.
3. **RSS Section Feeds:** Configures category feeds for the Google News app catalog.

#### Step-by-Step Setup:
1. Access with Google account verified as Owner in Google Search Console.
2. Create Publication with exact brand name and Bangladesh as country.
3. Set Primary Language: Bengali (`bn`).
4. Upload **Square Logo:** 512×512 px, 32-bit PNG with transparent background.
5. Upload **Wide Rectangular Logo (Light & Dark Theme):** height 20-40px, max width 400px.
6. Map category feeds via RSS 2.0 / Atom feeds.
7. Allow Worldwide or target Bangladesh + diaspora regions.
8. Submit for review (typically 1-2 weeks).

### 2. Technical SEO for News Sites

#### NewsArticle JSON-LD Requirements
Every article must include:
- `headline` (≤ 110 characters, must match visible `<h1>`)
- `image` (minimum **1200px wide**, minimum **800,000 pixels total area**, provide 16×9, 4×3, and 1×1 ratios)
- `datePublished` and `dateModified` with ISO 8601 + `+06:00` timezone
- `author` with `Person` type, name, jobTitle, url, sameAs social profiles
- `publisher` with `Organization` type and logo
- `isAccessibleForFree: true`
- `speakable` with CSS selectors for headline and summary
- `inLanguage: "bn-BD"`

#### News Sitemap Requirements
- **48-Hour Age Limit**: Only articles published within the last 48 hours
- **1,000 URL Limit** per news sitemap
- `<news:name>` must match Publisher Center brand name exactly
- `<news:language>`: `bn` for Bengali
- No static pages — only individual news articles

#### URL Architecture Recommendation
Use **Category + Unique ID + Short Slug**: e.g., `https://domain.com/category/sub-category/:id/:slug`
- Always enforce lowercase, strip accents, remove trailing slashes
- Provide automated shortlink system for Facebook/WhatsApp sharing to prevent percent-encoding degradation

#### AMP in 2026
**DO NOT IMPLEMENT AMP.** AMP is obsolete for new news portals in 2026. Astro generates pure static HTML faster than AMP.

### 3. Content Velocity

| Portal | Articles/Day |
| :--- | :--- |
| Prothom Alo | 250-350+ |
| Bangladesh Pratidin & Kaler Kantho | 180-260 |
| Jagonews24 & Banglanews24 | 200-300 |
| The Daily Star (English) | 100-150 |

**Minimum for a new general portal: 45-70 articles per day.**

#### Publishing Peak Hours (BST, GMT+6)
1. **07:30–09:30** (Morning Commute)
2. **13:00–14:30** (Lunch Break)
3. **18:30–23:00** (Prime Time Peak — highest traffic)

#### Breaking News Protocol
- **Phase 1 (Flash, 0-5 min):** 100-150 word urgent flash
- **Phase 2 (Expansion, 15-30 min):** Add quotes, context, photos. Update `dateModified`.
- **Phase 3 (Live Updates):** Do NOT create separate URLs. Update the single canonical URL.

### 4. E-E-A-T & Topic Authority

#### Mandatory Transparency Pages
1. **Editorial Masthead** ("সম্পাদকীয় পরিষদ") — real headshots, bios, credentials
2. **Dedicated Author Profile Pages** — Never use anonymous bylines like "অনলাইন ডেস্ক" or "Admin"
3. **About Us** — Legal entity, Trade License, TIN, Ministry of Information registration
4. **Physical Office Address & Map** — verified landline and mobile
5. **Corrections Policy** ("ভুল সংশোধন নীতি")
6. **Fact-Checking & Sourcing Policy** ("তথ্য যাচাই নীতি")

#### Originality
Google tracks who published a story first — applies "Highly Cited" label. Rewriting wire content requires: at least 1 original quote, local context, and custom photography.

### 5. Core Web Vitals Benchmarks

| Metric | Target | News Portal Pitfall | Solution |
| :--- | :--- | :--- | :--- |
| **LCP** | ≤ 1.5s | Heavy hero image, blocking header ads | Preload hero image (`fetchpriority="high"`), WebP/AVIF, Edge caching |
| **INP** | ≤ 100ms | Heavy ad auction scripts locking main thread | `requestIdleCallback()`, defer non-essential trackers |
| **CLS** | ≤ 0.02 | Ad banners loading dynamically | Reserve static CSS height/aspect-ratio on all ad containers |
| **TTFB** | ≤ 200ms | Shared hosting latency | Cloudflare Edge caching / SSG via Astro |

#### Zero-CLS Ad Containers
```css
.ad-leaderboard-container {
  min-height: 90px;
  width: 100%;
  max-width: 728px;
  contain-intrinsic-size: 728px 90px;
  content-visibility: auto;
}
```

#### Bengali Font Optimization
- WOFF2 format, subset to Bengali characters (`U+0980-09FF`) + basic ASCII
- `font-display: swap;` with `size-adjust` and `ascent-override` for fallback matching

### 6. Mobile-First Indexing

**90%+ of BD news readers are on mobile.** Specific rules:
- **Bengali min 17-18px body font** on mobile with `line-height: 1.65`
- **48×48px minimum touch targets** with 8px spacing
- **Total initial page payload under 1.2 MB**
- **Sticky bottom WhatsApp + Facebook share bar**

### 7. Social Signals & the Facebook Flywheel

Bangladesh has **55M+ active Facebook users**. Viral social activity creates indirect SEO:
1. **Google Discover Trigger**: Stories trending on Facebook trigger Discover placement
2. **Branded Search Spikes**: Users search "[Portal Name] + [Topic]" — Google interprets as authority signal
3. **Crawl Acceleration**: High request rates prompt Googlebot to re-crawl every few seconds

#### Social Card Optimization (1200×630 px)
```html
<meta property="og:type" content="article" />
<meta property="og:title" content="জাতীয় সংসদে নতুন বাজেট অধিবেশন শুরু" />
<meta property="og:image" content="https://www.example.com/images/cards/budget-session.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:locale" content="bn_BD" />
```

### 8. Backlink Strategy

1. **Data Journalism & Original Research** — monthly studies on Bangladeshi topics
2. **University Partnerships** — earn `.edu.bd` backlinks
3. **Wikipedia Citations** — publish citation-quality profiles and investigative backgrounders
4. **Startup/Fintech PR Hub** — deep startup profiles that companies link from "Press" pages
5. **Institutional Coverage** — FBCCI, BGMEA, BASIS press conferences

### 9. AI Search Optimization (GEO/AEO)

#### The "Answer Capsule" Pattern
State the core fact in the first sentence — no introductory fluff.

#### "এক নজরে" / Key Takeaways Box
```html
<div class="key-takeaways-box">
  <h3>সংবাদের সারসংক্ষেপ (এক নজরে)</h3>
  <ul>
    <li>২০২৬-২৭ অর্থবছরের জাতীয় বাজেট অধিবেশন শুরু হয়েছে আজ বিকেলে।</li>
    <li>মূল বাজেট প্রস্তাব আগামী বৃহস্পতিবার সংসদে উপস্থাপন করা হবে।</li>
  </ul>
</div>
```

#### `llms.txt` Standard
```text
# দৈনিক বাংলাদেশ সংবাদ
> স্বাধীন ও বস্তুনিষ্ঠ জাতীয় সংবাদ মাধ্যম।
## মূল বিভাগসমূহ
- [জাতীয় সংবাদ](https://www.example.com/category/bangladesh)
- [অর্থনীতি ও বাণিজ্য](https://www.example.com/category/economy)
- [খেলাধুলা](https://www.example.com/category/sports)
```

#### Allow AI Bots in `robots.txt`
```text
User-agent: GPTBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Google-Extended
Allow: /
```

### 10. Top 10 Fatal Mistakes for New Portals

1. Mass copy-pasting ("Churnalism") — triggers Scaled Content Abuse penalties
2. Anonymous / Faceless Newsroom — "অনলাইন ডেস্ক" bylines filtered out
3. No dedicated `news-sitemap.xml`
4. Keeping articles older than 48 hours in news sitemap
5. Unreserved ad units causing CLS failure
6. Cheap shared hosting crashing on viral spikes
7. Changing article URLs without 301 redirects
8. Heavy, unoptimized 400KB+ Bengali font TTFs
9. Missing compliance & transparency pages
10. Low-resolution thumbnails (<1200px) — ineligible for Discover

---

## Part 4: International Portal UX Innovations

**Source subagent:** `69748972-82e1-46c3-950a-655fe4c6cd91` (UX innovation analyst)

> **Note:** The full per-portal breakdown (BBC, Guardian, Al Jazeera, CNN, NYT, NHK, NDTV) was delivered in an earlier session turn that has since been truncated from context. The 10 innovation recommendations below were synthesized from that report and are preserved in full in the master plan. The per-portal findings that survive in session context are summarized here.

### Portals Analyzed
1. **BBC News** — interactive features, accessibility, dark mode, GEL design system, responsive design
2. **The Guardian** — live blogs, reader engagement, open journalism, design excellence
3. **Al Jazeera** — multimedia storytelling, AJ Labs data journalism, video integration, AJ+ short-form
4. **CNN** — breaking news UX, live updates, push notifications, multi-platform alerts
5. **The New York Times** — interactive articles, data visualization, polls, quizzes, daily games strategy
6. **NHK World (Japan)** — multi-language portal approach, disaster warning systems
7. **India Today / NDTV** — South Asian market features, prayer times, weather, stock tickers, commodity prices

### 10 Unique Innovation Recommendations (synthesized from the above)

1. **QR-Verified Social News Photo Card Generator** — Kills fake news photo cards on WhatsApp/Facebook
2. **Data-Saver / Ultra-Lite Mode (sub-30KB)** — Game-changer for rural readers on prepaid MB packs
3. **Real-Time AQI & Health Alert Ribbon** — No BD portal shows this
4. **Live Cricket Floating Score Pill** — Keeps cricket fans on portal vs bouncing to Cricinfo
5. **Expatriate Remittance & Currency Radar** — Captures 10M+ diaspora audience
6. **District-First Local News & Flood Alert System** — Personalized homepage with FFWC flood data
7. **Bangla AI Voice Reader & Audio Briefings** — High-quality TTS + daily audio bulletin
8. **Story Timeline & Context Recap Drawer** — Nobody does this in BD
9. **Daily Bangla News Quiz & BCS Prep Hub** — Captures millions of exam candidates as daily visitors
10. **Rumor Buster & Fact-Check Radar with WhatsApp sharing** — Viral trust mechanism

---

*Report compiled 2026-09-11. Source subagent transcripts archived in Antigravity brain.*
