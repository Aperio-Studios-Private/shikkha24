/**
 * Shikkha24 service worker — deadline reminders (N7).
 *
 * ## Why it exists at all
 *
 * Web Push is the only way to reach a reader who is not on the site, and the
 * only free one: no account, no card, no third-party service. It is the
 * mechanism behind N7 (`docs/education-feature-inventory.md` §4), which is
 * meant to turn one-off result-day traffic into a returning audience.
 *
 * ## Deliberately minimal
 *
 * It handles exactly two events and caches nothing. No offline shell, no
 * precache manifest, no background sync. Every one of those would add a
 * maintenance surface and a way for a stale cache to serve a wrong headline —
 * and on a news site, serving a stale headline is a correctness bug, not a
 * performance win.
 *
 * ## No imports
 *
 * A service worker cannot be bundled by Vite, and an `importScripts` call would
 * add a second request and a version-skew risk between the worker and the page.
 * So this file is standalone and lives in `public/`, which means **it is served
 * at the origin root** — required for the worker to control the whole scope.
 */

/**
 * Fallback title; the CMS does not expose a site name to the worker.
 *
 * ⚠️ **A service worker cannot read the CMS** — it is not bundled (see the note
 * above) and fetching it would add a request and a version-skew risk to every
 * notification. So this constant *is* a deliberate duplicate of the CMS
 * `siteName` and must be changed by hand when the owner renames the portal.
 * `scripts/verify-site-name.mjs` allow-lists it explicitly and fails if the
 * value drifts from `FALLBACK_SETTINGS`, so the duplicate cannot rot unnoticed.
 *
 * It is only reached when a push payload carries no `title`; the reminder
 * endpoint always sends one, so this is the malformed-payload path.
 */
const FALLBACK_TITLE = 'শিক্ষা২৪.কম'

/**
 * A push arrived. Show it.
 *
 * The payload is JSON built by `cms/src/endpoints/push.ts`. Every field is
 * treated as optional: a malformed payload must still produce a visible
 * notification, because a push that shows nothing is a push the reader never
 * knows about and cannot unsubscribe from.
 */
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = {}
  }

  const title = typeof payload.title === 'string' && payload.title ? payload.title : FALLBACK_TITLE
  const body = typeof payload.body === 'string' ? payload.body : ''
  const url = typeof payload.url === 'string' && payload.url.startsWith('/') ? payload.url : '/'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      lang: 'bn',
      // Collapse rather than stack: two reminders for the same deadline are one
      // piece of news, and a stack of them reads as spam.
      tag: 'shikkha24-deadline',
      renotify: false,
      data: { url },
    }),
  )
})

/**
 * The reader tapped the notification.
 *
 * An already-open tab is focused rather than a second one opened — a reader who
 * already has the site open should not accumulate tabs.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const target = event.notification.data && event.notification.data.url
  const url = typeof target === 'string' && target.startsWith('/') ? target : '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client) client.navigate(url)
          return undefined
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
