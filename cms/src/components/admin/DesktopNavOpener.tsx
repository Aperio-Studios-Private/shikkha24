'use client'

import { useNav, useWindowInfo } from '@payloadcms/ui'
import type React from 'react'
import { useEffect } from 'react'

/**
 * Opens the admin sidebar on desktop widths.
 *
 * ## Why this exists
 *
 * Payload 3.90.x–3.92.0 ships a nav-state bug for screens ≤1440px wide: the
 * admin's WindowInfo breakpoints define `l: (max-width: 1440px)`, so
 * `largeBreak` is TRUE on every common laptop, and `NavProvider`'s mount
 * effect (`largeBreak === true → setNavOpen(false)`) closes the sidebar and
 * marks the whole `<aside>` `inert` — no click anywhere in it lands. Measured
 * on the Render admin at 1280×720: `inert=""`, group buttons `tabIndex:-1`;
 * a fresh load at 1600px opens fine. The T-89 desktop grid
 * (`_admin-hierarchy.scss`) hides the nav toggler at ≥769px, so there was no
 * way to open it at all. Verified still unfixed upstream in
 * @payloadcms/ui 3.92.0 (latest as of 2026-10-27).
 *
 * This renderless component calls the nav context's own `setNavOpen(true)` —
 * the same mechanism the nav toggler uses — once the viewport leaves the
 * mobile/tablet range. On small screens it does nothing: the sidebar is a
 * modal there and Payload's close-on-navigate behaviour is correct. Re-runs
 * when the breakpoints flip so a resize keeps the right state.
 *
 * Rendered from `TopbarActions` (the `admin.components.actions` slot), which
 * mounts inside AppHeader on every admin page — inside `RootProvider`, so
 * both hooks resolve.
 */
export const DesktopNavOpener: React.FC = () => {
  const { setNavOpen } = useNav()
  const {
    breakpoints: { s: smallBreak, m: midBreak },
  } = useWindowInfo()

  useEffect(() => {
    // Desktop = neither the small (≤768) nor mid (≤1024) breakpoint active.
    // The large breakpoint (≤1440) is exactly the buggy zone, so it must NOT
    // gate this — only true mobile/tablet widths keep the modal behaviour.
    if (smallBreak === false && midBreak === false) {
      setNavOpen(true)
    }
  }, [smallBreak, midBreak, setNavOpen])

  return null
}
