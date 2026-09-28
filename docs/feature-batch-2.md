# Feature Batch 2 — Reporter System, Photocard, Live TV, Reactions, Photo Story

**Created:** 2026-09-18 · **Status:** 🚧 **S13 BUILT · S14–S17 specified and approved, not started**
**Requested by:** owner, 2026-09-18
**Builds on:** `docs/education-feature-inventory.md` (approved 2026-09-11) + `.sps/plan.md` S0–S12
**Index:** `docs/feature-register.md` — the single answer to *"is feature X built, and where?"*

> **Why this document exists (rule 13).** The owner requested 11 features on 2026-09-18.
> Six of them are **already built** and need no work; the remaining five are new and were
> not covered by the approved plan. Per rule 13 the docs are amended **before** any code is
> written, and this document is that amendment's specification.

---

## Build outcomes — read this first

| Section | Feature | Status |
|---|---|---|
| **S13** | Reporter verification + assignment + submission | ✅ **BUILT 2026-09-18** — see §2.5 |
| **S14** | QR ID card + photocard | ✅ **BUILT 2026-09-28** — see §3 and `.sps/section-todos/S14.md` |
| **S15** | Live TV | ✅ **BUILT 2026-09-28** — see §4 and `.sps/section-todos/S15.md` |
| **S16** | Reader reactions | ✅ **BUILT 2026-09-28** — see §5 and `.sps/section-todos/S16.md` |
| **S17** | Photo story + video news | ⬜ Specified, not started |

**Not covered by this batch but built in the same period:** the fact-check section
(`/fact-check`), the official social links, the developer credit, and the CMS rebuild
notice. All are recorded in `docs/feature-register.md` §2.

**Removed in the same period:** the `Jobs` collection — a strict subset of `Circulars`.
See `docs/feature-register.md` §3.

---

## 0. Owner decisions recorded 2026-09-18

| Question | Decision | Decided by |
|---|---|---|
| Live TV video source | **Both YouTube and Facebook** — the CMS stores the provider and the page picks the right player | Owner |
| Photocard → Facebook | **Share button only.** No Graph API, no page token, no app review | Owner |
| Reporter portal | **Agent's choice: best + most secure practice, mobile-friendly** → see §1.3 | Owner (delegated) |
| Build order | **Agent's choice** → S13 → S14 → S15 → S16 → S17 (dependency-ordered) | Owner (delegated) |

---

## 1. Feature disposition — what is already built

Six of the eleven requested features are **complete**. They are recorded here so nobody
rebuilds them.

| # | Requested feature | Status | Evidence |
|---|---|---|---|
| 6 | Online Voting / Poll System | ✅ **Built (S8)** | `cms/src/collections/Polls.ts`, `PollVotes.ts`, poll island, vote endpoint, self-hides without a CMS origin |
| 7a | Comment System | ✅ **Built (S4/S9)** | `Comments.ts`, `CommentSection.astro`, `POST /api/comments/submit` (mounted on the collection — see `.sps/handoff.md`) |
| 8 | Live Weather Update | ✅ **Built (S3)** | Open-Meteo, `lib/widgets.ts`, `HeaderWidgets.astro`, ipwho.is geolocation, feature-flagged |
| 9 | নামাজ / ইফতার / সাহরি times | ✅ **Built (S3)** | Aladhan API, `lib/prayer.ts`, Hijri with −2 day correction. Fajr = সাহরি ends, Maghrib = ইফতার |
| 11 | Multiple Advertisement Placement | ✅ **Built (S7)** | `AdSlot.astro` (zero-CLS), `AD_POSITIONS` contract, `AdUnits.ts`, AdSense on `requestIdleCallback`, sponsored template, CSP verified by real Apache |
| 12 | Secure Admin Panel & Security | ✅ **Built (S0/S1/S7)** | Payload admin, 5 RBAC roles, account lockout (5 attempts / 10 min), field-level access, two-profile CSP, rate limiting, honeypot, `pnpm audit` in CI |
| 10a | Photo Gallery | ✅ **Built (S9)** | `PhotoGalleries.ts`, `/gallery`, `/gallery/[slug]` |

**Genuinely new work — five sections, S13–S17:**

| Section | Covers | Requested as |
|---|---|---|
| **S13** | Reporter verification + assignment + news submission | #2, #4 |
| **S14** | QR reporter ID card + automatic photocard | #3, #1 |
| **S15** | Live TV (YouTube + Facebook) | #5 |
| **S16** | Reader reactions | #7 (reaction half) |
| **S17** | Photo story + video news | #10 (missing half) |

---

## 2. S13 — Reporter Management, Verification, Assignment & Submission

Covers requested features **#2** (Reporter Management & Verification System) and
**#4** (Reporter Account → News Submit & Assignment System).

### 2.1 What already exists (do not rebuild)

| Piece | Where |
|---|---|
| `reporter` RBAC role | `cms/src/access/roles.ts` |
| Reporter login account | `Users.ts` (auth, lockout, `roles` field-level-restricted to Super Admin) |
| Public author profile | `Authors.ts` (name, designation, bio, photo, `pressCardNo`, social) |
| Reporter → profile link | `Users.authorProfile` → `authors` |
| Draft → review → publish | Payload's built-in drafts + versions |
| Article field-level permissions | `Articles.ts` + `access/roles.ts` |
| Reader tip queue | `CitizenSubmissions.ts` (readers, **not** reporters) |

### 2.2 What is missing — the actual build

**A. Verification model (`Authors` gains a `verification` group)**

| Field | Type | Access | Why |
|---|---|---|---|
| `reporterId` | text, unique, indexed | read: anyone · **create/update: editors only** | Stable public identifier, e.g. `SHK-R-2026-0001`. Auto-generated by a `beforeValidate` hook — never hand-typed, so it cannot be duplicated or guessed |
| `verificationStatus` | select: `unverified` · `pending` · `verified` · `suspended` | read: anyone · **update: editors only** | ⚠️ **A reporter must not be able to verify themselves.** This is the same class as `Users.roles` — hiding a field in the UI is not authorisation |
| `verifiedAt` | date | read: anyone · update: editors only | Shown on the public profile; proves the badge is not decorative |
| `verifiedBy` | relationship → `users` | **read: authenticated only** · update: editors only | Audit — who vouched, and when |
| `verificationNote` | textarea | **read: authenticated only** | Internal reason, never public |
| `validUntil` | date | read: anyone · update: editors only | Press credentials expire; the public profile must show an expired card as expired |
| `joiningDate` | date | read: anyone · update: editors only | E-E-A-T |
| `beat` | select, hasMany | read: anyone · update: editors only | Education beat: স্কুল · কলেজ · বিশ্ববিদ্যালয় · মাদ্রাসা · পরীক্ষা · বৃত্তি · ভর্তি · চাকরি |
| `district` | relationship → `districts` | read: anyone · update: editors only | Reporter coverage area — reuses the existing 64-district taxonomy |

**B. `Assignments` collection (new)**

The editorial workflow that does not exist today: an editor assigns a story to a reporter,
the reporter accepts, files a draft, and the editor reviews.

| Field | Type | Notes |
|---|---|---|
| `title` | text, required | The story as assigned |
| `brief` | textarea | What to cover, angle, sources |
| `assignedTo` | relationship → `authors`, required | ⚠️ Access: a reporter reads **only their own** |
| `assignedBy` | relationship → `users` | Audit |
| `dueAt` | date, indexed | Drives the "due soon" sort |
| `priority` | select: `normal` · `high` · `urgent` | |
| `status` | select: `assigned` · `accepted` · `inProgress` · `filed` · `approved` · `rejected` | Editors move to `approved`/`rejected` |
| `filedArticle` | relationship → `articles` | Links the assignment to what was actually written |
| `editorNote` | textarea | Review feedback |
| `district` | relationship → `districts` | Optional location |

**Access rule (the important part):**

```
read:   reporter → only rows where assignedTo is their own author profile
        sectionEditor / editorInChief / superAdmin → all rows
create: sectionEditor / editorInChief / superAdmin
update: the assigned reporter may move assigned→accepted→inProgress→filed
        only editors may set approved / rejected, or reassign
delete: superAdmin only
```

**C. Reporter workspace — a Payload custom admin view (mobile-first)**

Decision (owner delegated): **the Payload CMS admin stays the single auth surface.**

Rationale, and why a separate frontend portal was rejected:

1. **A second login is a second attack surface.** The CMS auth already has account lockout,
   token expiry, field-level guards and an audit trail. Re-implementing that on the public
   site would duplicate the risk without duplicating the hardening.
2. **Readers and reporters must not share a table.** `Users` (staff) and `Readers` (public)
   are deliberately separate; a frontend portal would need a third identity concept.
3. **Zero extra hosting cost.** The CMS already runs on DianaHost PNR.
4. **It is already mobile-usable.** Payload 3's admin is responsive; the work is to add a
   **purpose-built reporter view** rather than to reimplement the panel.

The new view is a Payload **custom admin view** at `/admin/reporter`:

- **আমার কাজ (My Work)** — the reporter's own assignments, sorted by `dueAt`, with a
  status chip. Tapping one opens a one-field "filed article" link + status control.
- **দ্রুত সংবাদ (Quick news)** — a deliberately minimal mobile form: headline, category,
  district, body, photo. It creates a **draft** Article owned by that reporter. No publish
  control is rendered — a reporter cannot publish, which is enforced server-side by
  `Articles` field-level access, not by hiding a button.
- Both screens are single-column, ≥48px touch targets, and work at 375px.

**D. Public surfaces**

- `/reporters` — the editorial team page, listing **verified** reporters only, each with a
  verification badge and a link to their profile. This is the E-E-A-T page
  `docs/seo-plan.md` §5 asks for, and it is what makes verification *visible*.
- `/reporters/[slug]` — the public profile (extends the existing `/author/[slug]` pattern),
  showing the badge, `reporterId`, `validUntil` (and an **expired** state when past),
  beat and district.
- The article byline (`AuthorCard.astro`) gains a small verification mark next to a
  verified author's name.

**E. Security requirements (non-negotiable)**

| Requirement | Implementation |
|---|---|
| A reporter cannot self-verify | `verificationStatus` / `verifiedAt` / `verifiedBy` / `validUntil` are **field-level** `update: editor+` |
| A reporter cannot read another's assignment | Collection `read` access filters by `assignedTo` — not a UI filter |
| A reporter cannot publish | `Articles._status` field-level `update: editor+` (already in place) |
| A reporter cannot escalate their own role | `Users.roles` field-level `update: superAdmin` (already in place) |
| `reporterId` cannot be forged | `beforeValidate` hook; `unique: true` at the DB level |
| Verification is auditable | `verifiedBy` + Payload versions on `Authors` |
| Reporter PII stays private | `verifiedBy`, `verificationNote` are `read: authenticated` |

---

### 2.5 S13 build outcomes — ✅ BUILT 2026-09-18

Everything in §2.2 was implemented. Commits `dafa1cf`, `32f4427`, `517b69f` era.

**CMS**

| Piece | Where |
|---|---|
| Verification block on `Authors` | `reporterId` (unique, hook-generated `SHK-R-YYYY-NNNN`, Dhaka-anchored year, **not** create-only so it backfills), `verificationStatus`, `verifiedAt`, `verifiedBy`, `verificationNote`, `validUntil`, `joiningDate`, `beat`, `district` |
| `Assignments` collection | title, brief, `assignedTo`, `assignedBy`, `dueAt`, `priority`, `status`, `filedArticle`, `district`, `editorNote` |
| Hooks | `assignReporterId`, `stampVerification`, `guardAssignmentStatus`, `guardPublishStatus` |
| Endpoint | `POST /api/reporter/quick-draft` |
| Admin view | `/admin/reporter` — আমার কাজ + দ্রুত সংবাদ |
| Entry points | `afterNavLinks` + `beforeDashboard` |

**Frontend**

| Piece | Where |
|---|---|
| `/reporters` | Verified reporters **only** — filtered in the CMS query, so an unverified record never enters the build |
| `/reporters/:slug` | Badge, `reporterId`, `validUntil` (with an **expired** state), beat, district |
| Byline mark | `AuthorCard.astro` — 17 article pages carry it |
| `VerificationBadge.astro` | Shared by the team page, the profile and the byline |

**⚠️ Four defects found and fixed during the build — all were live:**

1. **A reporter could publish their own article.** `Articles` claimed the collection
   `update` access kept publishing to editors. It does not: that access is
   `isEditorial`, which **must** include reporters so they can save drafts, and
   `_status` carried no field-level restriction. `PATCH {"_status":"published"}`
   published an unreviewed story. → `guardPublishStatus` **throws** on the
   transition into `published` for non-editors. It throws rather than stripping
   the field, because a stripped write returns 200 and the reporter believes the
   story went live.
2. **`isSelfOrAdmin` cannot be used on `authors`.** It compares the document id to
   the **user** id — right for `users`, wrong here, where the link is
   `Users.authorProfile → authors`. A reporter got a flat **403 editing their own
   profile** while the comment claimed the opposite. → `isOwnAuthorProfileOrEditor`.
3. **`req.user` does not carry relationship fields.** `req.user.authorProfile` and
   `/api/users/me` both return `undefined` even though the column is set and a
   depth-0 read returns the id. The workspace therefore told a reporter with a
   valid profile that they had none, and the quick-draft form was unreachable — a
   failure that looks like missing data rather than a bug. → read the document back
   explicitly with `findByID` + `user` + `overrideAccess: false`.
4. **The timezone fix had shipped two broken imports.** `CommentSection.astro` and
   `DeadlineStrip.astro` called `formatBnBd` without importing it. `tsc` never
   checks `.astro` frontmatter, so it was neither a type nor a lint error, and the
   thin build hid both. → new gate `pnpm verify:astro-imports`, counter-proved.

**Verification**

- `pnpm --filter @shikkha24/cms verify:reporter` — **32/32**, including the
  quick-draft whitelist: a hostile body (`_status: published`, `isBreaking`,
  `isLead`, `reviewStatus: approved`, another `author`, a backdated `publishedAt`)
  is accepted as a request but **none of it reaches the database**, and **the
  byline is the reporter's own profile, not the one in the body**.
- 149-page build; `verify:links` all resolve; `verify:build-output` deployable.

**⚠️ Not verified, and recorded as such:** the **rendered** admin view. Payload
admin views hydrate client-side, so an authenticated `curl` returns the admin
**shell** (200, `__next_r`, `#portal`) — a 200 proves the route is registered and
nothing more. A render harness was written and then **removed** rather than shipped
as a check that always fails. **The view needs a manual browser check.**

---

## 3. S14 — QR Reporter ID Card & Automatic Photocard

Covers requested features **#3** (QR Code সহ Automatic Reporter ID Card) and
**#1** (Automatic Photocard তৈরি + Facebook Post).

### 3.1 New dependency

| Package | Version | License | Justification |
|---|---|---|---|
| `qrcode` | pinned exact at install | **MIT** | Server-side QR generation to a PNG buffer. Runs in Node (build/CI/CMS), never in the browser. `sharp` 0.35.4 is **already installed** and does the compositing |

No other dependency. No canvas native build (sharp is prebuilt), no paid service.

### 3.2 Where generation runs — and why not in the browser

**Decision: server-side, at the CMS, on demand, behind a Payload endpoint.**

| Option | Verdict |
|---|---|
| Build-time (Astro) | ❌ Every reporter/card change forces a full rebuild, and the CI quota is a recorded constraint |
| **CMS endpoint + sharp** | ✅ Runs where `sharp` already lives, cached hard, no rebuild |
| Client-side canvas | ❌ Cannot be pixel-perfect across devices, and a reader could forge a card |

**Endpoints (both authenticated or public-read as noted):**

- `GET /api/idcard/:reporterId.png` — the reporter ID card. **Public read** (a scanned card
  must resolve for anyone), but the data it exposes is exactly what `/reporters/[slug]`
  already publishes — nothing new is leaked.
- `GET /api/photocard/:articleId.png` — the social photocard for an article. Public read.

Both set `Cache-Control: public, max-age=86400` and are versioned by the record's
`updatedAt` (`?v=<epoch ms>`), the same cache-busting pattern the favicon fix established.

### 3.3 Card composition (sharp)

**Reporter ID card** (portrait, 1000×1600):
brand header · reporter photo · name (Bengali) · designation · `reporterId` ·
`pressCardNo` · blood group · `validUntil` · beat · a QR code → `https://shikkha24.com/verify/<reporterId>`

**News photocard** (square, 1200×1200):
article featured image (cover-cropped) · category chip · headline (Bengali, wrapped, clamped) ·
date via `formatBnBd()` · the Shikkha24 wordmark · a QR code → the article's canonical URL.

⚠️ **Headline wrapping must use the same Dhaka-anchored date helper** (`formatBnBd`) — the
timezone contract applies to generated images too.

### 3.4 QR verification route

`/verify/[reporterId]` — a **static** page generated at build from the `authors` collection.

- 2 path segments → no collision with the 3-segment article CSP rule (the recorded M15 trap).
- Renders: photo, name, designation, `reporterId`, verification status, `validUntil`.
- An unknown or suspended ID renders a clear **"যাচাই করা যায়নি"** state — never a blank page.
- Because the site is static, a newly verified reporter's page appears at the next build.
  The CMS already triggers a rebuild on change (debounced), so this is bounded and acceptable.

### 3.5 Facebook — share button only (owner decision)

No Graph API, no page token, no app review. The photocard page offers a
**"ফেসবুকে শেয়ার করুন"** button using the standard share dialog
(`https://www.facebook.com/sharer/sharer.php?u=<canonical>`), plus a **download** link for
the PNG so an editor can attach it manually.

⚠️ The share dialog is a **link the reader taps**, not an automatic request — so it adds no
third-party call on page load and does not disturb the CSP or the LCP budget.

---

## 4. S15 — Live TV

Covers requested feature **#5**.

### 4.1 Provider decision (owner: both)

New collection **`LiveStreams`**:

| Field | Type | Notes |
|---|---|---|
| `title` | text, required | e.g. "বাজেট ২০২৬ সরাসরি" |
| `provider` | select: `youtube` · `facebook`, required | Drives the player |
| `videoId` | text | YouTube video id |
| `pageUrl` | text | Facebook video/page URL |
| `isLive` | boolean, indexed | The page shows the stream only while this is true |
| `scheduledStart` / `scheduledEnd` | date | For the "আসছে" state |
| `description` | textarea | |
| `poster` | upload → media | Shown before the player is tapped |

### 4.2 Route

`/live-tv` — a **click-to-load** player, matching the existing video-embed pattern:
no iframe is created until the reader taps play, so the page makes **zero third-party
requests on load** and the LCP budget is untouched.

- No active stream → the page shows the schedule and the most recent recording, or
  self-hides entirely if the collection is empty.
- Uses `youtube-nocookie.com` for the YouTube player (sets no tracking cookie until playback).

### 4.3 ⚠️ The CSP problem this creates — a third profile is required

This is the single most important technical finding of this batch.

The current two profiles are:

| Profile | `frame-src` |
|---|---|
| Strict | `'none'` |
| Relaxed (`SHIKKHA24_CSP_RELAXED`) | ad domains **only** — no video |
| Article (`SHIKKHA24_CSP_ARTICLE`) | `youtube-nocookie.com` + `youtube.com` + ads |

`/live-tv` needs **YouTube *and* Facebook** iframes. Neither existing profile fits:

- Tagging it `RELAXED` → **the iframe is blocked** (no video in `frame-src`).
- Tagging it `ARTICLE` → works, but the env var is named `_ARTICLE` and using it for a
  non-article route is exactly the semantic drift `.sps/handoff.md` warns about.
- Extending `RELAXED` to include video → **a security regression**: the homepage, every
  category listing and `/quiz` would all gain iframe permission they do not need.

**Decision: add a third profile, `SHIKKHA24_CSP_MEDIA`, for `/live-tv` only.**

```
SetEnvIf Request_URI "^/live-tv/?(\?.*)?$" SHIKKHA24_CSP_MEDIA=1
```

with `frame-src` = YouTube + Facebook + ad domains (the route carries an ad slot).

**Consequences that must be handled in the same commit:**

1. `scripts/verify-apache.mjs` currently derives the expected profile from the presence of
   `data-ad-slot` (the corrected logic from M16). A third profile breaks that assumption —
   the harness must learn that `/live-tv` is an **ad-bearing media route** and expect
   `SHIKKHA24_CSP_MEDIA`, while every other ad-bearing route still expects `RELAXED`.
2. `docs/security.md` §5 must document the third profile.
3. `verify-build-output.mjs` should assert the `/live-tv` rule exists (counter-proved by
   injecting its removal).

⚠️ **Facebook embed domain:** `https://www.facebook.com` (the plugin URL is
`/plugins/video.php`). Adding it widens `frame-src` on exactly one route, not sitewide.

---

## 5. S16 — Reader Reactions

Covers the reaction half of requested feature **#7** (comments are already built).

### 5.1 Model

New collection **`Reactions`**:

| Field | Type | Notes |
|---|---|---|
| `article` | relationship → `articles`, required, indexed | |
| `type` | select: `like` · `love` · `wow` · `sad` · `angry` | |
| `reader` | relationship → `readers` | Present when signed in |
| `fingerprint` | text, indexed | Hashed IP + UA for anonymous dedupe — **never** a raw IP |

A compound unique index on `(article, type, reader)` and `(article, type, fingerprint)`
prevents double-counting at the **database** level, not merely in the UI.

### 5.2 Endpoint

`POST /api/reactions/toggle` — mounted **on the collection** with a collection-relative
path, following the `Comments` lesson (a root-mounted `/reactions/toggle` would be swallowed
by the collection router and 404, exactly as `/comments/submit` was).

Per-IP rate limit + honeypot, matching `citizen.ts`.

### 5.3 Frontend

A reaction bar island below the article body:

- **Self-hides** when `getPublicCmsOrigin()` is null — the S8 rule, unchanged.
- Shows optimistic counts, reconciled with the response.
- Reads a local flag to render the reader's own choice, but the **server** is the authority.
- Accessible: a `radiogroup` with a live-region count, not a bare emoji button row.
- Zero third-party requests; the counts are fetched once, on tap.

⚠️ **Aggregate counts must not be computed at build time** for the island — that would bake
stale numbers into static HTML. Counts are read at runtime from the CMS.

---

## 6. S17 — Photo Story & Video News

Covers the missing half of requested feature **#10** (the gallery already exists).

### 6.1 Photo story

A **new article layout**, not a new collection — a photo story is an article with a
different presentation, and a separate collection would split SEO authority and duplicate
the editorial workflow.

- `Articles.layout` gains `photoStory`.
- A `photoStory` content-block array: `image`, `caption`, `credit`, `fullBleed` (boolean).
- Rendered by a distinct template: full-bleed images, caption beneath, scroll-linked.
- ⚠️ **Zero-CLS is mandatory** — every image reserves its box via `aspect-ratio` from the
  media record's true dimensions, the same rule `ArticleCard.astro` already follows.
- JSON-LD: `ImageGallery` on the article page when `layout === 'photoStory'`.

### 6.2 Video news

- `Articles.videoUrl` + `Articles.videoProvider` (youtube/facebook), optional.
- An article with `videoUrl` renders the click-to-load player **above** the body.
- `/video` — a hub listing every article that carries a video, reusing the existing
  listing + pagination components.
- ⚠️ `/video` is 1 segment → **strict CSP** → the player is click-to-load, so the iframe is
  created only after a tap. But a tap **is** blocked by strict `frame-src 'none'`.
  → `/video` must be tagged with the new `SHIKKHA24_CSP_MEDIA` profile from S15, **or**
  `/video` must not embed and must link out instead.
  **Decision: tag `/video` with `SHIKKHA24_CSP_MEDIA`** — it is the same "embeds third-party
  video" category as `/live-tv`, which is exactly why the profile is named `MEDIA` and not
  `LIVETV`.

---

## 7. Build order and dependencies

```
S13 Reporter System ──┬──> S14 ID Card + Photocard   (needs verified reporters)
                      │
S15 Live TV ──────────┴──> S17 Video News           (needs the MEDIA CSP profile)
S16 Reactions         (independent)
```

| Order | Section | Depends on | Why this position |
|---|---|---|---|
| 1 | **S13** Reporter System | — | Foundation; S14's ID card renders verified reporter data |
| 2 | **S14** ID Card + Photocard | S13 | Needs `reporterId` + `verificationStatus` to exist |
| 3 | **S15** Live TV | — | Introduces the `MEDIA` CSP profile that S17 reuses |
| 4 | **S16** Reactions | — | Independent; small |
| 5 | **S17** Photo Story & Video News | S15 | Reuses the `MEDIA` profile and the click-to-load player |

---

## 8. Constraints honoured (checked, not assumed)

| Constraint | How this batch complies |
|---|---|
| **No card at signup** | Every piece is self-hosted or a free embed. No new service |
| **Zero recurring cost** | `qrcode` is MIT and runs locally; YouTube/Facebook embeds are free |
| **Bengali-only UI** | Every new user-facing string is Bengali; English only in identifiers |
| **One section at a time** | S13 → S17, approval-gated |
| **Docs before code** | This document + the `.sps/` amendments land before any code |
| **Performance gates** | Live TV and video news are click-to-load (zero third-party requests on load); every new image reserves its box (CLS < 0.02) |
| **CSP least privilege** | A third profile is added rather than widening `RELAXED` sitewide |
| **`overrideAccess` whitelist** | New public endpoints whitelist keys explicitly |
| **Self-hiding islands** | Reactions and Live TV render nothing without a CMS origin |

---

## 9. Open items for the owner

| # | Item | Needed for |
|---|---|---|
| 1 | Approve this specification | Before S13 starts |
| 2 | Facebook Page URL (for the share button's canonical target) | S14 |
| 3 | Whether `validUntil` on a press card should default to +1 year | S13 |
| 4 | Confirm the reporter `beat` list above matches your desks | S13 |
| 5 | YouTube channel + Facebook Page that will host live streams | S15 |
