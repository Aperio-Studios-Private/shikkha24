# Owner assistance needed — running list

> Everything an autonomous agent could finish is finished. This file lists **only**
> the items that need the owner's hands, account, or a decision. Maintained by the
> agent each session; newest first within each section.
>
> Last updated: **2026-10-16 (evening)**

---

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
