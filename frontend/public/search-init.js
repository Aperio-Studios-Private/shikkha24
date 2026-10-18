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
    /**
     * Section and date filters, expanded by default.
     *
     * These strings are the **filter keys**, not labels — Pagefind UI uses the
     * key as the group heading and has no per-filter translation, which is why
     * the article page tags them in Bengali. A key that does not match renders
     * nothing, so these two must stay in step with
     * `pages/[category]/[id]/[slug].astro`.
     */
    openFilters: ['বিভাগ', 'তারিখ'],
    /**
     * Hide a filter value once nothing matches it.
     *
     * Without this, choosing a section still lists every month in the index and
     * picking one returns nothing — the counts would be stale against the
     * current query. With it the filters cascade, which matters more than usual
     * here: Bengali has no stemming in Pagefind, so narrowing by hand is often
     * the better route to a result.
     */
    showEmptyFilters: false,
    // Bengali UI strings — Pagefind ships English defaults only.
    translations: {
      placeholder: 'খবর বা তথ্য খুঁজুন',
      clear_search: 'মুছুন',
      load_more: 'আরও ফলাফল',
      search_label: 'সাইটে অনুসন্ধান',
      filters_label: 'ফিল্টার',
      filter_selected_one: '[COUNT]টি নির্বাচিত',
      filter_selected_many: '[COUNT]টি নির্বাচিত',
      zero_results: '“[SEARCH_TERM]” বিষয়ে কোনো তথ্য মেলেনি',
      many_results: '“[SEARCH_TERM]” বিষয়ে [COUNT]টি ফলাফল পাওয়া গেছে',
      one_result: '“[SEARCH_TERM]” বিষয়ে ১টি ফলাফল পাওয়া গেছে',
      alt_search: '“[SEARCH_TERM]” বিষয়ে কোনো তথ্য মেলেনি। সম্পর্কিত “[DIFFERENT_TERM]” দেখানো হচ্ছে।',
      searching: 'খোঁজা হচ্ছে...',
    },
  })

  /**
   * Sort the date filter's values chronologically.
   *
   * ⚠️ **Pagefind renders filter values in index order, and there is no option to
   * change it.** The UI bundle's only `.sort()` call is for sub-results. For the
   * month filter that order is the order articles happened to be indexed in —
   * `২০২৬-০৬, ২০২৬-০৮, ২০২৬-০৭, ২০২৬-০৯` in practice. A date filter listing
   * August before July is a defect a reader will notice.
   *
   * The comparison is **codepoint, not `localeCompare`**: Bengali digits are
   * U+09E6–U+09EF in ascending order, so a plain `<`/`>` on the value string is
   * chronological. Collation rules are not guaranteed to be, and `localeCompare`
   * on Bengali digits is not something to bet a sort on.
   *
   * The section filter is deliberately left alone. Its values are peers, so any
   * order reads acceptably, and reordering it would mean shipping the CMS
   * taxonomy order into the client for no real gain.
   *
   * `MutationObserver` is guarded: Opera Mini runs its JavaScript without a DOM,
   * and a missing observer must degrade to "unsorted", never to "broken".
   */
  function sortDateFilter() {
    var root = document.getElementById('search')
    if (!root) return

    // Every `var` is declared here rather than at its point of use: `var` is
    // function-scoped, so one inside a block or a loop body reads as though it
    // were block-scoped. It is not.
    var blocks, block, name, values, current, moved, parent
    var i, j

    blocks = root.querySelectorAll('.pagefind-ui__filter-block')
    for (i = 0; i < blocks.length; i++) {
      block = blocks[i]
      name = block.querySelector('.pagefind-ui__filter-name')
      // biome-ignore lint/complexity/useOptionalChain: ES5 — optional chaining is ES2020.
      if (!name || name.textContent.replace(/\s+/g, ' ').trim() !== 'তারিখ') continue

      values = [].slice.call(block.querySelectorAll('.pagefind-ui__filter-value'))
      if (values.length < 2) return

      current = values.slice()
      // biome-ignore lint/complexity/useArrowFunction: ES5 — this file is not transpiled.
      values.sort(function (a, b) {
        var av = filterValueOf(a)
        var bv = filterValueOf(b)
        // Newest first.
        return bv < av ? -1 : bv > av ? 1 : 0
      })

      // Re-appending an already-sorted list still mutates the DOM, which would
      // re-trigger the observer below forever. Only touch it when it differs.
      moved = false
      for (j = 0; j < values.length; j++) {
        if (values[j] !== current[j]) {
          moved = true
          break
        }
      }
      if (!moved) return

      parent = current[0].parentNode
      for (j = 0; j < values.length; j++) parent.appendChild(values[j])
      return
    }
  }

  /** The filter value carried by a row's checkbox, or '' if the row is odd. */
  function filterValueOf(row) {
    var box = row.querySelector('.pagefind-ui__filter-checkbox')
    // biome-ignore lint/complexity/useOptionalChain: ES5 — optional chaining is ES2020.
    return box && box.value ? box.value : ''
  }

  sortDateFilter()

  // Read the constructor off `window` rather than the bare global: the guard and
  // the construction have to test the same thing, or an environment where the two
  // differ (a DOM shim, a sandboxed frame) passes the guard and then throws.
  var Observer = window.MutationObserver
  if (Observer) {
    // Pagefind re-renders the filter list on every search, so this has to run
    // again each time rather than once on load.
    // biome-ignore lint/complexity/useArrowFunction: ES5 — this file is not transpiled.
    new Observer(function () {
      sortDateFilter()
    }).observe(document.getElementById('search'), { childList: true, subtree: true })
  }
})
