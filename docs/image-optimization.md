# Shikkha24 — Image Optimization

**The rules this project follows for every image, and how to add new ones.**

Researched against current guidance (web.dev, MDN, HTTP Archive Web Almanac) and
implemented through Astro's asset pipeline.

---

## 1. The rules

| Rule | Why |
|---|---|
| **AVIF first, WebP fallback, JPEG last** | AVIF and WebP beat JPEG by 25–50% at equivalent quality. AVIF reached Baseline *widely available* in July 2026. The fallback costs one `<source>` line. |
| **Always `width` + `height`** | Lets the browser compute aspect ratio and reserve the box → **zero CLS**. |
| **Responsive `srcset` + `sizes`** | A 4000px file in a 400px slot wastes ~99% of bytes. |
| **`sizes` must mirror real CSS** | `srcset` says what exists; `sizes` says how wide it renders. Wrong `sizes` = browser picks a 1200px file for a 300px slot. The most-often-omitted attribute, and the one that decides whether responsive images save anything. |
| **Never lazy-load the LCP image** | Lazy-loading the hero directly delays LCP. Use `loading="eager"` + `fetchpriority="high"`. |
| **Lazy-load everything below the fold** | `loading="lazy"` + `decoding="async"`. |
| **Immutable cache for hashed assets** | Content-addressed filenames never change → `max-age=31536000, immutable`. |
| **SVG for icons and logos** | Vector, tiny, scales. Never a bitmap icon. |
| **Strip metadata** | EXIF, colour profiles and thumbnails add tens of KB. |

### Quality settings

| Format | Quality |
|---|---|
| AVIF | 50–70 |
| WebP | 75–90 |
| JPEG | 70–85 |

Astro's defaults sit in these ranges; we do not override them.

---

## 2. How it is implemented here

### Local images go in `src/assets`, never `public/`

This is the single most important structural decision.

- `public/` → copied **verbatim**. No resizing, no format conversion, no hashing.
- `src/assets` → processed by Astro. Generates AVIF + WebP + fallback, responsive
  widths, intrinsic dimensions, and hashes the filenames.

Our category archetypes live in `frontend/src/assets/categories/*.jpg` and are
loaded through `frontend/src/lib/images.ts`.

### One component does the work

`components/CategoryImage.astro` wraps Astro's `<Picture>`:

```astro
<Picture
  src={image}
  formats={['avif', 'webp']}
  widths={[400, 800, 1200]}
  sizes="(min-width: 1024px) 600px, 100vw"
  alt="..."
  loading={priority ? 'eager' : 'lazy'}
  fetchpriority={priority ? 'high' : 'auto'}
/>
```

**Always use this rather than a bare `<img>`** for local images — it is what
guarantees the rules above are applied consistently.

### Emitted markup (verified)

```html
<picture>
  <source srcset="...400w, ...800w, ...1200w" type="image/avif" sizes="...">
  <source srcset="...400w, ...800w, ...1200w" type="image/webp" sizes="...">
  <img src="....jpg" srcset="...400w, ...800w, ...1200w" sizes="..."
       width="1376" height="768" loading="eager" fetchpriority="high">
</picture>
```

### The archetype model

One image per category, reused for every article in that category lacking its own
photo. See `docs/assets-prompt.md` for the prompts that produced them —
deliberately generic so one image stays valid indefinitely.

`ArticleCard` falls back to the archetype automatically:

```
article.featuredImage  →  use it (remote, from CMS host disk)
otherwise              →  category archetype (local, optimised)
otherwise              →  no image, text-only card
```

### Cache headers

`public/.htaccess` already ships (Apache `Cache-Control`):

```
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

Astro hashes these filenames, so `immutable` is safe — a changed image is a new
URL.

---

## 3. Measured results

Source JPEGs from Google Flow: **1376×768, 630 KB – 1 MB each**.

After the pipeline (example, `education-news`):

| Output | Size |
|---|---|
| 400w JPEG | 25 KB |
| 800w JPEG | 84 KB |
| 1200w JPEG | 164 KB |
| AVIF equivalents | smaller again |

**8 archetypes → 104 optimised files** (8 categories × 3 formats × ~4 widths).
Well within DianaHost's inode quota (confirm with support).

Homepage: 13 `<picture>` elements, all with `sizes`, `width` and `height`.
One eager + `fetchpriority="high"` (the LCP lead); twelve lazy.

---

## 4. How to add a new image later

### A category archetype

1. Generate it with the prompt for that category in `docs/assets-prompt.md`.
2. Save as `frontend/src/assets/categories/<category-slug>.jpg`
   (16:9, at least 1376×768 — larger is fine, Astro downscales).
3. Done. `lib/images.ts` globs the folder, so **no code change is needed**.

### Any other local image

1. Put it in `frontend/src/assets/`.
2. Render it via `<CategoryImage>` (or Astro's `<Picture>` directly).
3. Set `sizes` to match how wide it actually renders.
4. Set `priority` only if it is the LCP element.

### An image from the CMS

Currently rendered as a plain `<img>` with explicit `width`/`height` and lazy
loading. Astro cannot optimise remote images until the CMS media hostname is
declared in `astro.config.mjs`:

```js
image: {
  remotePatterns: [{ protocol: 'https', hostname: 'media.shikkha24.com' }],
}
```

**To do once the CMS media hostname is confirmed** (`PUBLIC_MEDIA_BASE_URL`) —
then CMS images get the same AVIF/WebP/srcset treatment automatically. Note:
media is served from the DianaHost CMS origin (R2 was descoped in S9), so the
hostname is the CMS host, not an R2 bucket domain.

---

## 5. Checklist for shipping any new image

- [ ] Modern format (AVIF + WebP) — automatic via `<CategoryImage>`
- [ ] Responsive `srcset` — automatic
- [ ] `sizes` matches real CSS layout
- [ ] Explicit `width` + `height`
- [ ] Lazy unless it is the LCP element
- [ ] `fetchpriority="high"` on the LCP image only
- [ ] Descriptive Bengali `alt` text
- [ ] SVG if it is an icon or logo
- [ ] Under the per-asset budget in `docs/performance-budget.md`

---

## 6. Verification

```sh
pnpm run build:frontend
```

Check the emitted markup in `dist/index.html`:

- every `<img>` has `width`, `height`, `sizes`
- every `<picture>` has an `image/avif` source
- exactly one `fetchpriority="high"` (the LCP hero)

Lighthouse mobile should report no *"Properly size images"* or *"Serve images in
next-gen formats"* warnings, and zero image-related CLS.
