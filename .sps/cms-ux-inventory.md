# CMS admin UX inventory — T-89 C0

**Date:** 2026-10-19  
**Mode:** read-only C0 inventory. No CMS UI, collection, access, workflow, or dependency changes.  
**Decision used:** editor-first; English-first guidance with Bengali key terms; light-mode only.  
**Coverage:** all 34 configured Payload collections, the Site Settings global, 5 roles, publish/rebuild workflow, and all 4 current custom admin components.

## Current state

| Area | Finding |
|---|---|
| Collections | 34 collections are registered. Every collection has a collection-level description. |
| Global | `site-settings` is registered and describes site-wide name/logo/contact behavior. |
| Roles | `reporter`, `sectionEditor`, `editorInChief`, `adManager`, `superAdmin`; access is server-side. |
| Rebuild workflow | 22 distinct collection imports are wrapped with `withRebuildTrigger`; 23 call sites include the global variant. |
| Existing styling | `custom.scss` already improves buttons, delete affordance, focus, and primary brand color, but dark mode remains available. |
| Current components | 4 custom admin components exist: reporter dashboard link, nav link, workspace, and quick-draft form. |
| Guidance coverage | Most article/author/media fields have help text, but 12 collections have help on fewer than half of their fields. |
| Visual consistency | Reporter components mix inline styles, Tailwind dark variants, and a blue submit button; this conflicts with a cohesive light-only brand system. |

## Low-guidance collections

These are the first targets for C7 field-help work, after the global design system and highest-traffic flows:

| Collection | Field help coverage |
|---|---:|
| Assignments | 4/10 |
| Circulars | 1/7 |
| Citizen submissions | 4/9 |
| Deadlines | 3/7 |
| Fact checks | 1/5 |
| Newsletter subscribers | 4/9 |
| Photo galleries | 1/4 |
| Quizzes | 2/5 |
| Result links | 3/8 |
| Saved deadlines | 1/4 |
| Scholarships | 2/6 |
| Study-abroad guides | 1/7 |

## Prioritized feature list

1. **Light-only design system** — lock Payload to `admin.theme: 'light'`, define brand/surface/status/focus tokens, remove dark-only admin classes, and normalize buttons/forms.
2. **Task-based dashboard** — show “Start here”, role-aware quick actions, and a short Draft → Review → Publish → Rebuild explanation.
3. **Task-based navigation** — group collections by jobs: Write & Review, Education Data, Media, Interactive, Readers, Site Control.
4. **Article editor guide** — explain required fields, review states, lead/breaking behavior, publish timing, and what the reporter may not change.
5. **Media guide** — explain upload constraints, alt text, reuse, no automatic resizing, and safe replacement.
6. **Reporter workspace polish** — make assignments, deadlines, quick draft, and next actions clearer on mobile.
7. **Form help & feedback** — add concise instructions to low-guidance collections and standardize required/error/success language.
8. **Accessibility & QA** — verify light-only contrast, focus, keyboard use, touch targets, Bengali rendering, and mobile layout.

## Refined implementation chunks

| Chunk | Scope | Files expected | Verification |
|---|---|---|---|
| C1a | Light-only tokens + Payload theme lock | `payload.config.ts`, `custom.scss` | Typecheck, lint, build, grep for dark-theme opt-in |
| C1b | Buttons, links, focus, destructive controls | `custom.scss` | Typecheck, lint, build, browser spot check |
| C1c | Form fields and status colors | `custom.scss` | Typecheck, lint, build, browser spot check |
| C2a | Role-aware dashboard quick actions | new dashboard component + registration | Typecheck, lint, build, browser spot check |
| C2b | Publishing workflow explainer | same dashboard component | Typecheck, lint, build, browser spot check |
| C3a | Editorial navigation labels/groups | Articles/Assignments/Authors/Pages/FactChecks metadata | Typecheck, lint, build, browser spot check |
| C3b | Education/taxonomy navigation labels/groups | relevant collection metadata | Typecheck, lint, build, browser spot check |
| C3c | Media/interactive/reader/admin navigation | relevant collection metadata | Typecheck, lint, build, browser spot check |
| C4a | Article field instructions | `Articles.ts` | Typecheck, lint, build, editor walkthrough |
| C4b | Article workflow sidebar/help | `Articles.ts` or small component | Typecheck, lint, build, editor walkthrough |
| C5a | Media field instructions | `Media.ts` | Typecheck, lint, build, media walkthrough |
| C5b | Media list/reuse guidance | `Media.ts` or small component | Typecheck, lint, build, media walkthrough |
| C6a | Assignment cards/status/next steps | `ReporterWorkspace.tsx` | Typecheck, lint, build, mobile browser check |
| C6b | Quick-draft form polish | `QuickDraftForm.tsx` | Typecheck, lint, build, submission smoke test |
| C7a | Low-guidance batch 1: Assignments, Circulars, Deadlines | relevant collection files | Typecheck, lint, build, form walkthrough |
| C7b | Low-guidance batch 2: Fact checks, Quizzes, Result links | relevant collection files | Typecheck, lint, build, form walkthrough |
| C7c | Low-guidance batch 3: Media-adjacent and reader forms | relevant collection files | Typecheck, lint, build, form walkthrough |
| C8a | Contrast and light-only audit | fixes only | Automated/grep + browser contrast spot checks |
| C8b | Keyboard, touch, Bengali, mobile QA | fixes only | Browser/device checks + full CMS gates |

## Subagent policy for C0 onward

- C0 used three disjoint read-only inspection lanes: collections/workflows, access/components, and theme/styling.
- Implementation should normally proceed one chunk at a time to preserve visual coherence.
- Parallel implementation is safe only after C1a tokens are committed and file ownership is disjoint.
- The orchestrator must review each chunk, run its gates, and commit it separately.

## Risks and controls

| Risk | Control |
|---|---|
| Payload CSS class names may change between versions | Use supported overrides and keep selectors narrow; record class contracts in comments. |
| UI changes could imply permission changes | Never hide server-side authorization; only improve labels, guidance, and presentation. |
| Light-only lock could remove an operator preference | This is owner-requested; document the decision and ensure contrast remains accessible. |
| Too many simultaneous CSS edits could make regressions hard to isolate | Commit C1a/b/c separately and visually inspect each. |
| Bengali text may overflow small controls | Test mobile widths and keep English primary with short Bengali key terms. |

## Recommended next chunk

**C1a:** lock the admin to light mode and commit the design tokens only. No dashboard, navigation, or content-model changes yet.
