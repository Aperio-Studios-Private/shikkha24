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
    <div className="reporter-quicklink">
      <div>
        <h2>My Work (প্রতিবেদকের কাজ)</h2>
        <p>
          See your assignments and submit a quick draft (আপনার কাজের তালিকা দেখুন এবং দ্রুত সংবাদ জমা দিন)।
        </p>
      </div>
      <Link className="btn btn--style-primary" href="/admin/reporter">
        Open My Work (প্রতিবেদকের কাজে যান)
      </Link>
    </div>
  )
}
