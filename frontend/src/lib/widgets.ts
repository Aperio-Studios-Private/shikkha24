/**
 * Shared header helpers.
 *
 * ## Why the weather and prayer fetches no longer live here
 *
 * They used to. This module fetched Open-Meteo and Aladhan **at build time** and
 * baked the result into every page, on the reasoning that a static site should
 * not put a third party on the critical path.
 *
 * That reasoning was sound for a cost and a load-time budget, and wrong about
 * correctness. Both widgets answer a question about **the reader's** city, and
 * a static build knows one place — Dhaka, at whatever moment the site was last
 * deployed. The owner saw `সিলেট ২৯° হালকা বৃষ্টি` against a real 32° and mostly
 * sunny: the label came from a resolved location while the number beside it was
 * never refetched, and the condition was never written at all.
 *
 * Both now fetch in the reader's browser, into
 * {@link ../components/HeaderWidgets.astro}, which renders a neutral
 * placeholder first. The cost goes from *one build-time call for the whole site*
 * to *one call per page view per reader* — which is why the prayer panel's
 * Hijri date is fetched lazily on first open rather than alongside the times.
 *
 * Sources (both free, no API key — `docs/data-sources.md`):
 *   Weather → Open-Meteo          api.open-meteo.com
 *   Prayer  → Aladhan             api.aladhan.com
 */

/**
 * Latin → Bengali digits.
 *
 * The UI is Bengali-only, so a temperature of "31" must read as "৩১". Without
 * this the header would mix scripts for no good reason.
 */
export function toBnDigits(value: string | number): string {
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']
  return String(value).replace(/\d/g, (d) => bn[Number(d)])
}
