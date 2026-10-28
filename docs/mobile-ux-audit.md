# Mobile UX Audit — Shikkha24 (390×844, findings only — no fixes applied)

**Date:** 2026-10-28 · **Method:** real-browser walkthrough at 390×844 (iPhone-class)
on the live site, every interactive surface exercised, screenshots + programmatic
touch-target and overflow measurements. Per owner instruction: findings and
recommendations only.

---

## What works well (keep)

- No horizontal overflow on any audited page (scrollWidth ≤ viewport everywhere).
- Reading experience on articles: font size, line-height and measure are comfortable.
- Related-articles section renders correctly on mobile (2 cards).
- Search overlay opens and the input + খুঁজুন button are thumb-reachable.
- Drawer menu: standard pattern, categories readable, closes properly.
- New stacked default thumbnail reads cleanly at 96px list size.

---

## Findings (ordered by severity)

### 🔴 HIGH

**H1. Fixed share bar overlaps the footer.** On every page, the fixed bottom bar
(হোয়াটসঅ্যাপ / ফেসবুক / কপি) covers the footer's last rows — সামাজিক মাধ্যম buttons,
সাইটম্যাপ, গোপনীয়তা নীতি, ব্যবহারের শর্ত and যোগাযোগ are partially unreachable.
The footer lacks bottom padding to clear the fixed bar.
**Fix:** add `padding-bottom` (≈72px + safe-area inset) to `footer`/`body` on mobile,
or hide the share bar when the footer is in view.

**H2. Search suggestions broken on production (regression from the topbar redesign).**
Typing in the mobile search overlay shows no suggestions. Root cause confirmed in the
shipped bundle: the dynamic `import('/pagefind/pagefind.js')` was wrapped by Astro's
import helper (`a(...)`), which throws `importModule is not defined` at runtime —
`@vite-ignore` was not respected through Astro's script pipeline. The /search page
itself still works (it uses the script-tag pattern).
**Fix:** load Pagefind via script-tag injection (the same proven pattern as
`/search-init.js`) instead of a dynamic import, then call `PagefindUI`-free
`pagefind.search()` via the injected global.

**H3. 18 interactive targets below 44px on the homepage** (Apple/Google minimum is
44×44). Worst offenders: article-list links (24px tall), the weather button (21px),
the location select (24px), filter chips (38px), the site logo link (36px).
**Fix:** min-height 44px on list links (padding, not font), 44px on widget buttons
and the location select; chips to 44px with the same visual weight.

### 🟡 MEDIUM

**M1. Ad placeholder renders on the live site.** A grey 423×320 box labeled
'নতুন বিজ্ঞাপন' shows on the homepage and inside article bodies — reads as
unfinished to readers. It is presumably an AdSense slot awaiting inventory.
**Fix:** hide the slot until real ad code is active (feature flag), or style the
placeholder as an intentional brand panel.

**M2. Drawer carries the OLD three-button text resizer** — inconsistent with the new
single cycling button in the topbar (two different resizer UIs on one device).
**Fix:** replace the drawer's resizer block with the same cycling button component.

**M3. Drawer has no search entry.** The search icon lives in the topbar only; a
drawer user must close the menu to search. **Fix:** add a search row at the top of
the drawer that opens the same overlay.

**M4. Dense 2-column text-link grid** (the 'একাদশ শ্রেণিতে ভর্তি হতে…' list) — 24px
links in two columns read as a wall of text on mobile. **Fix:** single column with
44px rows and chevron affordance, or card-ify the top items.

### 🟢 LOW

**L1. Date flip slot reserves 160px (`w-40`) even before hydration** — on the 390px
topbar the reserved space is wider than the visible Bangla date; harmless but the
row can look slightly gapped. **Fix:** size the slot to the current date (JS measure)
or accept as-is.
**L2. Weather/prayer hidden below `sm`/`lg`** — on ≤640px phones the weather and
prayer widgets disappear entirely from the topbar (they're in no drawer either).
If these matter to readers, add them to the drawer. **Owner decision.**
**L3. Skip-link is 1×1** — technically present for keyboard users; fine, but could
be a visible toast on focus for mobile keyboard users. Cosmetic.

---

## Recommendations summary (actionable, ordered)

1. **H1** — footer clearance for the fixed share bar (CSS-only, 10 min).
2. **H2** — search suggestions fix via script-tag Pagefind loading (30 min + deploy).
3. **H3** — touch-target pass on the homepage list + widgets (1 h).
4. **M1** — hide the ad placeholder until inventory exists (5 min).
5. **M2/M3** — drawer consistency: new resizer + search row (30 min).
6. **M4** — de-densify the link grid (1 h, design choice).
7. **L1–L3** — optional polish.

Each item is independent; 1–3 are the ones a reader would hit daily.
