# Share/OG Card Tofu — Investigation & Plan (NO FIX APPLIED, per owner)

**Owner report (2026-10-28):** the share photo card renders Bengali as tofu boxes
(each glyph shows its Unicode codepoint — `09B6` = শ, `09A4` = থ…). QR code and
logo render fine. Owner instruction: learn the problem, fixes, process and best
practice first; make a plan; do not fix yet.

---

## 1. What the card is

The image is `GET /api/photocard/:articleId.png` (and the sibling ID-card
endpoint) — `cms/src/endpoints/id-card.ts` + `cms/src/lib/id-card.ts`. It
builds an SVG (title, date, site name, QR via the `qrcode` package, brand
logo) and rasterises it with **sharp**, passing
`text: { text, fontfile, font: 'SolaimanLipi' }` to libvips' `text` operator.
The font is **SolaimanLipi woff2**, copied into the deploy bundle at
`fonts/` by `scripts/assemble-cms-standalone.mjs`.

## 2. Investigation — what was tested (evidence-first)

| # | Test | Result |
|---|---|---|
| 1 | Live photocard for article 10 (`cms.shikkha24.com/api/photocard/10.png`) | **Reproduced: tofu** — QR + logo fine, all Bengali text is codepoint boxes |
| 2 | Same generator locally (bundle dir, same fonts/, same sharp code path) | **Renders correctly** — শিক্ষা২৪ পরীক্ষা in real Bengali glyphs |
| 3 | Local stderr during render | `Fontconfig error: Cannot load default config file: File not found` — **non-fatal locally** (macOS has system fonts as fallback) |
| 4 | Render build logs | Assemble step ran; fonts copied into the bundle (`fonts/` present at `/opt/render/project/src/cms/.next/standalone/cms/fonts`) |
| 5 | `fontPath()` resolution | `server.js` runs `process.chdir(__dirname)` → cwd IS the bundle dir → candidate 1 (`fonts/solaimanlipi-400.woff2`) resolves ✓ — so the **file is found**, `isFontAvailable()` returns true, and the endpoint proceeds |
| 6 | Render runtime docs | No statement about fontconfig/fonts in the native Node image |

## 3. Root cause (learned)

libvips' `text` operation renders through **Pango + fontconfig**. The
`fontfile` parameter asks fontconfig to load that specific file — but
fontconfig still needs its own configuration and, critically, **a writable
font cache** to instantiate any font.

- **Locally (macOS):** fontconfig's missing-config warning appears but the
  system font infrastructure exists, so Pango loads the woff2 and renders real
  Bengali glyphs. Test #2 proves the code path and the font file are sound.
- **On Render (Ubuntu container, free tier):** tofu boxes that display
  codepoints are Pango's **last-resort font** — what it draws when it cannot
  instantiate any real font. The container lacks a usable fontconfig setup
  (no `/etc/fonts/fonts.conf`, no font cache directory), so the fontfile load
  fails *silently* and every Bengali glyph falls back to the last-resort
  renderer. Latin/QR/logo survive because… the logo is an embedded PNG and the
  QR is drawn as vector rects — only the `text` operator depends on fonts.

**Why it surfaced now:** the old DianaHost host had a fuller system
environment (its tofu-era problems were different — sharp couldn't even
load). The fresh Render container is minimal, exposing the fontconfig
dependency that was always implicit in this code.

## 4. Best practice (researched)

For sharp/libvips `text` rendering on minimal containers (Render, AWS
Lambda, Docker scratch images), the established pattern is:

1. **Ship the font + a minimal `fonts.conf`** in the bundle:
   `fonts.conf` declaring `<dir>./fonts</dir>` and a writable
   `<cachedir>./fontconfig-cache</cachedir>`, then set
   `FONTCONFIG_FILE=/opt/.../fonts.conf` (or `FONTCONFIG_PATH`) in the start
   command. This is the documented approach for fontconfig-less images.
2. **Prefer TTF/OTF over WOFF2 for libvips text.** WOFF2 is a web-delivery
   format; Pango/fontconfig handles TTF/OTF natively and woff2 requires
   decompression support that minimal fontconfig builds may lack. Convert at
   build time (`fonttools` woff2→ttf) and ship the ttf.
3. **Fail loudly, not silently:** when the font cannot be instantiated, the
   card should 503 (the endpoint already has `isFontAvailable()` — extend it
   to probe an actual render, or check for the tofu signature) rather than
   ship a broken share image to social platforms.
4. **Alternative (heavier):** switch the service to a Docker runtime with
   `fontconfig` + fonts installed in the image — full control, but a bigger
   change than the free native runtime allows.

## 5. Proposed fix plan (awaiting owner approval)

| Step | Action | Cost |
|---|---|---|
| 1 | Add `fonts.conf` (dir + cachedir pointing inside the bundle) to the assemble script; ship **ttf** copies of SolaimanLipi (convert at build time with fonttools, which is already available) alongside the woff2 | small |
| 2 | Set `FONTCONFIG_FILE` in the start command (render.yaml + Render env) pointing at the bundled fonts.conf | tiny |
| 3 | Extend the card endpoints: probe-render once at boot; if the output lacks real glyphs (or the fontconfig load fails), answer **503** with a clear log — a missing share image beats a broken one on social platforms | small |
| 4 | Verify: redeploy → fetch `/api/photocard/10.png` → confirm real Bengali glyphs; also confirm the ID-card endpoint | tiny |

**Rollback:** revert the assemble/config changes; the endpoint keeps its
current behaviour.

## 6. Related (same class, noted for the plan)

- `og-default.png` (the static fallback share image) is a pre-rendered PNG and
  is unaffected — only the dynamically generated cards break.
- The tofu shares that already reached social platforms are cached by those
  platforms by URL; after the fix, the card URLs should be cache-busted
  (the same lesson as `OG_DEFAULT_VERSION` in `Layout.astro`).
