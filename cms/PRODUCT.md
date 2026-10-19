# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Payload CMS 3 on Next.js 16, TypeScript, SQLite, and Payload Admin custom SCSS. The admin runs locally at `http://localhost:3000/admin`; production is hosted separately.

## Primary Users

Newsroom operators: super admins, editors-in-chief, section editors, reporters, and ad managers. They create and review education news, manage taxonomy and media, moderate reader contributions, and publish to the Shikkha24 storefront.

## Operating Context

The CMS is the operational backend for the Bengali-first education portal. Editorial work moves from assignment or draft creation through review, approval, publication, and homepage placement. The dashboard should surface the next task quickly, especially when queues are mostly empty.

## Capabilities and Constraints

- Admin UI is English-first operator UI; reader-facing storefront content is Bengali.
- Light mode only.
- Optimize for speed and clarity over premium visual effects.
- No animations, transitions, shadows, or transforms anywhere in the admin UI.
- Emoji are preferred over icon libraries for lightweight recognition.
- Access control must remain enforced through Payload collection rules, not UI visibility.
- The current redesign is chunked and verification-gated; do not batch unrelated CMS surfaces.

## Product Principles

- Make the next editorial action obvious.
- Keep operator surfaces fast, clean, and predictable.
- Preserve role-aware data scope and server-side authorization.
- Use color semantically: brand, information, success, warning, and danger.
- Make empty states explain what to do next.

## Accessibility & Inclusion

Maintain visible focus, sufficient contrast, and 48px mobile touch targets for custom admin controls. Desktop may use compact rows, but mobile controls must remain reachable and readable.
