# Shikkha24 read-only live-code audit

**Date:** 2026-10-19  
**Project status:** Existing SPS project; production services responded during this audit  
**Requested scope:** Read every code file and verify behavior against live code  
**Audit outcome:** **INCOMPLETE — not every source file was read end-to-end.** This report records verified findings and the exact coverage limitation; it is not a clean bill of health or a complete security audit.  
**Changes:** No application code, configuration, docs, task queue, or handoff was changed. This report is the only intended repository write. No commit was created.

## Verdict

**Not ready for audit sign-off.** The code examined contains high-impact authorization and data-integrity defects, plus an unsafe workflow-output path. The storefront and CMS were reachable, but the review did not read every tracked code file as requested. Do not interpret the score or findings below as proof that unreviewed files are safe.

## Score

The SPS 100-point score is **56/100 — Weak**. The score is evidence-limited: unverified mobile, accessibility, media, and design checks received no points under the audit rubric. It is not a measured code-quality score.

| ID | Result | Points | Evidence |
|---|---|---:|---|
| A1 | Pass | 3/3 | `.sps/` project memory exists. |
| A2 | Pass | 3/3 | Root agent instructions contain the `/sps` lock. |
| A3 | Fail | 0/3 | [`agent.md`](./agent.md) identifies WorkBuddy AI and SPS 4.0.0; this audit ran in Copilot SDK in VS Code with SPS 4.4.0 loaded. |
| A4 | Warning | 1/2 | Profile and handoff exist, but contain conflicting/stale hosting and deployment state. |
| A5 | Pass | 3/3 | [`AGENTS.md`](../AGENTS.md), [`GEMINI.md`](../GEMINI.md), and [`CLAUDE.md`](../CLAUDE.md) all contain the `/sps` lock. |
| B1 | Pass | 4/4 | Education-portal identity is reflected in actual CMS collections and Bengali storefront content. |
| B2 | Pass | 4/4 | Manifests identify Astro, Payload/Next.js, SQLite, and TypeScript; live storefront and CMS responses confirm running surfaces. |
| B3 | Pass | 4/4 | Payload CMS is configured in source; live `/admin` and `/api/articles` returned 200. |
| B4 | Warning | 2/4 | Source has Cloudflare and cPanel deploy paths; the live storefront is served by Cloudflare. Current ownership/approved hosting state is not consistently represented by project controls. |
| C1 | Pass | 3/3 | This report distinguishes evidence, assumptions, and unverified items. |
| C2 | Pass | 3/3 | Evidence labels are included below. |
| D1 | Unverified | 0/6 | Responsive behavior was not checked across every page/template. |
| D2 | Unverified | 0/4 | Hover-only action risk was not exhaustively checked. |
| D3 | Unverified | 0/6 | Motion and reduced-motion behavior were not exhaustively checked. |
| D4 | Unverified | 0/3 | No complete dual-path motion review. |
| E1 | Warning | 2/5 | Media upload behavior and existing worktree changes were inspected; complete asset/workspace hygiene was not. |
| E2 | Unverified | 0/3 | Autoplay and total asset-weight policies were not exhaustively checked. |
| F1 | Pass | 4/4 | Package manifests contain lint, typecheck, build, and numerous verification scripts. These commands were not run. |
| F2 | Warning | 1/3 | Live services answered, but CI/deployability was not executed or fully audited. |
| F3 | Unverified | 0/3 | Accessibility basics were not checked across all routes. |
| H1 | Pass | 8/8 | CMS foundation is present in source and responsive in the live probes. |
| H2 | Warning | 4/8 | CMS/storefront integration is present, but not every section or failure path was audited. |
| H3 | Unverified | 0/4 | Design-gate risks were not exhaustively checked. |
| G1 | Pass | 4/4 | Existing plan and section/task records support SPS remediation. |
| G2 | Pass | 3/3 | Remediation order is provided below. |
| **Total** |  | **56/100** | **Weak** |

## Verified findings

Severity is based on the impact visible in source. Findings are ordered by risk; exploitability of workflow inputs depends on who can trigger the workflow.

| # | Severity | File and lines | Finding | Evidence and impact | Confidence |
|---|---|---|---|---|---:|
| 1 | High | [`Articles.ts`](../cms/src/collections/Articles.ts#L73), [`Articles.ts`](../cms/src/collections/Articles.ts#L302), and [`publish.ts`](../cms/src/hooks/publish.ts#L53) | Reporter access is not scoped to owned articles. | `create` and `update` use `isEditorial`, which includes reporters. There is no author-ownership filter, and the article `author` relationship has no field-level restriction. The publish hook blocks only a transition into `published`; it permits updates where the article was already published. A reporter can therefore create a byline under another author and edit another reporter's, including published, article. | 9/10 |
| 2 | High | [`Users.ts`](../cms/src/collections/Users.ts#L58), [`Users.ts`](../cms/src/collections/Users.ts#L119), and [`Assignments.ts`](../cms/src/collections/Assignments.ts#L51) | A user can retarget their own `authorProfile`. | Self-update is allowed on the user record, but `authorProfile` has no field-level write restriction. The selected author ID is then used to authorize author-profile and assignment access. A reporter can change the relationship to another reporter's author record and act against that reporter's profile/assignment scope. | 9/10 |
| 3 | High | [`campaign.ts`](../cms/src/lib/campaign.ts#L150) | A failed campaign-recipient query can permanently mark a campaign sent. | The query failure is converted into an empty recipient result; the flow treats that as completion and updates the campaign to `sent`. A transient database/query error can skip the mailing and suppress retry. | 9/10 |
| 4 | High | [`account.ts`](../cms/src/endpoints/account.ts#L73) | Account erasure can return success after partial failure. | Lookups, comment anonymization, owned-row deletions, and final reader deletion suppress failures. The endpoint continues and returns HTTP 200. If anonymization or a row deletion failed but the reader row was deleted, identifying data can remain without a usable reader identity to retry the erasure. | 9/10 |
| 5 | High* | [`deploy.yml`](../.github/workflows/deploy.yml#L188) and [`deploy-cloudflare.yml`](../.github/workflows/deploy-cloudflare.yml#L128) | Untrusted `reason` values are written raw to `$GITHUB_OUTPUT`. | A newline in the dispatch reason can add output records such as `target=cms` or `dry_run=false`. Downstream deploy steps consume those outputs while the confirmation check uses the original local input, so a crafted value can bypass safeguards or alter deploy mode. **Conditional:** impact depends on an untrusted party being able to trigger a workflow/repository dispatch with this value. Treat as an unsafe workflow boundary until verified and constrained. | 8/10 |
| 6 | Medium | [`bookmarks.ts`](../cms/src/endpoints/bookmarks.ts#L238) | Bookmark sync can claim success after failed writes. | Create/query failures are suppressed, then the endpoint can report `synced: true`. A client may replace its local bookmark list with an incomplete server result, and later syncs can treat that result as authoritative. | 8/10 |
| 7 | Medium | [`push.ts`](../cms/src/endpoints/push.ts#L311) | Failed push reminders are marked notified. | The sweep marks pending reminders notified after attempting sends, regardless of each send's success. A transient provider failure can therefore prevent another attempt. | 8/10 |
| 8 | Medium | [`push.ts`](../cms/src/endpoints/push.ts#L231) | The reminder sweep reads only the first 200 subscriptions. | The query has a fixed limit without pagination/cursor progression. If more than 200 subscriptions exist, later records may never be processed by repeated sweeps. | 8/10 |
| 9 | Medium | [`deploy-static.mjs`](../scripts/deploy-static.mjs#L356) and [`deploy-cms.mjs`](../scripts/deploy-cms.mjs#L407) | Failed cPanel deployment paths do not roll back destructive changes. | Static deployment removes stale files before confirming the new set landed; CMS deployment removes existing bundle paths before extraction and checks the commit sentinel afterward. A failed/no-op extract can leave production incomplete and require manual recovery. | 8/10 |
| 10 | Medium | [`index.astro`](../frontend/src/pages/index.astro#L103) and [`cms.ts`](../frontend/src/lib/cms.ts#L539) | Homepage selection ignores the editor-selected lead flag. | The homepage uses the newest item from the editorial list instead of selecting `isLead`; a newer article can displace the article the editor explicitly marked as lead. | 8/10 |
| 11 | Medium | [`Media.ts`](../cms/src/collections/Media.ts#L21) and [`Media.ts`](../cms/src/collections/Media.ts#L178) | Media-processing comments contradict active upload behavior. | The file header says uploads are converted to WebP, resized, and stripped of metadata. The `upload` config has no `formatOptions`, `resizeOptions`, or `imageSizes`; the file itself says those options are absent and originals are stored as uploaded. This is an intentional current limitation, but the contradictory header can cause operators to rely on transformations that do not happen. | 10/10 |
| 12 | Medium | [`wrangler.toml`](../frontend/wrangler.toml#L1), [`AGENTS.md`](../AGENTS.md), and live response headers | The deployed storefront uses Cloudflare despite the root project lock forbidding Cloudflare services. | Source config assigns the production custom domains to a Cloudflare Worker. A live GET to `https://shikkha24.com/` returned HTTP/2 200 with `server: cloudflare` and `cf-cache-status: HIT`. This is an unresolved policy/architecture mismatch, not an inference from docs. | 10/10 |
| 13 | Medium | [`payload.config.ts`](../cms/src/payload.config.ts#L377) and live `/admin` response | CMS admin is English-first although the root rule says user-facing UI is Bengali-only. | The active Payload i18n configuration exposes English as the supported/fallback language. The live `/admin` HTML returned `lang="en"`. The source comments describe an owner decision, but the root rule has no corresponding exception; owner intent needs to be reconciled. | 9/10 |
| 14 | Low | [`cms.ts`](../frontend/src/lib/cms.ts#L948) and [`[id].astro`](../frontend/src/pages/fact-check/[id].astro#L47) | Fact-check pages are generated from at most 100 records. | The static-path source is capped at 100 without paging. If the collection grows beyond that, later detail routes will not be generated. Current exposure was not checked. | 9/10 |
| 15 | Low | [`education.ts`](../frontend/src/lib/education.ts#L280) and [`[slug].astro`](../frontend/src/pages/study-abroad/[slug].astro#L14) | Study-abroad detail pages are generated from at most 50 records. | The static-path source is capped at 50 without paging. If the collection grows beyond that, later detail routes will not be generated. Current exposure was not checked. | 9/10 |

*The workflow finding is high impact if the dispatch boundary is reachable by an untrusted actor; the required actor/access path was not exercised in this read-only audit.

## Unverified risks

- The CMS rate limiter is an in-memory `Map`. Its protection depends on requests reaching the same process; whether production runs one or multiple CMS processes was not established here.
- The 100-record and 50-record static-route caps become user-visible only if current data exceeds those thresholds; live collection counts were not collected.
- No authenticated endpoint was exercised, no fault injection was performed, and no write operation was sent to production.
- No build, typecheck, lint, or verification script was run. The user requested read-only work; runtime/build commands can create artifacts or otherwise change state.

## Live probes

Read-only HTTP requests from this session:

- `GET https://shikkha24.com/` → **HTTP/2 200**; response headers included `server: cloudflare` and `cf-cache-status: HIT`.
- `GET https://cms.shikkha24.com/admin` → **HTTP/2 200**; returned admin HTML with `lang="en"` and the configured security headers.
- `GET https://cms.shikkha24.com/api/articles?limit=1` → **HTTP 200**, JSON response, one article in the returned document list.

These probes establish that those live surfaces responded at the probe time. They do **not** establish that every route, authenticated operation, deployment, or recovery procedure works.

## Coverage and limitations

The checkout contains **557 tracked files**. The executable/config inventory command counted **361 files** with code/config-like extensions. The inspected application and operations families total about **67,976 lines** (frontend source and Worker, CMS source, scripts, workflows, and publish watcher; root/config/data files are not all represented in that subtotal).

The requested full file-by-file read was **not achieved**:

- **Frontend:** 155 tracked paths under the reviewed frontend surfaces, including 8 binary JPG assets. The frontend review read 21 source files fully and 4 partially; **122 text/source files were not read in full**. It also read 9 runtime-adjacent files.
- **CMS:** 139 tracked paths under `cms/src`. The review was targeted, not line-by-line. The generated `payload-types.ts` was not read in full, all five generated migration JSON snapshots were omitted, and seed/verification files plus many other source files were not read end-to-end.
- **Automation/deployment:** workflows and selected deploy/backup code were inspected, but not all tracked scripts/config files were read end-to-end. The reviewer explicitly did not fully read dozens of scripts, including `check-host-fork.mjs`, `indexnow.mjs`, `optimize-images.mjs`, `verify-*.mjs`/`.sh`, `setup-env.mjs`, `with-cms.sh`, and several others.

No source fixes were made. The initial status showed `frontend/public/og-default.png` modified and `docs/assets/og-thumb-samples/build-og-default.mjs` untracked. A later status showed both paths clean and tracked in `HEAD`; this audit did not modify either path, and the shared-worktree state change cannot be attributed from the available evidence. A subsequent status showed [`Layout.astro`](../frontend/src/layouts/Layout.astro) modified; it had not appeared in the preceding status. This audit did not read, edit, or revert that file, and cannot attribute the change. The report is the only file intentionally written by this audit.

### Audit-process deviation

One live GET command accidentally redirected its public response to the outside-repository path `/tmp/audit-live-response`. The cleanup permission question could not be answered, so that exact file was left untouched. This was unintended and violated the requested no-write boundary; no further outside-repository writes or cleanup were performed.

## Recommended remediation order

1. Restrict reporter article access to owned drafts and protect the `authorProfile` relationship from self-service changes.
2. Make workflow output writing safe for multiline/untrusted inputs; ensure deploy mode and confirmation use one validated source.
3. Make newsletter, account-erasure, bookmark-sync, and push-sweep operations fail visibly or remain retryable when sub-operations fail.
4. Make deployment replacement atomic or preserve a known-good release for rollback.
5. Resolve the Cloudflare and English-admin policy conflicts explicitly with the owner.
6. Correct media-processing comments to match the actual upload path; separately decide whether server-side image transformations are required.
7. Complete the requested file-by-file audit before treating this report as comprehensive; then measure mobile, accessibility, performance, and route-count gates using explicitly approved read-only-safe validation.

## Evidence labels

- **Known:** Source code and manifests inspected; live HTTP statuses/headers listed above.
- **Assumed:** Workflow-output impact assumes an actor can supply a newline-bearing dispatch value; the exact trust boundary was not exercised.
- **Unverified:** All behavior that would require authenticated requests, a runtime fault, full builds/tests, current collection counts, or inspection of files not read end-to-end.

## Waiting decision

This is a read-only audit report only. No remediation or further code changes were started.
