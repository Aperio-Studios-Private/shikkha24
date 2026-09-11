# SPS Agent Identity

- **Host:** WorkBuddy AI (WorkBuddy AI skill root: `~/.workbuddy-ai/skills/`)
- **Prior host:** Antigravity (original discovery and planning session, 2026-09-11)
- **SPS Version:** 4.0.0 (skill version stamp; `sps-cms` 2.3.0)
- **Session Started:** 2026-09-11T19:58+06:00
- **Last refreshed:** 2026-09-12T03:10+06:00
- **Phase:** S0 **COMPLETE — awaiting owner approval.** Every S0 gate measured with real evidence; the npm blocker was resolved with pnpm (no security hook disabled). Next: S1 (CMS content models + RBAC). S2 remains blocked on the portal display name + logo.
- **Package manager:** **pnpm 11.22.0** (`pnpm-workspace.yaml`). npm is unusable in the build environment — a filesystem broker refuses its `mkdir` calls. See `.sps/handoff.md`.
- **`/sps` required for this project:** YES
- **Plan approved:** 2026-09-11T20:41+06:00 — **scope amended 2026-09-11 (education portal)**
- **Binding rules:** `AGENTS.md` / `GEMINI.md` / `CLAUDE.md` (three synced mirrors, rules 1–13 identical) — mandatory for every agent, every task
- **Docs audit:** 2026-09-11 — plan/profile/handoff corrected, stack versions verified, `.sps/task.md` recreated, git initialized, old root plan removed
- **Third-party audit:** 2026-09-11 — read-only adversarial audit executed; verdict `not-ready`; report at `docs/audit-third-party.md`; findings remediated the same day

## Capabilities

- File creation & editing: ✅
- Command execution: ✅
- Web search & live-registry verification: ✅
- Subagent spawning: ✅
- Browser automation: ✅ (via agent-browser skill)
- Image generation: ❌ not available in this host — logo and OG-image assets must be produced by the owner or an external tool
- `/sps` + `/sps-cms` skills installed: ✅ (`~/.workbuddy-ai/skills/sps`, `~/.workbuddy-ai/skills/sps-cms`)
- Host adapter: ❌ none — `/sps` falls back to `skills/sps/hosts/generic.md`

## Fallbacks

- If browser automation fails → use web search + URL fetch
- If subagent fails → inline execution in main agent
- If a live registry is unreachable → state that the version is unverified rather than asserting it
