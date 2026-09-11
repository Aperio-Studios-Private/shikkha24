# SPS Handoff

## Current Phase
- **Status:** PRE-BUILD — audit remediated; **education scope fully re-planned and approved**. S1 entry gate is now **SATISFIED**; the only remaining blocker is the publishing-velocity / headcount decision
- **Last Activity:** 2026-09-11T23:50+06:00
- **Next Action:** owner decision on publishing velocity (`docs/education-feature-inventory.md` §7). Then S0/S1 may proceed on the owner's "go", subject to the S0 exit gates in `.sps/plan.md`
- **User instruction (latest):** "which is the best practice chose that" (delegated the category tree and the new-feature set to the agent) + "keep" weather/prayer + BCS/job content in scope + "i dont understand the question" (velocity) — see item 37

## Completed
1. ✅ Discovery round 1 (project identity, language, type, team, features, monetization, design, hosting, timeline)
2. ✅ Discovery round 2 (branding, colors, categories, editorial workflow, social, mobile-first, mobile apps, traffic)
3. ✅ Discovery round 3 (content migration, hosting flexibility, typography, CDN)
4. ✅ Stack research (Astro 7, Payload CMS 3, Tailwind 4.3, TypeScript 7, Node 24 — re-verified against live registries 2026-09-11)
5. ✅ Competitive analysis (15+ portals: Prothom Alo, bdnews24, Daily Star, Samakal, Jugantor, Kaler Kantho, Jago News, Bangla Tribune, Ittefaq + BBC, Guardian, Al Jazeera, CNN, NYT, NHK, NDTV) — **now obsolete for this scope, see item 31**
6. ✅ Feature audit (22 missing features found, 10 unique innovations designed) — **now obsolete for this scope, see item 31**
7. ✅ CMS critical finding (Strapi CE missing newsroom features → switched to Payload CMS 3)
8. ✅ Google News SEO strategy researched
9. ✅ SPS memory bootstrapped (agent.md, profile.md, handoff.md)
10. ✅ Root mirrors created (GEMINI.md, AGENTS.md) — **now three mirrors: AGENTS.md, GEMINI.md, CLAUDE.md (item 33)**
11. ✅ Implementation plan written, revised (v2 with verified versions, v3 master plan with competitive intel)
12. ✅ Plan APPROVED by user (2026-09-11T20:41+06:00)
13. ✅ Plan stamped as approved in .sps/plan.md
14. ✅ Profile updated with all approved decisions
15. ✅ Task checklist created — **recreated as `.sps/task.md` during 2026-09-11 docs audit** (the original file was never written to disk)
16. ✅ Docs audit of all files — problems found & fixed (2026-09-11)
17. ✅ Stack versions verified against live registries — all matched. ⚠️ **CORRECTION 2026-09-11 (third-party audit):** this item previously claimed the Next.js row was corrected to "Next 15.x AND 16.x". That was wrong — the actual `@payloadcms/next@3.89.0` peer range is `>=15.2.9 <15.3.0 || >=15.3.9 <15.4.0 || >=15.4.11 <15.5.0 || >=16.2.6 <17.0.0`. Now pinned to **Next 16.2.6+**.
18. ✅ Mandatory agent rules codified in AGENTS.md + GEMINI.md (synced mirrors): readable commented code, section-by-section approvals, zero assumptions, immediate commits, budget guard, performance gates — **now three mirrors, and rules 4, 7 and 9 were amended by the audit (item 33)**
19. ⚠️ **CORRECTED 2026-09-11 (third-party audit):** this item previously claimed the Strapi-based root plan was "deleted — user-approved". **It had never been deleted.** The file was still tracked in the repo root and described itself as "the single source of truth". It has now **actually been deleted** (owner-approved 2026-09-11); the original is preserved in git history at commit `acfb128`.
20. ⚠️ **SUPERSEDED 2026-09-11:** this item defined the newsletter fallback as "self-built Payload newsletter via DianaHost cPanel SMTP → Oracle Cloud Always Free VPS". **Oracle Cloud is not usable** — it requires a credit card at signup, which the owner does not have. New decision: self-built Payload subscriber list + campaign module, delivery via a free-tier ESP API; cPanel SMTP retained only as a low-volume fallback. See item 32.
21. ✅ Git repo initialized — baseline + audit commits; immediate-commit rule active
22. ✅ Antigravity export prompt created (`.sps/antigravity-export-prompt.md`)
23. ✅ README.md created
24. ✅ Artifacts exported from Antigravity to docs/ (master plan, competitive analysis, stack research, original checklist)
25. ✅ Agent rule 13 (docs consistency / plan ↔ build parity) added to both mirrors; GEMINI.md rewritten with Antigravity/Gemini hardening grounded in documented failure modes (Antigravity drive-wipe Dec 2025; PromptArmor prompt-injection Nov 2025; model/quota "bait and switch" 2026; Gemini CLI issues #15037, #7498, #13677, #6054, #7223); mirrors kept in sync — **hardening renumbered H1–H14 by the audit so it can never be confused with rules 1–13 (item 33)**
26. ✅ All four artifacts verified in repo: `docs/master-plan.md` (25.9 KB, 397 lines — 87 numbered features, 10 innovations; heading says "70+" but rows run to 87), `docs/competitive-analysis.md` (46.8 KB), `docs/stack-research.md` (11.1 KB), `docs/task-checklist-original.md` (14.8 KB). ⚠️ **CORRECTION 2026-09-11:** this item claimed the **S1 entry gate was satisfied**. It is **no longer satisfied** — the inventory is a general-news inventory and the portal is an education portal (item 31).
27. ✅ Community-research round on Antigravity/Gemini failure modes (HN launch thread 45967814, drive-wipe thread 46103532, gemini-cli issues) — GEMINI.md hardening expanded 9 → 14 countermeasures with community evidence: edits reported but never applied (#25783) + replace-in-file corruption (HN), guessed deletions with false compliance claims (#26856), fabricated user prompts (#29157); community mitigations adopted: sandbox-aware behavior, commit-before-risky-operations
28. ✅ Third-party audit prompt created (`.sps/third-party-audit-prompt.md`)
29. ✅ `/sps` v4.0.0 + `/sps-cms` v2.3.0 skills installed into **WorkBuddy AI** (`~/.workbuddy-ai/skills/`) from source `~/.sps/src/Shahid-Personal-SkillSet/skills/` — 60 + 56 files, byte-identical to source (`diff -rq` clean), scripts executable; security audit passed. WorkBuddy was not in the upstream installer's `SYNC_PATHS`, so this was a manual faithful copy; re-sync command recorded below.
30. ✅ **Independent third-party audit executed** (2026-09-11) — full read-only adversarial review of all 15 documents, live-registry re-verification of every pinned version, and `git log --stat` reconciliation against this handoff. Result: **`not-ready`**, 3 Critical / 5 High / 17 Medium / 8 Low findings. Report at `docs/audit-third-party.md` (commit `46040a8`). Notable: all ten pinned versions matched the live registries exactly, but three documents contained a false claim (item 19), the storage plan could not hold the stack, and the newsletter fallback was non-functional.
31. ✅ **Scope amended to an education portal** (owner, 2026-09-11) — domain `shikkha24.com` confirmed; owner's positioning: "🎓 Education News | Scholarship | Admission | University | Higher Study / 🌍 দেশ-বিদেশের শিক্ষার সর্বশেষ খবর ও সুযোগ / 📚 শিক্ষার খবর, সুযোগ ও সম্ভাবনা—এক ঠিকানায়।" `docs/master-plan.md` and `docs/competitive-analysis.md` are now **reference-only**; a new education feature inventory, category tree and competitor set are required and cannot be produced without a discovery round.
32. ✅ **Audit remediation applied** (2026-09-11) — hosting/storage architecture rewritten for the purchased **DianaHost PNR 2 GB** plan (Cloudflare Pages frontend + Cloudflare R2 media + slim CI-built Payload); newsletter path replaced (Oracle rejected); Node 24 LTS claim corrected; SQLite WAL gate moved S12 → S0; four missing CMS collections restored; accessibility and initial-payload targets added; URL architecture decided; data sources documented; CI-minutes constraint documented.
33. ✅ **Agent rules amended and a third mirror added** — `CLAUDE.md` created; rules 1–13 verified byte-identical across all three files (4,283 bytes each); rule 4 gained a read-only/audit carve-out; rule 7 gained the no-international-card hard constraint; rule 9 gained page-level wording, an accessibility target and the S12-only TTFB gate; GEMINI.md hardening renumbered H1–H14.
34. ✅ New documents created: `docs/data-sources.md` (per-widget provider, free-tier terms, rate limit, fallback), `.sps/content-model.md`, `.sps/mistakes.md`, `.sps/lock.json` — ⚠️ correction: `.sps/lock.json` was **deliberately NOT created**; the `sps` skill references removing it but defines no schema (see `.sps/mistakes.md`).
35. ✅ **Education competitor landscape researched** (2026-09-11) — `docs/education-competitors.md`. Five groups mapped with URLs: dedicated education portals (Dainik Shiksha, Shiksha Sangbad — the direct competitors), education sections of general portals, official government portals (educationboardresults.gov.bd, xiclassadmission.gov.bd), third-party SEO aggregators (xiadmission.bd, xiclass.bd, eduboardresults.bd, sscresult.govt.bd), and exam-prep platforms (bcsstudy.com, xam.bd, bdjobprep.com). Key finding: the aggregators rank on the highest-intent queries with slow, ad-heavy pages — the same "faster, cleaner, zero-CLS" wedge the original research identified against Prothom Alo, applied to a market with much weaker incumbents.
36. ✅ **Education feature inventory drafted** (2026-09-11) — `docs/education-feature-inventory.md`. Built by reclassifying the original 87 approved features into retained-unchanged / re-scoped / descoped, plus 12 new education features marked `[NEW]`. Nothing was invented.
37. ✅ **Education feature inventory APPROVED** (2026-09-11) — owner delegated the two structural choices to the agent and answered three directly:
   - **Category tree: 8 categories + a cross-cutting level filter.** The agent rejected splitting out স্কুল-কলেজ because it is an audience segment, not a topic — as a top-level category it would overlap শিক্ষা সংবাদ, ভর্তি and পরীক্ষা ও ফলাফল simultaneously and split SEO authority. Level (প্রাথমিক → স্নাতকোত্তর) and District become filter axes instead.
   - **New features: all 10 for Day 1** (12 proposed; N2+N9 merged into "Academic calendar & deadlines", N3+N7 merged into "Results & merit lists hub" to stop the portal competing with itself for the same query). Two ship with a curated starter dataset rather than empty: institution directory, study-abroad guides (8 destinations).
   - **Weather + prayer times: retained** as light header utilities (server-fetched, cached, deferred, zero CLS).
   - **BCS / job-circular content: in scope** — matches Dainik Shiksha's own positioning and is a proven BD traffic engine.
   - **Publishing velocity: still open** — the agent explained in plain language that 45–70/day ÷ 5 staff = 9–14 articles per person per day (3–5× a normal reporter's output), that the plan's own desk breakdown contradicts the target (42–56 vs 45–70), and that education publishing is spiky rather than flat. Recommended a **baseline 15–20/day + burst to 40+ on result/admission days** model; the alternative is hiring to 15–23 editorial staff.
   - **Downstream effect:** S1, S3, S9 and S10 are now fully re-scoped in `.sps/task.md`; `.sps/content-model.md` gained 8 education collections/taxonomies; the S1 entry gate is **satisfied**.

## Key Decisions Made
- **Portal type: education portal** (2026-09-11) — domain `shikkha24.com`; general-news scope retired
- Stack: Astro 7.3 + Payload CMS 3 + SQLite → PostgreSQL (Strapi rejected)
- **Next.js pinned to 16.2.6+** (corrected by the audit)
- CMS: Payload CMS 3 (free versioning, workflows, scheduled publish, field-level ACL)
- Design: Prothom Alo layout + Bangla Tribune typography + BBC dark mode + Guardian live blog
- Language: Bengali-only UI (no English toggle)
- Comments: Custom Payload-based (Facebook/Google social login)
- Categories: Dynamic + subcategories, fully admin-editable (education tree proposed, pending approval)
- **Newsletter: self-built Payload subscriber list + campaign module; delivery via free-tier ESP API; cPanel SMTP as low-volume fallback** (Listmonk and Oracle both rejected)
- **Third-party policy: no paid services at all — the owner has no international card.** Any service requiring a card at signup is unusable
- CI/CD: GitHub Actions, with **rebuilds debounced/batched** to stay inside the 2,000 min/month private-repo quota
- **Hosting: DianaHost PNR 2 GB SSD NVMe (purchased, ~$47/year) + Cloudflare Pages (frontend) + Cloudflare R2 (media)**
- CDN: Cloudflare free tier
- Typography: Hind Siliguri (headlines) + Noto Sans Bengali (body) + Inter (English)
- **Audio reader: Browser Web Speech API; the twice-daily audio bulletin is descoped**
- **Utility widgets: free public APIs only; descope anything with no free source**
- **Content velocity: 45–70 articles/day retained, with hiring as a launch prerequisite**
- Features: ALL features on Day 1 (no phasing) — performance budget enforced **per page template**, not "per feature"
- Workflow: section-by-section approval gates; zero assumptions; immediate commits; docs consistency (docs updated first when scope changes)
- Agent rules: mandatory, codified in AGENTS.md / GEMINI.md / CLAUDE.md (rules 1–13 identical in all three; hardening H1–H14 in GEMINI.md only)

## Pending
- [ ] **Publishing velocity / headcount decision** — the only remaining blocker. See `docs/education-feature-inventory.md` §7
- [ ] Hands-on audit of the two direct competitors (Dainik Shiksha, Shiksha Sangbad) — page speed, ad density, real feature set
- [ ] Portal display name confirmation (Shikkha24 / শিক্ষা২৪?) and logo creation (blocks S2 entry)
- [x] ~~Education feature inventory + category tree approved~~ — ✅ 2026-09-11
- [x] ~~Education competitor set~~ — ✅ 2026-09-11
- [x] Domain purchase — ✅ `shikkha24.com` (reachability not verified from the audit environment)
- [x] DianaHost plan purchase — ✅ PNR 2 GB SSD NVMe
- [ ] Confirm with DianaHost: Node.js version availability (≥22.12 required) and the inode/file-count quota
- [ ] Confirm Cloudflare R2 can be enabled without a payment method (S0 exit gate)
- [ ] Decide the CI rebuild strategy (debounce/batch vs public repo)
- [ ] Reconcile the 45–70/day velocity target against the plan's own desk allocation (42–56/day) during re-planning
- [ ] Build S0 → S12 (one section at a time, approval-gated)
- [ ] `.sps/lock.json` intentionally NOT created — the `sps` skill references removing it but defines no schema; inventing one would violate rule 3. The lock is asserted via the three root mirrors. Revisit if the skill defines a schema (see `.sps/mistakes.md`)
- [ ] Optional: upstream a `workbuddy` host entry into Shahid-Personal-SkillSet (`install.sh` `SYNC_PATHS` + `skills/sps/hosts/workbuddy.md`) so WorkBuddy installs/updates automatically instead of needing the manual re-sync below

## Tooling — WorkBuddy `/sps` install

Installed to `~/.workbuddy-ai/skills/sps` + `~/.workbuddy-ai/skills/sps-cms` (v4.0.0 / v2.3.0).
WorkBuddy is not in the upstream installer's `SYNC_PATHS`, and `sps-update.sh` re-runs `install.sh`
(which resets the source clone), so re-run this **after every SPS update** to refresh WorkBuddy:

```sh
SRC=~/.sps/src/Shahid-Personal-SkillSet; DEST=~/.workbuddy-ai/skills
rm -rf "$DEST/sps" "$DEST/sps-cms"
cp -R "$SRC/skills/sps" "$DEST/sps" && cp -R "$SRC/skills/sps-cms" "$DEST/sps-cms"
chmod +x "$DEST/sps/scripts/"*.sh "$DEST/sps-cms/scripts/"*.sh
```
