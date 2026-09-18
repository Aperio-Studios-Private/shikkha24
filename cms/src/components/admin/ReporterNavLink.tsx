'use client'

import { usePathname } from 'next/navigation'

/**
 * Nav link to the reporter workspace.
 *
 * ## Why this exists
 *
 * The workspace is a custom root view at `/admin/reporter`, and a view nothing
 * links to is a view nobody finds. The dashboard lists every collection, but
 * `assignments` is not where a reporter starts their day — *"what do I owe, and
 * by when?"* is — and that question is this page.
 *
 * ## Why it is not gated on role
 *
 * A reporter needs it; a desk benefits from it (the same view shows them the
 * whole board). Gating it would mean a client-side role check, and a hidden link
 * is not authorisation anyway — `Assignments.read` decides what each role
 * actually sees, server-side. So everyone sees the link and the data differs.
 *
 * `usePathname` is from `next/navigation`, which the admin already runs on — no
 * new dependency.
 */
export function ReporterNavLink() {
  const pathname = usePathname()
  const active = pathname === '/admin/reporter'

  return (
    <a
      href="/admin/reporter"
      style={{
        display: 'flex',
        alignItems: 'center',
        minHeight: '2.75rem',
        padding: '0 1rem',
        fontWeight: active ? 600 : 400,
        textDecoration: 'none',
        opacity: active ? 1 : 0.85,
      }}
    >
      প্রতিবেদকের কাজ
    </a>
  )
}
