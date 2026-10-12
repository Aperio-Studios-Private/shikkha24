# Audit verification — `NewsPortal-Fix-Guide.md` (2026-10-11)

**Verdict on the guide as a whole: useful, but it must not be worked through as written.**
Roughly **two-thirds of its claims hold**, but it contains **five proposed fixes that would make
things worse or break the build**, and several severe claims are stale — several of its "critical"
items were already fixed earlier the same day.

Every row below was checked against the code, not read. Line numbers are the audit's unless noted.

---

## Scoreboard

| Group | TRUE | PARTLY | FALSE | FIXED | Not verifiable |
|---|---|---|---|---|---|
| A (critical) | 1 | 2 | 0 | 2 | 0 |
| B (frontend) | 10 | 3 | 1 | 0 | 0 |
| C (CMS) | 9 | 5 | 0 | 0 | 0 |
| D (ops/CI) | 5 | 4 | 0 | 0 | 0 |
| E (docs/owner) | 2 | 2 | 0 | 1 | 2 |

---

## ⚠️ The five fixes in the guide that would make things worse

These are the reason not to work the list top-to-bottom.

| Item | The guide says to do this | What actually happens |
|---|---|---|
| **C-02** | Restrict `correctAnswer` to `isEditorial` | **Silently breaks the quiz.** Grading happens in the browser, so answers arrive empty and every option marks wrong. Worse, `verify-s8.mjs` still passes — it only checks the string `"answer"` appears, and `{"answer":""}` contains it. **The breakage would not be detected.** |
| **C-05** | Gate `/api/newsletter/status` behind auth | **Removes the newsletter form from every page.** The Astro build calls it unauthenticated to decide whether to render signup at all. Dropping `sendTriggerEnabled` also fails `verify:engagement`. |
| **C-13** | Remove `sharp` from `cms/package.json` | **Breaks module resolution at boot.** `sharp` is absent from the Payload *config* but still imported by `lib/id-card.ts`, which is mounted in the production config. Same failure family as the recorded `@swc/helpers` boot bug. |
| **C-03** | Change `CitizenSubmissions.create` to `noOne` | Removes the admin panel's ability to file a submission by hand — Payload's admin create control obeys the same rule. A real regression for triage. |
| **D-04 / T-06** | Compare config fields against the newest snapshot directly | **The gate could never go green.** `users.roles` is `hasMany`, so Payload models it as a `users_roles` pivot *table*, not a column. The snapshot was correct all along; the fix would demand a column the generator will never emit. |
| **D-07** | `??` → `\|\|` in `remoteArchiveName()` | Swaps one colliding constant for another (`cms-deploy-.zip` → `cms-deploy-local.zip`). Also breaks `verify-cpanel-deploy.mjs:917`. **Throw on a blank run id instead.** |
| **C-15** | Harmonise the 3 rate-limit-first endpoints to honeypot-first | Parses an attacker-controlled body *before* rate limiting, on the three endpoints doing the most DB work per request. Strictly worse. The real defect is one overclaiming sentence in `lib/http.ts`. |

---

## Stale claims — already fixed before the guide was written

| Item | Guide says | Reality |
|---|---|---|
| **A-04** | 🔴 CI red on CLS, 0.0439, fix "left uncommitted" | **Fixed and committed** (`06feb5b`, `ccdd0d2`). The `Lighthouse gate` step concludes **success**; article CLS is 0.0084. The fix was not "prepared" — it shipped. |
| **A-01** | 🔴 Production admin rejects ALL writes | Migration + bootstrap both exist and are shipped. `.sps/tasks.md` is the stale part — it still says `todo` while the code is deployed. |
| **E-04** | 🟡 Media count drop unexplained | Already tracked as **T-12**, with confounds ruled out and a falsifiable 30-second test written. |

---

## Claims that are wrong outright

- **B-01 — "the print button is dead because the CSP blocks inline handlers."** The frontend has
  **three** CSP profiles; only the default is strict. `ShareRow` renders on the article route,
  which is served by `SHIKKHA24_CSP_ARTICLE` — it *does* include `'unsafe-inline'`. The button works.
  The guide concluded "no `.htaccess`", which is a dotfile-glob artefact, then generalised one of
  three profiles site-wide. **Acting on this would regress a working button.**
- **B-14a — "TrendingList is mislabelled."** It is a documented, deliberate disclosure; the
  component's own header argues the case at length.
- **B-14b — "`#173404` on `#eaf3de` is unreadable in dark mode."** That is ~12:1 contrast, passing
  WCAG AAA, and the pair is *identical* in both themes because the background is a hardcoded literal.
  The claim fails on arithmetic.
- **B-15** — `SocialLinks` cannot emit `d={undefined}`; the icon set and the platform union are
  closed and identical. Only 2 of 5 "stale comments" are actually stale.

---

## Where the guide is right, and matters

Re-ranked by real impact, not by the severity labels it chose:

1. **C-06 🟠→ effectively 🔴** — the ID-card/photocard endpoints call `sharp`, which **cannot load on
   this host** (libvips needs a worker per core; the host returns `ERR_SERVER_NOT_RUNNING` on fork).
   Expected behaviour is an uncaught throw → **500 per request**, not merely an expensive one. The
   photocard is the `og:image` fallback and is in the share row. *Inference, not measured — one
   `curl` of `/api/photocard/:id.png` on the host settles it.*
2. **B-06 🟠** — a **live correctness bug**. `getArchiveBuckets` buckets by Asia/Dhaka but
   `getArticlesByMonth` filters on UTC boundaries. Bangladesh is UTC+6 with no DST, so anything
   published 00:00–06:00 local lands in a different month in the nav than in the body.
3. **C-01 🟠** — `ResultLinks` is the only collection whose publish state is enforced only in the
   consumer. **The proposed fix is safe** — no inbound relationships.
4. **B-05 🟠** — self-contradicting within one file: the comment promises a suspended reporter gets
   a "not active" card, the code 404s them.
5. **B-09 🟠** — `javascript:` in a CMS `importantLinks`/`website`/`admissionUrl` field executes on
   click. `contact.astro` is real too, but via a different mechanism: it **bypasses** the existing
   `socialLinks()` helper rather than missing a sanitiser.
6. **D-05 🟡→ effectively 🟠** — `verify-search-init.mjs` is not merely *capable* of passing
   vacuously; **it is doing so on every run today** in both `ci.yml` and `deploy.yml`. linkedom is
   not installed and not a dependency. It is the only test of `public/search-init.js`.
7. **D-03 🟡** — `verify-cms-sync.mjs` caps at 100 and prints `PASS 100/100` for `institutions`,
   which holds **724 rows**. 624 are never checked and the output reads as full coverage.
8. **C-11d** — the audit stopped one file short: `demo-purge.ts:274` repeats the false WebP claim,
   and **`docs/security.md:155`** ("everything raster is re-encoded to WebP and capped at 2000px")
   is a *security* document making a false claim about upload behaviour.
9. **C-11e** — `systemManagedField` is **entirely unused** (one grep hit: its own definition).
   Under rule 1, delete it rather than edit its comment.
10. **E-01** — correct, and the staleness has spread further than the guide notes: `.sps/plan.md`,
    `.sps/profile.md`, `docs/master-plan.md`, `docs/stack-research.md`, and
    `docs/dianahost-provisioning-checklist.md` (which quotes a *third* figure).

### Notable corrections to real findings

- **A-02** — the defect is real but the **failure mode is wrong**. Line **237**, not 238. curl does
  *not* die: with `--fail` and two positionals it tries the second URL and **exits 0**, writing the
  archive to **stdout** instead of the destination. It fails later as an ENOENT on `latest.txt`.
  A second defect the guide missed: the `--proto` allowlist is **silently dropped** too.
- **B-11** — all three caps are real; **every line number is wrong**. The gallery cap (200) is the
  worst case, not the 50-item study-abroad one.
- **C-08** — the literal `نزدیکٹے` **does not exist** in the file in any Unicode normalisation. The
  real fragment is at `push.ts:281`.
- **C-10** — line 172-173, and exposure is to **authenticated staff**, not the public.
- **D-09** — "unmarked" is wrong. `engines: node >=22.12.0`, `.nvmrc`, and all four workflows pin 24.
- **D-06 / D-09** — both scripts are **not run by CI at all**; the flakiness is dev-local only.
- **B-12** — the lockfile is **gitignored npm residue**, not committed drift.
- **C-12** — the purge tooling is solid and correctly guarded, but "24 demo articles live in
  production" is **not verifiable from the repo** and is contradicted by `.sps/handoff.md:530`.

### Already deliberate, documented, and correctly so — leave alone

- **C-07** (`ipFromHeaders` takes the last hop) — fix **F-13**, documented with a spoof table and the
  single-trusted-hop precondition.
- **C-14b** (stateless reader sessions) — the trade-off is argued in `endpoints/oauth.ts:279-287`.
  One revocation path the guide missed: **deleting the reader row invalidates the cookie.**
- **C-04** (reader cannot delete own bookmarks) — **cosmetic**; `/toggle` already deletes.
- **E-05** (706/724 institutions lack `discipline`) — a **documented, evidence-backed deferral**
  after two automations were tested and rejected on evidence.

---

## 🔴 Found during verification, not in the guide

**CI is currently failing on artifact storage quota, and it is masking the dependency audit.**

Run `38203976878` fails on `Upload frontend build output` and `Upload standalone bundle` —
`Failed to CreateArtifact: Artifact storage quota has been hit`. Because the job fails first,
**`Dependency audit` is skipped**, so CI has not actually reported the audit in that run.

Every other step passed, including `Lighthouse gate` and `Build (CMS, standalone)`. This is a
separate blocker from T-10 and it must be cleared before the audit's status can be read from CI
at all.

---

## Recommended order (correcting the guide's)

1. **C-06** — confirm the photocard endpoint on the host with one `curl`. If it 500s, a share
   feature is dead in production.
2. **Clear the artifact quota**, so CI reports the dependency audit again.
3. **B-06** — archive month boundaries disagree with the body. Small, real, user-visible.
4. **C-01** — the one security fix in the CMS that is both real and safe to apply.
5. **D-05** — make `verify-search-init.mjs` fail rather than skip; it is inert today.
6. **D-03** — fail when `totalDocs > 100` instead of reporting partial coverage as full.
7. **A-02** — fix the argv, and add the missing counter-proof. The guide's fix is right; its
   description of what happens is not.
8. Then the comment-only batch (C-11a–e, D-02, B-04) — cheap, and two of them are actively
   misleading (C-11a could invite re-adding a literal secret; C-11d contradicts `docs/security.md`).

**Do not** apply C-02, C-03, C-05, C-13, C-15, D-04 or D-07 as written.