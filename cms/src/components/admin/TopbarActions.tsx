'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

import { TopbarSearch } from './TopbarSearch'

/**
 * The admin topbar's action cluster: global search, quick create, site link.
 *
 * Registered on `admin.components.header`, so Payload renders it inside
 * AppHeader's actions row on every admin screen. Search is the shortcut-heavy
 * path editors use dozens of times a day; "New Article" and the live-site link
 * sit beside it rather than a sidebar's scroll away.
 *
 * ## Why roles are *shown*, not *trusted*
 *
 * `/api/users/me` decides which quick actions render. That hides buttons the
 * role cannot use — it grants nothing. Every destination route runs its own
 * server-side access rule, so a forged or stale role list here changes the
 * chrome, never the data (`docs/security.md` §3: hiding a button is not
 * authorisation).
 */

/** Roles that may file articles — mirrors `EDITORIAL_ROLES` in access/roles.ts. */
const EDITORIAL_ROLES: readonly string[] = [
  'superAdmin',
  'editorInChief',
  'sectionEditor',
  'reporter',
]

export function TopbarActions() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [roles, setRoles] = useState<string[]>([])
  const triggerRef = useRef<HTMLButtonElement>(null)

  /*
   * Read the session's roles once, for presentation only. A failed fetch is
   * not an error state: the search button and Site link are useful to every
   * signed-in user, so they render unconditionally.
   */
  useEffect(() => {
    let cancelled = false
    fetch('/api/users/me', { credentials: 'include' })
      .then(async (res) => (res.ok ? ((await res.json()) as { user?: { roles?: unknown } }) : null))
      .then((data) => {
        if (cancelled) return
        const list = data?.user?.roles
        setRoles(Array.isArray(list) ? list.filter((r): r is string => typeof r === 'string') : [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // ⌘K / Ctrl+K toggles the overlay from anywhere in the admin.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  /** Close the overlay and put focus back on the trigger that opened it. */
  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    triggerRef.current?.focus()
  }, [])

  const canCreate = roles.some((role) => EDITORIAL_ROLES.includes(role))
  const isReporter = roles.includes('reporter')

  return (
    <div className="topbar-actions">
      <button
        type="button"
        ref={triggerRef}
        className="topbar-actions__search"
        aria-haspopup="dialog"
        aria-label="Search (খুঁজুন)"
        onClick={() => setSearchOpen(true)}
      >
        <span aria-hidden>🔍</span>
        <span className="topbar-actions__label">Search</span>
        <kbd className="topbar-actions__kbd">⌘K</kbd>
      </button>
      {canCreate && (
        <>
          <span className="topbar-actions__divider" aria-hidden />
          <Link
            className="topbar-actions__new"
            href="/admin/collections/articles/create"
            aria-label="New Article (নতুন সংবাদ)"
          >
            <span aria-hidden>＋</span>
            <span className="topbar-actions__label">New Article</span>
          </Link>
        </>
      )}
      {isReporter && (
        <>
          <span className="topbar-actions__divider" aria-hidden />
          <Link className="topbar-actions__reporter" href="/admin/reporter" aria-label="দ্রুত সংবাদ">
            <span aria-hidden>📄</span>
            <span className="topbar-actions__label">দ্রুত সংবাদ</span>
          </Link>
        </>
      )}
      <span className="topbar-actions__divider" aria-hidden />
      <a
        className="topbar-actions__site"
        href="https://shikkha24.com"
        target="_blank"
        rel="noreferrer"
        aria-label="View live site (সাইট দেখুন)"
      >
        <span aria-hidden>🌐</span>
        <span className="topbar-actions__label">Site</span>
      </a>
      {searchOpen && <TopbarSearch onClose={closeSearch} />}
    </div>
  )
}
