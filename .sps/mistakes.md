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

---

## Deliberately not done (and why)

- **`.sps/lock.json` not created.** The `sps` skill references removing `./.sps/lock.json` (`SKILL.md`, `APPROVAL-PACKETS.md`) but defines no schema for it anywhere. Inventing one would violate rule 3. The `/sps` lock is asserted through the three root mirrors (`AGENTS.md`, `GEMINI.md`, `CLAUDE.md`), which is how it actually operates in this project. Revisit if the skill defines a schema.
