/**
 * Anti-FOUC: restore reader preferences before the first paint.
 *
 * ## Why this is a separate file and not inline
 *
 * It has to run before paint, so it must be a **blocking** script in `<head>` —
 * and it was originally written as an inline `<script is:inline>` to guarantee
 * that. But the site's Content-Security-Policy is `script-src 'self'` with no
 * `'unsafe-inline'` (`docs/security.md` §5), and an inline script is blocked by
 * it. The theme and text-scale preferences then silently stopped being applied,
 * producing exactly the flash of wrong theme this file exists to prevent.
 *
 * A same-origin external script without `async` or `defer` is still
 * parser-blocking and still runs before paint, so it keeps the guarantee and
 * satisfies the CSP. `/theme-init.js` is served from `public/`, so Astro copies
 * it verbatim and it is never bundled or renamed — which matters, because the
 * hash in a bundled filename would change the URL.
 *
 * Keep this file tiny: it is on the critical path of every page load.
 *
 * ## ES5 on purpose
 *
 * Files in `public/` are copied verbatim — they are never bundled or transpiled,
 * so whatever syntax is written here is what old browsers receive. The device
 * matrix includes Opera Mini (`docs/testing-and-qa.md`), which runs JavaScript
 * server-side with limited syntax support. Hence `function` expressions and
 * string concatenation rather than arrow functions and template literals.
 */
// biome-ignore lint/complexity/useArrowFunction: ES5 — this file is not transpiled.
;(function () {
  // Theme — LIGHT is the default.
  //
  // The site is designed light-first. We deliberately do NOT follow
  // prefers-color-scheme: a reader on a dark-mode phone was getting a dark site
  // they never asked for. Dark is strictly opt-in — only a past explicit choice
  // turns it on.
  var theme = localStorage.getItem('shikkha24-theme')
  if (theme === 'dark') document.documentElement.classList.add('dark')
  else document.documentElement.classList.remove('dark')

  // Text scale — set by the text resizer, applied here so it survives a reload
  // without a visible reflow.
  var scale = localStorage.getItem('shikkha24-text-scale')
  // biome-ignore lint/style/useTemplate: ES5 — this file is not transpiled.
  if (scale === '1.1' || scale === '1.2') {
    document.documentElement.style.fontSize = `${parseFloat(scale) * 100}%`
  }
})()
