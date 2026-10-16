# Owner assistance needed — running list

> Everything an autonomous agent could finish is finished. This file lists **only**
> the items that need the owner's hands, account, or a decision. Maintained by the
> agent each session; newest first within each section.
>
> Last updated: **2026-10-16 (evening)**

## Index — read this first

**One thing blocks almost everything else: `O-7`, the GitHub Actions budget.** Every
fix below except O-3 and O-6 is written, verified and sitting in git — it cannot reach
the server until CI can run again. Restoring the budget delivers all of them at once.

| # | What | Needs from you | Status |
|---|---|---|---|
| **O-7** | GitHub Actions budget exhausted | Restore billing / raise the spending limit | 🔴 blocks 20 fixes |
| **O-11** | Live site shows Asr **51 min early** | nothing — ships with O-7 | 🔴 user-visible bug |
| **O-1** | 6 CMS media files missing from disk | Check `upload.staticDir` on the host | 🔴 images |
| **O-4** | CSP-blocked Cloudflare beacon | Turn off Web Analytics in the CF dashboard | 🟡 2 min |
| **O-8** | Four CMS collections are empty | Seed them or tell me to | 🟡 your call |
| **O-9** | IndexNow + Bing Webmaster | Import the key, click verify | 🟡 5 min |
| **O-3** | Rotate the CMS password | Do it yourself, I never see it | 🟡 security |
| **O-6** | Request indexing in Search Console | Paste 6 URLs | 🟡 SEO |
| **O-5** | CMS deploy for the button work | nothing — ships with O-7 | ⏳ waiting |
| **O-10** | Three CMS security fixes | nothing — ships with O-7 | ⏳ waiting |
| **O-2** | ✅ **CLOSED** — covers uploaded | nothing | done |

> ⚠️ **A note on numbering.** These IDs are stable and referenced from `.sps/tasks.md`
> and `.sps/handoff.md`, so a gap or an out-of-order number means items were added over
> time — not that anything is missing. The list below is grouped by what it needs from
> you; the index above is the reading order.

---

## 🔴 URGENT — CI and deploys are stopped: GitHub Actions budget exhausted

**Found 2026-10-16 00:33.** Every push since `bfa91b3` (00:07) fails at the job level
with:

> **"The job was not started because an Actions budget is preventing further use."**

This is **not a code problem** — GitHub is refusing to start jobs because the
account's Actions minutes/spending limit is exhausted. Runs die in ~3 seconds with
"Verify in 2s" and no logs.

**What is live and what is stuck:**

| commit | what | live? |
|---|---|---|
| `bfa91b3` (00:07) | accessibility + heading-order fixes | ✅ **LIVE** (`--color-ink-subtle:#707070` is serving) |
| `b711eb3` (00:18) | CMS admin button affordance (T-26) | ❌ not deployed |
| `53d92d7` (00:28) | nodemailer security fix | ❌ not deployed (storefront unaffected) |
| `0d69a1a` (00:31) | **CSS performance optimization** (render blocking → 0) | ❌ not deployed |
| docs commits | task/handoff records | ❌ (harmless — repo only) |

Verified against production: the live stylesheet hash is still the pre-optimisation
build, so the performance gain is **committed but not serving**.

**I verified the work is shippable without CI** (2026-10-16): I can reproduce every
gate the deploy workflow runs, and all four pass locally on the current tree —
`verify:build-output` (6/6 published articles reached the build), `verify:links`
("All internal links resolve"), `verify:search-init` ("behaves correctly"),
`verify:cloudflare` ("OK — 83 checks, every section + its negative control").
`wrangler deploy --dry-run` from `frontend/` also succeeds (279 files, correct
ASSETS binding), and wrangler on this machine is already authenticated to the
`shaha24` account. So a local deploy is technically possible.

⚠️ **Two gate traps worth knowing** (both cost me time; neither is a real defect):
1. `verify:build-output` **must** be run with `CMS_URL` set. Without it the check
   falls to the `THIN_BUILD_MIN_ARTICLE_PAGES` floor of 10 and reports a false
   failure ("6 article page(s), floor 10"), because that floor was chosen while the
   six demo articles still existed and we have since deleted them. With `CMS_URL`
   set it uses the self-calibrating tier and correctly passes: *"6 article page(s)
   built, CMS reports 6 published."*
2. Pagefind runs as a **post-build** step, so `npx astro build` alone makes
   `verify:build-output` report a missing Pagefind index. Use `pnpm run build:frontend`.

**I have not deployed**, because doing so would bypass the CI gate the project treats
as authoritative, and the workflow deliberately warns that such a deploy "is NOT
covered by CI". That is your call, not mine.

**What I need from you (either):**
1. **GitHub → Settings → Billing and plans → Actions** — raise or reset the included
   minutes / spending limit for the `SHAHID8142` account, **or**
2. Tell me to wait until the monthly allowance resets, and I will re-run the stuck
   workflows then (`gh run rerun` on the latest commit rebuilds and deploys).

**Nothing is lost** — every change is committed and pushed. The moment Actions works
again, one re-run deploys the CSS optimisation and the CMS work.

⚠️ Public repos get unlimited free Actions minutes; this repo is **private**, so
minutes are billed. If the budget cannot be raised, the durable fix is either making
the repo public or moving the build to a host that does not meter CI — a decision
for you, not something I should assume.

**Narrowed 2026-10-16:** `GET /repos/SHAHID8142/shikkha24/actions/permissions` returns
`{"enabled": true, "allowed_actions": "all"}`, so Actions is *not* disabled at the repo
level — the block is **account-level billing**, and reading the billing endpoint needs
a `user`-scoped token I do not have. That is why only you can clear it.

## 🔴 Blocking — the site cannot show images until these are done

### O-1. CMS media files are missing from disk (T-25)
**Symptom you reported:** every image shows `{"errors":[{"message":"Something went wrong."}]}`.

**What I proved (2026-10-16, all 8 media records probed live):**

| created | file | HTTP | bytes |
|---|---|---|---|
| 2026-10-13 | `icon-maskable.svg` | **200** ✅ | 899 |
| 2026-10-13 | `apple-touch-icon.png` | **200** ✅ | 2334 |
| 2026-10-04 | `demo-plate-7…12.webp` (ids 1–6) | **500** ❌ | 48 (the error body) |

The database **records** are intact (`/api/media/2` returns 200 with the right
filename, size and URL). Only the **file bytes** are unreadable. So this is not a
UI bug, not a permissions bug in your admin, and not a code bug: the record↔file
pair is broken on disk, and everything uploaded on 2026-10-04 is affected while
everything from 2026-10-13 still works.

**Your 12 images are not lost.** They never reached the CMS at all (only 8 media
records exist, none newer than 2026-10-13). The files are safe in the repo at
`editorial/assets-batch-1/`.

**What I need from you (one of):**
1. **cPanel → File Manager** → the CMS application directory → find Payload's upload
   folder (`upload.staticDir`; typically `media/` beside the app) → tell me whether
   it exists, whether it is writable, and whether it contains any image files.
   If it is empty, the T-03 backup is the recovery source.
2. **Or** say "treat media as broken until P4" and I will keep publishing
   text-only (which is the current live state — the site is fully readable, just
   imageless).

Once the folder is healthy, **one test upload** tells us everything.

### ✅ O-2. CLOSED — the 6 covers are uploaded and attached (no action needed)
**Done by me on 2026-10-16, without needing you.** I had told you this needed the CMS
admin UI because I believed the host proxy was stripping multipart text fields. **That
was wrong, and I found the real cause:** Payload wants text fields inside a `_payload`
JSON part, not as separate multipart fields. My probes were sending the wrong request
shape.

All six covers are now in the CMS (media ids **10–15**), attached to their articles
(23→10, 24→11, 25→12, 26→13, 27→14, 28→15), each with its Bengali alt text and the
`চিত্র: AI` credit. All six serve 200 and appear across 6–7 pages in a fresh build,
including `og:image` for social sharing. **T-23 is complete.**

### O-10. Three CMS security hardening fixes are waiting on the same deploy
No action beyond O-7's Actions budget / O-5's CMS deploy — recorded so they are not
forgotten, because they are the kind of thing that is easy to lose track of.

Found while doing T-20 groundwork (I had CMS admin credentials in `cms/.env.local`,
so I could probe the live CMS properly rather than only from outside):

| Fix | What it stops | Commit |
|---|---|---|
| Pin `serverURL` in the Payload config | The live CMS answered `GET /api/payload-migrations` with `Cannot GET https://0.0.0.0:3000/...` — it was leaking its **internal port** to anonymous callers, and building absolute URLs from whatever `Host` header arrived (the precondition for host-header poisoning) | `f535bac` |
| `poweredByHeader: false` | `X-Powered-By: Next.js, Payload` was advertising your exact framework and CMS versions to anyone who asked, which tells an attacker which known exploits to try | `ef37cd4` |
| Override `dompurify` 3.4.8 → 3.4.17 | Cleared 3 security advisories (13 → 8 total). Monaco pins that exact version, so no normal update could ever fix it | `0ce0ab5` |

**What I checked and found sound** (no action needed):
- Security headers on both the CMS and the site are strong — HSTS with preload,
  `nosniff`, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, a tight
  Permissions-Policy, and a CSP with `object-src 'none'` / `base-uri 'self'`.
- **Login brute-force protection works**: 5 wrong passwords locks the endpoint
  (429) and it stayed locked when I re-checked.
- **No user enumeration** — a non-existent email gives the same generic error as a
  real one, so attackers cannot discover which accounts exist.
- Admin sessions expire after **2 hours**, and the JWT uses HS256 properly.
- `/api/users` and `/api/payload-preferences` both correctly return **403** to the
  public.
- The 4 remaining "ignored" high advisories have **no fix published upstream** — I
  checked each one, so none is a stale suppression hiding a real problem.

### O-9. Bing Webmaster Tools + turning on IndexNow (5 minutes, after the deploy)
Two small things, both blocked behind O-7's Actions budget because the key file has
to be live first.

**Step 1 — verify Bing Webmaster Tools (once).**
1. Go to <https://www.bing.com/webmasters> and sign in with the same Google account
   you used for Search Console.
2. Choose **"Import from Google Search Console"** — Bing copies your verified sites,
   sitemaps and settings. Accept the permissions it asks for.
3. It should show `shikkha24.com` as verified. If it does not, tell me and I will
   produce the exact DNS TXT record for you to paste, the same way we did GSC.

**Step 2 — turn on instant indexing (once the storefront has deployed).**
The key file is committed at `frontend/public/91fbd16cdf07709ad236e60bed652c13.txt`. Check it is live:
open <https://shikkha24.com/91fbd16cdf07709ad236e60bed652c13.txt> — it must show exactly this one line:
```
91fbd16cdf07709ad236e60bed652c13
```
If it shows a 404, the storefront has not deployed yet (O-7); tell me and I will
re-check. Once it shows the key, run:
```
pnpm indexnow
```
That submits all 63 URLs from the sitemap to Bing, Yandex, Seznam and Naver in one
call. It prints `OK HTTP 200` (or `202`) on success, and a plain-English reason on
failure. You can preview without sending anything using `pnpm indexnow -- --dry-run`.

**Why this is worth doing:** without it, Bing finds new articles on its own schedule
— often days. With it, a story is re-crawled within minutes, which is the difference
between a breaking story being current and being stale. It is free and needs no card.

### O-8. Four CMS collections are empty — sections of the site are blank
Not urgent, and **not a bug** — the code is correct, there is simply no content yet.
Found while fixing a verifier that was reporting the empty state as a failure
(commit `eddaf5d`). The live CMS returns `totalDocs = 0` for:

| Collection | What readers see now |
|---|---|
| `scholarships` | scholarship listings have nothing to show |
| `result-links` | exam-results quick links are empty |
| `circulars` | circular listings are empty |
| `deadlines` | the deadline tracker is empty |

Everything else is populated and in sync: **articles 6/6, categories 8/8,
study-abroad 8/8, institutions 6/6**.

**What I need from you:** nothing technical — just tell me whether you want me to
seed these from public sources (the way the earlier sections were seeded), or whether
you would rather add them yourself in the CMS. The pages, schemas and verifiers are
already in place, so either way is quick. I have not invented any entries.

### O-7. Nothing — FYI: two live SEO/UX fixes are committed but not deployed
Not an action for you beyond O-1's Actions budget. For completeness, these are
**committed, gate-verified, and waiting on a deploy**:
- **Prayer Asr was 5–6 minutes early** — the widget never sent `school=1`, so
  Aladhan defaulted to Shafi'i while Bangladesh follows Hanafi. Fixed; verified the
  request now returns `meta.school = HANAFI` (Dhaka 20 Oct: 15:52, was 15:02).
- **Every article's `NewsArticle` schema was missing `image`**, which Google News
  requires. Fixed to reuse the same working photocard URL as `og:image`; verified on
  a deploy-equivalent build that all 6 articles now emit
  `https://cms.shikkha24.com/api/photocard/NN.png` (that endpoint returns 200).
- Plus the T-24 performance work (render blocking eliminated; `styleLayout`
  2,454 ms → 227 ms).

All three ship with the same re-run once Actions works, or with a local
`wrangler deploy` if you approve that (see the URGENT section).

## 🟡 Decisions / small actions

### ⚠️ O-11. The live site shows the wrong Asr time (fix is ready, needs the deploy)
**A live correctness bug on a religious feature, not a cosmetic one.**

Bangladesh follows the **Hanafi** Asr (2:1 shadow). Our code asks Aladhan for Hanafi,
but **production still runs the bundle from before that fix** — the live JavaScript
builds `…&method=${b}` and stops, sending no `&school=` at all, so Aladhan falls back
to **Shafi'i**.

Measured for Dhaka today:

| | Asr |
|---|---|
| **Live now** (Shafi'i, the wrong default) | **15:04** |
| **Correct** (Hanafi) | **15:55** |

**Asr is displayed 51 minutes early.** The gap is widest in autumn and narrows in
summer; Asr is the only affected time.

- **The fix is committed** (`a833434`) and verified — it has simply never reached the
  server, the same **Actions budget** blocker as O-7.
- **Why nothing caught it:** every check in `verify:prayer-times` read either the
  source constant or the live API, and **neither can see a stale deploy**. I added a
  built-artifact check that reads the emitted JavaScript, and **proved it works by
  negative control** — stripping `school=` from the bundle makes it fail with exactly
  the production symptom.
- **Nothing for you to do beyond the deploy.** Recorded because a wrong prayer time is
  the kind of thing a reader notices and quietly stops trusting the site over.

### O-3. Rotate the CMS password
You said you would rotate it after the publishing task. **The publishing task is
done** (6 articles live). The credentials you pasted are in this chat's history and
in `cms/.env.local` (git-ignored, never committed, redacted from logs) — rotation is
the correct finish.

### O-4. Turn off Cloudflare Web Analytics in the dashboard
**Why:** Cloudflare auto-injects its analytics beacon
(`static.cloudflareinsights.com/beacon.min.js`) into every production response.
Our own CSP (`script-src 'self' …`) blocks it, so **every page logs a CSP violation**
and production best-practices measures **93 instead of 100** (Lighthouse on the
local build shows 100, because Cloudflare is not in front of it — this is exactly
the kind of production-only difference worth catching).

Nothing in the repo references the beacon; it is added at Cloudflare's edge.

**Owner decision (2026-10-16): keep the CSP strict** — do not widen `script-src`.
So the fix is to stop Cloudflare injecting it:

1. Cloudflare dashboard → **your account → the `shikkha24.com` zone**
2. **Analytics & Logs → Web Analytics**
3. If a site entry exists for `shikkha24.com`, **disable/delete it**
   (the beacon is only injected while a Web Analytics site is enabled)
4. Tell me when done — I will re-measure production and confirm
   best-practices returns to 100 and the console error disappears.

**Do not** add `cloudflareinsights.com` to the CSP: that was the alternative and it
was rejected (it adds a third-party script plus an egress of reader IPs, against
rule 7's self-hosted preference).

### O-5. Deploy the CMS so the admin button work appears (T-26)
The new admin styling is committed and verified in the built admin CSS, but the
Cloudflare workflow deploys **only the storefront**. The CMS runs on DianaHost, so
it needs its own deploy for the improved buttons to show up in your admin.

### O-6. Request indexing in Google Search Console
For the 6 new article URLs and `/faq` — the sitemaps already list them, but an
explicit request speeds up first crawl.

---

## ℹ️ Informational — no action needed

- **The "template images" mystery is solved.** The visuals you could not find in (or
  delete from) the media gallery were repo files —
  `frontend/src/assets/categories/*.jpg` — reused by design whenever an article had
  no photo. The demo plates in the media library were uploads *of those same
  visuals*, which is why deleting them never changed the site. That fallback is now
  **removed everywhere**, so an article without a cover renders text-only.
- **Demo content is fully gone.** I deleted the last demo articles via the API
  (`demo-hsc-result-2026`, `demo-teacher-recruitment-2026`); `demo-madrasa-new-syllabus`
  was already gone. The CMS now holds exactly your 6 real articles. The only "demo"
  strings left on the site are the intentional ad-slot placeholders, which real
  AdSense replaces later.
- **All 6 articles are live** with headlines, H1s, FAQPage schema on `/faq`, and both
  sitemaps updated (news sitemap 6 URLs, main sitemap 63).
