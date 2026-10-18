# SPS Agent Identity

> **⚠️ Rewritten 2026-10-19 (audit finding A3).** The previous version named one
> agent product and a skill version stamp ("WorkBuddy AI", "SPS 4.0.0"), and
> described a hosting state that had already changed. An audit running under a
> different harness scored the file as wrong, correctly. Identity is now stated
> in terms that stay true across harnesses; anything versionable is cited where
> it actually lives.

- **Governing workflow:** `/sps` (see the `/sps` lock in `AGENTS.md`). This file
  never replaces it.
- **Binding rules:** `AGENTS.md` / `GEMINI.md` / `CLAUDE.md` — mirrors carrying
  the same numbered rules; change them together in one commit.
  Antigravity/Gemini-specific hardening lives only in `GEMINI.md`.
- **Project memory:** `.sps/` — `profile.md`, `handoff.md`, `tasks.md`,
  `plan.md`. First read of any session is `.sps/tasks.md`.
- **Skills:** the installed `sps` and `sps-cms` skills. Their version stamps live
  in the skill install, not in this file, so they cannot go stale here.
- **Session Started:** 2026-09-11T19:58+06:00
- **Last refreshed:** 2026-10-19 (identity + hosting state re-verified)
- **Phase:** **S0–S12 all built; the site is LIVE**, served by **Cloudflare
  Workers** since the owner-approved T-18 P1 migration (2026-10-15). The CMS runs
  on DianaHost cPanel. *(Superseded: "LIVE on DianaHost since 2026-10-04" and
  "`deploy.yml` ends in `rsync`/`scp` and does not work" — the Cloudflare deploy
  path is green in CI and the cPanel path is rollback-only.)*
- **Repository:** `SHAHID8142/shikkha24` — **PUBLIC** (Actions unmetered).
  *(Supersedes the "private → 2,000 minutes/month" note in `.sps/profile.md`.)*
- **Package manager:** **pnpm 11.22.0** (`pnpm-workspace.yaml`). npm is unusable
  in the build environment — a filesystem broker refuses its `mkdir` calls.
  See `.sps/handoff.md`.
- **Plan approved:** 2026-09-11T20:41+06:00 — **scope amended 2026-09-11
  (education portal)**.
- **Third-party audits:** 2026-09-11 read-only audit → `docs/audit-third-party.md`,
  findings remediated same day. **2026-10-19** second read-only audit → verdict
  "not ready for sign-off", score 56/100; findings + remediation queue in
  `.sps/audit-report.md` and the AUDIT REMEDIATION QUEUE in `.sps/tasks.md`.

## Capabilities

- File creation & editing: ✅
- Command execution: ✅
- Web search & live-registry verification: ✅
- Subagent spawning: ✅
- Browser automation: **harness-dependent** — check the installed skills before
  relying on it; do not assume it exists.
- Image generation: **not available in every harness.** Brand and OG assets in
  this repository are produced by committed generator scripts under
  `docs/assets/og-thumb-samples/` (`build-samples.mjs`, `build-og-default.mjs`),
  which need only Node + the CMS's `sharp` — not an image model.

## Fallbacks

- If browser automation is unavailable → use web search + URL fetch, and say
  which measurements could not be taken rather than estimating them.
- If a subagent fails → inline execution in the main agent.
- If a live registry is unreachable → state that the version is unverified
  rather than asserting it.
