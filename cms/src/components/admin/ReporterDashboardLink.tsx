import Link from 'next/link'

/**
 * Dashboard entry point to the reporter workspace.
 *
 * ## Why this exists alongside the nav link
 *
 * The workspace is registered in `admin.components.afterNavLinks` too, which is
 * the conventional place. But `afterNavLinks` output did **not** appear in the
 * server-rendered admin HTML on `/admin` or on a collection list, so whether it
 * renders before hydration could not be verified from the outside — and a
 * workspace nobody can find is a workspace that does not exist.
 *
 * This renders in the dashboard **body**, which is server-rendered and therefore
 * checkable. It is also the better position for this particular page: a reporter
 * starting their day lands on the dashboard, and "what do I owe?" is the first
 * thing they should see rather than the 31st collection in a list.
 *
 * ## No client hooks
 *
 * Deliberately a server component. The nav variant uses `usePathname` for its
 * active state; this one has no state to track, and keeping it hook-free means
 * it cannot be affected by hydration timing.
 */
export function ReporterDashboardLink() {
  return (
    <div
      style={{
        border: '1px solid var(--theme-elevation-100, #e4e4e4)',
        borderRadius: '0.5rem',
        padding: '1rem',
        marginBottom: '1.5rem',
      }}
    >
      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>প্রতিবেদকের কাজ</h2>
      <p style={{ fontSize: '0.875rem', opacity: 0.75, marginBottom: '0.75rem' }}>
        আপনার কাজের তালিকা দেখুন এবং দ্রুত সংবাদ জমা দিন।
      </p>
      <Link
        href="/admin/reporter"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          minHeight: '2.75rem',
          padding: '0 1rem',
          borderRadius: '0.375rem',
          background: 'var(--theme-elevation-800, #1f1f1f)',
          color: 'var(--theme-elevation-0, #ffffff)',
          fontWeight: 500,
          textDecoration: 'none',
        }}
      >
        প্রতিবেদকের কাজে যান
      </Link>
    </div>
  )
}
