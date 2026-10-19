# T-89 C1c — Modern CMS design research

**Date:** 2026-10-19 21:35 (+06:00)  
**Mode:** Internet research and project-memory update only. No CMS source changed.  
**Question:** How should a modern, colorful, light-mode Payload CMS be designed so it is clean, fast, and easy to use?

## Primary sources

1. **Payload — Custom CSS**  
   <https://payloadcms.com/docs/admin/customizing-css>  
   Confirms the supported path is a custom admin stylesheet rather than replacing the admin framework.
2. **Payload — Custom Components**  
   <https://payloadcms.com/docs/custom-components/overview>  
   Confirms supported slots for root components, nav links, dashboard content, graphics, providers, and custom views.
3. **Atlassian Design — Color**  
   <https://atlassian.design/foundations/color>  
   Recommends role-based color tokens, semantic intent, emphasis levels, distinct selected/focused states, and WCAG AA contrast.
4. **Primer — Color usage**  
   <https://primer.style/product/getting-started/foundations/color-usage/>  
   Recommends separating base, functional, and component tokens; using semantic foreground/background/border roles; and treating semantic color as status/action/emphasis rather than decoration.
5. **IBM Carbon — Color overview and guidelines**  
   <https://www.carbondesignsystem.com/building-blocks/foundations/color/overview/>  
   <https://www.carbondesignsystem.com/building-blocks/foundations/color/guidelines/>  
   Recommends a dominant neutral palette, subtle layer shifts, role-based tokens, and a small number of purposeful alert colors.
6. **Material Design 3 — Color roles**  
   <https://m3.material.io/styles/color/roles>  
   Recommends primary, secondary, and tertiary accent roles by importance, paired container/on-container colors, and distinct surface hierarchy.
7. **NN/g — Usability heuristics**  
   <https://www.nngroup.com/articles/ten-usability-heuristics/>  
   Recommends visible status, user language, clear exits, consistency, error prevention, recognition over recall, minimalist design, and recoverable errors.
8. **NN/g — Progressive disclosure**  
   <https://www.nngroup.com/articles/progressive-disclosure/>  
   Recommends showing the common path first and deferring advanced choices until needed, without turning simple tasks into excessive steps.
9. **NN/g — Empty states**  
   <https://www.nngroup.com/articles/empty-state/>  
   Treats empty states as onboarding: explain the benefit, show the next action, and make the first success easy.

## Design model for Shikkha24 CMS

### 1. Product concept

The admin should read as a **content workbench**, not a database directory. The user's first question is not “what collections exist?” but “what should I do next?”

The modern model is:

- **Dashboard = work queue:** recent drafts, assigned work, needs review, ready to publish, and failed rebuilds.
- **Collections = task surfaces:** content, education, media, readers, advertising, and administration grouped by workflow.
- **Editor = guided pipeline:** write → enrich → publish, with the common path visible and advanced controls deferred.
- **Lists = decision surfaces:** scan, filter, act, and recover—not raw tables.
- **Empty states = onboarding:** explain why the surface matters and give one next action.

### 2. Color system

Color should be **clean but colorful**: a light neutral workbench with purposeful accents. The Shikkha24 brand red should identify the product and editorial content, not destructive actions.

Recommended semantic roles:

| Role | Use | Direction |
|---|---|---|
| Canvas | Page background | Cool light neutral, darker than cards |
| Surface | Cards, nav, header, forms, lists | White with a visible border |
| Ink | Primary text | Near-black slate |
| Muted ink | Descriptions, metadata | Medium slate, still readable |
| Border | Separation and control edges | Light slate; stronger for inputs |
| Brand red | Product identity, editorial accents | Not delete/danger |
| Emerald | Create, save, publish, success | Primary workflow action |
| Blue | Links, filters, navigation, information | Interactive and informational |
| Amber | Draft, warning, rebuild notice | Caution without alarm |
| Red | Delete, destructive, failed publish | Reserved for danger |
| Purple / teal / orange | Optional family accents for media, interactive, advertising | Use sparingly and consistently |

Every semantic color needs foreground, background, border, muted, and emphasis variants. Never use the brand red and danger red interchangeably. Never use color alone: pair it with text, an icon, or a shape.

### 3. Hierarchy and layout

- Use a **4/8px spacing system**; common steps: 4, 8, 12, 16, 24, 32, 48.
- Use **white cards on a slightly darker canvas** with 1px borders and no shadows.
- Use **one primary action per view**. Secondary actions become quiet buttons or overflow menus.
- Keep the sidebar around **272–280px**, with collapsible workflow groups and clear active state.
- Make headers compact: page title, status, metadata, and one primary action.
- Use a **sticky editor action bar** for save/publish state and error summary.
- Use **two-column editors** on desktop and a single column on mobile; the sidebar should collapse into a review/settings drawer.

### 4. Typography

- Use system fonts for speed; no webfont for the admin shell.
- Recommended scale:
  - Page title: 20–22px bold.
  - Section heading: 16–17px semibold.
  - Card/list title: 14–15px semibold.
  - Body/input: 14px.
  - Help/metadata: 12.5–13px.
  - Sidebar group label: 12px semibold uppercase.
- Keep line-height comfortable: 1.45–1.6 for prose and help text.
- Bengali field content/help should render at a readable size and line-height even when admin chrome is English-first.

### 5. Dashboard and navigation

The dashboard must not show 35 equal collection cards. It should be **role-aware and task-first**:

1. **Start here / My Work:** assignments, quick draft, recent drafts.
2. **Needs attention:** unsaved errors, rejected work, missing media, failed rebuild.
3. **Ready to publish:** approved or review-complete content.
4. **Recently edited:** the user's last 5–10 documents.
5. **All collections:** grouped, collapsed, or moved behind a “Browse all” drawer.

Navigation should mirror workflow:

- Editorial: Articles, Assignments, Authors, Pages, Fact checks.
- Education: Scholarships, Deadlines, Institutions, FAQs, Study abroad.
- Media: Media library, Photo galleries, Live streams.
- Interactive: Live blogs, Polls, Quizzes.
- Readers: Comments, Newsletter, Bookmarks, Push.
- Administration: Users, Readers, Site settings.

Groups should remain visible but collapsed by default, except Editorial and Media. This preserves discoverability while reducing noise.

### 6. Lists and filters

- One emerald **Create New** action.
- Search, saved filters, status chips, and date filters grouped in one toolbar.
- Sticky table header and 44–48px row/control targets.
- Status chips with semantic color, icon, and label.
- Row hover should be neutral; selected rows remain recognizable with a border or checkmark.
- Bulk actions appear only after selection.
- Destructive actions stay out of the primary row action area.

### 7. Editor and publishing

The editor should guide the publishing pipeline:

1. **Content:** headline, excerpt, body.
2. **Enrichment:** featured image, gallery, video, related links.
3. **Classification:** category, tags, education metadata.
4. **Review/publish:** status, author ownership, publish date, rebuild state.

Rules:

- Required fields are obvious before submit.
- Help text is short and contextual.
- Validation appears next to the field and in a summary.
- Publish is emerald; delete is red.
- Draft/published/review states are chips, not plain text.
- The action bar always shows unsaved state and current status.
- Advanced fields are collapsed until needed.

### 8. Feedback and empty states

- Show immediate state changes without heavy animation.
- Use inline messages for field errors and banners for page-level state.
- Use toasts only for short confirmations; never hide a failure only in a toast.
- Empty states should include:
  1. Why the surface matters.
  2. What the user can do next.
  3. One primary action.
  4. Optional secondary help link.

Example: “No media yet. Upload the first image to use it in articles.” Primary action: “Upload media.”

### 9. Performance and accessibility

- No dark mode.
- No glassmorphism, gradients, or decorative shadows.
- No transform/transition on controls; hover changes color/background only.
- Text contrast: 4.5:1 minimum; large text and essential UI: 3:1 minimum.
- Focus must be visible and distinct from selected state.
- Touch targets: 44px desktop, 48px mobile.
- Use system fonts and CSS variables; avoid new JS dependencies and animation libraries.
- Keep each CSS file small and split by tokens, hierarchy, and controls.

## Payload implementation constraints

- Use `custom.scss` for the supported design-token layer.
- Use `admin.components` slots for nav, dashboard, graphics, and custom views.
- Remap Payload's native `--theme-elevation-*` and status variables instead of overriding every component manually.
- Use Payload components where they already work; replace only the shell, dashboard, or editor surfaces when the existing component cannot express the workflow.
- Avoid a parallel design system or new UI framework.

## Recommended implementation order

1. **C1c5 — Color/shape token audit:** complete semantic foreground/background/border variants.
2. **C1c6 — Navigation IA:** collapse workflow groups and clarify active/selected states.
3. **C1c7 — Dashboard workbench:** task-first cards, recent work, needs attention, and browse-all drawer.
4. **C1c8 — List toolbar:** search/filter/status chips and one primary CTA.
5. **C1c9 — Editor pipeline:** staged sidebar, status chips, sticky action bar, validation summary.
6. **C1c10 — Empty states:** benefit, next action, and help.
7. **C1c11 — Emoji/icons:** fast, relatable identification.
8. **C1c12 — QA:** contrast, keyboard, mobile, detector, typecheck, lint, build, and owner review.

## Confidence

**High** for the design direction because it is grounded in Atlassian, Primer, Carbon, Material 3, NN/g, and Payload's own extension model.  
**Medium** for exact visual values until the owner reviews rendered dashboard, list, and editor variants.
