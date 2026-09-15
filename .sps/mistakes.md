# Shikkha24 — Mistake Log (do-not-repeat)

Promoted from the independent third-party audit of 2026-09-11 (`docs/audit-third-party.md`).
Each entry is a mistake that was actually made in this repository, with the rule that prevents a repeat.

---

## M1 — Claiming work was done when it was not
**What happened:** Three documents (`.sps/handoff.md` item 19, `README.md`, `.sps/profile.md`) stated that the superseded Strapi root plan had been "deleted — user-approved". It had never been deleted. The file was still tracked in the repo root and described itself as "the single source of truth".
**Why it matters:** A superseded plan specifying a rejected stack sat in the repo root for any agent to read and follow. This is exactly the drift rule 13 exists to prevent.
**Rule:** After any file operation, verify on disk (`git ls-files`, `git log --diff-filter=D`, `ls`) before recording it as done. Never write a completion claim you have not just re-verified.

## M2 — Trusting an earlier audit's conclusions
**What happened:** The 2026-09-11 in-house audit recorded "all stack versions verified". The versions were indeed correct — but the same audit's Next.js claim was wrong, and it recorded a deletion that never happened.
**Rule:** Re-verify independently. A prior audit is a claim, not evidence. The third-party audit re-checked all ten versions against live registries and found one refuted and one incomplete claim in the same table.

## M3 — A documented fallback that could not work
**What happened:** The newsletter fallback was documented as "self-hosted Listmonk on Oracle Cloud Always Free". Oracle blocks outbound port 25 by default and requires a card at signup. The owner has no card. The fallback was non-functional as written.
**Rule:** Before writing a fallback into the plan, verify its prerequisites (payment method, port access, vendor policy, rate limits) — not just that the software exists.

## M4 — Planning for infrastructure that was never sized
**What happened:** The plan pinned a 3 GB host (wrong — the purchased plan is 2 GB) and never analysed storage, while targeting 45–70 articles/day with images. A Next.js + Payload `node_modules` alone is 0.7–1.2 GB.
**Rule:** Every infrastructure decision needs an arithmetic check against the actual workload. Record the numbers in the plan, not just the conclusion.

## M5 — Scope drift between documents
**What happened:** Four CMS collections silently disappeared between the original checklist (16) and the operative plan (12). The operative checklist also lost ~75% of the detail (50 items vs 198).
**Rule:** When a document is recreated, diff it against the version it replaces and record what was dropped and why.

## M6 — A plan aimed at the wrong subject
**What happened:** The 87-feature inventory, category tree and competitive analysis were built for a general news portal. The portal is an education portal (`shikkha24.com`). None of the competitive research targeted education competitors.
**Rule:** Confirm the product's actual subject and domain before producing deep research. If the scope changes, mark the old artifacts obsolete rather than letting them remain as build inputs.

## M7 — Internal contradictions left unreconciled
**What happened:** `docs/master-plan.md` recommended SSR and static output in the same file; `docs/stack-research.md` recommended the exact free tiers the plan rejected; the profile said "motion: minimal only" while the plan shipped scrollytelling.
**Rule:** When two documents disagree, one of them must be corrected in the same commit — never leave both standing.

## M8 — Unverified external claims presented as fact
**What happened:** The Node 24 row said "Active LTS until April 2028" (it is end-of-life 2028-04-30; Active LTS ended 2026-10-20). The Next.js compatibility range was stated as "15.x or 16.x" (the real peer range excludes most of those versions).
**Rule:** Every version, date and compatibility claim is verified against a live source before it is written. Cite the source in the document.

## M9 — Ambiguous rule numbering
**What happened:** `GEMINI.md` contained two independently numbered rule lists (13 main + 14 hardening), so "rule 13" meant two different things.
**Rule:** Hardening rules are prefixed `H1`–`H14`; main rules stay `1`–`13`. Verified identical across all three mirrors.

## M10 — No concurrency/load validation until the end
**What happened:** The SQLite WAL 5-writer concurrency test — a foundational database decision — was gated at S12, after all twelve sections were built.
**Rule:** Foundational risks are validated in S0. Never gate a load-bearing decision at the finish line.

## M11 — A capability documented in a comment that the code never implemented
**What happened:** Twice. (a) `cms/src/seed/demo.ts` told the reader to run `payload run src/seed/demo-purge.ts`; **no such file existed**, so "delete the demo content before launch" silently meant hand-deleting ~130 records across 22 collections. (b) `.github/workflows/deploy.yml` told the operator they could skip the `.htaccess` deploy by putting `# NO-DEPLOY` in the host file — no such check existed, and the step overwrote the host file unconditionally, undoing the rsync exclusion two lines above it that existed specifically to protect a hotfix.
**Why it matters:** Both read as working features. The second would have destroyed an emergency CSP fix *during the incident it was written for*.
**Rule:** A comment is a promise. When you write a capability into a comment or a runbook, check the code implements it — and when you find one that does not, either implement it or delete the sentence, in the same commit. **The diagnostic is one grep:** if the only hit for the claimed flag, path or script name is the sentence that claims it, the capability does not exist.

## M12 — An undeclared dependency that resolved only because of a stale directory
**What happened:** `frontend/package.json` never declared `sharp`. `frontend/node_modules/sharp` was a **real directory** left by a manual install, so `astro build` resolved sharp on that machine and CI had nothing — `MissingSharp`, exit 1. It was the third CI failure in a row, each invisible locally.
**Why it matters:** The local build was green for three days on a package the project did not depend on. A green build on a machine with history is not a green build.
**Rule:** `node_modules` is not evidence that a dependency is declared. `ls -la node_modules/<pkg>` tells you which it is — a **symlink** is pnpm-managed, a **directory** is not. Any package the build needs must appear in that workspace's own `package.json`.

## M13 — Repairing a broken tree with a command that can make it worse
**What happened:** Mid-task, a `pnpm install` intended to relink one package purged the root `node_modules` and left it **empty of symlinks** while `node_modules/.pnpm` kept all 566 packages — so `astro` and `biome` stopped resolving, and the repair itself took four separate sandbox blockers to complete.
**Rule:** Before running a mutating repair (install, purge, schema push, force-reset), know what the command removes on the failure path — and confirm the recovery path works *before* you need it. Prefer the narrowest operation that fixes the actual problem.

## M14 — A test that reimplemented the thing it was testing
**What happened:** `scripts/verify-csp-routes.mjs` "verified" the CSP route rules by parsing the `<LocationMatch>` blocks out of `frontend/public/.htaccess` and re-running their regexes in JavaScript. It passed for three days. The file was **unrunnable**: `<LocationMatch>` is not permitted in `.htaccess` context, so Apache answered **HTTP 500 to every request**. Deploying it would have taken the whole site down. The same misunderstanding had also killed two of the three cache rules — `<FilesMatch>` matches the basename, not the path, so `<FilesMatch "\._astro/">` and `<FilesMatch "^/fonts/">` never matched a file and hashed assets shipped with no `Cache-Control`.
**Why it matters:** The harness was worse than no harness. It produced a green tick over a file that would have caused a total outage, and it survived a release-readiness sweep because the same sweep had recorded this check as "production-only" and moved on. It could only ever prove that two implementations agreed — never that either was right about the platform.
**Rule:** **Never reimplement the mechanism you are testing.** If a real copy of the platform is available locally, run it. Before writing "this can only be verified in production", spend one command checking whether that is true — here `apachectl`/`httpd` was already installed. And when a platform has context rules (what a directive is legal inside), a test that does not exercise the platform's parser cannot see them.

## M15 — An enumeration that contradicted the data it was written to describe
**What happened:** The rewritten article CSP rule excluded a hand-written list of "reserved" first path segments so that `/article/:slug`, `/gallery/:slug` and friends would not inherit the article profile. `study-abroad` was in the list — but `study-abroad` is *both* a two-segment listing **and** the first segment of real article URLs (`/study-abroad/4/demo-study-abroad-canada`). Every study-abroad article silently fell to the strict profile and would have lost AdSense. The new harness caught it on its first run.
**Why it matters:** The enumeration was written from memory of the route tree, not from the route tree. It was wrong on the day it was written, and it failed silently in the direction that costs money.
**Rule:** Prefer a structural rule ("exactly three path segments", which is what the route tree actually guarantees) over a list that must be kept in sync with the route tree. When a list is unavoidable, generate the expectation from the data. ⚠️ The first version of this rule said "the harness reads each page's own JSON-LD to decide which profile it should get" — that prescription was itself wrong, and M16 is what it cost. Generate the expectation from **the cause**, not from something correlated with it.

## M16 — A harness expectation derived from a proxy instead of the cause
**What happened:** M15's fix made `verify-apache` decide each page's expected CSP profile from its JSON-LD `@type`: `CollectionPage` ⇒ relaxed. That is a proxy. A route is relaxed **because it renders an ad slot** — the `.htaccess` says so in as many words ("Category listing — 1 ad slot") — and JSON-LD type merely correlates with that. When `/latest` was rewritten as a proper listing it gained correct `CollectionPage` schema and no ad slot, so the harness demanded a relaxed profile for a page that is correctly strict and went red on a correct page.
**Why it matters:** It is M14's disease in a milder form: the check no longer reimplemented Apache, but it still asserted something *about* the data rather than the thing that actually determines the outcome. A harness that fails for the wrong reason gets switched off, and then it protects nothing. It also cost a false alarm on the first run — and the fix for the real defect behind it (M17's second half) was only visible *after* the expectation was corrected.
**Rule:** Derive an expectation from the mechanism that causes the behaviour, not from a field that happens to be present when it occurs. Here: `data-ad-slot` in the page's own markup — the marker `AdSlot.astro` emits. When a harness goes red, first ask whether the *expectation* is right; a correct page failing is evidence about the harness, not about the page.

## M17 — Two route defects invisible because the fixture corpus exactly equalled the page size
**What happened:** `PAGE_SIZE` is 12 and the demo corpus was exactly 12 articles, so `totalPages` was always 1 and no pagination control ever rendered anywhere. Two defects hid behind that: (a) `/latest` was a single page reading `?page=N` — which on a static build is evaluated at build time, where there is no query string — while `Pagination` builds its links as `${basePath}/page/${n}`, so the moment a thirteenth article was published the page would render a "পরের →" link to a 404; (b) the article CSP rule matched **any** three-segment path, and `/latest/page/2` is three segments, so page 2 of the feed would have been served the *article* profile (relaxed, with `frame-src` for video embeds) despite carrying no ads. Neither was observable in any build, on any machine, in any test.
**Why it matters:** The corpus was chosen to look representative, not to exercise the code. A fixture whose size happens to equal a boundary constant tests the boundary case never — and both defects sat exactly on that boundary. Both were found only by reading the code against the corpus size, not by running anything.
**Rule:** When a feature is parameterised by a limit (page size, batch size, retry count, window), the fixture must exceed it at least once, or the boundary path is untested no matter how green the suite is. Assert the **count of generated artefacts** (pages, batches), not just the exit code — a green build over a corpus that cannot reach the branch proves nothing about the branch.

**Fixed 2026-09-15.** The demo corpus now holds 24 articles against a `PAGE_SIZE` of 12, so `/latest` emits two pages and `verify:links` checks the `/page/2` links that were previously never generated. It also carries tags, three authors instead of one, and publish dates spread across roughly three months — the three things that had left the tag, author and date-archive routes deferred for lack of content to show.

**A third defect surfaced the moment the corpus grew — in a harness, not the product.** `verify-cms-sync` asserted that **every** CMS article's title appears in `/latest/index.html`. That is only true while the corpus fits on one page: once `/latest` paginates, page 1 holds just the newest slice and the harness reported the other twelve as "missing" — a false failure against a correct build. The assumption had been accidentally true since it was written and had never been tested, for exactly the reason this entry describes. It now concatenates the base page **and every `/page/:n` subpage** before checking. **The lesson generalises: a fixture pinned to a boundary does not only hide product defects, it lets wrong test assumptions harden into apparent coverage.**

---

## Deliberately not done (and why)

- **`.sps/lock.json` not created.** The `sps` skill references removing `./.sps/lock.json` (`SKILL.md`, `APPROVAL-PACKETS.md`) but defines no schema for it anywhere. Inventing one would violate rule 3. The `/sps` lock is asserted through the three root mirrors (`AGENTS.md`, `GEMINI.md`, `CLAUDE.md`), which is how it actually operates in this project. Revisit if the skill defines a schema.
