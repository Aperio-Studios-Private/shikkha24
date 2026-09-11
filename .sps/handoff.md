# SPS Handoff

## Current Phase
- **Status:** PRE-BUILD — docs audit complete; agent rules active (13 rules + Antigravity/Gemini hardening); all planning artifacts exported; awaiting user "go" for S0
- **Last Activity:** 2026-09-11T22:20+06:00
- **Next Action:** on user's "go" signal — build S0 (Foundation & Toolchain), one section at a time with approval gates
- **User instruction (latest):** "add rule: if I ask to add/modify anything not covered in the docs, agents must update the docs first to keep build ↔ plan consistent; learn Gemini models & Antigravity known problems and rewrite GEMINI.md to avoid those mistakes — do not start building yet"

## Completed
1. ✅ Discovery round 1 (project identity, language, type, team, features, monetization, design, hosting, timeline)
2. ✅ Discovery round 2 (branding, colors, categories, editorial workflow, social, mobile-first, mobile apps, traffic)
3. ✅ Discovery round 3 (content migration, hosting flexibility, typography, CDN)
4. ✅ Stack research (Astro 7, Payload CMS 3, Tailwind 4.3, TypeScript 7, Node 24 — re-verified against live registries 2026-09-11)
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
15. ✅ Task checklist created — **recreated as `.sps/task.md` during 2026-09-11 docs audit** (the original file was never written to disk)
16. ✅ Docs audit of all files — problems found & fixed (2026-09-11)
17. ✅ Stack versions verified against live registries — all matched; Next.js row corrected (Payload 3.89.0 supports Next 15.x AND 16.x)
18. ✅ Mandatory agent rules codified in AGENTS.md + GEMINI.md (synced mirrors): readable commented code, section-by-section approvals, zero assumptions, immediate commits, budget guard, performance gates
19. ✅ Root initial plan doc (Strapi-based) deleted — user-approved; `.sps/plan.md` is the single source of truth (original preserved in git baseline commit)
20. ✅ Newsletter fallback redefined per user: self-built Payload newsletter via DianaHost cPanel SMTP → Oracle Cloud Always Free VPS; paid & limited free-tier SaaS rejected
21. ✅ Git repo initialized — baseline + audit commits; immediate-commit rule active
22. ✅ Antigravity export prompt created (`.sps/antigravity-export-prompt.md`)
23. ✅ README.md created
24. ✅ Artifacts exported from Antigravity to docs/ (master plan, competitive analysis, stack research, original checklist)
25. ✅ Agent rule 13 (docs consistency / plan ↔ build parity) added to both mirrors; GEMINI.md rewritten with Antigravity/Gemini hardening grounded in documented failure modes (Antigravity drive-wipe Dec 2025; PromptArmor prompt-injection Nov 2025; model/quota "bait and switch" 2026; Gemini CLI issues #15037, #7498, #13677, #6054, #7223); mirrors kept in sync
26. ✅ All four artifacts verified in repo: `docs/master-plan.md` (25.9 KB, 397 lines — 87 numbered features, 10 innovations; heading says "70+" but rows run to 87, export kept verbatim), `docs/competitive-analysis.md` (46.8 KB), `docs/stack-research.md` (11.1 KB), `docs/task-checklist-original.md` (14.8 KB) — **S1 entry gate satisfied**; original checklist kept for reconciliation only (`.sps/task.md` remains operative)

## Key Decisions Made
- Stack: Astro 7.3 + Payload CMS 3 + SQLite → PostgreSQL (Strapi rejected)
- CMS: Payload CMS 3 (free versioning, workflows, scheduled publish, field-level ACL)
- Design: Prothom Alo layout + Bangla Tribune typography + BBC dark mode + Guardian live blog
- Language: Bengali-only UI (no English toggle)
- Comments: Custom Payload-based (Facebook/Google social login)
- Categories: Dynamic + subcategories, fully admin-editable
- Newsletter: Listmonk 6.2 (self-hosted); fallback: self-built cPanel SMTP → Oracle Always Free VPS
- Third-party policy: no paid services, no limited free-tier SaaS — self-hosted/self-built preferred
- CI/CD: GitHub Actions (automated build + deploy to cPanel)
- Hosting: DianaHost PNR 3GB SSD (৳6,999/year)
- CDN: Cloudflare free tier
- Typography: Hind Siliguri (headlines) + Noto Sans Bengali (body) + Inter (English)
- Features: ALL 87+ features on Day 1 (no phasing) — performance budget enforced per feature
- Workflow: section-by-section approval gates; zero assumptions; immediate commits; docs consistency (docs updated first when scope changes)
- Agent rules: mandatory, codified in AGENTS.md / GEMINI.md (13 rules + Antigravity/Gemini hardening in GEMINI.md only)

## Pending
- [ ] Portal name decision
- [ ] Logo creation
- [ ] Domain purchase
- [ ] DianaHost plan purchase
- [ ] Build S0 → S12 (one section at a time, approval-gated)
