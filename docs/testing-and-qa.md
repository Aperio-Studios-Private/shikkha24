# Testing, QA & Accessibility Plan — Shikkha24

**Created:** 2026-09-11 · **Status:** S0/S12 input. **Testing had only S12 checkboxes; accessibility had only a numeric target.**
**Why this exists:** "Lighthouse ≥90 accessibility" is a target, not a plan. And there was no defined answer to what gets tested, how, on which devices, or how Bengali rendering is verified.

---

## 1. Quality gates — what runs when

| Gate | Trigger | Blocks |
|---|---|---|
| TypeScript typecheck | Every CI run | Merge |
| Lint | Every CI run | Merge |
| Production build | Every CI run | Deploy |
| Lighthouse CI (perf + a11y budgets) | Every CI run | Deploy |
| HTML validation | Every CI run | Deploy (warn first) |
| JSON-LD / schema validation | Every CI run | Deploy |
| Broken-link check | Every CI run | Deploy (warn first) |
| `pnpm audit` | Every CI run | Policy in `docs/security.md` §9 |
| Bengali render audit | Manual, per section | Section approval |
| Device / browser matrix | Manual, at S12 and after major UI changes | Launch |
| Restore drill | Manual, pre-launch + every 6 months | Launch (`docs/backup-and-recovery.md`) |

All CI gates run inside the **debounced/batched build** — do not multiply CI minutes (see `docs/reliability.md`).

---

## 2. Test strategy — honest scope

This is a mostly-static site. Over-engineering a test suite here would be waste.

| Layer | Approach |
|---|---|
| **Static output** | Verified by the build itself + Lighthouse CI + link/schema checks. No unit tests needed. |
| **Payload collections, hooks, access control** | **Deserve real tests** — RBAC enforcement, field-level restrictions, scheduled publishing, versioning. These are the places where a bug is silent and damaging. |
| **Astro islands (client JS)** | A small number of targeted tests for the interactive bits (quiz, GPA calculator, deadline saver). |
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

- [ ] Every CI gate green on the release commit
- [ ] Lighthouse budgets met on all measured templates (both ad and no-ad profiles)
- [ ] Manual keyboard pass on homepage, article, category, search, quiz
- [ ] Screen-reader pass with Bengali content
- [ ] Device matrix completed
- [ ] Bengali rendering audit completed
- [ ] Rich Results Test passes on every template
- [ ] News sitemap and RSS validate
- [ ] 404 and error pages verified
- [ ] A full restore from backup performed and timed
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
- [ ] Add the CI gates to the build workflow at S0
