# Logo Design Brief — শিক্ষা২৪.কম (shikkha24.com)

> Hand this file to an AI design assistant (ChatGPT/midjourney/etc.) as context.
> It contains who we are, why the logo is needed, hard technical constraints,
> exact brand colors, design directions, and the deliverable checklist.

---

## 1. Who we are

- **Product:** শিক্ষা২৪.কম — an independent, Bengali-first **education news &
  opportunities portal for Bangladesh**, live at shikkha24.com since 2026.
- **Owner's positioning (verbatim):**
  - 🎓 Education News | Scholarship | Admission | University | Higher Study
  - 🌍 দেশ-বিদেশের শিক্ষার সর্বশেষ খবর ও সুযোগ
  - 📚 শিক্ষার খবর, সুযোগ ও সম্ভাবনা—এক ঠিকানায়।
- **Readers:** school/college/university students, admission and exam candidates
  (SSC, HSC, university admission, BCS), scholarship seekers, parents, teachers,
  institutions — across Bangladesh.
- **Character of the brand:** fast and trustworthy like a newsroom (the "24"
  in the name signals round-the-clock coverage), yet approachable and hopeful —
  "সুযোগ ও সম্ভাবনা" (opportunity and possibility). Not a government body, not a
  university, not a coaching center: an independent media/information brand.
- **Language note:** the interface is 100% Bengali. The brand name is
  "শিক্ষা২৪.কম" (Shikkha = education, 24 = always-on, .kom = .com).

## 2. Why a (better) logo is needed

The site currently ships a minimal placeholder mark (a tiny 48×48 SVG with two
paths) while the real product — articles, breaking-news ticker, scholarship
trackers, results coverage — has grown. The logo must now hold up as a recognizable
**media brand** on the site, in browser tabs, on social share cards, and in
WhatsApp/Telegram link previews, which is how most Bangladeshi education news
actually travels.

## 3. ⚠️ The single most important constraint: it is a MARK, not a wordmark

- The site name **শিক্ষা২৪.কম is rendered as live text BY the website itself**,
  always to the right of the mark, in the site font (SolaimanLipi).
- Therefore the logo **must contain NO readable text** — no Bengali letters, no
  "24", no English words. If the generator include lettering, it will duplicate
  the site name in the header and — critically — **AI image generators now
  reliably corrupt Bengali (Bangla) script**, producing broken glyph shapes.
- **Do not attempt to draw Bengali characters.** A clean abstract mark is the
  deliverable. (If the tool offers it: an optional secondary "full lockup" for
  social share images may pair the mark with reserved empty space for the name,
  but even there never generate the lettering.)
- Design for reading at **16px (browser tab) and 48px (header)** — the header
  renders the mark small beside the name.

## 4. Surfaces it must survive

| Surface | Size | Constraint |
|---|---|---|
| Site header (light page) | ~32–40 px tall | beside dark text on white |
| Site header (dark mode) | ~32–40 px tall | beside light text on near-black |
| Browser favicon | 16–32 px | still identifiable, single shape reads |
| Apple touch icon / PWA | 180–512 px | square, safe margins |
| Open Graph share card | overlaid on ~1200×630 | reads on white and on photo tints |
| WhatsApp/Telegram thumbnail | tiny square | high contrast, no fine lines |

## 5. Exact brand palette

- **Primary red (dominant):** `#DA1C25` — the brand's breaking-news/urgency red
- Deep press red (accents on light backgrounds): `#C4161E`
- Soft red (accents on dark backgrounds): `#F87171`
- Ink (text/near-black): `#1F1F1F`
- White for knockout space: `#FFFFFF`
- Also acceptable: restrained white/negative-space usage of the mark on red.

The logo should be **flat vector** — solid shapes, no gradients, no 3D, no
shadows, no thin hairlines that vanish at 16 px. One or two colors maximum
(ideally: red mark with white negative space, or ink mark for monochrome use).

## 6. Design directions (explore these; pick/refine, don't concatenate them)

1. **Monogram "শ" spirit without the letterform** — a bold geometric glyph that
   *evokes* the Bengali শ (Shikkha) through form language only; must not be a
   broken rendering of the actual letter.
2. **Open book → rising sun / horizon** — education + a new day of opportunity;
   the "sun" element may be the brand-red circle so newsroom energy is present.
3. **Graduation cap + broadcast signal** — a mortarboard whose tassel or top
   carries a small signal/wifi-like arc: "education, broadcast around the clock".
4. **The "always-on 24" idea without digits** — a circular arrow or noon-sun
   mark suggesting "education news all day, every day" (again: no literal "24"
   digits, no text).

Guidance for evaluation: strong silhouette, legible at 16 px, no clip-art
literalness (no book-backpack-pen-clutter), one idea per mark, asymmetric
confidence over perfect symmetry, feels contemporary newsroom more than school.

## 7. Avoid

- Any lettering — Bengali OR Latin (the #1 failure mode)
- Gradients, bevels, 3D extrusion, drop shadows, glow
- More than two colors; multi-part marks that need spacing to stay legible
- See-and-say clichés: lightbulb+brain, graduation cap on stacked books, globe
  with orbiting rings, "e-learning" arrows
- Anything resembling a government/UN/ministry emblem (we are an independent outlet)

## 8. Deliverable checklist (what to ask the generator for)

1. **Primary:** square-format flat logo mark, centered, generous safe margin
   (~15% padding), **transparent or plain white background**, delivered as a
   1024×1024 PNG *and* a vector-style description precise enough to be
   hand-traced into SVG (SVG must stay under ~5 KB, 2–6 paths).
2. **Dark-mode variant:** same mark colored for near-black backgrounds
   (e.g., white + brand red, or the soft-red accent `#F87171`).
3. **Monochrome variant:** single-color ink / single-color white.
4. A favicon sanity note: "still readable at 16 px" — if not, simplify the mark's
   interior detail.

## 9. Ready-to-paste image prompt (for ChatGPT/DALL·E-class tools)

> Flat vector logo MARK for an independent Bengali education news portal.
> Abstract geometric symbol only — absolutely NO text, NO letters, NO numbers,
> no Bengali script. One idea: [pick from section 6 — e.g. an open book whose
> spine opens into a rising red sun, suggesting education and a new day of
> opportunity]. Solid shapes, bold rounded strokes, high contrast, minimal
> detail so it reads at 16 px. Colors: vivid red #DA1C25 plus white negative
> space, optionally near-black #1F1F1F. Flat design, no gradients, no shadows,
> no 3D. Centered on a transparent background with 15% safe margin, square
> canvas. Contemporary newsroom feel — confident, hopeful, trustworthy.

Iterate with: "simplify further for 16 px favicon legibility" and
"remove any accidental letterforms" until clean.

## 10. After generation (what the owner does next)

The accepted design will be: hand-traced to SVG (≤5 KB), uploaded into the CMS
(Site Settings → logo + favicon — no code change needed), and verified at 16 px,
32 px, header size, light mode, dark mode, and on the share card.
