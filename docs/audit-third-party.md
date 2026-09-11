# Third-Party Audit Report — NewPortal

**Audit date:** 2026-09-11
**Repository state audited:** commit `c5e9e49` (branch `main`), working tree clean
**Scope:** all documentation and plans. No application code exists — the project is pre-build.
**Protocol:** `.sps/third-party-audit-prompt.md`
**Verdict:** `not-ready`

---

## 0. Auditor disclosure

Two honesty notes, because independence is the point of this report.

1. **The auditor was not fully independent.** This audit was run in a session that had already worked on the repository: it installed the `/sps` skill and, while doing so, read `AGENTS.md`, `GEMINI.md`, `.sps/plan.md`, `.sps/profile.md`, `.sps/handoff.md`, `.sps/task.md`, `.sps/agent.md` and `.sps/antigravity-export-prompt.md`. Every file in the reading list was then re-read from disk for this audit, but findings should be weighted knowing the auditor was not blind to the project.
2. **One protocol violation, disclosed.** Two scratch files (`/tmp/a_rules.txt`, `/tmp/g_rules.txt`) were written outside the repository in order to diff the rule blocks of `AGENTS.md` against `GEMINI.md`. This is technically "creating a file", which the read-only constraint forbids. No repository state was changed; `git status` confirmed a clean tree throughout. It is disclosed rather than hidden.

---

## 1. Verdict

**`not-ready`.**

The stack research is genuinely strong: all ten pinned versions were independently re-verified against live registries and **matched exactly**, including publish dates and the native-binary evidence confirming the TypeScript 7 Go port. That portion of the plan is trustworthy.

Three Critical issues nonetheless block the build "go" signal:

1. The approved **3 GB hosting plan cannot hold a Payload/Next.js application plus media** at the plan's own publishing target, and no document analyses storage at all.
2. **Three documents claim the superseded Strapi plan was deleted, and it was not** — it is still a tracked file in the repository root that describes itself as "the single source of truth".
3. The **approved newsletter fallback is non-functional as documented** — Oracle blocks outbound port 25 by default, and cPanel rate-limits bulk SMTP.

Beyond those, roughly **ten Day-1 features depend on external data APIs that no operative document identifies, prices, or checks against the zero-cost budget rule**.

The plan is approximately 85% solid. The remaining 15% is concentrated in exactly the places that would derail S0 (toolchain/hosting) and S9 (newsletter/media).

---

## 2. Findings

### Critical

| Severity | File & line | Finding | Evidence | Recommended fix |
|---|---|---|---|---|
| **Critical** | `.sps/profile.md:14`, `.sps/plan.md:51`, `docs/master-plan.md:270` | **3 GB storage cannot host this stack at the stated publishing volume.** No document analyses storage. A Next.js 16 + Payload 3 `node_modules` is roughly 0.7–1.2 GB; add `.next` build output, the SQLite database, and Payload-generated image variants (several sizes per upload). At 45–70 articles/day with 2–3 images each, media alone exceeds 3 GB within weeks. | DianaHost store lists PNR 3 GB as **3 GB storage / 400 GB bandwidth / $82.35 yr**. Publishing target from `docs/master-plan.md:270`. | Decide a media/storage strategy before S1: larger plan, external object store, or a hard media quota. Any external store is a free-tier service, which the owner previously rejected for core infrastructure — **owner budget decision**. |
| **Critical** | `.sps/handoff.md` item 19, `README.md:22`, `.sps/profile.md:91` | **Three documents claim the old Strapi plan was deleted. It was not.** The file is still tracked and unmodified in the repository root, describes itself as *"the single source of truth (plan.md) to be placed at the project root"*, specifies the **rejected** Strapi stack, and states a **different** hosting spec (2 GB vs the plan's 3 GB). An agent reading the repository root finds a competing `plan.md`. | `git ls-files` lists it; `git log --diff-filter=D` finds **no deletion commit**; the file exists on disk (9,793 bytes, 10 occurrences of "Strapi"). | Delete the file and commit. Correct all three false claims. This is precisely the drift that project rule 13 was written to prevent. |
| **Critical** | `.sps/plan.md:125`, `.sps/profile.md:35` | **The approved newsletter fallback cannot work as documented.** Path A (self-built Payload newsletter via DianaHost cPanel SMTP) is subject to cPanel per-domain hourly send caps, and bulk sending from a shared IP damages sender reputation. Path B (Listmonk on Oracle Cloud Always Free) is blocked: Oracle blocks outbound port 25 by default for tenancies created after June 2021 and it **"cannot be removed by configuring egress"** — it requires an Oracle support unblock. | Oracle release notes, "Outbound SMTP is blocked"; cPanel documentation, "How to Set Email Send Limits". | Owner decision: a real ESP (a paid service) or a descoped low-volume manual newsletter. Also note that Listmonk requires its own PostgreSQL instance, which no document addresses. |

### High

| Severity | File & line | Finding | Evidence | Recommended fix |
|---|---|---|---|---|
| **High** | `docs/master-plan.md:42–48,137–162`; `.sps/task.md:71` | **About ten Day-1 features require external data sources that no operative document identifies**: cricket scores, AQI, weather, prayer times, currency, gold, commodity prices, DSE ticker, flood gauge. Each needs a provider, rate limit, cost, and a budget-compliance check. The **only** place a provider is named is `docs/task-checklist-original.md:217` (OpenAQ) — a document marked "for reconciliation only". `.sps/task.md` names none. | Full read of all four planning documents; search for API and endpoint references. | Add `docs/data-sources.md` listing, per widget: provider, free-tier terms, rate limit, and fallback behaviour. Gate each against rule 7. |
| **High** | `docs/master-plan.md:85`, features 34/35, Innovation #7 | **The AI Bangla voice reader and twice-daily audio bulletin have no implementation path.** No TTS vendor, no self-hosted option, and no cost analysis appears anywhere. Commercial Bengali TTS is a paid service, which conflicts directly with rule 7. | Absence of any TTS decision across all documents. | Decide explicitly: self-hosted TTS on the VPS, or a paid API. **Owner budget decision.** |
| **High** | `.sps/plan.md:36`, `docs/stack-research.md:46` | **The documented Next.js compatibility range is wrong and would break a literal install.** The documents say "15.x or 16.x". The actual `@payloadcms/next@3.89.0` peer range is `>=15.2.9 <15.3.0 \|\| >=15.3.9 <15.4.0 \|\| >=15.4.11 <15.5.0 \|\| >=16.2.6 <17.0.0`, which **excludes** Next 15.5.x, 16.0.0–16.2.5 and 17.x. `npm install next@15` resolves to 15.5.x and produces a peer-dependency conflict. | npm registry, `@payloadcms/next@3.89.0` peerDependencies. | Replace with the exact range and pin Next **16.2.6+**. |
| **High** | `.sps/plan.md:109` | **The performance targets are logically incoherent as written.** The scope-versus-performance clause states that targets are *"enforced per feature, not per page"* — but Lighthouse ≥95 and the <30 KB data-saver budget are **page-level** measurements. Lighthouse scores a page load; it cannot score a feature. | `.sps/plan.md:109` against `docs/master-plan.md:369–388`. | Rewrite as page-level targets and enumerate the specific pages and templates in scope. |
| **High** | `docs/master-plan.md:270` vs `.sps/profile.md:9` | **The content velocity target is unachievable with the stated team.** 45–70 articles/day against 5+ reporters/editors equals 9–14 articles per person per day, seven days a week. Separately, the master plan's own desk allocation sums to **42–56/day**, not 45–70. | Arithmetic on `docs/master-plan.md:270–277`. | Reconcile the target with team size, or record it explicitly as an unowned operational risk. |

### Medium

| Severity | File & line | Finding | Evidence | Recommended fix |
|---|---|---|---|---|
| **Medium** | `.sps/plan.md:121`, `.sps/task.md:80` | **The SQLite WAL concurrency gate sits at S12, the very end of the build.** The database choice is foundational (S0/S1) but is validated only after all twelve sections are complete. If it fails, the entire CMS decision is invalidated at the finish line. | Gate placement in `.sps/plan.md` and `.sps/task.md`. | Move the five-editor concurrency test to S0/S1. |
| **Medium** | `docs/stack-research.md:94` | **The Node 24 LTS claim is factually wrong.** The document says *"Active LTS until April 2028"*. Actual: Active LTS ends **2026-10-20** (about five weeks after plan approval), Maintenance continues to **2028-04-30**, which is end-of-life. Node 26 becomes LTS on **2026-10-28**. | `github.com/nodejs/Release` `schedule.json`. | Correct the claim and note the October 2026 transition so the choice is deliberate. |
| **Medium** | `.sps/plan.md:36` | **Payload 3.89.0 was published 2026-09-10T14:49Z — one day before being pinned as the production foundation.** Rule 8 requires dependency justification; no freshness risk is recorded. | npm registry publish timestamp. | Record the risk; consider pinning 3.88.x and upgrading after the S0 smoke test. |
| **Medium** | `.sps/plan.md:62`, `.sps/task.md:24` | **Four collections were silently dropped from S1.** Plan and task list twelve collections; the original checklist had sixteen. Missing: **Subcategories** (required by `.sps/profile.md:51–62` and feature 2), **Newsletter Subscribers** (required by the documented newsletter fallback), **Photo Galleries** (feature 50), and **Pages** (the E-E-A-T pages). | Compare `.sps/plan.md:62` and `.sps/task.md:24` against `docs/task-checklist-original.md:30–45`. | Re-add the four collections, or record why they were dropped. |
| **Medium** | `docs/master-plan.md:396` | **"task.md checklist created (150+ tasks)" is false for the operative file.** `.sps/task.md` contains **50** items; the superseded original contains **198**. The operative checklist lost roughly 75% of its granularity (no field lists, no verification steps, no data sources). | Counted `- [ ]` items in both files. | Correct the claim and restore granularity where it matters. |
| **Medium** | `docs/task-checklist-original.md:268` vs `.sps/plan.md:88–104` | **No accessibility target exists in the operative documents.** "Lighthouse accessibility ≥90" appears only in the superseded checklist; `.sps/plan.md`'s Verification Targets and `AGENTS.md` rule 9 both omit it. | Compare the two target tables. | Add an accessibility target to `.sps/plan.md`. |
| **Medium** | `docs/competitive-analysis.md:486` | **No URL architecture decision is recorded.** The research recommends `/:category/:sub/:id/:slug`; neither `.sps/plan.md` nor `.sps/task.md` specifies any URL scheme. The same research document lists "changing article URLs without 301 redirects" among its fatal mistakes. | Read of both operative documents. | Decide the URL architecture before S4/S5. |
| **Medium** | `docs/stack-research.md:143,181` | **The research document contradicts the approved budget rule.** It recommends Supabase/Neon/Railway free-tier PostgreSQL and Railway/Render free tiers for Listmonk — the exact options that `.sps/plan.md:125` and `.sps/profile.md:90` **explicitly rejected**. | Direct contradiction between documents. | Correct the research document so it cannot later be cited as approval. |
| **Medium** | `docs/master-plan.md:241` | **The master plan recommends SSR while the approved plan chose static output.** Line 241 says *"Adopt a Headless SSR Architecture: Emulate their React/Next.js + Headless CMS model."* Line 53 of the same file says *"Zero-JS static HTML via Astro 7."* `.sps/plan.md` and the architecture diagram specify Astro static. | Internal contradiction within a single file. | Remove the SSR recommendation. |
| **Medium** | `.sps/profile.md:27` vs `docs/master-plan.md:173,323` | **Motion policy contradiction.** The profile states *"Motion: Minimal — breaking ticker, subtle hover, reading progress bar **only**"* and *"Richer mobile motion allowed: no"*. The master plan ships scrollytelling, a vertical-video carousel, and a before/after slider. | Direct contradiction. | Reconcile, and decide whether scrollytelling is in scope. |
| **Medium** | `docs/competitive-analysis.md:553` vs `:18` | **The central mobile-first premise rests on contradictory data within one document.** "90%+ of BD news readers are on mobile" versus the Prothom Alo table showing **51% mobile / 49% desktop**. | Same file, two sections. | Reconcile and cite a source. |
| **Medium** | `README.md:23` | **README is stale.** It states *"Still awaiting: competitive-analysis & stack-research exports"* — both were committed 37 minutes before the README was written. | Commit `bf1957c` (22:17) versus README creation (22:29). | Update the README. |
| **Medium** | `AGENTS.md:24` vs `.sps/third-party-audit-prompt.md:13` | **Agent rules conflict with the audit protocol.** Rule 4 mandates an immediate commit after *any* task; the audit prompt forbids writes entirely. `AGENTS.md` declares itself "mandatory — every agent, every task". | Both files. | Add an explicit read-only carve-out to rule 4. |
| **Medium** | `AGENTS.md:31–32` | **Rule 7 contradicts the project's own approved spend.** *"Zero recurring software/platform fees… No paid services"* against `.sps/profile.md:14`'s paid DianaHost plan. Ambiguous as written. | Both files. | Reword to "no **new** recurring fees beyond the approved host and domain". |
| **Medium** | `AGENTS.md:36` | **Rule 9 is unenforceable as written.** It demands TTFB <200 ms from *every UI section*, but TTFB is a property of Cloudflare and DianaHost, which are not configured until S12. The rule also does not state mobile or desktop, nor dev server or production. | Rule text versus the section order. | Gate TTFB at S12 only, and specify mobile plus production measurement. |
| **Medium** | `GEMINI.md:15–51` and `:57–70` | **"Rule N" is ambiguous in `GEMINI.md`.** There are two numbered lists — thirteen main rules and fourteen hardening rules. "Rule 13" means *"Docs consistency"* in one list and *"Commit before risky operations"* in the other. | Counted both lists. | Prefix the hardening rules `H1–H14`. |
| **Medium** | `.sps/plan.md:61`, `docs/master-plan.md:359–362` | **The plan never states where the Payload/Next.js application is built.** CI builds the Astro frontend, but Payload/Next must run on DianaHost. Five native toolchains are in play — Astro's Rust compiler, Tailwind Oxide, Rolldown, the TypeScript 7 Go binary, and Pagefind's Rust binary — and all must execute somewhere with Node ≥22.12 and a modern glibc. The S0 gate does not specify this. | `astro@7.3.2` engines require `node >=22.12.0`; `typescript@7.0.2` ships twenty platform-specific native binaries. | Specify the build topology in S0, and add "DianaHost Node version" as an explicit S0 gate item. |

### Low

| Severity | File & line | Finding | Recommended fix |
|---|---|---|---|
| **Low** | `docs/master-plan.md:98` vs `:87 rows` | The heading says "70+ Features"; there are exactly **87** rows (subtotals 19+22+8+7+7+4+12+8 = 87, internally consistent). Three other documents say "87+". | Change to 87. |
| **Low** | `docs/competitive-analysis.md:37` vs `:497` | Prothom Alo publishing velocity is given as "300–500+/day" and "250–350+" in the same file. | Reconcile. |
| **Low** | `.sps/` | Skill-mandated memory files are absent: `content-model.md`, `mistakes.md`, `lock.json`. `CLAUDE.md` is also missing, though the SPS lock rule names all three mirrors. | Create them, or record why they are deferred. |
| **Low** | `.sps/agent.md:3` | `Host: Antigravity` is stale; the SPS skill mandates refreshing this each session. | Refresh the host value. |
| **Low** | `.sps/plan.md:72`, `docs/master-plan.md:326` | `hreflang` on a deliberately single-language site is pointless; the research document uses `inLanguage: "bn-BD"` instead. | Drop `hreflang` or justify it. |
| **Low** | `docs/master-plan.md:376` | The initial-payload target is 1.2 MB here, 1.5 MB in the SPS skill default, and absent from `.sps/plan.md` and rule 9. | Pick one value and record it in `.sps/plan.md`. |
| **Low** | `docs/master-plan.md:231` | The E-E-A-T `/about` page omits "Ministry of Information registration", which `docs/competitive-analysis.md:519` requires. | Add it. |
| **Low** | `.sps/profile.md:27` vs `docs/master-plan.md:129` | "Charcoal" is used for two different hex values (#1F1F1F brand versus #121212 dark-mode base). Confusing, though not contradictory. | Rename one, for example "dark surface". |

---

## 3. Questions for the owner

1. **Storage.** Given 3 GB total and 45–70 articles/day — a larger DianaHost plan, an external object store (a free tier, which you previously rejected for core infrastructure), or a hard media-quota policy? This decides whether the architecture is viable at all.
2. **Newsletter and email.** Given that Oracle blocks port 25 and cPanel rate-limits bulk SMTP — do you accept paying for an ESP, or should the newsletter be descoped to a low-volume manual send?
3. **TTS for the audio reader (features 34/35).** Self-hosted model, paid API, or descope? This is a budget decision, not an agent decision.
4. **Data sources for roughly ten widgets.** Are you willing to accept free-tier API dependence (rate limits, no SLA) for cricket, AQI, weather, currency, gold, DSE and commodities, or should some be descoped?
5. **Next.js version.** Confirm targeting **Next 16.2.6+**, the only clean path through Payload 3.89.0's peer range?
6. **Node version on DianaHost.** The vendor's PNR page lists Python/Ruby/Node.js but publishes **no Node version**. Has the vendor confirmed Node ≥22.12 (ideally 24) is available?
7. **DianaHost inode limit.** cPanel accounts normally enforce a file-count quota, and a Next.js `node_modules` contains tens of thousands of files. Has the inode limit been confirmed with DianaHost?
8. **The ৳6,999 figure.** The vendor's store shows **$82.35/year** for the 3 GB PNR plan, implying an ~85 BDT/USD conversion that appears stale. Can the actual BDT invoice amount be confirmed?
9. **Content migration.** `.sps/handoff.md` states that discovery round 3 covered "content migration", but no decision is recorded anywhere. Is this a greenfield launch, or is content being migrated from an existing site?
10. **Accessibility target.** Should a numeric Lighthouse accessibility target (the superseded checklist said ≥90) be recorded in `.sps/plan.md`?
11. **URL architecture.** `/:category/:sub/:id/:slug` as the research recommends, or something else? This must be settled before S4/S5.
12. **The missing international research.** `docs/competitive-analysis.md:641` states that the BBC, Guardian, Al Jazeera, CNN, NYT, NHK and NDTV breakdown was "truncated from context", and line 667 says the transcripts are "archived in Antigravity brain" — that is, outside this repository. Is that analysis recoverable, or should the plan stop claiming intelligence from "7 world-class international portals" that it cannot produce?
13. **`/sps` lock file.** Should `.sps/lock.json` be created? The installed skill references it; it does not exist.

---

## 4. Verification log

### Dimension 1 — Internal consistency

Read all fifteen documents end to end. Cross-checked every version, date, feature count, section list, category tree and gate definition by hand. Counted checkbox items in both checklists (`.sps/task.md` 50 versus `docs/task-checklist-original.md` 198). Counted feature rows and validated the section subtotals (87 = 87). Diffed the numbered rule blocks of `AGENTS.md` against `GEMINI.md`. Ran an existence check on twenty referenced paths.

**Referenced-path existence check:** all fourteen documentation paths referenced by the docs exist. Missing: `.sps/lock.json`, `.sps/design-system.md`, `.sps/content-model.md`, `.sps/mistakes.md`, `CLAUDE.md`. `.env.example` is also absent, but that is correctly deferred to S0 and is not a finding.

### Dimension 2 — Factual verification (live registries)

| Claim | Source | Result |
|---|---|---|
| astro 7.3.2 | registry.npmjs.org | MATCH (published 2026-09-08) |
| payload 3.89.0 | registry.npmjs.org | MATCH (published 2026-09-10T14:49Z) |
| tailwindcss 4.3.3 | registry.npmjs.org | MATCH (2026-07-16) |
| typescript 7.0.2 | registry.npmjs.org | MATCH — twenty platform-specific native binaries confirm the Go-based port |
| vite 8.3.0 | registry.npmjs.org | MATCH (`astro@7.3.2` depends on `vite ^8.0.13`) |
| pagefind 1.5.2 | registry.npmjs.org | MATCH (2026-04-12) |
| @payloadcms/db-sqlite 3.89.0 | registry.npmjs.org | MATCH |
| @payloadcms/db-postgres 3.89.0 | registry.npmjs.org | MATCH |
| Node 24.21.0 LTS "Krypton" | nodejs.org/dist/index.json | MATCH (2026-09-07) |
| SQLite 3.53.4 | sqlite.org/download.html | MATCH (`sqlite-amalgamation-3530400`) |
| PostgreSQL 18.6 | postgresql.org/versions.json | MATCH (major 18, latestMinor 6) |
| Listmonk 6.2.0 | GitHub API `knadh/listmonk` releases | MATCH (2026-06-26) |
| Payload peer range "≥15.2.9, ≥16.2.6" | `@payloadcms/next@3.89.0` | **INCOMPLETE** — see High finding 3 |
| Node 24 "Active LTS until April 2028" | nodejs/Release `schedule.json` | **WRONG** — see Medium finding 2 |
| DianaHost PNR 3 GB specification | clients.dianahost.com store | CONSISTENT with the plan; no Node version or inode limit published |
| Oracle Always Free can send email | docs.oracle.com release notes | **REFUTED** — port 25 blocked by default |
| cPanel bulk email capability | docs.cpanel.net | **LIMITED** — per-domain hourly send caps |

### Dimension 3 — Feasibility and risk

Assessed the Payload-on-Passenger, SQLite-WAL, TypeScript 7 toolchain, Pagefind Bengali and Listmonk paths.

**The Evidence Labels table in `.sps/plan.md` is mostly honest.** `Assumed`, `Unverified` and `Unlikely` are used correctly, and the Payload-on-Passenger and TypeScript 7 entries explicitly require S0 testing rather than asserting success. The `Listmonk on cPanel` entry is labelled *Unlikely*; this audit can strengthen that to **effectively impossible**, since the vendor lists only Python, Ruby and Node.js support — no Go.

Two cells are not honest:

- The **fallback row** presents a newsletter plan that cannot function as written (Critical finding 3).
- The **SQLite row** is correctly labelled "Assumed" but its validation is gated in the wrong section (Medium finding 1).

### Dimension 4 — Completeness

Missing: a data-source document (High finding 1); a TTS decision (High finding 2); a URL architecture decision (Medium finding 7); an accessibility target (Medium finding 6); a security and backup plan for reader accounts and PII; a consolidated budget ledger; and the skill-mandated `.sps/content-model.md`, `mistakes.md` and `lock.json` (Low finding 3).

S0 is missing an explicit **DianaHost Node-version** verification and an **inode-limit** verification (Medium finding 17; questions 6 and 7).

### Dimension 5 — Plan quality

The S0→S12 order is sound, and the S0, S1 and S2 gates are sensibly placed. The failures are the S12-placed SQLite gate (Medium finding 1), the incoherent "per feature, not per page" clause (High finding 4), and the unachievable velocity target (High finding 5).

**"ALL 87+ features Day 1" is not a hard commitment as written.** `.sps/plan.md:109` explicitly permits deferral with owner approval. The scope claim and its escape hatch live in separate sections and should be stated together.

### Dimension 6 — Agent rules quality

**Verified good:** the thirteen numbered rules in `AGENTS.md` and `GEMINI.md` are **byte-identical**. The diff between the two extracted rule blocks showed additions only, and those additions were the disclosed Antigravity/Gemini hardening section. The claim at `AGENTS.md:9` that the numbered rules are identical is **true**. `AGENTS.md` carries 13 numbered rules; `GEMINI.md` carries 13 plus 14 hardening rules.

**Problems:** rule-number ambiguity (Medium finding 16); the commit-versus-read-only conflict (Medium finding 13); the budget-guard contradiction (Medium finding 14); and the unenforceable TTFB gate (Medium finding 15).

### Dimension 7 — Process integrity

`git log --stat` was reconciled against all 27 "Completed" claims in `.sps/handoff.md`. **Most check out precisely** — the four exported artifacts match their claimed line counts exactly (master-plan 397, competitive-analysis 667, stack-research 266, task-checklist-original 280), and the audit-correction commit's file list matches claims 15 through 21.

**One claim is false:** the deleted root plan was never deleted (Critical finding 2).

**Two phantom references point outside the repository:** `docs/competitive-analysis.md:667` ("transcripts archived in Antigravity brain") and the session and subagent UUIDs at `docs/stack-research.md:4` and `docs/competitive-analysis.md:4,10,252,444,639`. None are resolvable from this repository.

### Explicitly not confirmed

The following could not be independently verified in this session and are flagged rather than asserted: Prothom Alo Similarweb/Semrush traffic figures; the truncated international per-portal analysis; the "45–70 articles/day minimum" assertion; PostgreSQL 19 beta status; Astro 7.2 incremental builds; Pagefind Bengali search quality; Payload Bengali admin labels; DianaHost's Node version and inode limit; the ৳6,999 BDT figure; and Oracle's idle-instance reclamation policy for Always Free.

---

## 5. Coverage note

For every dimension above, the checks performed are stated alongside the findings so that coverage can be judged independently of the conclusions. No dimension was rubber-stamped: the version-verification dimension, where the documentation is strongest, still produced one refuted claim and one incomplete claim, and the agent-rules dimension, which is largely sound, still produced four findings.

*Report generated 2026-09-11 against commit `c5e9e49`. No repository state was modified by the audit itself.*

---

## 6. Remediation log (added 2026-09-11)

All findings were remediated on 2026-09-11 at the owner's direction. Commits: `5124534` (docs/plan), `1af50bc` (agent rules), and the commit containing this file.

| Finding | Status | What changed |
|---|---|---|
| **C1** 3 GB storage | ✅ Fixed | Architecture rewritten for the **purchased DianaHost PNR 2 GB** plan: Cloudflare Pages (frontend) + Cloudflare R2 (media) + slim CI-built Payload using Next.js `output: 'standalone'`. Expected host footprint ≈400–700 MB. Documented R2 fallback. **New finding surfaced during remediation: the plan said 3 GB / ৳6,999 but the plan actually purchased is 2 GB / ~$47 — corrected everywhere.** |
| **C2** Stale Strapi plan | ✅ Fixed | The file has **actually been deleted** (owner-approved). The three false claims carry visible `CORRECTION` notes rather than being silently rewritten. |
| **C3** Newsletter fallback | ✅ Fixed | Oracle Cloud removed (requires a card the owner does not have). New path: self-built Payload subscriber list + campaign module, delivery via a free-tier ESP API, cPanel SMTP as a low-volume fallback. |
| **H1** No data sources | ✅ Fixed | `docs/data-sources.md` created. Five providers **verified live with no API key** (Aladhan, Open-Meteo weather, Open-Meteo air quality, open.er-api.com, exchangerate.host, Frankfurter). Widgets with no free source are explicitly descoped. |
| **H2** TTS with no path | ✅ Fixed | Browser Web Speech API adopted. The twice-daily audio bulletin is **descoped** — it cannot be pre-generated client-side. |
| **H3** Next.js range wrong | ✅ Fixed | Pinned to `>=16.2.6 <17.0.0`; the full real peer range is now recorded in `.sps/plan.md` and `docs/stack-research.md`. |
| **H4** "per feature, not per page" | ✅ Fixed | Rewritten as page-level, with the measured page templates enumerated. |
| **H5** Velocity vs team size | ✅ Fixed | Owner chose to keep 45–70/day **and plan to hire**; team size is now a launch prerequisite. The 42–56 vs 45–70 arithmetic mismatch is recorded. |
| **M1** SQLite gate at S12 | ✅ Fixed | Concurrency gate moved to **S0 exit**. |
| **M2** Node 24 LTS wrong | ✅ Fixed | Corrected: Active LTS ends 2026-10-20, EOL 2028-04-30, Node 26 LTS 2026-10-28. |
| **M3** Payload 3.89.0 one day old | ✅ Fixed | Freshness risk recorded; S0 now includes a hold-vs-pin decision. |
| **M4** Four collections dropped | ✅ Fixed | Subcategories, Newsletter Subscribers, Photo Galleries and Pages restored in `.sps/task.md` and `.sps/content-model.md`. |
| **M5** "150+ tasks" false | ✅ Fixed | Corrected to 198 (original) / 50 (operative, before restoration). |
| **M6** No accessibility target | ✅ Fixed | Lighthouse accessibility ≥90 added to `.sps/plan.md` and to agent rule 9. |
| **M7** No URL architecture | ✅ Fixed | `/:category/:subcategory/:id/:slug` + shortlink, recorded in `.sps/plan.md`. |
| **M8** Research contradicted budget | ✅ Fixed | Supabase/Neon/Railway and Railway/Render recommendations removed from `docs/stack-research.md` with the contradiction explained. |
| **M9** SSR recommendation | ✅ Fixed | Removed from `docs/competitive-analysis.md`, struck through with the reasoning preserved. |
| **M10** Motion contradiction | ✅ Fixed | Reconciled in `.sps/profile.md`: minimal by default, richer motion only in lazy-loaded S8 islands. |
| **M11** 90% vs 51% mobile | ✅ Fixed | Clarified in `docs/competitive-analysis.md` — two different metrics, neither to be cited as measured fact. |
| **M12** README stale | ✅ Fixed | README rewritten: doc map, status notes and blocking-gate table. |
| **M13** Rule 4 vs audit protocol | ✅ Fixed | Rule 4 gained an explicit read-only/audit carve-out. |
| **M14** Rule 7 vs paid host | ✅ Fixed | Reworded to scope new fees, and now records the no-international-card constraint. |
| **M15** Rule 9 TTFB unenforceable | ✅ Fixed | TTFB gated at S12 only; measurement context specified. |
| **M16** Rule numbering ambiguous | ✅ Fixed | Hardening renumbered **H1–H14**. |
| **M17** Build topology unstated | ✅ Fixed | Documented in `.sps/plan.md`; DianaHost Node-version and inode-quota checks added as S0 exit gates. |
| **L1–L8** | ✅ Fixed | Feature count 87; velocity figures reconciled; `.sps/content-model.md` + `mistakes.md` created; `.sps/agent.md` refreshed; `hreflang` → `inLanguage`; 1.2 MB payload budget recorded; Ministry of Information registration added; charcoal token disambiguated. |

**Not remediated, deliberately:**
- **`.sps/lock.json`** — the `sps` skill references removing it but defines **no schema**. Creating one would be a guess, which rule 3 forbids. The lock is asserted through the three root mirrors. Recorded in `.sps/mistakes.md`.
- **The truncated international competitive research** — not recoverable from this repository. The plan's claim to intelligence from "7 world-class international portals" is now marked unsupported in both `docs/master-plan.md` and `docs/competitive-analysis.md`.

**New findings raised during remediation** (not in the original audit):
1. The purchased hosting plan is **2 GB**, not the 3 GB every document claimed.
2. The portal is an **education** portal (`shikkha24.com`), not a general news portal — which makes the 87-feature inventory, category tree and competitor set obsolete.
3. **GitHub Actions minutes**: at 45–70 articles/day, one build per publish is 1,350–2,100 builds/month against a 2,000-minute private-repo quota. Rebuilds must be debounced or batched.

**Outstanding (blocks S1 entry):** the education feature inventory, category tree and competitor set. These require a discovery round with the owner and were deliberately **not invented**.
