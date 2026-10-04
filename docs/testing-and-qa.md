# Testing, QA & Accessibility Plan — Shikkha24

**Created:** 2026-09-11 · **Status:** S0/S12 input. **Testing had only S12 checkboxes; accessibility had only a numeric target.**
**Why this exists:** "Lighthouse ≥90 accessibility" is a target, not a plan. And there was no defined answer to what gets tested, how, on which devices, or how Bengali rendering is verified.

---

## 1. Quality gates — what runs when

| Gate | Trigger | Blocks |
|---|---|---|
| TypeScript typecheck | Every CI run | Merge |
| Lint | Every CI run | Merge |
| **`.astro` frontmatter imports** (`pnpm verify:astro-imports`) | Every CI run | Merge |
| **GPA calculation** (`pnpm verify:gpa`) | Every CI run | Merge |
| Production build | Every CI run | Deploy |
| Lighthouse CI (perf + a11y budgets) | Every CI run | Deploy |
| ~~HTML validation~~ | ⚠️ **DOES NOT EXIST.** Documented here until 2026-10-04; no such step is in `ci.yml`. Either add it or stop claiming it | — |
| ~~JSON-LD / schema validation~~ | ⚠️ **DOES NOT EXIST.** Documented here until 2026-10-04; no such step is in `ci.yml`. The Rich Results Test is still a manual checklist item (§6) | — |
| Build-output check (`pnpm verify:build-output`) | Every CI run | Deploy |
| **`.htaccess` served through a real Apache** (`pnpm verify:apache`) | Every CI run | Deploy |
| **Internal links** (`pnpm verify:links`) | Every CI run | Deploy |
| **Search-init behaviour** (`pnpm verify:search-init`) | Every CI run | Deploy |
| **Reporter access control + quick-draft whitelist** (`verify:reporter`) | Every CI run | Merge |
| **Rebuild-notice placement** (`verify:rebuild-notice`) | Every CI run | Merge |
| **Social URL validation** (`verify:social`) | Every CI run | Merge |
| **Card determinism + QR target** (`verify:id-card`) | Every CI run | Merge |
| **Reaction dedupe at the database** (`verify:reactions`) | Every CI run | Merge |
| **Generated types not stale** (`verify:payload-types`) | Every CI run | Merge |
| **🔒 Access matrix — every collection × role × operation** (`verify:access`) | Every CI run | Merge |
| **Media upload rules** (`verify:media`) | Every CI run | Merge |
| **Newsletter signup + tokens** (`verify:newsletter`) | Every CI run | Merge |
| **Comments, polls, citizen submissions** (`verify:engagement`) | Every CI run | Merge |
| **Push subscription flow** (`verify:push`) | Every CI run | Merge |
| **OAuth state + reader creation** (`verify:oauth`) | Every CI run | Merge |
| **Rebuild trigger debounce** (`verify:rebuild`) | Every CI run | Merge |
| CMS read/write paths (`verify:sync`) **and** endpoint behaviour (`verify:endpoints`) | Every CI run — needs a **live CMS** | Deploy |
| `pnpm audit` | Every CI run | Policy in `docs/security.md` §9 |
| Bengali render audit | Manual, per section | Section approval |

⚠️ **This table is a claim about CI, and it has been wrong.** Until 2026-09-30 it listed
`verify:endpoints`, `verify:social` and `verify:rebuild-notice` as "Every CI run" while none of
the three ran anywhere in the workflow — the gate was documented but did not exist. All three run
now, and the table matches the workflow.

⚠️ **Two harnesses need a live HTTP server and cannot join the local-API loop:** `verify:endpoints`
and `verify:sync`. They run under `with-cms.sh` in their own step. Adding either to the
`for h in …` loop fails with `ECONNREFUSED` — a mistake worth naming, because it was made and
caught while adding `verify:access`.

**When adding a harness, add it to the workflow in the same commit**, to the loop or to the
with-CMS step depending on whether it makes HTTP requests. A gate that is only documented is not a
gate.
| Device / browser matrix | Manual, at S12 and after major UI changes | Launch |
| Restore drill | Manual, pre-launch + every 6 months | Launch (`docs/backup-and-recovery.md`) |

**The broken-link check blocks, and it is not advisory.** It was planned as "warn first"; it blocks instead, because on a fully static site an internal link is a promise that a file exists and there is no legitimate exception to break it. The warning-only posture is what let `/latest` ship a "পরের →" link to `/latest/page/2` with no route behind it — a link is still valid HTML when its target is missing, so nothing upstream fails.

All CI gates run inside the **debounced/batched build** — do not multiply CI minutes (see `docs/reliability.md`).

### 1.1 ⚠️ Why `verify:astro-imports` exists

**`.astro` frontmatter is not typechecked in this project.** `tsc --noEmit` only sees
`.ts`/`.tsx`; `@astrojs/check` is the tool that would cover `.astro`, and it rejects
TypeScript 7 — which is *why* Biome was adopted.

The consequence: an identifier used in a component's frontmatter without an import
is **neither a type error nor a lint error**. It is a `ReferenceError` at build
time, thrown **only if that component actually renders**.

That is not theoretical. The 2026-09-16 timezone fix changed `bnDate()` in
`CommentSection.astro` and `formatDate()` in `DeadlineStrip.astro` to call
`formatBnBd()`, and **both import edits silently failed**. The thin build passed,
because `CommentSection` self-hides without a CMS origin and `DeadlineStrip`
renders nothing without deadlines. It surfaced only on a **full** build against a
live CMS.

The gate scans every `.astro` file: any name exported as a runtime value from
`src/lib/*.ts` that is *used* in the frontmatter must also be *imported* there or
declared locally. Counter-proved by removing the import and watching it fail by
name. It runs **before** the build — it needs no build, and failing there is faster
and clearer than failing inside the prerender.

### 1.2 The five standing rules these gates encode

1. **A green build is not a full build.** With no reachable CMS the frontend exits
   **0** and emits ~34 pages instead of ~149. Assert the **page count**, never the
   exit code.
2. **A route nothing generates has never run.** Fixtures must cover every branch a
   route can take, or the route is unexercised. This has cost this project three
   defects.
3. **A harness that reimplements the mechanism is not evidence.** `verify-csp-routes`
   passed for three days while the `.htaccess` was unrunnable, because it
   re-implemented Apache's regex matching in JavaScript. `verify:apache` starts a
   real Apache instead.
4. **A test that pollutes the thing it tests is worse than no test.** The reporter
   harness left fixtures in the database after three crashes, and because they
   carried real slugs they generated **real pages**. Cleanup now runs in a
   `finally`, plus a startup purge of the reserved `verify-` namespace.
5. **Counter-prove every new check** — inject the defect and watch it fail. A check
   that has never failed has never been tested.
6. **Some things cannot be verified from outside.** Payload admin views hydrate
   client-side, so `curl` returns the admin **shell** (200, `__next_r`, `#portal`)
   and a 200 proves only that the route is registered. The `/admin/reporter` view
   therefore needs a **manual browser check**; the automated harness written for it
   was **removed** rather than shipped as a check that always fails.

---

## 2. Test strategy — honest scope

This is a mostly-static site. Over-engineering a test suite here would be waste.

| Layer | Approach |
|---|---|
| **Static output** | Verified by the build itself + Lighthouse CI + link/schema checks. No unit tests needed. |
| **Payload collections, hooks, access control** | **Deserve real tests** — RBAC enforcement, field-level restrictions, scheduled publishing, versioning. These are the places where a bug is silent and damaging. |
| **Astro islands (client JS)** | A small number of targeted tests for the interactive bits. **The GPA calculator is the first to have one** (`pnpm verify:gpa`) — and it earned it the hard way: its calculation lived inside a page `<script>`, nothing could call it, and three wrong answers shipped. Any island whose output a reader *relies on* should follow that pattern: pure logic in a `lib/` module, a harness over it, and a `verify:build-output` assertion that the page's DOM contract still holds. |
| **End-to-end** | A smoke test of the critical paths: publish → build → page renders. Not a full E2E suite. |
| **Editorial workflow** | Manual verification with real accounts for each of the 5 roles. |

**Explicitly out of scope:** full E2E coverage, visual regression testing, load testing at scale. Load/concurrency is covered by the S0 SQLite WAL gate, not by a test suite.

---

## 3. Accessibility

### Target

**WCAG 2.2 Level AA** as the commitment, with Lighthouse accessibility ≥90 as the automated floor. (The superseded checklist said ≥90; `.sps/plan.md` now records it. WCAG AA is the standard Google and most institutions expect.)

### Bengali-specific considerations — genuinely harder than Latin

- **Screen readers:** Bengali TTS/braille support varies by platform. Test with NVDA and TalkBack; record what actually works rather than assuming.
- **Conjunct characters (যুক্তাক্ষর):** must render correctly at every size; a broken conjunct reads as garbage to a screen reader and to a human.
- **Font fallback:** if a Bengali glyph is missing, the result is tofu (□□□). Verify the fallback chain explicitly.
- **Line-height:** ≥1.65 (already a target) — Bengali vowel signs collide at tighter leading.
- **No letter-spacing hacks.** Spacing tricks break Bengali rendering. Never apply them to Bengali text.

### Requirements

- Full keyboard operability; visible focus states; logical tab order
- Semantic HTML — real headings, real landmarks, real `<button>`s
- `prefers-reduced-motion` honoured (the site is minimal-motion by policy, but scrollytelling in S8 must respect it)
- Contrast: ≥4.5:1 for body text, ≥3:1 for large text. Dark mode must pass the same bar — the original plan claimed "WCAG AAA" for dark mode, which is unrealistic; **AA is the commitment**
- All interactive targets ≥48×48px with spacing (already a target)
- Images have meaningful Bengali `alt` text; decorative images have empty `alt`
- Form fields have real labels, not placeholder-only
- Live regions for the live blog and quiz feedback

### Automated vs manual

Lighthouse/axe catch roughly a third of real issues. **Manual keyboard and screen-reader passes are mandatory** before launch — the automated number is not the deliverable.

---

## 4. Browser and device matrix

| Target | Why |
|---|---|
| Chrome (Android) | Dominant in Bangladesh |
| **UC Browser** | Still significant in BD — verify layout and Bengali rendering |
| **Opera Mini** | Extreme data-saving mode; verify the site is readable and that data-saver mode shines here |
| Samsung Internet | Large A-series install base |
| Firefox (desktop) | Secondary |
| Chrome / Safari (desktop) | Editorial team, advertisers |

**Devices:** at minimum one low-end Android in the Symphony/Walton class (the stated target audience), one mid-range Android, one desktop.

**Widths:** 375px (primary), 390px, 414px, 768px, 1024px, 1280px+.

---

## 5. Bengali rendering audit

Run at S2 (when fonts land) and again at S12 (full audit). Check:

- [ ] All conjuncts render — test a string containing র-ফলা, য-ফলা, হ্রস্ব-ই কার, দীর্ঘ-ঊ কার
- [ ] No tofu anywhere, including in fallback states before the font loads
- [ ] Line-height ≥1.65 at every breakpoint
- [ ] Body text ≥17px on mobile
- [ ] Subsetted font files have not silently dropped glyphs used in production copy
- [ ] Numbers, dates (বঙ্গাব্দ + হিজরি) and currency render correctly
- [ ] Headline font vs body font pairing holds at all sizes
- [ ] Print stylesheet renders Bengali correctly

---

## 6. Pre-launch QA checklist

> ⚠️ **The site launched 2026-10-04 with this checklist entirely unticked, and it remains
> unticked.** That is not a record of a passed check. Two items are now known-failed rather than
> unknown:
>
> - **"Every CI gate green on the release commit"** — ❌ **currently red.** The Lighthouse
>   `cumulative-layout-shift` gate fails at 0.0436 against a 0.03 limit on the article template.
> - **"A full restore from backup performed and timed"** — ⚠️ **cannot be done.** There is no
>   backup to restore from; `backup-db.yml` has failed 6 runs out of 6. See
>   `docs/backup-and-recovery.md` §6.

- [ ] ❌ Every CI gate green on the release commit — **known red on CLS**
- [ ] Lighthouse budgets met on all measured templates (both ad and no-ad profiles)
- [ ] Manual keyboard pass on homepage, article, category, search, quiz
- [ ] Screen-reader pass with Bengali content
- [ ] Device matrix completed
- [ ] Bengali rendering audit completed
- [ ] Rich Results Test passes on every template
- [ ] News sitemap and RSS validate
- [ ] 404 and error pages verified — ✅ **done 2026-10-04** (`/` 200 153 KB, `sitemap.xml`, `rss.xml`, `archive/`, `search/` all 200)
- [ ] A full restore from backup performed and timed — 🔴 **blocked: no backup exists**
- [ ] Every editor role verified with a real account
- [ ] Social share debuggers (Facebook, X) render the correct card
- [ ] Dark mode audited for contrast
- [ ] Print view audited

---

## 7. Regression rule

After each section (S0–S12), re-run the CI gates **and** spot-check the previously approved sections. A section is not complete if it broke an earlier one — this is the practical enforcement of agent rule 6 (surgical scope) and rule 2 (approval gates).

---

## 8. Open items

- [ ] Confirm the WCAG commitment is AA (not AAA) — the original plan claimed AAA for dark mode, which is not realistic
- [ ] Decide whether Payload collection tests are worth the setup at S1 or deferred
- [ ] Source a low-end Android device for testing (or a device lab service)
- [ ] Confirm whether any free screen reader handles Bengali adequately on Android
- [ ] ~~Add the CI gates to the build workflow at S0~~ — ✅ done; 30 steps in `ci.yml`
- [ ] Add HTML validation and JSON-LD/schema validation, or delete their rows from §1. Right now
      this document promises two gates that do not exist
- [ ] Add the missing pre-launch checks that were skipped at launch (§6), now that it is overdue
      rather than pending
