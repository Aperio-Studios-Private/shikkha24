# SPS Agent Identity

- **Host:** Antigravity
- **SPS Version:** 4.0.0
- **Session Started:** 2026-09-11T19:58+06:00
- **Phase:** APPROVED — Ready to build S0 (Foundation & Toolchain)
- **`/sps` required for this project:** YES
- **Plan approved:** 2026-09-11T20:41+06:00
- **Binding rules:** AGENTS.md / GEMINI.md (synced mirrors) — mandatory for every agent, every task
- **Docs audit:** 2026-09-11 — plan/profile/handoff corrected, stack versions verified, `.sps/task.md` recreated, git initialized, old root plan removed

## Capabilities

- File creation & editing: ✅
- Command execution: ✅
- Web search: ✅
- Subagent spawning: ✅
- Browser automation: ✅ (via agent-browser skill)
- Image generation: ✅

## Fallbacks

- If browser automation fails → use web search + URL fetch
- If subagent fails → inline execution in main agent
