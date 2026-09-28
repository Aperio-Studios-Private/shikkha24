# Shikkha24 — Master Feature Register

**Created:** 2026-09-18 · **Status:** ✅ authoritative — this is the single answer to
*"is feature X built, and where?"*

> **Why this document exists.** The owner requested a set of features on 2026-09-18
> and later asked for every detail to be recorded in one place. Features were
> documented across `docs/education-feature-inventory.md` (the original approved
> set), `docs/feature-batch-2.md` (the 2026-09-18 batch), `.sps/plan.md` (the build
> order) and `.sps/task.md` (the checklist) — four documents, no single index.
> This is that index. **If a feature is not in this table, it is not tracked.**

**How to read the status column:**

| Status | Means |
|---|---|
| ✅ **Built** | Shipped, with evidence recorded |
| 🟡 **Partial** | Some of it exists; the rest is listed |
| ⬜ **Not built** | Specified, approved, not started |
| ⛔ **Descoped** | Deliberately dropped, with the reason |

---

## 1. The owner's 12 requested features (2026-09-18)

The owner's own numbering is preserved below, including the two duplicated numbers
in the original list (there were two "9"s and two "10"s), so a re-read of that
message maps one-to-one onto this table.

| # | Feature requested | Status | Section | Where it lives |
|---|---|---|---|---|
| 1 | Automatic Photocard + Facebook Post | ✅ **Built** | S14 | `cms/src/lib/id-card.ts`, `cms/src/endpoints/id-card.ts`, `frontend/src/components/ShareRow.astro` |
| 2 | Reporter Management & Verification | ✅ **Built** | S13 | `cms/src/collections/Authors.ts` (verification block), `frontend/src/pages/reporters/` |
| 3 | QR Code Reporter ID Card | ✅ **Built** | S14 | `cms/src/lib/id-card.ts` (QR + sharp), `frontend/src/pages/verify/[reporterId].astro` |
| 4 | Reporter News Submit & Assignment | ✅ **Built** | S13 | `cms/src/collections/Assignments.ts`, `cms/src/endpoints/reporter.ts`, `cms/src/components/admin/ReporterWorkspace.tsx` |
| 5 | Live TV | ⬜ **Not built** | S15 | — |
| 6 | Online Voting / Poll System | ✅ **Built** | S8 | `cms/src/collections/Polls.ts`, `PollVotes.ts`, `cms/src/endpoints/poll-vote.ts`, `frontend/src/components/PollWidget.astro` |
| 7a | Comment System | ✅ **Built** | S4 / S9 | `cms/src/collections/Comments.ts`, `cms/src/endpoints/comments.ts`, `frontend/src/components/CommentSection.astro` |
| 7b | Reaction System | ⬜ **Not built** | S16 | — |
| 8 | Live Weather Update | ✅ **Built** | S3 | `frontend/src/lib/widgets.ts`, `frontend/src/components/HeaderWidgets.astro` |
| 9a | নামাজের সময়সূচি (prayer times) | ✅ **Built** | S3 | `frontend/src/lib/prayer.ts` |
| 9b | ইফতার ও সাহরির সময়সূচি | ✅ **Built** | S3 | same — Fajr = সাহরি ends, Maghrib = ইফতার |
| 10a | Photo Gallery | ✅ **Built** | S9 | `cms/src/collections/PhotoGalleries.ts`, `frontend/src/pages/gallery/` |
| 10b | Photo Story | ⬜ **Not built** | S17 | — |
| 10c | Video News | ⬜ **Not built** | S17 | — |
| 11 | Multiple Advertisement Placement | ✅ **Built** | S7 | `cms/src/collections/AdUnits.ts`, `frontend/src/components/AdSlot.astro`, `AdCreative.astro`, `frontend/src/lib/ads.ts` |
| 12 | Secure Admin Panel & Security System | ✅ **Built** | S0 / S1 / S7 | see §4 |

**Summary: 9 of 15 rows built · 6 not built · 0 descoped.**

---

## 2. Features added after the original 12

These were not in the owner's list. Each has a reason for existing.

| Feature | Status | Where | Why it was added |
|---|---|---|---|
| Official social links (header, drawer, footer, JSON-LD) | ✅ **Built** | `frontend/src/lib/social.ts`, `frontend/src/components/SocialLinks.astro` | Owner asked why the footer had no social links. Three surfaces were building the list independently and **none validated the URL scheme** — a stored `javascript:` value would have executed on click. |
| Developer credit (footer) | ✅ **Built** | `frontend/src/components/DeveloperCredit.astro` | Owner: the developer's WhatsApp/Facebook were styled like the site's own contact links. |
| CMS→storefront rebuild visibility | ✅ **Built** | `cms/src/lib/rebuild-trigger.ts`, `cms/src/verify/rebuild-notice.ts` | Owner: *"I have edited lots of things but those are not reflecting to the storefront."* The rebuild was silent, so publishing looked broken. |
| Fact-check section | ✅ **Built** | `cms/src/collections/FactChecks.ts`, `frontend/src/pages/fact-check/`, `frontend/src/components/FactVerdictBadge.astro` | The collection existed with **no reader and no route**. Retained feature ("fact-check radar"), scoped to admission rumours and fake result links. |
| Reporter workspace (`/admin/reporter`) | ✅ **Built** | `cms/src/components/admin/ReporterWorkspace.tsx`, `QuickDraftForm.tsx`, `ReporterNavLink.tsx`, `ReporterDashboardLink.tsx` | The mobile-first half of S13. |
| Reporter quick-draft endpoint | ✅ **Built** | `cms/src/endpoints/reporter.ts` | The generated `POST /api/articles` accepts every writable field; the mobile form must not. |
| `safeExternalUrl` (shared URL-scheme guard) | ✅ **Built** | `frontend/src/lib/url.ts` | One implementation instead of three — three copies of a security check is three chances to drift. |
| Social URL validation (CMS) | ✅ **Built** | `cms/src/lib/social-url.ts` | The field accepted the platforms' own homepages as if they were the newsroom's accounts. |

---

## 3. Removed

| Thing | When | Why |
|---|---|---|
| `Jobs` collection | 2026-09-18 | **A strict subset of `Circulars`.** Circulars' `type` already offers শিক্ষা / বিসিএস / সরকারি চাকরি / বেসরকারি চাকরি, and it carries *more* (`level`, `publishedDate`, `vacancyCount`). Two collections for one content type means the editor guesses which to use, and the site splits its own authority across two URLs. N8 already defines the Circulars tracker as *"education + BCS/job circulars"*. 0 rows lost. |

⚠️ **Job content is still fully publishable** — as an **article** in the
`চাকরি ও ক্যারিয়ার` category (`/category/jobs-career`), or as a **circular**
(`/circulars`). Only the redundant third collection was removed.

---

## 4. Already-built features — the detail

### 4.1 Online Voting / Poll (request #6) — ✅ Built, S8

| Piece | Where |
|---|---|
| Collections | `cms/src/collections/Polls.ts`, `PollVotes.ts` |
| Vote endpoint | `cms/src/endpoints/poll-vote.ts` — mounted **on the collection**, not at the root (a root path whose first segment equals a collection slug is shadowed by that collection's generated route — the `/comments/submit` 404) |
| Frontend | `frontend/src/components/PollWidget.astro` |
| Self-hiding | Renders nothing without a CMS origin |

Dedupe is at the database level, not the UI.

### 4.2 Comment System (request #7a) — ✅ Built, S4 / S9

| Piece | Where |
|---|---|
| Collection | `cms/src/collections/Comments.ts` |
| Endpoint | `cms/src/endpoints/comments.ts` → `POST /api/comments/submit` |
| Frontend | `frontend/src/components/CommentSection.astro` |

⚠️ **The endpoint is mounted on the collection, and that is load-bearing.** As a
root endpoint, `/comments/submit` made Payload parse the request as "collection
`comments`, document id `submit`" — so every reader comment returned 404.

Moderation cannot be forged: the handler writes with `overrideAccess: true` (it
must — there is no session), so the protection is that **the data object is built
key by key from a whitelist** and `isApproved` is hard-set to `false`.

### 4.3 Live Weather (request #8) — ✅ Built, S3

| Piece | Where |
|---|---|
| Source | Open-Meteo — free, **no API key** |
| Fetch | Server-side, cached, deferred so it never affects LCP |
| Geolocation | **ipwho.is** — never the browser Geolocation API (owner decision) |
| Frontend | `frontend/src/lib/widgets.ts`, `frontend/src/components/HeaderWidgets.astro` |

### 4.4 নামাজ / ইফতার / সাহরি (request #9) — ✅ Built, S3

| Piece | Where |
|---|---|
| Source | Aladhan API — free, no key |
| Frontend | `frontend/src/lib/prayer.ts` |

- **সাহরি ends at Fajr**, **ইফতার is at Maghrib** — the Ramadan times are the
  ordinary prayer times, so no separate data source is needed.
- ⚠️ **Hijri date needs a −2 day correction** against Aladhan (owner decision).
- ⚠️ Transliterated month names are matched by **normalisation**, never by
  enumerating spellings.
- The Bangla calendar shown is the **Bangladesh variant** (1963 / reformed 2019),
  not the Indian one — they differ in year start and month lengths.

### 4.5 Photo Gallery (request #10a) — ✅ Built, S9

`cms/src/collections/PhotoGalleries.ts` · `frontend/src/pages/gallery/index.astro`
· `frontend/src/pages/gallery/[slug].astro`. Self-hides with an honest empty
state. Carries **no ad slot** — no approved `AD_POSITIONS` value fits it.

### 4.6 Multiple Advertisement Placement (request #11) — ✅ Built, S7

| Piece | Where |
|---|---|
| `AD_POSITIONS` — **a contract** | `frontend/src/lib/ads.ts` — exactly one `AdSlot` per value |
| Components | `AdSlot.astro` (zero-CLS), `AdCreative.astro`, `DemoAd.astro` |
| CMS | `cms/src/collections/AdUnits.ts` |
| AdSense | Loaded on `requestIdleCallback`, **after LCP** — never render-blocking |
| Zero requests when unconfigured | With no AdSense unit, the loader returns immediately |

**Deliberate constraints:**

- **No raw-HTML ad field.** A stored-HTML field would turn a compromised Ad Manager
  account into stored XSS on every page carrying the unit.
- **No `clickCount`** — descoped.
- Paid placements are labelled **«বিজ্ঞাপন»** and their links carry
  `rel="sponsored nofollow"`. An unlabelled paid link is a Google link-scheme
  violation.
- **Mid-article ads need ≥6 paragraphs.**
- Sponsored content is excluded from the masthead and ticker but kept in the feed
  with the «বিজ্ঞাপন» label.
- ⚠️ **A route is CSP-relaxed because it RENDERS AN AD SLOT** (`data-ad-slot`) —
  not because of its JSON-LD type or its listing-ness.

### 4.7 Secure Admin Panel & Security (request #12) — ✅ Built, S0 / S1 / S7

| Control | Where |
|---|---|
| 5 RBAC roles | `cms/src/access/roles.ts` — প্রতিবেদক · বিভাগীয় সম্পাদক · প্রধান সম্পাদক · বিজ্ঞাপন ব্যবস্থাপক · সুপার অ্যাডমিন |
| Account lockout | `Users.auth` — 5 attempts, 10-minute lock, 2-hour token |
| Field-level access | Throughout; `Users.roles` is Super-Admin-only so a reporter cannot promote themselves |
| Two-profile CSP | `.htaccess` via `SetEnvIf Request_URI` + `Header ... env=` |
| Rate limiting + honeypot | `cms/src/lib/rate-limit.ts`, `lib/http.ts` |
| Dependency audit | `pnpm audit` in CI |
| Reader/staff separation | `Readers` (public) and `Users` (staff) are **separate collections** |

**Hardened after audits:**

- ⚠️ **`<LocationMatch>` is ILLEGAL in `.htaccess`** — it returns HTTP 500
  sitewide. Path matching uses `SetEnvIf Request_URI`.
- ⚠️ **`<FilesMatch>` matches the basename, not the path.**
- ⚠️ **`Request_URI` includes the query string** — patterns need `(\?.*)?$`.
- ⚠️ **A reporter could publish their own article** until 2026-09-18. `_status`
  had no field guard and the collection `update` access must include reporters so
  they can save drafts. Now `guardPublishStatus` throws on the transition into
  `published` for non-editors.
- ⚠️ **`overrideAccess: true` bypasses field-level access** — public handlers are
  protected by a key-by-key whitelist, not by field rules.
- ⚠️ **`isSelfOrAdmin` must not be used on `authors`** — it compares the document
  id to the *user* id, which are different numbers there.

---

## 5. Not built — the remaining work

### S14 — QR Reporter ID Card & Automatic Photocard (requests #1, #3) — ✅ **BUILT 2026-09-28**

**Specified in `docs/feature-batch-2.md` §3.** **Built and verified.** Full evidence, the two
exit-gate defects found, and the counter-proofs are in `.sps/section-todos/S14.md`.

Two defects were found only at verification time, and both are worth remembering:

- 🚨 The **"যাচাই করা যায়নি" state was unreachable in the built site.** The page implemented
  the branch and its comment claimed it worked, but a static build emits only the paths
  `getStaticPaths` returns — an unknown ID reached Apache's 404. Fixed with a `not-found`
  sentinel plus the file's **first `mod_rewrite` block**, `noindex`ed (it answers 200), and
  counter-proved in `verify:apache` against a real Apache.
- 🚨 **`bloodGroup` (spec §3.3) had been dropped** from both the collection and the card. It
  appeared exactly once in the repository — in the spec — so nothing flagged it. Added.

| Piece | Shipped as |
|---|---|
| Dependency | `qrcode` 1.5.4 (MIT, exact pin) + `sharp` 0.35.4 — recorded in `.sps/handoff.md` (rule 8) |
| Reporter ID card | `GET /api/idcard/:reporterId.png` — portrait 1000×1600, `Cache-Control: max-age=86400` + `ETag` from `updatedAt` |
| News photocard | `GET /api/photocard/:articleId.png` — square 1200×1200, published articles only |
| Verification route | `/verify/:reporterId` — static, 2 segments (no article-rule collision), with the unknown-ID state reachable |
| Facebook | **Share button only** (owner decision) — `sharer.php`, no Graph API, no page token, no app review |

⚠️ Generation runs **server-side at the CMS**, not in the browser and not at build
time — a browser cannot be trusted to render an unforgeable card, and build-time
generation would spend CI minutes on every reporter edit.

### S15 — Live TV (request #5)

**Specified in `docs/feature-batch-2.md` §4.** Nothing built.

- Owner decision: **both YouTube and Facebook**; the CMS stores the provider.
- `/live-tv` — click-to-load player, **zero third-party requests before the reader
  taps play**.
- 🚨 **This forces a THIRD CSP profile (`SHIKKHA24_CSP_MEDIA`).** The relaxed
  profile has no video in `frame-src` (the iframe would be silently blocked) and
  the article profile is YouTube-only. Widening the relaxed profile was rejected
  as a security regression — the homepage, every category listing and `/quiz`
  would gain iframe permission they do not need.
- ⚠️ A third profile **breaks `verify-apache.mjs`**, whose corrected expectation
  logic assumes exactly two. That, `docs/security.md` §5, and a counter-proved
  build-output check must land in the same commit.
- Self-hosted streaming is **not possible** — DianaHost is 2 GB shared hosting.

### S16 — Reader Reactions (request #7b)

**Specified in `docs/feature-batch-2.md` §5.** Nothing built.

- `Reactions` collection: article, type (like/love/wow/sad/angry), reader,
  `fingerprint` (**hashed** IP+UA — never a raw IP).
- Compound unique indexes so double-voting is rejected at the **database** level.
- `POST /api/reactions/toggle` mounted **on the collection** (the
  `/comments/submit` lesson).
- Self-hiding island; counts read at **runtime**, never baked into static HTML.

### S17 — Photo Story & Video News (requests #10b, #10c)

**Specified in `docs/feature-batch-2.md` §6.** Nothing built.

- `Articles.layout = 'photoStory'` + a photo-story block array — **a layout, not a
  new collection**, because a separate collection would split SEO authority and
  duplicate the editorial workflow.
- `Articles.videoUrl` + `videoProvider`; a click-to-load player above the body.
- `/video` hub.
- ⚠️ Every photo-story image must reserve its box (`aspect-ratio`) — **CLS < 0.02
  is a hard gate**.
- ⚠️ `/video` is 1 segment ⇒ strict CSP ⇒ it must be tagged with the
  `SHIKKHA24_CSP_MEDIA` profile from S15, or it must link out instead of embedding.

---

## 6. Descoped, with reasons

| Feature | Reason |
|---|---|
| `Jobs` collection | Redundant with `Circulars` — see §3 |
| Live cricket floating pill | Out of scope; no free data source |
| AQI / air-quality ribbon | Out of scope |
| DSE stock ticker | Out of scope; no public API |
| Gold price tracker | Out of scope; no free API |
| Commodity price tracker | Out of scope; no API |
| Disaster / cyclone warning banner | Out of scope |
| Daily 3-min audio bulletin | No zero-cost TTS path (Web Speech API cannot pre-generate audio) |
| Self-hosted live streaming | Needs a VPS with RTMP; violates the zero-recurring-cost constraint |
| Bookmark → CMS sync | Browser-local half works; the sync half needs a **merge-policy decision** (a naive union resurrects a bookmark deleted on another device) |
| `AD_POSITIONS` additions | The set is a contract; adding a value is a plan amendment (rule 13) |

---

## 7. Verification gates — what proves what

Every claim in this document is backed by a runnable check.

| Command | Proves | Result |
|---|---|---|
| `pnpm verify:astro-imports` | Every `lib/` export used in `.astro` frontmatter is imported — `.astro` frontmatter is **not typechecked** here | 116 exports |
| `pnpm verify:links` | Every internal `href`/`src` resolves to a built file | 6,900+ links |
| `pnpm verify:build-output` | Sitemaps, no inline scripts, page count, favicon, CSP hooks | deployable |
| `pnpm verify:apache` | **A real Apache** over the real `dist/` — status codes, header counts, per-page CSP profile | 18/18 |
| `pnpm verify:search-init` | The date-filter reorder runs against a DOM | 8 behaviours |
| `pnpm --filter @shikkha24/cms verify:reporter` | Reporter access control **and** the quick-draft whitelist | 32/32 |
| `pnpm --filter @shikkha24/cms verify:rebuild-notice` | The rebuild notice appears on exactly the triggered configs | 10/10 |
| `pnpm --filter @shikkha24/cms verify:social` | Social URL validation rejects homepages, bare handles, plain http | 11/11 |
| `pnpm --filter @shikkha24/cms verify:endpoints` | Real writes over HTTP, read back, cleaned up | — |
| `pnpm --filter @shikkha24/cms verify:sync` | Every CMS record appears on its page | — |

**Standing rules these gates encode:**

1. **A green build is not a full build.** With no reachable CMS the frontend
   exits 0 and emits ~34 pages instead of ~149. Assert the **page count**.
2. **A route nothing generates has never run.** Fixtures must cover every branch
   the route can take.
3. **A harness that reimplements the mechanism is not evidence.**
4. **A test that pollutes the thing it tests is worse than no test.**
5. **Counter-prove every new check** — inject the defect and watch it fail.

---

## 8. Open items needing an owner decision

| # | Item | Blocks |
|---|---|---|
| 1 | Real social account URLs (`/admin → Site Settings → সোশ্যাল লিংক`) | The footer/header social block self-hides until set |
| 2 | `DEPLOY_WEBHOOK_URL` | Automatic rebuilds in production — currently unset, and the CMS now says so in its own admin description |
| 3 | Reporter **beat** list — does it match your desks? | S13 sign-off |
| 4 | YouTube channel + Facebook Page for live streams | S15 |
| 5 | The `/admin/reporter` view needs a **manual browser check** — Payload admin views hydrate client-side, so no automated check can confirm the render | S13 sign-off |
| 6 | Trade Licence / TIN / Ministry of Information numbers | The E-E-A-T footer block renders only once set |
| 7 | Real logo | A placeholder SVG stands in |
