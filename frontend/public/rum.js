/**
 * Sample first-party LCP/FCP paint timings for the T-80 field-data decision.
 *
 * CSP blocks inline scripts, so this is a small same-origin file. It samples
 * before observing to avoid work on 80% of page views, sends once per page, and
 * stores no identifiers or cookies.
 */
;(() => {
  if (Math.random() >= 0.2 || !('sendBeacon' in navigator)) return

  var lcp
  var fcp
  var sent = false

  function send(force) {
    if (sent || typeof lcp !== 'number' || (!force && document.visibilityState !== 'hidden')) return
    sent = true
    var payload = JSON.stringify({ path: location.pathname, lcp: Math.round(lcp), fcp: fcp })
    navigator.sendBeacon('/telemetry', new Blob([payload], { type: 'text/plain' }))
  }

  try {
    new PerformanceObserver((entries) => {
      var lastEntry = entries.getEntries()[entries.getEntries().length - 1]
      if (lastEntry) lcp = lastEntry.startTime
    }).observe({ type: 'largest-contentful-paint', buffered: true })

    new PerformanceObserver((entries) => {
      var firstEntry = entries.getEntries()[0]
      if (firstEntry && fcp === undefined) fcp = Math.round(firstEntry.startTime)
    }).observe({ type: 'paint', buffered: true })
  } catch {
    return
  }

  document.addEventListener('visibilitychange', () => send(false))
  window.addEventListener('pagehide', () => send(true), { once: true })
})()
