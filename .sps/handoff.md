# SPS Handoff

## Current Phase
- **Status:** APPROVED — Plan approved, task checklist created, ready to build
- **Last Activity:** 2026-09-11T20:42+06:00
- **Next Action:** Begin Section S0 (Foundation & Toolchain) on user's "go" signal
- **User instruction:** "proceed but do not build yet" — all prep done, awaiting build command

## Completed
1. ✅ Discovery round 1 (project identity, language, type, team, features, monetization, design, hosting, timeline)
2. ✅ Discovery round 2 (branding, colors, categories, editorial workflow, social, mobile-first, mobile apps, traffic)
3. ✅ Discovery round 3 (content migration, hosting flexibility, typography, CDN)
4. ✅ Stack research (Astro 7, Payload CMS 3, Tailwind 4.3, TypeScript 7, Node 24 — all verified Sep 2026)
5. ✅ Competitive analysis (15+ portals: Prothom Alo, bdnews24, Daily Star, Samakal, Jugantor, Kaler Kantho, Jago News, Bangla Tribune, Ittefaq + BBC, Guardian, Al Jazeera, CNN, NYT, NHK, NDTV)
6. ✅ Feature audit (22 missing features found, 10 unique innovations designed)
7. ✅ CMS critical finding (Strapi CE missing newsroom features → switched to Payload CMS 3)
8. ✅ Google News SEO strategy researched
9. ✅ SPS memory bootstrapped (agent.md, profile.md, handoff.md)
10. ✅ Root mirrors created (GEMINI.md, AGENTS.md)
11. ✅ Implementation plan written, revised (v2 with verified versions, v3 master plan with competitive intel)
12. ✅ Plan APPROVED by user (2026-09-11T20:41+06:00)
13. ✅ Plan stamped as approved in .sps/plan.md
14. ✅ Profile updated with all approved decisions
15. ✅ Task checklist created (task.md)

## Key Decisions Made
- Stack: Astro 7.3 + Payload CMS 3 + SQLite → PostgreSQL (Strapi rejected)
- CMS: Payload CMS 3 (free versioning, workflows, scheduled publish, field-level ACL)
- Design: Prothom Alo layout + Bangla Tribune typography + BBC dark mode + Guardian live blog
- Language: Bengali-only UI (no English toggle)
- Comments: Custom Payload-based (Facebook/Google social login)
- Categories: Dynamic + subcategories, fully admin-editable
- Newsletter: Listmonk 6.2 (self-hosted)
- CI/CD: GitHub Actions (automated build + deploy to cPanel)
- Hosting: DianaHost PNR 3GB SSD (৳6,999/year)
- CDN: Cloudflare free tier
- Typography: Hind Siliguri (headlines) + Noto Sans Bengali (body) + Inter (English)
- Features: ALL 87+ features on Day 1 (no phasing)

## Pending
- [ ] Portal name decision
- [ ] Logo creation
- [ ] Domain purchase
- [ ] DianaHost plan purchase
- [ ] Build S0 → S12 (all sections)
