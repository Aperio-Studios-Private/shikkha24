---
name: Shikkha24 CMS
description: Light, fast, role-aware newsroom admin for the Shikkha24 education portal.
colors:
  brand: "#da1c25"
  brand-dark: "#b8161e"
  brand-soft: "#fff1f2"
  info: "#1d4ed8"
  info-soft: "#dbeafe"
  success: "#047857"
  success-soft: "#d1fae5"
  warning: "#b45309"
  warning-soft: "#fef3c7"
  danger: "#dc2626"
  danger-soft: "#fee2e2"
  canvas: "#e9edf5"
  surface: "#ffffff"
  ink: "#152238"
  ink-muted: "#526077"
  border: "#cbd5e1"
typography:
  title:
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.4
  section:
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  compact:
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "20px"
components:
  primary-button:
    backgroundColor: "{colors.brand}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    height: "44px"
  status-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    rounded: "999px"
  status-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    rounded: "999px"
  status-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    rounded: "999px"
---

# Design System: Shikkha24 CMS

## Overview

**Creative North Star: "a clean task desk."**

The incumbent admin is a light, flat operator workspace. It favors clear hierarchy, compact navigation, semantic color, and fast scanning over decorative effects. Depth comes from surface color and borders, not elevation.

**Key Characteristics:**

- Light canvas with white cards and controls.
- Red brand accents used sparingly.
- Solid red sidebar category rows with white text.
- Emoji-led collection labels for fast recognition.
- Semantic status colors for success, warning, and danger.

## Colors

The palette separates neutral structure from semantic action and status colors.

### Primary

- **Shikkha Red** (`#da1c25`): brand identity, active emphasis, and primary actions.
- **Deep Red** (`#b8161e`): dark brand text and hover emphasis.

### Secondary

- **Information Blue** (`#1d4ed8`): links, informational actions, and focus.
- **Success Green** (`#047857`): approved or published states.
- **Warning Amber** (`#b45309`): pending-review or caution states.
- **Danger Red** (`#dc2626`): returned, rejected, or destructive states.

### Neutral

- **Canvas** (`#e9edf5`): page background.
- **Surface** (`#ffffff`): cards, panels, and controls.
- **Ink** (`#152238`): primary text.
- **Muted Ink** (`#526077`): secondary text.
- **Border** (`#cbd5e1`): card and control boundaries.

## Typography

**Body Font:** system/Payload admin stack

Use compact, high-contrast operator text. Section titles are 14–16px bold; body and helper copy are 13–14px. Do not reduce mobile text below the project touch-target rule.

## Layout

Desktop uses a persistent 275px sidebar plus a fluid content column. Cards use compact 10–14px padding and 10–12px gaps. Mobile collapses to one column and preserves 48px interactive targets.

## Elevation & Depth

Flat by default. Do not add shadows, transforms, or transitions to controls. Distinguish surfaces with background color and 1px borders.

## Shapes

Controls and cards use 8–12px radii. Status chips use a full pill. Borders remain visible and simple.

## Components

### Buttons

- **Shape:** 8px radius, centered label, minimum 44px desktop height.
- **Primary:** Shikkha Red background with white text.
- **Secondary:** white or neutral surface with a visible border.
- **Focus:** 3px blue outline with offset.

### Status Chips

- **Style:** soft semantic background, semantic foreground, 1px muted border.
- **State:** success, warning, danger, or neutral.

### Cards / Containers

- **Corner Style:** 12px.
- **Background:** white on the light canvas.
- **Shadow Strategy:** none.
- **Border:** 1px neutral border.

### Navigation

Desktop sidebar is 275px. Category rows are 32px solid red with centered white text. Items are compact 36px rows with thin separators; mobile targets expand to 48px.

## Do's and Don'ts

- Do use semantic color to explain meaning.
- Do preserve 48px mobile targets for custom controls.
- Don't add shadows, transforms, or transitions to controls.
- Don't use animation or hover motion anywhere in the CMS.
- Don't use dark mode.
- Don't replace lightweight emoji with an icon library.
