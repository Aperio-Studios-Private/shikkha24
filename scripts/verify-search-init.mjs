/**
 * Verify `public/search-init.js` — the Pagefind UI bootstrap for `/search`.
 *
 * ## Why this exists
 *
 * The date filter's values are reordered in the DOM after Pagefind renders them,
 * because Pagefind renders filter values in *index* order and offers no option to
 * change it — for the month filter that order is whatever order articles happened
 * to be indexed in (`২০২৬-০৬, ২০২৬-০৮, ২০২৬-০৭, ২০২৬-০৯` in practice). A date
 * filter listing August before July is a defect a reader notices.
 *
 * That reordering is easy to break silently: a wrong comparison, a lost
 * idempotence guard, or an unguarded `MutationObserver` all fail quietly. So the
 * real file is exercised against a DOM rather than trusted.
 *
 * ## It runs the shipped file, not a copy of its logic
 *
 * A harness that reimplements the mechanism can only prove two implementations
 * agree. This loads `public/search-init.js` verbatim and runs it.
 *
 * ## The DOM library is optional, on purpose
 *
 * `linkedom` is a devDependency and this **fails** when it is missing.
 *
 * It used to be optional and SKIP with exit 0, on the reasoning that a hard
 * dependency for one harness was not worth it. Measured 2026-10-12: linkedom was
 * not installed anywhere and not listed in any `package.json`, so **the gate
 * skipped on every run of `ci.yml` and `deploy.yml` and had never once executed
 * its assertions.** It was the only test of `public/search-init.js`, which
 * `verify-build-output.mjs` checks only for the presence of class names. The cost
 * of the skip was an untested feature reported as tested, in both workflows,
 * indefinitely — which is the codebase's own rule ("an assertion that cannot be
 * made to fail is not evidence") applied in reverse: an assertion that could not
 * be *made* ran at all.
 *
 * The class names below are Pagefind's *internal* markup, read out of the shipped
 * `pagefind-ui.js`. `verify-build-output.mjs` asserts they are still present, so
 * a Pagefind update that renames them fails the build loudly instead of quietly
 * disabling the sort.
 *
 * Run: node scripts/verify-search-init.mjs
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Resolve linkedom from the project, or from wherever the caller points us. */
function loadLinkedom() {
  const candidates = [import.meta.url, process.env.LINKEDOM_REQUIRE_FROM].filter(Boolean)
  for (const from of candidates) {
    try {
      return createRequire(from === import.meta.url ? from : join(from, 'index.js'))('linkedom')
    } catch {
      // try the next source
    }
  }
  return null
}

const linkedom = loadLinkedom()
if (!linkedom) {
  // Fail, do not skip. `LINKEDOM_REQUIRE_FROM` stays supported so the harness can
  // borrow a copy from elsewhere, but a missing DOM means the assertions below
  // cannot be made — and reporting that as success is what hid this for a week.
  console.error('\n::error::verify-search-init cannot run — linkedom is not resolvable.')
  console.error('  It is a devDependency; run `pnpm install`.')
  console.error('  If it is installed elsewhere, set LINKEDOM_REQUIRE_FROM to that node_modules.\n')
  process.exit(1)
}

const { parseHTML } = linkedom

const SRC = readFileSync(join(ROOT, 'frontend/public/search-init.js'), 'utf8')

let failures = 0
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

/** One filter value row, in the shape Pagefind emits. */
const row = (name, value, count) =>
  `<div class="pagefind-ui__filter-value">` +
  `<input class="pagefind-ui__filter-checkbox" type="checkbox" name="${name}" value="${value}">` +
  `<label class="pagefind-ui__filter-label">${value} <span>(${count})</span></label>` +
  `</div>`

/**
 * The filter markup Pagefind UI emits, with the date values in the order the real
 * index returns them — which is the defect under test.
 */
const MARKUP =
  `<div id="search">` +
  `<div class="pagefind-ui__filter-block">` +
  `<h3 class="pagefind-ui__filter-name">বিভাগ</h3>` +
  `<div class="pagefind-ui__filter-group">` +
  row('বিভাগ', 'বিদেশে পড়াশোনা', 2) +
  row('বিভাগ', 'পরীক্ষা ও ফলাফল', 5) +
  row('বিভাগ', 'শিক্ষা সংবাদ', 3) +
  `</div></div>` +
  `<div class="pagefind-ui__filter-block">` +
  `<h3 class="pagefind-ui__filter-name">তারিখ</h3>` +
  `<div class="pagefind-ui__filter-group">` +
  row('তারিখ', '২০২৬-০৬', 4) +
  row('তারিখ', '২০২৬-০৮', 8) +
  row('তারিখ', '২০২৬-০৭', 8) +
  row('তারিখ', '২০২৬-০৯', 4) +
  `</div></div>` +
  `</div>`

const INDEX_ORDER = ['২০২৬-০৬', '২০২৬-০৮', '২০২৬-০৭', '২০২৬-০৯']
const SORTED = ['২০২৬-০৯', '২০২৬-০৮', '২০২৬-০৭', '২০২৬-০৬']
const SECTIONS = ['বিদেশে পড়াশোনা', 'পরীক্ষা ও ফলাফল', 'শিক্ষা সংবাদ']

/** The values shown for one filter key, in document order. */
const valuesOf = (document, key) => {
  for (const block of document.querySelectorAll('.pagefind-ui__filter-block')) {
    const name = block.querySelector('.pagefind-ui__filter-name')
    if (!name || name.textContent.trim() !== key) continue
    return [...block.querySelectorAll('.pagefind-ui__filter-value')].map(
      (r) => r.querySelector('.pagefind-ui__filter-checkbox').value,
    )
  }
  return []
}

/**
 * A linkedom document plus a shim `window` the source will actually read.
 *
 * linkedom's window silently ignores an assignment to `window.MutationObserver`,
 * so the observer has to be supplied through a window object of our own. The
 * source only touches `window.addEventListener` and `window.MutationObserver`,
 * so the shim is faithful.
 */
const fresh = (makeObserver) => {
  const { window: real, document } = parseHTML(`<!doctype html><html><body>${MARKUP}</body></html>`)
  const observed = []
  let options = null

  const shim = {
    addEventListener: real.addEventListener.bind(real),
    MutationObserver: makeObserver ? makeObserver(observed) : undefined,
  }

  // A function declaration, not an arrow — the source calls `new PagefindUI(...)`,
  // and an arrow function is not constructible.
  function PagefindUI(opts) {
    options = opts
  }

  return {
    document,
    observed,
    options: () => options,
    run() {
      const fn = new Function('window', 'document', 'PagefindUI', SRC)
      fn(shim, document, PagefindUI)
      real.dispatchEvent(new real.Event('DOMContentLoaded'))
    },
  }
}

console.log('\n=== search-init.js ===\n')

// ── A. No MutationObserver (Opera Mini, a sandboxed frame) ───────────────────
{
  const ctx = fresh(null)
  check(
    'fixture starts in index order (the defect)',
    JSON.stringify(valuesOf(ctx.document, 'তারিখ')) === JSON.stringify(INDEX_ORDER),
    valuesOf(ctx.document, 'তারিখ').join(' '),
  )

  let threw = null
  try {
    ctx.run()
  } catch (error) {
    threw = error
  }
  check(
    'runs without a MutationObserver (graceful degradation)',
    threw === null,
    threw?.message ?? '',
  )

  check(
    'the date filter is reordered newest-first',
    JSON.stringify(valuesOf(ctx.document, 'তারিখ')) === JSON.stringify(SORTED),
    valuesOf(ctx.document, 'তারিখ').join(' '),
  )
  check(
    'the section filter is left alone',
    JSON.stringify(valuesOf(ctx.document, 'বিভাগ')) === JSON.stringify(SECTIONS),
    valuesOf(ctx.document, 'বিভাগ').join(' '),
  )
  check(
    'PagefindUI was still constructed',
    ctx.options()?.openFilters?.includes('তারিখ') === true,
    ctx.options() ? `openFilters=${JSON.stringify(ctx.options().openFilters)}` : 'never called',
  )
}

// ── B. MutationObserver present ──────────────────────────────────────────────
{
  const ctx = fresh(
    (observed) =>
      function (callback) {
        this.observe = (target, config) => observed.push({ target, config, callback })
      },
  )

  ctx.run()
  check(
    'the observer is registered on #search',
    ctx.observed.length === 1 && ctx.observed[0].target?.id === 'search',
    ctx.observed.length ? `target=#${ctx.observed[0].target?.id}` : 'never registered',
  )

  // Simulate Pagefind re-rendering the list in index order again.
  const block = [...ctx.document.querySelectorAll('.pagefind-ui__filter-block')].find(
    (b) => b.querySelector('.pagefind-ui__filter-name')?.textContent.trim() === 'তারিখ',
  )
  const group = block.querySelector('.pagefind-ui__filter-group')
  for (const r of [...group.querySelectorAll('.pagefind-ui__filter-value')]) group.appendChild(r)

  ctx.observed[0].callback()
  check(
    'a re-render is re-sorted',
    JSON.stringify(valuesOf(ctx.document, 'তারিখ')) === JSON.stringify(SORTED),
    valuesOf(ctx.document, 'তারিখ').join(' '),
  )

  // Idempotence — the guard that stops the observer feeding itself. Without it
  // the re-append would re-trigger the observer, forever.
  const firstRow = group.querySelector('.pagefind-ui__filter-value')
  ctx.observed[0].callback()
  check(
    're-running does not re-append (no observer feedback loop)',
    group.querySelector('.pagefind-ui__filter-value') === firstRow,
    'first row element identity preserved',
  )
}

console.log(
  failures === 0 ? '\nsearch-init.js behaves correctly.\n' : `\n${failures} check(s) FAILED.\n`,
)
process.exit(failures === 0 ? 0 : 1)
