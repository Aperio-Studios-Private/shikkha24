# Project Memory — Shikkha24

Curated long-term facts. Only durable, cross-session truths belong here — not task logs.

## What this project is
- **Shikkha24 (শিক্ষা২৪)** — a Bengali-language **education** news and opportunity portal.
- Domain: **`shikkha24.com`** (decided 2026-09-11).
- Positioning: *Education News | Scholarship | Admission | University | Higher Study — দেশ-বিদেশের শিক্ষার সর্বশেষ খবর ও সুযোগ*.
- Not a general news portal. `docs/master-plan.md` and `docs/competitive-analysis.md` are general-news artifacts and are **reference-only**.

## Hard constraints (do not violate)
1. **The owner has no international credit or debit card.** Every service that requires a card at signup is unusable — Oracle Cloud, Railway, Render, paid SMTP relays, paid TTS APIs, paid data APIs, paid object storage. This is technical, not just budgetary.
2. **Zero recurring cost** beyond the approved host and domain.
3. **Bengali-only UI.** No English toggle.
4. **Do not build until the owner says "go" for S0.** The project is deliberately pre-build.
5. **One section at a time** (S0→S12), each ending in evidence + explicit owner approval. Never batch.

## Infrastructure (purchased / chosen)
- Host: **DianaHost PNR 2 GB SSD NVMe** — 2 GB storage, 200 GB/month bandwidth, 50 databases, SSH on demand, Python/Ruby/Node.js.
- **⚠️ DianaHost runs Node.js 20.18.2, which is END-OF-LIFE (2026-04-30).** `astro@7.3.2` needs `>=22.12.0` and `vite@8.3.0` needs `^20.19.0 || >=22.12.0` → **Astro and Vite cannot run on the host at all**; they build in CI only. `next@16.3.4` (`>=20.9.0`) and `@payloadcms/next@3.89.0` (`^18.20.2 || >=20.9.0`) do accept it. DianaHost's cPanel has a **Node.js Selector with a version drop-down** — select 22/24 if offered.
- Frontend: **Cloudflare Pages** (free, unlimited bandwidth).
- Media: **Cloudflare R2** (10 GB free, zero egress). The account **has a payment method on file**, so R2 is enableable — but that also means overage is **billable**: set an 80% usage alert. Verify with `wrangler login && wrangler r2 bucket list`.
- Payload CMS runs on the 2 GB host, built in CI with Next.js `output: 'standalone'` (~300–600 MB).
- Repository is **PRIVATE** → CI budgets: **GitHub Actions 2,000 min/month** and **Cloudflare Pages 500 builds/month** (the tighter of the two). Cloudflare Pages also caps at **20,000 files/site** (~2–3 years at target volume).
- **Why CI exists:** editors only ever use the Payload admin panel — they never touch GitHub. Because the public site is pre-built static HTML, publishing triggers an invisible rebuild in CI. Full explanation in `docs/hosting-and-deployment.md`.
- DianaHost publishes **no inode quota, CPU/memory limits, email send limits, or backup policy** — all must come from a support ticket.

## Editorial scale (decided)
- **Publishing velocity: baseline 15–20 articles/day + burst to 40+ on result/admission/circular days.** The flat 45–70/day target is retired (it implied 15–23 staff).
- Editorial team: **5 people already in place**. Greenfield launch, no content migration.

## Verified facts worth not re-researching
- Pinned stack (all verified against live registries 2026-09-11): Astro 7.3.2, Payload 3.89.0, Tailwind 4.3.3, TypeScript 7.0.2, Vite 8.3.0, Pagefind 1.5.2, Node 24.21.0 LTS "Krypton", PostgreSQL 18.6, SQLite 3.53.4.
- **Next.js must be `>=16.2.6 <17.0.0`.** The `@payloadcms/next@3.89.0` peer range excludes Next 15.5.x, 16.0.0–16.2.5 and 17.x.
- **Node 24 Active LTS ends 2026-10-20** (EOL 2028-04-30). Node 26 becomes LTS 2026-10-28.
- Free data APIs that work with **no API key** (tested live): Aladhan (prayer times + Hijri date), Open-Meteo (weather), Open-Meteo Air Quality (AQI), open.er-api.com and exchangerate.host and Frankfurter (FX).
- No free source exists for cricket scores, DSE data, gold prices, commodity prices or flood gauges — all descoped.

## Working conventions
- **Three rule mirrors** — `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`. Rules 1–13 must be **byte-identical** across all three; change all three in the same commit. GEMINI.md additionally carries hardening rules `H1`–`H14`.
- **`.sps/` is project memory.** Update `.sps/handoff.md` after every meaningful task. Never rewrite plan/profile history silently — add visible `CORRECTION` notes.
- **Commit immediately** after each finished task (`type(scope): summary`). Never mix unrelated changes.
- `.sps/handoff.md` is edited by concurrent agent sessions — **always re-read it before editing**.
- `.sps/lock.json` intentionally does not exist: the `sps` skill references it but defines no schema. Do not invent one.
- Agents must never assume. Ask the owner, or research it first and cite the source.

## Open decisions
- Education feature inventory, category tree and competitor set — **require an owner discovery round; S1 is blocked on this.**
- Portal display name confirmation and logo.
- **Publishing velocity — OPEN.** 45–70 articles/day implies 15–23 editorial staff, but the plan states 5 people (at 2–4 articles/person/day, 5 people produce 15–20/day). Education publishing is spiky, not flat. Recommended model: baseline 15–20/day + burst to 40+ on result/admission days. This is the last blocker before S0/S1.
