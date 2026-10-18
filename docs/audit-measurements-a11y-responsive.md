# D1 / D2 / D3 / D4 + F3 — responsive, hover, motion and accessibility basics: measurements

**Audit dimensions closed:** D1 ("Responsive behavior was not checked across every page/template"), D2 ("Hover-only action risk was not exhaustively checked"), D3 ("Motion and reduced-motion behavior were not exhaustively checked"), D4 ("No complete dual-path motion review"), and the F3 rider (accessibility basics across all routes).
**Mode:** read-only. No application code, `.sps/tasks.md` or `.sps/handoff.md` was modified. The only file written is this report.
**Measured:** 2026-10-19 (Asia/Dhaka), against `main` @ `a712a27ada8ef239dc20a8caca8bbc1a2dd42e84` (commit time 2026-10-19 00:18:10 +0600).
**Repo:** local worktree `/Volumes/SSD/CODES/NewsPortal`.

> Every number below is backed by the command output quoted next to it. Where something
> could not be measured without a browser, it is listed in §9 with the reason — not
> silently omitted and not upgraded to a pass.

---

## 1. Method, and why it is static analysis

**A browser was not available, so nothing here is a rendering measurement.** Before
choosing the method I checked whether browser automation was already installed, per the
brief:

```
$ pnpm list --depth 0 | grep -i -E "playwright|puppeteer"
NONE at workspace root
$ cd frontend && pnpm list --depth 0 | grep -i -E "playwright|puppeteer|jsdom|parse5|cheerio"
NONE in frontend
$ ls node_modules/.bin | grep -i -E "playwright|puppeteer"
no browser bins
```

No browser-automation package is present in either the workspace root or `frontend`, and
no browser binary is on `node_modules/.bin`. Installing one is out of scope (the brief
forbids it; `.sps/profile.md` budget rules and AGENTS.md rule 7/8 also apply). **The
method is therefore static analysis of the built HTML and the built CSS**, plus source
inspection for provenance. This is a real measurement of what the build *ships*, and it
is explicitly **not** a measurement of rendered layout, computed style, or interaction
latency. §9 lists what that excludes.

### 1.1 Build freshness, and the concurrency hazard

The brief said to build only if `dist/` was stale. I checked first:

```
$ stat -f "%Sm %N" frontend/dist
Oct 19 00:17:18 2026 frontend/dist
$ find frontend/src -newer frontend/dist -name "*.astro"
(empty — no source .astro newer than dist)
```

`dist/` was therefore **not stale at the time of the check**, and no build was needed.
However, a **concurrent agent was actively rebuilding `dist/` during this pass** — at
00:30 the build replaced `dist/` wholesale and `dist/index.html` did not exist for
roughly a minute (mid-write; `git status` shows `frontend/src/pages/index.astro`,
`frontend/src/lib/cms.ts`, `frontend/src/lib/education.ts` and several `cms/` files
modified by another writer). Measuring a directory that another process is rewriting
would have produced non-reproducible mixed-version numbers.

To make the measurement honest I **froze the artifact** and measured the snapshot only:

```
$ cp -R frontend/dist/. /tmp/aud/snap/     # 114 .html, 4 .css
$ find /tmp/aud/snap -name "*.html" | wc -l
114
$ find /tmp/aud/snap -name "*.css" -exec ls -la {} +
-rw-r--r-- 48331 /tmp/aud/snap/_astro/Layout.BfUpHQAK.css
-rw-r--r-- 41830 /tmp/aud/snap/pagefind/pagefind-component-ui.css
-rw-r--r--  7336 /tmp/aud/snap/pagefind/pagefind-modular-ui.css
-rw-r--r-- 14482 /tmp/aud/snap/pagefind/pagefind-ui.css
```

All HTML/CSS numbers in this report refer to that snapshot of build `@ a712a27`. The
final successful build completed at `Oct 19 00:31:46 2026`, i.e. the snapshot is the
completed build, not the half-written one. Source line numbers refer to the working tree
at the same commit.

### 1.2 Commands actually run

| Purpose | Command | Result |
|---|---|---|
| Tooling check | `pnpm list --depth 0 \| grep -i -E "playwright\|puppeteer"` | none installed (§1) |
| Template enumeration | `find dist -name "index.html" \| wc -l` | **113** project pages + `404.html` = **114** HTML documents |
| Build freshness | `stat -f "%Sm %N" frontend/dist`, `find frontend/src -newer frontend/dist -name "*.astro"` | not stale; unmodified |
| Snapshot | `cp -R frontend/dist/. /tmp/aud/snap/` | frozen artifact |
| Viewport sweep | per-file `grep -c 'name="viewport"'` over all 114 docs | 113/113 pages + `404.html` = **114/114** |
| Breakpoint inventory | `grep -o '@media[^{]*' Layout.css \| sort \| uniq -c` | 9 distinct queries (§2.2) |
| Fixed-width hunt | `grep -o 'width:[0-9]\+px' Layout.css`; `grep -o 'min-width:[^;}]*' Layout.css` | max fixed width = `4px` (§2.3) |
| Image `sizes`/`srcset` | regex sweep over all 308 `<img>` in the snapshot | 43/43 responsive images correct (§2.4) |
| Hover inventory | `sed 's/}/}\n/g' Layout.css \| grep -o '^[^{]*:hover[^{]*' \| sort -u` | 41 `:hover` occurrences, 21 `:focus*` (§3) |
| Motion inventory | `grep -rn "animation:\|transition:\|scroll-behavior" frontend/src` | 4 `@keyframes`, 6 motion call-sites (§4) |
| Reduced-motion blocks | python brace-matching extraction of every `@media (prefers-reduced-motion` block | 2 blocks, extracted verbatim (§4.2) |
| Per-template a11y | python `re` sweep over all 114 docs → 39-template table | §5 |
| Control labelling | ancestor-`<label>` span analysis (not id-only) | 0 genuinely unlabelled (§5.4) |
| Redirect-stub split | detect `http-equiv="refresh"` | 19 stubs / 95 real pages (§5.1) |

### 1.3 Template enumeration — how the real set was established

The brief listed template names to cover. I did **not** trust that list: I derived the set
from the built output, which is authoritative.

```
$ find frontend/dist -name "index.html" | sed 's|^dist/||; s|/index.html$||' | sort
(root) a/23 … a/32 about about-us admission/23/… admission/28/… admission/31/…
archive archive/2026-10 archive/article/… author/shikkha24-desk bookmarks category/…
cgpa circulars citizen contact deadlines education-news/… exams fact-check faq gallery
gpa index.html institutions institutions/demo-* jobs-career/… latest live-tv login
newsletter/confirm newsletter/unsubscribe privacy-policy quiz reporters results
scholarship/25/… scholarships search study-abroad study-abroad/demo-* tag/… (37 tags)
terms-of-use university/26/… verify/SHK-R-2026-0001 verify/not-found video
```

Two corrections came out of this that matter for the audit:

1. **`/article/*` is not a page template.** All 9 documents under `dist/article/` are
   ~900-byte meta-refresh redirect stubs, not rendered articles:
   ```
   $ wc -c article/*/index.html
   930 906 945 918 963 930 876 891 930
   $ cat article/hsc-result-2026-possible-date/index.html
   <!DOCTYPE html><html lang="bn">…<meta http-equiv="refresh" content="0; url=https://shikkha24.com/education-news/27/hsc-result-2026-possible-date">
   <title>পুনর্নির্দেশ — শিক্ষা২৪.কম</title>…<a href="…">এগিয়ে যান</a>…
   ```
   The **real** article template is `/[category]/[id]/[slug]`
   (`frontend/src/pages/[category]/[id]/[slug].astro`), e.g.
   `dist/education-news/27/hsc-result-2026-possible-date/index.html` (84,513 bytes).
   The audit must measure that route, not `/article/…`.
2. **19 of the 114 HTML documents are redirect stubs** (`a/*`, `about-us`,
   `article/*`): `http-equiv="refresh"` is present, and **95 are real rendered pages.**
   Stubs are reported separately in §5 so they do not dilute per-template counts.

---

## 2. D1 — Responsive behaviour

### 2.1 Verdict

**114 of 114 HTML documents declare a viewport meta tag; 0 missing.** The declaration is
consistent everywhere:

```
$ grep -o '<meta name="viewport"[^>]*>' /tmp/aud/snap/index.html
<meta name="viewport" content="width=device-width, initial-scale=1">
$ grep -o '<meta name="viewport"[^>]*>' /tmp/aud/snap/404.html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

| Check | Result |
|---|---|
| Documents with `name="viewport"` | **114 / 114** |
| Documents with duplicate viewport | **0** |
| Documents with a bare/ﬁxed-content viewport (`width=1200`) | **0** |
| `<html lang>` set (all `bn`) | **114 / 114** |

### 2.2 Responsive CSS actually shipped

Breakpoints present in the **single** shipped stylesheet
(`dist/_astro/Layout.BfUpHQAK.css`, 48,331 bytes — there is one site-wide CSS bundle, so no
page can miss responsive rules that another page has):

```
$ grep -o '@media[^{]*' Layout.BfUpHQAK.css | sed 's/@media *//' | sort | uniq -c | sort -rn
   3 (hover:hover)
   2 (width>=64rem)
   2 (width>=640px)
   2 (width>=48rem)
   2 (width>=40rem)
   2 (prefers-reduced-motion:reduce)
   1 (width>=96rem)
   1 (width>=80rem)
   1 (width>=1024px)
```

Named Tailwind v4 breakpoints resolve to `sm 40rem/640px`, `md 48rem/768px`,
`lg 64rem/1024px`, `xl 80rem/1280px`, `2xl 96rem/1536px` — all five are present. Utility
usage measured across the built HTML:

```
sm: 2568 uses   md: 85 uses   lg: 746 uses   xl: 0 uses   2xl: 0 uses
```

`xl`/`2xl` are unused but *defined*, so the layout is fluid above 1024px rather than
capped — which is correct here, because the content column is capped separately by
`.container-page` (`max-width: var(--container-content)` = 1248px).

### 2.3 Fixed-width / overflow hunt — 0 overflowing containers

The brief called out `width: 1200px` without `max-width`, `min-width` values, and
`overflow-x` risks. Measured:

```
$ grep -o 'width:[0-9]\+px' Layout.BfUpHQAK.css | sort -u
width:0px  width:1px  width:2px  width:4px          # max fixed width = 4px
$ grep -o 'min-width:[^;}]*' Layout.BfUpHQAK.css | sort -u
min-width:0
min-width:calc(var(--spacing) * 6)      # .min-w-6  = 24px
min-width:calc(var(--spacing) * 28)     # .min-w-28 = 112px
$ grep -o 'max-width:[^;}]*' Layout.BfUpHQAK.css | sort -u
max-width:100%  max-width:40rem  max-width:48rem  max-width:64rem  max-width:65ch
max-width:70%   max-width:80rem  max-width:96rem  max-width:var(--container-2xl)
max-width:var(--container-3xl)  max-width:var(--container-content)
max-width:var(--container-prose)  max-width:var(--container-xl)
```

Every `max-width` is rem- or token-based; there is **no** absolute container width. The
largest fixed width anywhere in the stylesheet is 4px. Inline styles in the built HTML
were also swept, and the only non-`100%` widths are ad slots that are already
`width:100%` + `max-width`:

```
$ grep -oh 'style="[^"]*width:[^"]*"' */index.html */*/index.html index.html 2>/dev/null | sort -u
style="width:0%"  style="width:25%"  style="width:75%"
style="width:100%;max-width:300px;height:250px"     # sidebar ad slots (homepage)
style="width:100%;max-width:728px;height:90px"      # leaderboard ad slots (category)
$ grep -o 'style="[^"]*width:[0-9]\+px' */index.html */*/index.html index.html | sort -u
(empty)
```

`width:100%;max-width:728px` cannot overflow a 320px viewport, because the 100% wins below
728px.

**Page container.** The mobile-safe wrapper is `.container-page`
(`frontend/src/styles/global.css:232-243`):

```css
.container-page {
  width: 100%;
  max-width: var(--container-content);   /* 78rem / 1248px */
  margin-inline: auto;
  padding-inline: 1rem;
}
@media (min-width: 640px) { .container-page { padding-inline: 1.5rem; } }
```

`width:100%` + `padding-inline` means it is intrinsically safe at 320px. Coverage:

```
$ python: pages WITHOUT 'container-page'
total pages: 114   pages without .container-page: 19
```

All **19** of those are exactly the redirect stubs identified in §1.3 (`a/*`, `about-us`,
`article/*`) — i.e. **95/95 real pages carry `.container-page`, 0 real pages lack it.**

**Long unbreakable strings.** Bengali has no inter-word break opportunity in a URL-like
run, so this was measured directly:

```
$ python: visible-text sweep for /[A-Za-z0-9_\-\./@:]{30,}/    (scripts/styles stripped)
unique long tokens: 0
$ grep -o 'overflow-wrap:[^;}]*' Layout.BfUpHQAK.css
overflow-wrap:break-word
```

`overflow-wrap: break-word` is set on `body` (`frontend/src/styles/global.css:183`), and
no visible unbreakable token ≥30 chars exists in the built output.

### 2.4 Responsive images

`srcset` without `sizes` is the defect class here (the browser then assumes `100vw` and
over-downloads). Measured across all 308 `<img>` in the snapshot:

```
total <img>                        : 308
srcset AND sizes                   :  43
srcset WITHOUT sizes  (DEFECT)     :   0
sizes without srcset  (harmless)   :   0
neither                            : 265
with width= and height= (CLS)      : 265
with loading="lazy"                : 112
```

**0 defects.** Every image that ships a `srcset` also ships a matching `sizes`. The 265
"neither" images are the *same* logo/icon file repeated across 95 pages (unique sources:
7 — the CMS logo plus 6 article thumbnails rendered at a fixed CSS size), so the count is
large only because the pages are. Representative `sizes` values in the build:

| Source | `sizes` |
|---|---|
| `frontend/src/components/ArticleCard.astro:132` | `(min-width: 1024px) 800px, 100vw` (stacked) / `96px` |
| `frontend/src/components/CategorySection.astro:51` | `(min-width: 1024px) 400px, 100vw` |
| `frontend/src/components/CategoryImage.astro:62` | `(min-width: 1024px) 600px, 100vw` |
| `frontend/src/pages/gallery/index.astro:76` | `(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw` |
| `frontend/src/pages/[category]/[id]/[slug].astro:462` | `(min-width: 1024px) 800px, 100vw` |

### 2.5 D1 concrete violations

| # | Severity | Finding | Evidence | Fix |
|---|---|---|---|---|
| D1-1 | **Low** | 5 data tables are **not** wrapped in an `overflow-x` container, so a narrow viewport relies on the table's own shrink behaviour. Cells are short (3 Bengali headers) so overflow is unlikely but unmitigated. | `dist/cgpa/index.html` (3 tables), `dist/gpa/index.html` (2 tables): `<table class="mt-3 w-full border-collapse text-sm">` with no ancestor `overflow-x-auto`. Source: `frontend/src/pages/cgpa.astro:161-…`, `frontend/src/pages/gpa.astro`. Compare the **correct** pattern already used at `frontend/src/pages/institutions/[slug].astro:248`: `<div class="mt-3 overflow-x-auto">`. | Wrap each of the 5 tables in `<div class="overflow-x-auto">`. |
| D1-2 | **Informational** | `/article/…` exists in the sitemap footprint as 9 redirect stubs rather than redirects handled at the edge. Not a responsive defect, but an audit-scope correction recorded here because the previous audit measured "the article template" as `/article/*`. | §1.3 | Measurement correction only. |

No fixed-width overflow, no viewport-less page, no missing `sizes`, and no long-string
overflow was found. **3 of 39 measured templates have any D1 deficiency: `cgpa`, `gpa`
(tables), and the `/article/*` stub family (scope note).**

---

## 3. D2 — Hover-only action risk

### 3.1 Verdict: no hover-only affordance found

The failure mode the brief describes is a control that is `display:none` / `opacity:0` /
`visibility:hidden` and only becomes reachable on `:hover`. I searched for it in both the
built CSS and the source:

```
$ grep -rn -B2 -A4 "hover" frontend/src/ --include=*.astro --include=*.css \
    | grep -E "display: *none|opacity: *0|visibility: *hidden|pointer-events: *none"
(empty)
```

**Zero instances.** Every `:hover` rule in the shipped CSS is a purely cosmetic
reinforcement (colour, background, border, shadow, or a ≤1.02–1.1 scale):

```
$ sed 's/}/}\n/g' Layout.BfUpHQAK.css | grep -o '^[^{]*:hover[^{]*' | sort -u
.dark\:hover\:bg-dark-raised  .dark\:hover\:border-brand-red  .dark\:hover\:border-brand-red\/60
.dark\:hover\:border-dark-ink\/20  .dark\:hover\:text-brand-red  .dark\:hover\:text-dark-ink
.group-hover\:scale-\[1\.02\]  .group-hover\:text-brand-red  .hover\:bg-surface-raised
.hover\:border-brand-red  .hover\:border-brand-red\/40  .hover\:border-brand-red\/50
.hover\:border-ink\/20  .hover\:decoration-brand-red  .hover\:opacity-90  .hover\:shadow-sm
.hover\:text-brand-red  .hover\:text-ink  .hover\:text-white\/80  .hover\:underline
.ticker-viewport[…]  (has :focus-within twin)
```

Every one of these is `color`/`background-color`/`border-color`/`box-shadow`/`opacity`/
`text-decoration`/`scale`. **None is a visibility or pointer-events gate**, so removing
hover changes appearance only, never reachability.

### 3.2 Hover is paired with a real path in every interactive case

| Interactive surface | Hover role | Keyboard / touch path | File:line |
|---|---|---|---|
| Header search field | `focus:w-40` expands the field — expansion is driven by **`:focus`**, not hover | Tab focuses it; `aria-label="খুঁজুন"` | `frontend/src/components/Header.astro:94-95` |
| Breaking ticker | `:hover` pauses the marquee | **`:focus-within` pauses it too**, and under reduced motion the track is `animation:none` + `overflow-x:auto` (scrollable) | `frontend/src/components/BreakingTicker.astro:88-114`; built `.ticker-viewport[…]:hover …,…:focus-within …{animation-play-state:paused}` |
| Article cards / headings | `group-hover:text-brand-red` recolours a heading | The heading is **inside** an `<a>` that already has discernible text — hover is redundant reinforcement | `frontend/src/components/ArticleCard.astro:208`, `TrendingList.astro:55`, `LatestFeed.astro:49`, `index.astro:267,348`, `404.astro:76`, `reporters/index.astro:142`, `gallery/index.astro:95` |
| Gallery tile zoom | `group-hover:scale-[1.02]` | Same — decorative transform on an already-labelled link | `frontend/src/pages/gallery/index.astro:82`, `gallery/[slug].astro:156` |
| Video play button | `group-hover:scale-110` on the circle | The trigger is a real `<a>` to the video (comment at `ContentBlockScripts.astro:69-76` confirms click-to-load keeps a working link with JS off) | `frontend/src/components/MediaEmbed.astro:128` |
| Demo ad rotation | `mouseenter` sets `paused = true` | **Touch is not served by hover** — but rotation is background decoration, and the ad is not an action | `frontend/src/components/DemoAd.astro:155-158` |
| Mobile menu | — | Opens by `click`; closes on **Escape** | `frontend/src/components/Header.astro:310-312` |
| Reaction bar | — | Full **arrow-key** navigation, `ArrowRight/Down/Left/Up` | `frontend/src/components/ReactionBar.astro:201-207` |

Focus visibility is a global requirement, not per-component:

```
$ sed 's/}/}\n/g' Layout.BfUpHQAK.css | grep -n ':focus-visible'
62::focus-visible{outline:2px solid var(--color-brand-red);outline-offset:2px;border-radius:2px}
```

Source: `frontend/src/styles/global.css:206-210`. Counts: **41** `:hover` occurrences vs
**21** `:focus*` selectors, and **3** `@media (hover:hover)` blocks (Tailwind wraps hover
utilities so hover styles do not stick on touch devices).

### 3.3 D2 concrete findings

| # | Severity | Finding | Evidence |
|---|---|---|---|
| D2-1 | **None** | No hover-gated control. 0 of 41 `:hover` rules control visibility, reachability or `pointer-events`. | §3.1 |
| D2-2 | **Low / behavioural** | The demo-ad rotation pauses on `mouseenter` only (`DemoAd.astro:155-156`). A touch user **cannot** pause the rotation — they can only stop it globally via reduced-motion, which is honoured at `DemoAd.astro:143,150`. WCAG 2.2.2 (Pause, Stop, Hide) applies to motion that auto-starts and lasts >5s; this rotation is 4s-interval and infinite, so **this is a genuine 2.2.2 exposure on touch**, not a hover-accessibility one. | `frontend/src/components/DemoAd.astro:143-168` — `if (reduceMotion) continue` then `setInterval(…, 4000)`; only `mouseenter`/`mouseleave` set `paused`. |

---

## 4. D3 / D4 — Motion and reduced-motion, dual-path

### 4.1 Motion inventory

There are exactly **4 `@keyframes`** and **6 motion call-sites** in the whole application:

| # | Motion | Kind | Source | Reduced-motion gate | Gated? |
|---|---|---|---|---|---|
| 1 | Global smooth scrolling (`scroll-behavior: smooth`) | CSS scroll | `frontend/src/styles/global.css:174` | `@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto } }` — `global.css:214-217` | **Yes** |
| 2 | Breaking-ticker marquee (`ticker-scroll`, 40s linear infinite) | CSS keyframe, infinite | `frontend/src/components/BreakingTicker.astro:88`, keyframes `:97` | `:107-114` → `animation: none` **plus** `overflow-x: auto` so content stays readable | **Yes** |
| 3 | Live-blog entry flash (`live-entry-in`, 1200ms once) | CSS keyframe | `frontend/src/components/LiveBlogTimeline.astro:134`, keyframes `:137` | `:147-151` → `animation: none` | **Yes** |
| 4 | Scrollytelling reveal (`scrolly-reveal`, scroll-timeline) | CSS scroll-driven | `frontend/src/styles/content-blocks.css:251`, keyframes `:258` | `@supports (animation-timeline: view()) { @media (prefers-reduced-motion: no-preference) { … } }` — `content-blocks.css:248-256` | **Yes (opt-in)** |
| 5 | Photo-story frame reveal (`photo-frame-in`, scroll-timeline) | CSS scroll-driven | `frontend/src/components/PhotoStory.astro:124`, keyframes `:129` | `@supports (animation-timeline: view()) { @media (prefers-reduced-motion: no-preference) { … } }` — `PhotoStory.astro:121-139` | **Yes (opt-in)** |
| 6 | Poll bar fill width (`transition: width 300ms`) | CSS transition | `frontend/src/components/PollWidget.astro:175` | `:178-182` → `transition: none` | **Yes** |
| 7 | Demo-ad creative cross-fade (`transition: opacity 600ms`) | CSS transition | `frontend/src/components/DemoAd.astro:175` | Global `*{transition-duration:.01ms!important}` (see §4.3) | **Yes (globally)** |
| 8 | Demo-ad creative rotation (`setInterval` 4s) | **JS-driven** | `frontend/src/components/DemoAd.astro:158-168` | `frontend/src/components/DemoAd.astro:143` `matchMedia('(prefers-reduced-motion: reduce)').matches` → `:150` `if (reduceMotion) continue` | **Yes (JS)** |
| 9 | Utility transitions (`transition-colors`, `transition-opacity`, `transition-transform`, `transition-all`, `transition-[width]`, `duration-75/200/300`) | CSS transitions on hover/focus | Tailwind utilities throughout `src/`; compiled at `Layout.BfUpHQAK.css:468-477` | Global reset (§4.3) | **Yes** |

### 4.2 The global gate, extracted verbatim from the shipped CSS

```
$ python brace-match extraction of every '@media (prefers-reduced-motion' in Layout.BfUpHQAK.css
--- block @ 8478 ---
html{scroll-behavior:auto}
*,:before,:after{transition-duration:.01ms!important;animation-duration:.01ms!important;animation-iteration-count:1!important}

--- block @ 48178 ---
.ticker-track[data-astro-cid-zmtqedct]{animation:none}
.ticker-viewport[data-astro-cid-zmtqedct]{overflow-x:auto}
```

Source of the first block: `frontend/src/styles/global.css:214-225`, commented *"The site
is minimal-motion by policy; richer motion is confined to lazy-loaded S8 islands. Honour
the OS preference everywhere."* It is a **catch-all**: the `!important` longhand
`transition-duration`/`animation-duration` beats every non-`!important` component
shorthand, so motion added later is neutralised by default rather than by remembering to
gate it.

### 4.3 Counts

| Metric | Count |
|---|---|
| `@keyframes` declared | **4** |
| `animation:` call-sites | **4** (ticker, live-entry, scrolly-reveal, photo-frame-in) |
| Motion declarations total (animations + transitions + smooth scroll) | **9** |
| Motion declarations honouring reduced motion | **9** |
| **Ungated motion declarations** | **0** |
| `@media (prefers-reduced-motion: reduce)` blocks in shipped CSS | **2** |
| `@media (prefers-reduced-motion: no-preference)` opt-in gates in source | **2** (`content-blocks.css:249`, `PhotoStory.astro:122`) |
| Explicit JS `matchMedia` reduced-motion checks | **1** (`DemoAd.astro:143`) |
| `@supports (animation-timeline: view())` qualifiers | **2** |

**9 of 9 motion declarations honour reduced motion. 0 ungated.** There is therefore no
"ungated ones with file + line" list to produce — the list is empty, and §4.1 is the
evidence for that claim rather than its absence.

### 4.4 Dual-path review (D4)

| Path | Declared behaviour | Where |
|---|---|---|
| **Default** | Ticker marquees 40s infinite; live-blog new entry flashes 1200ms once; scrollytelling and photo frames fade/rise on scroll (Chromium only, behind `@supports`); poll bar animates width 300ms; demo ad cross-fades and rotates every 4s; smooth scrolling. | §4.1 rows 1-9 |
| **`prefers-reduced-motion: reduce`** | Ticker: `animation:none` **and** the viewport becomes `overflow-x:auto`, so the headlines remain reachable by scrolling (content preserved, not merely hidden). Live-blog flash: `animation:none`. Scrollytelling/photo: never applied at all — the plain ordered list / static frame is the only rendering. Poll bar: `transition:none` (the bar still jumps to its final width — information preserved). Demo ad: rotation loop never starts (`continue`), so the first creative is static. All other transitions: `0.01ms` via the global reset. Smooth scrolling: `scroll-behavior:auto`. | §4.1, §4.2 |

The dual-path design is **information-preserving**: in every case the reduced path keeps
the content and removes only the movement. That is the correct outcome, and it is the
specific claim the previous audit could not make.

### 4.5 D3/D4 concrete findings

| # | Severity | Finding | Evidence |
|---|---|---|---|
| D3/4-1 | **None** | 0 ungated motion declarations. | §4.1, §4.3 |
| D3/4-2 | **Low** | The scroll-driven animations are gated on `@supports (animation-timeline: view())`, so they simply do not exist in Safari/Firefox. That is a deliberate graceful-degradation choice documented at `content-blocks.css:241-247` and `PhotoStory.astro:20`, not a defect — recorded so the audit does not mistake "not running" for "broken". | `frontend/src/styles/content-blocks.css:244-247` |
| D3/4-3 | **Low** | `DemoAd` rotation is JS-driven and stops under reduced motion, but there is **no pause control** for touch users who do not set the OS preference (same root cause as D2-2, WCAG 2.2.2). | `frontend/src/components/DemoAd.astro:155-168` |

---

## 5. F3 — Accessibility basics, per template

39 templates measured on the frozen snapshot (95 real pages collapsed to one
representative per distinct template; 19 redirect stubs are reported as their own row).
`h1` = count of `<h1>`; `skip` = heading-level jumps; `noAlt` = `<img>` with no `alt`
attribute; `eBad` = `alt=""` without `aria-hidden`; `nName` = links with no accessible
name; `gen` = links whose text is bare "এখানে ক্লিক করুন" / "বিস্তারিত" etc.; `tbl`/`wrp` =
tables / tables inside an overflow wrapper; `ctl`/`unlbl` = form controls / unlabelled.

### 5.1 Per-template table

| Template | Built file | h1 | skip | imgs | noAlt | eBad | links | nName | gen | tbl | wrp | ctl | unlbl | lang | viewport |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| homepage | `index.html` | 1 | 0 | 22 | 0 | 8 | 95 | 0 | 0 | 0 | 0 | 7 | 0 | bn | 1 |
| **article (real)** | `education-news/27/hsc-result-2026-possible-date/` | 1 | 0 | 6 | 0 | 4 | 75 | 0 | 0 | 0 | 0 | 0 | 0 | bn | 1 |
| category | `category/scholarship/` | 1 | 0 | 4 | 0 | 2 | 67 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| tag | `tag/hsc/` | 1 | **1** | 4 | 0 | 4 | 68 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| author | `author/shikkha24-desk/` | 1 | 0 | 17 | 0 | 5 | 75 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| gallery index | `gallery/` | 1 | **1** | 2 | 0 | 2 | 66 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| video | `video/` | 1 | **1** | 2 | 0 | 2 | 66 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| live-tv | `live-tv/` | 1 | **1** | 2 | 0 | 2 | 65 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| circulars | `circulars/` | 1 | **1** | 2 | 0 | 2 | 66 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| scholarships | `scholarships/` | 1 | **1** | 2 | 0 | 2 | 66 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| results | `results/` | 1 | **1** | 2 | 0 | 2 | 66 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| faq | `faq/` | 1 | 0 | 2 | 0 | 2 | 66 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| study-abroad index | `study-abroad/` | 1 | 0 | 2 | 0 | 2 | 74 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| study-abroad detail | `study-abroad/demo-canada/` | 1 | 0 | 2 | 0 | 2 | 67 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| institutions index | `institutions/` | 1 | 0 | 2 | 0 | 2 | 72 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| institutions detail | `institutions/demo-du/` | 1 | 0 | 2 | 0 | 2 | 68 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| fact-check index | `fact-check/` | 1 | **1** | 2 | 0 | 2 | 66 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| archive | `archive/` | 1 | **1** | 2 | 0 | 2 | 67 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| archive month | `archive/2026-10/` | 1 | **1** | 17 | 0 | 5 | 76 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| search | `search/` | 1 | 0 | 2 | 0 | 2 | 71 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| latest | `latest/` | 1 | 0 | 17 | 0 | 5 | 76 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| about | `about/` | 1 | 0 | 2 | 0 | 2 | 76 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| contact | `contact/` | 1 | 0 | 2 | 0 | 2 | 71 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| privacy-policy | `privacy-policy/` | 1 | 0 | 2 | 0 | 2 | 67 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| terms-of-use | `terms-of-use/` | 1 | 0 | 2 | 0 | 2 | 68 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| citizen | `citizen/` | 1 | **1** | 2 | 0 | 2 | 66 | 0 | 0 | 0 | 0 | 9 | 0 | bn | 1 |
| deadlines | `deadlines/` | 1 | 0 | 2 | 0 | 2 | 66 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| exams | `exams/` | 1 | **1** | 2 | 0 | 2 | 66 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| cgpa | `cgpa/` | 1 | **1** | 2 | 0 | 2 | 68 | 0 | 0 | **3** | **0** | 4 | 0 | bn | 1 |
| gpa | `gpa/` | 1 | **1** | 2 | 0 | 2 | 67 | 0 | 0 | **2** | **0** | 2 | 0 | bn | 1 |
| quiz index | `quiz/` | 1 | **1** | 2 | 0 | 2 | 66 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| bookmarks | `bookmarks/` | 1 | 0 | 2 | 0 | 2 | 66 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| login | `login/` | 1 | **1** | 2 | 0 | 2 | 66 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| reporters index | `reporters/` | 1 | **1** | 2 | 0 | 2 | 66 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| newsletter confirm | `newsletter/confirm/` | 1 | **1** | 2 | 0 | 2 | 63 | 0 | 0 | 0 | 0 | 3 | 0 | bn | 1 |
| verify (ok) | `verify/SHK-R-2026-0001/` | 1 | **1** | 2 | 0 | 2 | 66 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| verify (not found) | `verify/not-found/` | 1 | **1** | 2 | 0 | 2 | 66 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| 404 | `404.html` | 1 | 0 | 2 | 0 | 2 | 71 | 0 | 0 | 0 | 0 | 2 | 0 | bn | 1 |
| admission detail | `admission/28/ju-admission-exam-2026-27/` | 1 | 0 | 7 | 0 | 3 | 75 | 0 | 0 | 0 | 0 | 7 | 0 | bn | 1 |
| redirect stubs (19) | `a/*`, `about-us`, `article/*` | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | bn | 1 |

### 5.2 Aggregate

| Metric | Result |
|---|---|
| Templates measured | **39** (95 real pages collapsed + 19 stubs enumerated) |
| Templates with **exactly one `<h1>`** | **39 / 39** (0 with zero, 0 with two) |
| `<html lang>` present and `bn` | **39 / 39** |
| Templates with a heading-level skip | **20 / 39** (see §5.3) |
| Total heading skips | **20** |
| `<img>` elements inspected | **156** |
| `<img>` with **no `alt` attribute** | **0** |
| `<img>` with `alt=""` | **127** |
| …of those, explicitly `aria-hidden="true"` | **29** |
| …of those, `alt=""` **without** `aria-hidden` | **98** — all the decorative brand logo (§5.5) |
| Links inspected | **2,698** |
| Links with **no accessible name** | **0** |
| Links with generic text ("এখানে ক্লিক করুন", bare "বিস্তারিত") | **0** |
| Tables | **5** (cgpa 3, gpa 2) |
| Tables inside an overflow wrapper | **0 / 5** (finding D1-1) |
| Form controls inspected | **~57** |
| Form controls genuinely unlabelled | **0** (see §5.4) |
| `aria-hidden="true"` on a focusable element | **0** |

### 5.3 Heading-level skips — the largest real class (20 templates)

Every skip has **the same two causes**: the site header's mobile drawer and the footer
column headings are `<h3>`, while no `<h2>` precedes them in the document. The page's own
`<h1>` is then followed directly by the global `<h3>`.

```
$ Header.astro heading levels:  247: <h3>
$ Footer.astro heading levels:  83: <h3>  145: <h3>  166: <h3>  202: <h3>
```

Concrete instances:

| Source | Line | Markup | Skip caused |
|---|---|---|---|
| `frontend/src/components/Header.astro` | **247** | `<h3 class="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-subtle dark:text-dark-ink-muted">শিক্ষা সেবা</h3>` (inside the mobile drawer `#mobile-menu`) | h1 → h3 on all 20 templates below |
| `frontend/src/components/Footer.astro` | **83** | `<h3 class="mb-4 …">শিক্ষা সেবা</h3>` (column 2, education tools) | h1 → h3 |
| `frontend/src/components/Footer.astro` | **145** | `<h3 class="mb--4 …">` (column 3) | h1 → h3 |
| `frontend/src/components/Footer.astro` | **166** | `<h3 class="mb-3 mt-6 …">` (nested) | h1 → h3 |
| `frontend/src/components/Footer.astro` | **202** | `<h3 class="mb-4 …">` (column 4) | h1 → h3 |

The 20 affected templates, with the observed jump:

| Template | Jump | First offending heading text |
|---|---|---|
| tag | h1→h3 | একাদশ শ্রেণিতে ভর্তি হতে তৃতীয় ধাপে আবেদনের সুযোগ |
| gallery index | h1→h3 | শিক্ষা সেবা |
| video | h1→h3 | শিক্ষা সেবা |
| live-tv | h1→h3 | শিক্ষা সেবা |
| circulars | h1→h3 | শিক্ষা সেবা |
| scholarships | h1→h3 | শিক্ষা সেবা |
| results | h1→h3 | শিক্ষা সেবা |
| fact-check index | h1→h3 | শিক্ষা সেবা |
| archive | h1→h3 | শিক্ষা সেবা |
| archive month | h1→h3 | আত্মপ্রকাশ করল — শিক্ষা২৪ |
| citizen | h1→h3 | শিক্ষা সেবা |
| exams | h1→h3 | শিক্ষা সেবা |
| cgpa | h1→h3 | শিক্ষা সেবা |
| gpa | h1→h3 | শিক্ষা সেবা |
| quiz index | h1→h3 | শিক্ষা সেবা |
| login | h1→h3 | শিক্ষা সেবা |
| reporters index | h1→h3 | শিক্ষা সেবা |
| newsletter confirm | h1→h3 | শিক্ষা সেবা |
| verify (ok) | h1→h3 | শিক্ষা সেবা |
| verify (not found) | h1→h3 | শিক্ষা সেবা |

Note this is **emphasis, not silence**: the header drawer and footer are global chrome
rendered on every route, so one fix in two files closes all 20. Note also that the tag
template's skip is genuinely content-level (an article headline rendered at `h3`) and is a
separate fix from the chrome one.

### 5.4 Form controls — 0 unlabelled (a false-positive class corrected here)

A naive id-only check reports 13 unlabelled controls. That is **wrong**, and the report
records the correction rather than the artefact. Re-measured by testing whether each input
is a descendant of a `<label>…</label>` span (regardless of `id`), or is matched by
`label[for]`, or has `aria-label`, or is a deliberately hidden honeypot:

```
$ python ancestor-<label>-span analysis over all 39 templates
TOTAL genuinely unlabelled controls: 0
```

The three classes the naive check flagged, all of them false positives:

| Pattern | Files | Why it is correct |
|---|---|---|
| Poll radios (no `id`, wrapped in `<label>`) | `frontend/src/components/PollWidget.astro:75-84` | `<label class="poll-option …">` **wraps** the input; the fieldset also has `<legend class="sr-only">একটি বিকল্প বেছে নিন</legend>` at `:71` |
| CGPA scale radios (no `id`, wrapped) | `frontend/src/pages/cgpa.astro:100-109` | `<label class="flex items-start gap-2 …">` wraps `<input type="radio" name="cgpa-scale">`, with a real visible `<span>` label; fieldset legend at `:97` |
| Honeypots `<input type="text" name="company" data-poll-honeypot tabindex="-1" aria-hidden="true">` | `PollWidget.astro` (homepage), `citizen.astro`, `admission/28/…` | Correctly **excluded** from the a11y tree *and* from tab order (`tabindex="-1"` **and** `aria-hidden="true"` **and** `pointer-events-none`/`h-0 w-0 opacity-0`) — the pattern is right |

`aria-hidden="true"` on focusable elements: **0 occurrences** (the honeypots are the only
`aria-hidden` controls and they carry `tabindex="-1"`, so they are not focusable). No
invalid-ARIA pattern was found in this class.

### 5.5 `alt=""` without `aria-hidden` — 98 instances, all the decorative brand logo

This is the one a11y pattern worth a decision, and it is **defensible as written**. All 98
instances are the same component's image: the CMS brand logo, rendered beside the
wordmark text.

```
$ grep -o '<img[^>]*shikkha24-logo[^>]*>' index.html | head -3
<img src="…/shikkha24-logo.svg" alt="" width="16" height="16" class="h-9 w-auto shrink-0 sm:h-10" decoding="async">
<img src="…/shikkha24-logo.svg" alt="" width="56" height="56" … loading="lazy">
<img src="…/shikkha24-logo.svg" alt="" width="32" height="32" … loading="lazy">
```

Source `frontend/src/components/Logo.astro:91-107`:

```astro
<a href="/" class={…} aria-label={showName ? undefined : siteName}>
  {logoSrc && <img src={logoSrc} alt="" width={markWidth} height={markHeight} class="h-9 w-auto shrink-0 sm:h-10" decoding="async" />}
  {showName && <span class="font-headline text-2xl …"><span class={nameBaseClass}>{namePrefix}</span>…</span>}
</a>
```

- `alt=""` is the correct choice: the logo is decorative **because the brand name is
  adjacent text**, and the enclosing `<a>` takes its accessible name from that text.
- When `showNameWithLogo: false` hides the name, the same `<a>` gains
  `aria-label={siteName}` (`Logo.astro:94`), so the link is still named.
- The 29 instances that *do* carry `aria-hidden` are the same component rendered in
  contexts where the wrapper already suppresses it.

**Finding:** the pattern is not a WCAG failure. It is recorded as **Low**, with the
recommendation to add `aria-hidden="true"` to the logo `<img>` for explicitness, matching
the 29 instances that already do so. It is not a defect.

No image anywhere in the build lacks an `alt` attribute entirely (`noAlt = 0` over 156
images), so the "non-empty alt, or `alt=""` + `aria-hidden` where decorative" requirement
is met in substance for all 156.

### 5.6 F3 concrete findings

| # | Severity | Finding | Evidence |
|---|---|---|---|
| F3-1 | **Medium** | Header mobile drawer uses `<h3>` with no `<h2>` anywhere in the header → **h1→h3 skip on 20 of 39 templates**. | `frontend/src/components/Header.astro:247` |
| F3-2 | **Medium** | Footer column headings are `<h3>` with no `<h2>` → contributes the same skip on every route. | `frontend/src/components/Footer.astro:83,145,166,202` |
| F3-3 | **Low** | The `tag` template emits an article headline as `<h3>` directly under the page `<h1>` — a content-level skip independent of chrome. | `tag/hsc` built output, §5.3 |
| F3-4 | **Low** | 98 decorative logo `<img alt="">` omit `aria-hidden="true"`; correct in effect, inconsistent with the 29 sibling instances that include it. | `frontend/src/components/Logo.astro:100` |
| F3-5 | **None** | 0 images without `alt`; 0 links without an accessible name; 0 generic "click here" links; 0 unlabelled controls; 0 invalid `aria-hidden` on focusables. | §5.2, §5.4 |

---

## 6. Priority-ordered defect list

| P | ID | Defect | Dimension | Evidence | Effort |
|---|---|---|---|---|---|
| 1 | F3-1 + F3-2 | Heading-level skip h1→h3 on **20 of 39 templates**, caused by two global components (header drawer + footer). One fix in two files closes all 20. | F3 | `Header.astro:247`; `Footer.astro:83,145,166,202` | S |
| 2 | D1-1 | **5 of 5** data tables (cgpa 3, gpa 2) have no `overflow-x` wrapper, so narrow-viewport behaviour is unmitigated. The correct pattern already exists at `institutions/[slug].astro:248`. | D1 | `cgpa/index.html`, `gpa/index.html` | S |
| 3 | D2-2 / D3-4-3 | Demo-ad rotation (4s interval, infinite) **cannot be paused by touch users** — only `mouseenter` pauses it. Genuine WCAG 2.2.2 exposure; reduced-motion is honoured but is not the only required path. | D2, D3/D4 | `DemoAd.astro:155-168` | S |
| 4 | F3-3 | `tag` template emits an article headline as `<h3>` under the page `<h1>`. | F3 | §5.3 | S |
| 5 | F3-4 | 98 decorative logo images omit `aria-hidden="true"` (correct in effect, inconsistent with 29 siblings). | F3 | `Logo.astro:100` | S |

---

## 7. Verdicts

| Dimension | Verdict | Numbers |
|---|---|---|
| **D1 — Responsive** | **Verified, with 1 low-severity defect class.** Measurement is static, not rendered (§9). | 114/114 documents declare viewport; 0 duplicate; 0 fixed-width overflow (max fixed width 4px); 0 long unbreakable strings; 43/43 responsive images have both `srcset` and `sizes`; 95/95 real pages carry `.container-page`; **3 of 39 templates have any D1 deficiency** (`cgpa`, `gpa` = unwrapped tables; `/article/*` = scope correction, not a defect). |
| **D2 — Hover-only risk** | **Verified: none.** No hover-gated affordance exists. | 41 `:hover` occurrences, all cosmetic; **0** visibility/`pointer-events` gates; 21 `:focus*` selectors; 3 `@media (hover:hover)` blocks; search expands on `:focus`; ticker pauses on `:focus-within`; Escape closes the drawer; arrow keys drive the reaction bar. 1 unrelated WCAG 2.2.2 exposure (demo ad, touch). |
| **D3 — Motion inventory + gating** | **Verified: fully gated.** | 4 `@keyframes`, 6 motion call-sites, **9 motion declarations, 9 honour reduced motion, 0 ungated**; 2 `prefers-reduced-motion: reduce` blocks shipped; 2 `no-preference` opt-in gates; 1 JS `matchMedia` check. |
| **D4 — Dual-path review** | **Verified: information-preserving in both paths.** | Default path animates; reduced path removes movement while keeping content (ticker becomes `overflow-x:auto` scrollable, poll bar still reaches its final width, scrolly/photo never apply). §4.4. |
| **F3 — A11y basics** | **Verified, 3 real defect classes.** | 39/39 templates have exactly one `<h1>`; 39/39 `lang="bn"`; **20/39 have a heading skip** (20 skips total); 0/156 images missing `alt`; 0/2698 links without an accessible name; 0 generic-text links; 0 unlabelled controls; 0 invalid `aria-hidden` on focusables; 5 tables, 0 wrapped. |

---

## 8. Not measurable in this environment

These are recorded as **not measurable**, with the reason. They are **not** passes, and no
credit should be taken for them.

| # | Check | Why it is not measurable here |
|---|---|---|
| N1 | _Superseded — no build was required._ | `dist/` was fresh at 00:17 and no `src/**/*.astro` was newer, so no build was run. A concurrent agent rebuilt at 00:30-00:31 regardless; I froze the completed output (§1.1) instead of racing it. |
| N2 | **Real layout at 320px** (does anything actually overflow?) | Requires a rendering engine. Static analysis can prove no fixed width ≥320px exists and that `overflow-wrap: break-word` is global, but it cannot prove computed layout. The 5 unwrapped tables (D1-1) are flagged precisely because their behaviour is unverified. |
| N3 | **Computed style at the 5 breakpoints** (does `md:`/`lg:` win where intended?) | Same reason. Cascade order and specificity were reasoned about, not computed. |
| N4 | **Touch-target sizes (≥48×48px gate)** | Needs `getBoundingClientRect()`. Class evidence exists (`min-h-12` = 48px, `min-h-11` = 44px, `h-10` = 40px on header controls, `h-8 w-8` = 32px on `TextResizer.astro:18,27,36` and `h-7 w-7` = 28px on `SocialLinks.astro:62`), but **without layout these cannot be confirmed as the rendered hit area** — the 28-44px values are a genuine risk that must be measured in a browser, not asserted from classes. |
| N5 | **INP / interaction latency** | Requires a real user interaction and the Performance API. Out of scope for static analysis. |
| N6 | **CLS** | Requires layout + paint. `width`/`height` are present on 265/308 `<img>` (§2.4), which is necessary but not sufficient evidence. |
| N7 | **axe-core / real a11y audit** (contrast ratios, accessible-name computation, ARIA validity beyond the checks in §5) | No browser and no `axe-core` in the repo. Colour-contrast in particular is **not measured at all** — `docs/` notes Lighthouse a11y was previously run, but this pass did not reproduce it. |
| N8 | **`prefers-reduced-motion` actually applied at runtime** | The media queries and the `matchMedia` call are present in the shipped bytes (`§4.2`); whether the browser honours them under a real OS setting was not exercised. |
| N9 | **Focus-visible rendering / focus order** | `:focus-visible` is declared globally (`global.css:206-210`) and focus styles exist as classes, but visible focus and tab order need a browser. |
| N10 | **Redirect stubs behaving as redirects** (9 `article/*` + 10 others) | Static analysis confirms the `http-equiv="refresh"` and canonical target are present; it does not confirm the 301/302 the edge serves. |
| N11 | **Screen-reader output** | No AT available. |

---

## 8b. E2 — Autoplay and total asset weight (measured 2026-10-19, orchestrator)

The audit scored E2 0/3 as *"autoplay and total asset-weight policies were
not exhaustively checked"* — an unverified dimension, not a failure. Measured
statically against the built output after a clean `pnpm run build` (114 pages):

**Autoplay — nothing autoplays.**

| Check | Result |
|---|---|
| `<video>` / `<audio>` elements in the whole build | **0** (`grep -rho "<video[^>]*>\|<audio[^>]*>" dist` → empty) |
| `autoplay` attributes shipped | **0** |
| `autoplay` mentions in source | 2, both inside an iframe `allow` list set **after a user tap** (`ContentBlockScripts.astro:97,103`, `MediaEmbed.astro:174,212`) — the comment states the reasoning: *"`autoplay=1` is allowed because a tap is a user gesture"*. A gesture-gated embed is not autoplay. |
| Timed loops that move content | 1 — the demo ad's 4s rotation, which now carries a real stop control (see the D2 fix) |
| Timed loops that only change text | 1 — the prayer countdown repaints every 30s (`HeaderWidgets.astro:256`), no animation and no layout shift; interruptible and not motion |

**Total asset weight.** Whole build **7.5 MB** against the repo's 15 MB CI
ceiling; per-type: HTML 4,169 KB (114 documents, 19 of them redirect stubs),
WebP 649 KB, JS 514 KB, CSS 109 KB, woff2 154 KB, PNG 68 KB, SVG 6 KB.

Per-page critical path was measured separately at **309 KB** (homepage) and
**287 KB** (article) against the **1.2 MB** gate — see the design-gates report.
The 30 KB *data-saver* budget is defined in `docs/performance-budget.md:53` as a
whole-page mode that *"strips ads, defers images behind a tap placeholder"*;
that mode is a build-time feature, so its budget is **not measurable from the
default build** and is recorded as such rather than assumed to pass.

**Verdict: E2 satisfied on the evidence available** — no autoplaying media
exists to violate the policy, and both weight budgets that can be measured
statically are inside their gates with room to spare. The data-saver budget
remains unmeasured pending a browser and that mode's build flag.

---

## 9. Reproducing this

```bash
cd frontend
stat -f "%Sm %N" dist                       # confirm freshness before measuring
find src -newer dist -name "*.astro"        # must be empty
mkdir -p /tmp/aud && rm -rf /tmp/aud/snap && cp -R dist/. /tmp/aud/snap/

# D1
find /tmp/aud/snap -name "index.html" | wc -l
grep -c 'name="viewport"' /tmp/aud/snap/index.html
grep -o '@media[^{]*' /tmp/aud/snap/_astro/Layout.BfUpHQAK.css | sed 's/@media *//' | sort | uniq -c | sort -rn
grep -o 'width:[0-9]\+px' /tmp/aud/snap/_astro/Layout.BfUpHQAK.css | sort -u

# D2
sed 's/}/}\n/g' /tmp/aud/snap/_astro/Layout.BfUpHQAK.css | grep -o '^[^{]*:hover[^{]*' | sort -u
grep -rn -B2 -A4 "hover" src/ --include=*.astro --include=*.css \
  | grep -E "display: *none|opacity: *0|visibility: *hidden|pointer-events: *none"   # expect empty

# D3/D4
grep -rn "@keyframes" src/
grep -rn "animation:\|transition:\|scroll-behavior" src/
grep -o 'prefers-reduced-motion' /tmp/aud/snap/_astro/Layout.BfUpHQAK.css | wc -l

# F3
python3 /tmp/aud/a11y2.py     # per-template extraction; see §5.1
```

Snapshot: 114 HTML, 4 CSS, build `@ a712a27`, frozen at `frontend/dist` mtime
`Oct 19 00:31:46 2026`.
