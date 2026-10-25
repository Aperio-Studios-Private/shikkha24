'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

/** One result row as returned by `GET /api/admin-search`. */
interface AdminSearchItem {
  id: string | number
  title: string
  status: string | null
  href: string
}

/** One named collection group in the endpoint's response. */
interface AdminSearchGroup {
  slug: string
  label: string
  items: AdminSearchItem[]
}

interface Props {
  /** Close the overlay and return focus to the search trigger. */
  onClose: () => void
}

/** Stable option id, matching the aria-activedescendant value to a row. */
function optionId(index: number): string {
  return `topbar-search-option-${index}`
}

/** Chip tone per status value — the same semantics the review board uses. */
function statusTone(status: string): 'info' | 'success' | 'danger' | 'neutral' {
  if (status === 'draft') return 'info'
  if (status === 'published' || status === 'approved') return 'success'
  if (status === 'changesRequested' || status === 'rejected') return 'danger'
  return 'neutral'
}

/**
 * The global search overlay (⌘K).
 *
 * A combobox over `/api/admin-search`: the input owns the interaction, the
 * flat result list is a listbox, and Arrow keys rove an aria-activedescendant
 * rather than moving focus, so the typed text never loses its caret. Enter
 * follows the active row's edit link; Esc or a backdrop click closes.
 *
 * Results arrive debounced (250 ms) and aborted when superseded, so fast
 * typing never renders a stale answer for a query that is no longer on screen.
 */
export function TopbarSearch({ onClose }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [groups, setGroups] = useState<AdminSearchGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  /** All rows across groups, so arrow keys walk one continuous list. */
  const flat = useMemo(() => groups.flatMap((group) => group.items), [groups])
  const trimmed = query.trim()

  // Keyboard focus starts in the field every time the overlay opens.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (trimmed.length < 2) {
      setGroups([])
      setActiveIndex(-1)
      setLoading(false)
      return undefined
    }
    setLoading(true)
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      fetch(`/api/admin-search?q=${encodeURIComponent(trimmed)}`, {
        credentials: 'include',
        signal: controller.signal,
      })
        .then(async (res) =>
          res.ok ? ((await res.json()) as { groups?: AdminSearchGroup[] }) : {},
        )
        .then((data) => {
          // A new result set invalidates whatever row was active before it.
          setGroups(Array.isArray(data.groups) ? data.groups : [])
          setActiveIndex(-1)
        })
        .catch(() => {
          if (!controller.signal.aborted) setGroups([])
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 250)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [trimmed])

  // Keep the roving row visible when the list is taller than the panel.
  useEffect(() => {
    if (activeIndex < 0) return
    document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (flat.length === 0 ? -1 : (index + 1) % flat.length))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (flat.length === 0 ? -1 : index <= 0 ? flat.length - 1 : index - 1))
    } else if (event.key === 'Enter') {
      const hit = activeIndex >= 0 ? flat[activeIndex] : undefined
      if (hit) {
        event.preventDefault()
        router.push(hit.href)
        onClose()
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  /**
   * A click on the scrim (not the panel) dismisses the overlay — the pointer
   * equivalent of the input's Esc handler.
   */
  function onBackdropClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose()
  }

  const showEmpty = trimmed.length >= 2 && !loading && flat.length === 0
  let rowIndex = -1

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: scrim behind the dialog — clicking outside the panel is the pointer's dismiss gesture; the keyboard equivalent is Esc on the input.
    <div className="topbar-search-overlay" role="presentation" onClick={onBackdropClick}>
      <div className="topbar-search__panel">
        <input
          ref={inputRef}
          type="text"
          className="topbar-search__input"
          value={query}
          placeholder="Search (খুঁজুন)"
          aria-label="Search articles, assignments, authors (খুঁজুন)"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls="topbar-search-listbox"
          aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onInputKeyDown}
        />
        <div id="topbar-search-listbox" role="listbox" className="topbar-search__results">
          {groups.map((group) => (
            // biome-ignore lint/a11y/useSemanticElements: ARIA grouped-listbox pattern — options nest under role="group", and a fieldset is not valid listbox content.
            <div
              className="topbar-search__group"
              role="group"
              aria-label={group.label}
              key={group.slug}
            >
              <p className="topbar-search__caption">{group.label}</p>
              {group.items.map((item) => {
                rowIndex += 1
                const index = rowIndex
                return (
                  <Link
                    key={`${group.slug}-${item.id}`}
                    id={optionId(index)}
                    role="option"
                    aria-selected={index === activeIndex}
                    className="topbar-search__result"
                    href={item.href}
                    onClick={onClose}
                  >
                    <span className="topbar-search__title">{item.title}</span>
                    {item.status && (
                      <span
                        className={`topbar-search__status topbar-search__status--${statusTone(item.status)}`}
                      >
                        {item.status}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
        {showEmpty && <p className="topbar-search__empty">No results (কিছু পাওয়া যায়নি)</p>}
      </div>
    </div>
  )
}
