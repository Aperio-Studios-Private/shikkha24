# **Comprehensive Architecture & Implementation Specification: Scalable News Portal (plan.md)**

This document serves as the single source of truth (plan.md) to be placed at the project root and fed into multi-agent AI harnesses (Antigravity IDE, Claude, DeepSeek). It specifies the end-to-end technical roadmap, data schemas, frontend/backend architecture, and resource deployment strategies tailored for cost-effective execution on Diana Host shared cPanel hosting with zero recurring software licensing expenses.

## **1\. Project Vision & Operational Constraints**

> * **Budget Boundary:** Absolute zero recurring software/platform subscription fees. Expenditures are strictly confined to Domain registration and Diana Host hosting package (starting on shared cPanel with 2GB storage/RAM thresholds).  
> * **Future Scalability:** Fully decoupled headless architecture permitting backend or database migration to dedicated VPS or managed cloud clusters without touching or rewriting frontend presentation code.  
> * **Performance & SEO Benchmark:** Perfect Core Web Vitals (sub-second Largest Contentful Paint), zero layout shifts, automated JSON-LD news schemas, and 100% crawling indexability.

## **2\. Multi-Agent AI Harness & Orchestration Workflow**

The implementation workflow is split across specialized multi-agent roles executing sequentially or collaboratively within leading AI harnesses such as Antigravity IDE, Claude, and DeepSeek.

| Agent Persona | Primary Engine / Harness | Responsibilities & Deliverables &nbsp; |
| :---- | :---- | :---- |
| **System Architect Agent** | Claude / Antigravity IDE | Generates directory skeletons, defines API contracts, orchestrates data pipelines, and ensures architectural conformance. |
| **Backend & Database Agent** | DeepSeek / Claude | Configures Strapi headless CMS, content models, lifecycle hooks, role-based security, SQLite/MySQL database optimizations, and REST/GraphQL schemas. |
| **Frontend & SEO Specialist Agent** | Antigravity IDE / Claude | Builds Astro SSR/SSG templates, Tailwind CSS responsive layouts, zero-JS island components, NewsArticle schema generators, and RSS/Sitemap feeds. |
| **Monetization & Ads Agent** | DeepSeek / Antigravity | Develops flexible ad injection modules (header banner, in-feed, sticky sidebar, interstitial), viewability scripts, and dynamic fallback ad components. |
| **DevOps & QA Reviewer Agent** | Claude / Antigravity IDE | Conducts code reviews, lints security holes, writes cPanel Node.js deployment automation, sets up Cloudflare caching rules, and monitors memory boundaries. |

## **3\. Technical Architecture Overview**

> * **Frontend Layer:** Astro (v5+). Renders 100% static HTML by default. Uses Astro Islands only for interactive widgets (breaking news tickers, live polls, comment widgets).  
> * **Backend Layer:** Self-Hosted Strapi Community Edition (Node.js). Completely free, open-source, and hosted without monthly subscription limits.  
> * **Database Layer:** SQLite initially (embedded, zero-configuration, near-zero memory footprint for shared hosting), easily swappable to cPanel MySQL/MariaDB or remote PostgreSQL upon scale.  
> * **Styling & UI:** Tailwind CSS with custom typography plugins optimized for high-readability Bengali and English newspaper typography.

## **4\. Strapi Backend Data Schemas & Content Architecture**

### **4.1 Collection: Articles (api::article.article)**

| Field Name | Type | Configuration & Details &nbsp; |
| :---- | :---- | :---- |
| title | String | Required, indexed, max length 255 chars. |
| slug | UID | Generated automatically from title, unique index. |
| excerpt | Text | Summary lead paragraph for home feeds and meta descriptions. |
| content | Rich Text / Blocks | Full article body supporting structured embeds, quotes, and images. |
| featured\_image | Media (Single) | WebP optimized banner image with caption and alt text attributes. |
| category | Relation | Many-to-One with Categories (e.g., Politics, Business, Sports). |
| author | Relation | Many-to-One with Staff Profiles. |
| is\_breaking | Boolean | Flag to push headline to top urgent breaking ticker bar. |
| published\_at | DateTime | Editorial publication timestamp. |

### **4.2 Collection: Ad Units (api::ad-unit.ad-unit)**

| Field Name | Type | Configuration & Details &nbsp; |
| :---- | :---- | :---- |
| slot\_position | Enumeration | top\_leaderboard, sidebar\_sticky, in\_article\_1, footer\_banner |
| ad\_type | Enumeration | custom\_banner (Direct Client), ad\_network\_script (Google AdSense) |
| banner\_image | Media | Direct graphic asset for sponsored partnerships. |
| target\_url | String | Destination click link with UTM tracking parameters. |
| raw\_script | Text | HTML/JS code block if served from third-party networks. |
| is\_active | Boolean | Instant toggle switch to enable/disable campaigns without redeploying. |

### **4.3 Role-Based Access Control (RBAC) Matrix**

> * **Super Admin:** Unrestricted system settings, API tokens, webhook setups, user accounts, and ad placements.  
> * **Editor-in-Chief / Senior Editor:** Can create, edit, approve, and publish all stories across all categories. Controls article placement flags (Breaking News, Lead Story).  
> * **Reporter / Staff Writer:** Can create and edit only their assigned drafts. No permission to publish directly to live site or alter layout configs.  
> * **Ad Manager:** Granted permissions solely to the Ad Units collection to update client banners and schedules without editorial interference.

## **5\. Frontend Architecture (Astro Project Structure)**

The Astro frontend codebase is organized for modular maintainability and rapid page generation:

news-portal-frontend/  
├── public/  
│   ├── favicon.svg  
│   └── robots.txt  
├── src/  
│   ├── components/  
│   │   ├── Header.astro  
│   │   ├── NavigationBar.astro  
│   │   ├── BreakingNewsTicker.astro  
│   │   ├── LeadStoryCard.astro  
│   │   ├── ArticleGrid.astro  
│   │   ├── AdSlot.astro  
│   │   ├── SeoHead.astro  
│   │   └── Footer.astro  
│   ├── layouts/  
│   │   └── BaseLayout.astro  
│   ├── lib/  
│   │   ├── strapi.js          // Fetch wrapper with error fallbacks  
│   │   └── seoHelper.js       // Schema.org NewsArticle JSON-LD builder  
│   ├── pages/  
│   │   ├── index.astro        // Portal Homepage  
│   │   ├── category/  
│   │   │   └── \[slug\].astro   // Category page listing  
│   │   ├── news/  
│   │   │   └── \[slug\].astro   // Dedicated article reading view  
│   │   ├── rss.xml.js         // Automated RSS publication feed  
│   │   └── sitemap.xml.js     // Dynamic XML Sitemap for Google  
│   └── styles/  
│       └── global.css  
├── astro.config.mjs  
├── package.json  
└── tailwind.config.cjs

## **6\. Hosting Strategy & Diana Host Resource Optimization**

Operating a modern headless stack on a 2GB cPanel hosting tier requires deliberate engineering to ensure stability, prevent out-of-memory errors, and handle traffic spikes smoothly.

| Layer / Component | Configuration for 2GB Shared Hosting | Optimization Objective &nbsp; |
| :---- | :---- | :---- |
| **Strapi CMS** | Run via cPanel *Setup Node.js App* (Phusion Passenger). Run in production mode with memory limit clamped to \--max-old-space-size=512. | Prevents Strapi administrative tasks from consuming all cPanel memory limits. |
| **Astro Frontend** | Pre-build to static assets (output: 'static') served directly from Apache/LiteSpeed public\_html. | Zero Node.js server overhead for public readers. Millions of hits handled via simple web server files. |
| **Image Handling** | Enable Strapi WebP automatic image optimization and responsive break sizes on media upload. | Drastically cuts bandwidth consumption and ensures instant loading on mobile 4G/3G connections. |
| **CDN & Caching** | Connect domain through Cloudflare Free Tier with edge HTML caching rules enabled. | Shields Diana Host server during viral traffic events; absorbs DDoS and bot traffic for free. |

## **7\. Multi-Agent Step-by-Step Prompting Playbook**

Feed the following discrete prompts to your multi-agent AI harnesses in Antigravity IDE, Claude, and DeepSeek to build out the project progressively:

> 1. **Prompt 1 (System Architect):** *"Read plan.md. Initialize the root project monorepo structure containing backend/ (Strapi 4/5) and frontend/ (Astro). Generate the base configuration files, scripts, and environment variable skeletons."*  
> 2. **Prompt 2 (Backend Agent):** *"In backend/, implement the Strapi schema schemas for Articles, Categories, Authors, and Ad Units as outlined in Section 4 of plan.md. Configure RBAC roles and enable public read permissions for published entities."*  
> 3. **Prompt 3 (Frontend Agent):** *"In frontend/, setup Astro with Tailwind CSS. Implement dynamic routing for /news/\[slug\] and /category/\[slug\] that fetches from the Strapi REST API. Ensure all article pages generate Google News compatible JSON-LD schemas."*  
> 4. **Prompt 4 (Monetization Agent):** *"Implement the AdSlot.astro component capable of rendering either custom affiliate graphic banners with click tracking or external ad network snippets dynamically based on active Strapi ad settings."*  
> 5. **Prompt 5 (DevOps & QA Agent):** *"Audit the entire repository against the Diana Host 2GB constraint. Provide the exact cPanel production deployment checklist, including LiteSpeed .htaccess caching headers, Node.js passenger configs, and automated static generation scripts."*