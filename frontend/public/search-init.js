/**
 * Pagefind UI bootstrap for `/search`.
 *
 * ## Why this is a separate file
 *
 * It was an inline `<script is:inline>`, and the site's CSP is `script-src 'self'`
 * with no `'unsafe-inline'` — so the browser blocked it and `/search` rendered a
 * search box that never initialised. A same-origin external file satisfies the
 * CSP with no loss: both this and `/pagefind/pagefind-ui.js` are ordinary
 * parser-blocking scripts, so their order is preserved and `PagefindUI` is
 * defined by the time this runs.
 *
 * Served from `public/`, so Astro copies it verbatim and the URL is stable.
 *
 * ES5 on purpose: `public/` files are never transpiled, and the device matrix
 * includes Opera Mini (`docs/testing-and-qa.md`), whose JavaScript runs
 * server-side with limited syntax support.
 */
// biome-ignore lint/complexity/useArrowFunction: ES5 — this file is not transpiled.
window.addEventListener('DOMContentLoaded', function () {
  new PagefindUI({
    element: '#search',
    showSubResults: true,
    showImages: false,
    // Bengali UI strings — Pagefind ships English defaults only.
    translations: {
      placeholder: 'অনুসন্ধান...',
      clear_search: 'মুছুন',
      load_more: 'আরও ফলাফল',
      search_label: 'সাইট অনুসন্ধান',
      filters_label: 'ফিল্টার',
      zero_results: '“[SEARCH_TERM]” এর জন্য কোনো ফলাফল পাওয়া যায়নি',
      many_results: '“[SEARCH_TERM]” এর জন্য [COUNT] টি ফলাফল',
      one_result: '“[SEARCH_TERM]” এর জন্য ১ টি ফলাফল',
      alt_search: '“[SEARCH_TERM]” এর জন্য কোনো ফলাফল নেই। “[DIFFERENT_TERM]” দেখানো হচ্ছে।',
      searching: '“[SEARCH_TERM]” অনুসন্ধান করা হচ্ছে...',
    },
  })
})
