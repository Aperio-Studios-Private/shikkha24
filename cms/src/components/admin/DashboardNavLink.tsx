'use client'

import { usePathname } from 'next/navigation'

/**
 * Sidebar link back to the admin dashboard.
 */
export function DashboardNavLink() {
  const pathname = usePathname()
  const active = pathname === '/admin'

  return (
    <a className={active ? 'nav__link active' : 'nav__link'} href="/admin">
      {active ? <span className="nav__link-indicator" /> : null}
      Dashboard
    </a>
  )
}
