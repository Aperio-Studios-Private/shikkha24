# Owner assistance needed — running list

> Everything an autonomous agent could finish is finished. This file lists **only**
> the items that need the owner's hands, account, or a decision. Maintained by the
> agent each session; newest first within each section.
>
> Last updated: **2026-10-16 (evening)**

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

### O-2. Upload the 6 covers — only after O-1 is fixed
Everything is prepared for pure clicking: **`editorial/assets-batch-1/upload-ready/`**
contains the 6 covers renamed per article, plus `README.md` with the exact Bengali
**alt text** and the mandatory `চিত্র: AI` credit for each.

I could not do it for you: the live host's proxy **drops non-file form fields on
multipart POSTs**, so the required `alt` never arrives and Payload rejects the
upload — proven 2026-10-16 with both `curl` and Node (`file`-only reaches
validation; `alt`-only reports "No files were uploaded"). This unlocks automatically
when the CMS moves at P4.

After you upload, tell me and I will `PATCH` `featuredImage` onto articles 23–28.

---

## 🟡 Decisions / small actions

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
