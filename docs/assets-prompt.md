# Shikkha24 — AI Visual Asset Prompts (Google Flow)

**How to generate every visual the newsroom needs, using Google Flow.**

Read §1 and §2 before generating anything. They contain the rules that keep
this portal honest and keep your images usable.

---

## 1. What Google Flow is — and what it actually does for us

**Flow** (Google Labs) is an AI filmmaking studio. It is a *product*, not an API,
and it bundles three models:

| Model | Does | We use it for |
|---|---|---|
| **Imagen** | Text → **image** | ~95% of our work: article hero images, thumbnails, section art, OG images |
| **Veo** (2 / 3) | Text → **video** (8-second clips) | Occasional social loops, live-blog stings |
| **Gemini** | Language | Refining and expanding our prompts |

Flow's features:
- **Text to Video** — prompt → clip
- **Ingredients to Video** — up to 3 reference images for character/object/style consistency *(Veo 2 only)*
- **Frames to Video** — you supply the first frame; useful for starting from a still we already like
- **Scenebuilder** — assemble clips; **Jump To** and **Extend** *(Veo 2 only)*

> Model names inside Flow change as Google ships. Prompt *craft* is what stays
> stable — that is what this document teaches.

### What we are generating, 95% of the time: stills

A news portal runs on **static images** — one hero image per article, thumbnails
in lists, a social share card. Video is a rare exception. So this document is
weighted toward image prompts, with a video section for completeness.

---

## 2. ⛔ Red lines — read this first

These are not stylistic preferences. Breaking them damages the portal's
credibility, and in some cases breaks Google's terms.

### 2.1 Never generate a photorealistic image of a real event

**Never.** Not a real flood. Not a real fire. Not a real accident. Not a real
protest, result day, or exam hall at a named institution.

A generated photorealistic image of a specific real event is **fabrication**. It
does not matter that it is labelled — readers skim images, and a fake photo of a
disaster is the single fastest way to destroy a news brand.

| ❌ Never | ✅ Do this instead |
|---|---|
| "Photo of the Dhaka college fire, flames and smoke" | Conceptual illustration: a flame motif, abstract, editorial style |
| "Photo of students celebrating HSC results at Notre Dame" | Illustration of a generic student holding a result sheet — no real institution |
| "Photo of the flood in Sylhet, submerged houses" | Abstract water/climate illustration, or **use a real photo** from a wire/reporter |
| "Portrait of [real named person]" | Use their real photograph, or a generic illustrated figure |

**Rule of thumb:** if the image would be misleading without a caption, do not
generate it.

### 2.2 Never generate real, named people

Not politicians, not celebrities, not our own journalists, not sources. Use
their real photograph, or a clearly generic illustrated figure.

### 2.3 Never generate children in news contexts

Imagen's `personGeneration` default is `allow_adult` — which exists precisely
because generating children is restricted. `allow_all` is **not available in the
EU, UK, Switzerland or MENA**. Keep `allow_adult`. For any story involving
minors, use illustration or a real supplied photo with consent.

### 2.4 Always disclose AI-generated imagery

Every generated asset must be marked in the CMS. Flow/Imagen output carries a
**SynthID** watermark, but that is invisible to readers — disclosure is a
separate editorial duty:

- Set the media item's **caption or a custom field** to `AI-জেনারেটেড ছবি` (AI-generated image).
- Write **alt text in Bengali** describing the image, never "AI image".

### 2.5 When you need a real photo, get a real photo

Generated art cannot cover: spot news, named events, real people, real places at
a specific moment. For those: use a staff photo, a wire service, or run the
article with **no image**. A text-only article is honest; a fabricated one is not.

---

## 3. ⚠️ Critical constraints for a Bengali portal

Three things will bite you. All three are avoidable.

### 3.1 Prompts must be written in English

Imagen accepts **English-only** prompts, maximum **480 tokens**.

Our site is Bengali-only, but the *prompt* is an instruction to a machine and
must be English. Do not paste Bengali into Flow — it will not be understood.

> **Workflow implication:** the editor writes the Bengali headline; the prompt
> is written in English describing the same idea. Keep §7's library open and
> adapt.

### 3.2 Never put Bengali text inside a generated image

Imagen *can* render text, but:
- limit **25 characters or fewer**
- **2–3 phrases maximum**
- it cannot reproduce a specific font reliably
- placement is approximate

Bengali makes all of this worse: **conjuncts (যুক্তাক্ষর) will be garbled.**
A generated "শিক্ষা" will come out as broken glyphs — the same conjunct problem
that drives our 17px type floor.

> **Hard rule: generated images contain ZERO text.**
> All headlines, labels, dates and logos are overlaid with HTML/CSS at render
> time. This also means one image can be reused across headlines, and the text
> stays selectable, translatable and accessible.

### 3.3 Leave space for the text overlay

Because text is overlaid in CSS, compose images with **negative space** —
usually the lower third or one side. Say so in the prompt:
`...with clean empty space in the lower third for a text overlay`

---

## 4. The prompt formula

Imagen's documented structure is:

```
Subject  +  Context / Background  +  Style
```

That is the skeleton. For newsroom work we extend it to get reliable, on-brand
results:

```
[SUBJECT] + [ACTION/STATE] + [SETTING] + [COMPOSITION] + [CAMERA]
         + [LIGHTING] + [STYLE/MEDIUM] + [MOOD & COLOUR]
         + [NEGATIVE SPACE] + [QUALITY MODIFIERS]
```

You do not need all ten every time. **Subject + Setting + Style** will produce
something usable. Add the rest when you need control.

### 4.1 Worked example

> ❌ *"education news image"* — far too vague.

> ✅ *"A young South Asian university student sitting at a wooden library desk,
> reading an open book, warm morning light through a tall window, medium shot
> from a slight low angle, soft natural lighting, flat editorial illustration
> with subtle paper texture, warm optimistic palette of terracotta and cream,
> clean empty space in the lower third for a text overlay, high detail,
> professional illustration"*

---

## 5. Every instruction type — the full vocabulary

Mix and match from these. This is the reference you come back to.

### 5.1 Subject
Who or what is in frame.
- *A young South Asian woman in her twenties* / *a schoolteacher in her forties* / *a group of university students*
- *An open textbook and a notebook* / *a graduation cap* / *a microscope*
- Be specific: *"a student with short black hair wearing a white shirt and backpack"* beats *"a student"*

### 5.2 Action / State
What is happening. Images with an action read as news; static ones read as stock.
- *writing in a notebook* / *raising a hand in a lecture hall* / *walking through a campus courtyard*
- *looking at a result sheet with a surprised expression* / *shaking hands at a job fair*

### 5.3 Setting / Context
Where. This does most of the storytelling work.
- *a sunlit university library* / *a crowded admission fair* / *a quiet village schoolhouse*
- *a modern laboratory* / *an airport departure hall* / *a monsoon street in Dhaka*
- Paint it: *"a dusty attic with a single beam of afternoon light"* beats *"a room"*

### 5.4 Composition
- `centered composition` · `rule of thirds` · `symmetrical` · `layered depth`
- `foreground subject, blurred background` · `flat lay from above` · `isometric 3D`

### 5.5 Camera / Framing
- **Shot size:** `extreme close-up` · `close-up` · `medium shot` · `wide shot` · `establishing shot`
- **Angle:** `eye level` · `low angle` · `high angle` · `overhead / flat lay` · `aerial view`
- **Motion (video only):** `static camera` · `slow pan left` · `tracking shot` · `dolly in` · `crane down`
- **Lens:** `35mm` · `50mm` · `wide angle 16mm` · `macro 100mm` · `telephoto 200mm`

### 5.6 Lighting
Sets the mood more than anything else.
- `soft natural morning light` · `golden hour` · `overcast diffused light`
- `dramatic side lighting` · `studio lighting` · `backlit with rim light`
- `warm tungsten interior` · `cool blue daylight`

### 5.7 Style / Medium
**This is our brand signature — see §6.**
- `flat editorial illustration` · `soft 3D render` · `isometric illustration`
- `watercolour editorial illustration` · `linocut print style` · `screen-print poster`
- `photo-illustration` · `documentary photography` *(use only for non-news generic scenes)*
- `stop motion` / `clay animation` *(video)*

### 5.8 Mood & Colour
- `calm and hopeful` · `urgent and tense` · `celebratory` · `solemn` · `optimistic`
- `warm terracotta and cream` · `cool blue and slate` · `muted desaturated`
- Brand anchors: `deep red #DA1C25 accent` · `charcoal #1F1F1F` · `warm off-white`

### 5.9 Negative space (for our overlay)
- `with clean empty space in the lower third`
- `uncluttered background on the left side`
- `simple background, no text, no lettering`

### 5.10 Quality modifiers
- `high detail` · `professional illustration` · `4K` · `HDR` · `sharp focus` · `clean lines`

### 5.11 What to exclude (no negative-prompt field exists)

Imagen has **no `negativePrompt` parameter**. The only exclusion control is
`personGeneration`. So exclusions must be phrased as **positive instructions**:

| Instead of "no…" | Write |
|---|---|
| "no text" | `plain background with no text, no lettering, no signage` |
| "no people" | set `personGeneration = dont_allow`, and write `empty environment, no figures` |
| "no clutter" | `minimal, uncluttered, clean composition` |
| "not photorealistic" | `flat vector illustration, clearly illustrative` |
| "no watermark" | `clean image, no watermark, no logo` |

---

## 6. House visual style

Consistency is what makes generated art look like *our* art rather than random AI.

| Element | Our standard |
|---|---|
| **Medium** | Flat or soft-3D **editorial illustration** — never photorealistic for news |
| **Palette** | Warm off-white base, charcoal `#1F1F1F`, brand red `#DA1C25` as accent, muted terracotta/teal support |
| **People** | Generic South Asian / Bengali features, modest clothing, no identifiable individuals |
| **Light** | Soft, warm, natural — optimistic (we are an education portal) |
| **Texture** | Subtle paper grain or clean flat; avoid heavy filters |
| **Text** | **Never** in the image — always overlaid |
| **Watermark** | SynthID is automatic; add `AI-জেনারেটেড` in the CMS caption |

**Append this to nearly every prompt:**

> `, flat editorial illustration, warm optimistic palette with subtle terracotta
> and cream, soft natural light, clean composition with empty space in the lower
> third, no text, no lettering, professional illustration, high detail`

---

## 7. Asset specifications

### 7.1 Aspect ratio per placement

Imagen supports: `1:1`, `3:4`, `4:3`, `9:16`, `16:9` (default `1:1`).

| Placement | Ratio | Why |
|---|---|---|
| **Article hero (lead)** | `16:9` | Widescreen; the lead image |
| **Category card thumbnail** | `4:3` or `16:9` | Matches `ArticleCard` aspect-3/2 and aspect-16/10 |
| **OG / social share** | `16:9` (1200×630 ≈ 1.91:1, crop from 16:9) | Social cards |
| **Mobile story / Reel** | `9:16` | Full-screen vertical |
| **Square social post** | `1:1` | Facebook/Instagram feed |
| **Portrait card** | `3:4` | Compact cards |

> Generate at `16:9` for heroes and **crop down** in CSS for other placements.
> One master asset per article, cropped per surface.

### 7.2 Output settings
- `aspectRatio`: pick from the table above
- `imageSize`: `1K` is enough for web; `2K` for print-quality features
- `numberOfImages`: `4` (then pick the best)
- `personGeneration`: keep `allow_adult` — **never** `allow_all`

### 7.3 File handling after generation

1. **Export** from Flow.
2. **Convert** to WebP (primary) and AVIF where supported.
3. **Resize** to the delivery sizes in `docs/performance-budget.md` (hero < 150 KB).
4. **Name it:** `YYYY-MM-DD--<slug>--<variant>.webp`
   e.g. `2026-09-12--hsc-result-2026--hero.webp`
5. **Upload** to Payload Media (which stores in Cloudflare R2).
6. **Fill in the CMS:**
   - **Alt text (Bengali)** — describe the image for a screen reader. Required.
   - **Caption** — `AI-জেনারেটেড ছবি` unless it is a real photograph.
   - **Credit** — `Shikkha24AI` or the photographer's name.

---

## 8. Prompt library — every type of news

Each entry: a **ready-to-paste English prompt**, the **ratio**, and **notes**.
Append the §6 house-style suffix unless stated.

### 8.1 Our 8 education categories

#### শিক্ষা সংবাদ — Education News
```
A university campus courtyard in the early morning with generic South Asian
students walking and talking, soft warm sunlight, wide establishing shot,
flat editorial illustration, calm and optimistic mood
```
*16:9 · Generic scene — never a named institution.*

#### বৃত্তি ও স্কলারশিপ — Scholarship
```
An open hand offering a glowing scholarship certificate to a young student,
abstract background of floating books and light particles, centered composition,
warm gold and terracotta palette, celebratory but dignified mood
```
*16:9 · Abstract avoids depicting a real awarding body.*

#### ভর্তি — Admission
```
A long line of hopeful students outside an admission office with forms in hand,
medium wide shot, overcast soft daylight, muted teal and cream palette,
anticipatory mood, generic building with no signage
```
*16:9 · **No signage** — a readable institution name would imply a real place.*

#### বিশ্ববিদ্যালয় — University
```
A stately red-brick university building with arched windows and a clock tower,
students on the steps, symmetrical composition, golden hour light,
institutional and aspirational mood, no signage or text
```
*16:9 · Invented architecture, not a real campus.*

#### উচ্চশিক্ষা — Higher Study
```
A postgraduate student in a quiet research laboratory examining samples under a
microscope, medium close-up, cool clean daylight with warm accent,
focused and scholarly mood
```
*16:9*

#### বিদেশে পড়াশোনা — Study Abroad
```
A young student with a suitcase and backpack standing at an airport departure
gate looking out at a plane, wide shot, cool morning light through tall glass,
hopeful and adventurous mood, no airline logos or text
```
*16:9 · **No airline logos or signage**.*

#### পরীক্ষা ও ফলাফল — Exams & Results
```
A student at a desk lit by a desk lamp late at night surrounded by open books
and notes, close-up, warm lamp light against cool blue darkness,
tense then relieved mood
```
*16:9 · For **result days**, prefer the abstract version below — it is safer and reusable.*

```
Abstract composition of an answer script and a rising bar chart made of light,
dark navy background with warm gold accents, isometric 3D illustration,
triumphant mood, no numbers or text
```
*16:9 · Reusable across every result story. **No numbers** — data goes in the overlay/HTML.*

#### চাকরি ও ক্যারিয়ার — Jobs & Career
```
A job fair hall with stalls and generic candidates in conversation, wide shot,
bright even interior lighting, professional blue and charcoal palette with a red
accent, ambitious mood, no company logos or text
```
*16:9 · **No company logos**.*

---

### 8.2 General news types

#### Breaking / Urgent
```
Abstract red and charcoal geometric shapes suggesting urgency and motion,
diagonal composition, dramatic high-contrast lighting, minimal and stark,
no text
```
*16:9 · Abstract is the **only** safe option for breaking news — you cannot know what really happened yet.*

#### Politics / Government
```
A generic parliament or assembly chamber interior with rows of empty seats,
symmetrical wide shot, formal daylight, muted institutional palette,
solemn mood, no flags with identifiable emblems, no portraits
```
*16:9 · **No real flags, emblems or portraits.***

#### Economy / Business
```
Abstract rising and falling line graph rendered as layered translucent paper,
soft shadow, isometric view, cool slate and warm gold palette,
analytical mood, no numbers or axis labels
```
*16:9*

#### Budget
```
A stylized stack of coins and documents with a pie-chart shape made of light,
clean studio lighting, terracotta and cream palette, official but accessible
mood, no numbers or currency symbols
```
*16:9*

#### Health
```
A generic doctor and patient in a clean clinic consultation room, medium shot,
soft even daylight, calm reassuring white and teal palette, no logos or text
```
*16:9 · Never illustrate a specific disease outbreak realistically.*

#### Science & Technology
```
A researcher in a modern laboratory working at a bench with glassware and a
glowing screen, medium shot, cool blue light with warm accent,
curious and precise mood, no readable screens or text
```
*16:9*

#### Climate / Environment
```
Abstract illustration of rising water and a green sapling growing through it,
layered depth, moody overcast light with a warm break, urgent but hopeful,
no text
```
*16:9 · For **specific disasters**, use a real photo — never generate one.*

#### Weather
```
Flat weather icon set style illustration of sun and rain clouds over a green
Bengal delta landscape, clean bright palette, simple and legible, no text
```
*16:9 · Safe because weather is generic, not a specific event.*

#### Sports
```
A generic athlete running on a track at golden hour, low angle, motion energy,
warm dramatic light, determined mood, no team colours, no logos, no text
```
*16:9*

#### Culture / Festival
```
A festive street scene with lanterns and decorations, generic celebration,
warm golden evening light, joyful mood, no religious text or identifiable
religious iconography
```
*16:9 · Be careful with religious imagery — keep it generic and respectful.*

#### Entertainment
```
A stylized theatre stage with curtains and a single spotlight on a microphone,
dramatic chiaroscuro lighting, deep red and charcoal palette, no text
```
*16:9*

#### Crime / Court
```
A generic courtroom with an empty judge's bench and wooden panelling,
symmetrical wide shot, sombre diffused daylight, desaturated palette,
solemn mood, no identifiable people, no text
```
*16:9 · Never depict a real case, victim or accused.*

#### Obituary / Memorial
```
A single candle glowing in a dark frame with soft warm light, minimal
composition, respectful and sombre mood, charcoal and warm gold palette,
no text
```
*16:9 · Restraint is the rule.*

#### Opinion / Editorial
```
An abstract ink-brush stroke forming an open quotation shape, textured paper
background, minimal composition, charcoal ink on warm off-white,
thoughtful mood, no readable text
```
*16:9*

#### Election
```
A generic hand placing a ballot paper into a sealed ballot box, close-up,
even neutral lighting, civic and orderly mood, no party symbols, no colours
associated with any party, no text
```
*16:9 · **No party symbols or colours** — this matters.*

#### International
```
Abstract globe rendered in soft translucent layers with connected nodes of
light, cool blue and warm gold, centered composition, diplomatic and calm
mood, no country borders, no text
```
*16:9*

---

### 8.3 Recurring / seasonal

| Occasion | Prompt skeleton | Note |
|---|---|---|
| **Result season** | *"Abstract glowing bar chart and answer script, dark navy, gold accents"* | Reusable all season |
| **Admission season** | *"Generic queue at an admission office, forms in hand, anticipatory"* | No signage |
| **New academic year** | *"Fresh notebooks, pencils and a school bag on a wooden desk, flat lay from above, morning light"* | Flat lay works well |
| **Eid** | *"Abstract crescent and lantern motif, geometric pattern, warm gold and green, festive, no text"* | Keep geometric/abstract |
| **Pahela Baishakh** | *"Abstract Bengali new year motif with a rising sun and traditional patterns, warm saffron and red, celebratory, no text"* | No readable Bengali |
| **Monsoon** | *"Rain over a green Bengal village landscape viewed through a window, soft grey-green light, calm"* | |
| **Winter** | *"Misty morning field with warm low sun, layered depth, quiet and cold"* | |
| **National mourning** | *"Single candle, dark frame, sombre"* | Restraint |

---

### 8.4 Functional / UI assets

These are **not** news — they are the site's furniture. Generate once, reuse.

| Asset | Prompt | Ratio |
|---|---|---|
| **Default OG image** | *"Abstract composition of an open book with light rays, deep red and charcoal on warm off-white, flat editorial illustration, centered, generous empty space, no text"* | 16:9 |
| **Newsletter header** | *"Flat illustration of an envelope with papers and a small plant, warm cream background, friendly, no text"* | 3:1 (crop from 16:9) |
| **404 / error** | *"An empty desk with a toppled chair and scattered papers, muted palette, gently whimsical, no text"* | 16:9 |
| **Category fallback** | *per category in §8.1* | 16:9 |
| **Author avatar placeholder** | *"Simple flat illustrated portrait silhouette, neutral warm background, no facial detail, no text"* | 1:1 |
| **Scholarship badge** | *"Flat gold badge icon with a ribbon, centered on transparent-feeling plain background, no text"* | 1:1 |
| **Live-blog sting (video)** | *"Abstract pulsing red dot with subtle radiating rings, dark background, minimal, seamless loop"* | 16:9, 8s |
| **Section divider** | *"Subtle abstract line pattern in charcoal on off-white, minimal, tileable"* | 16:9 |

---

## 9. Video prompts (Veo) — when you need motion

Same elements, plus **camera motion** and optional **audio**.

```
[SUBJECT] + [ACTION] + [SETTING] + [CAMERA MOTION] + [LIGHTING]
         + [STYLE] + [AUDIO]
```

**Example — study-abroad social loop:**
> *"A young student walking through a sunlit airport concourse pulling a
> suitcase, slow tracking shot following at eye level, warm morning light
> through tall glass, flat editorial illustration style, ambient airport
> ambience with soft footsteps, 8 seconds, no text, no logos"*

| Do | Avoid |
|---|---|
| `static camera` when you want a still-like clip | Long dialogue — it will not fit in 8s |
| One clear camera move per clip | Multiple moves in one clip |
| `seamless loop` for UI stings | Generating minors' speech |
| Specify `ambient sound` explicitly | Photorealistic news events (§2.1) |

---

## 10. Workflow

1. **Write the Bengali headline first.** Know the story.
2. **Decide: real photo or generated art?** If the story is a specific real
   event or person → **real photo or nothing** (§2.5).
3. **Pick the prompt** from §8 and adapt.
4. **Append the house-style suffix** (§6) and the negative-space instruction.
5. **Generate 4**, choose 1. Regenerate rather than settling.
6. **Check against §11 QA** before exporting.
7. **Export → convert to WebP → resize** per §7.3.
8. **Upload to Payload Media**; fill **Bengali alt text** and
   **AI-generated caption**.
9. **Overlay the headline in HTML/CSS.** Never bake text in.

---

## 11. QA checklist

Before an image ships:

- [ ] Does it depict a **real event, place or person**? → reject (§2.1, §2.2)
- [ ] Does it involve **children**? → reject or replace with illustration (§2.3)
- [ ] Is there **text in the image**? → reject, or crop it out (§3.2)
- [ ] Are there **logos, signage or flags**? → reject (brand/legal risk)
- [ ] Is there **empty space** for the headline overlay? (§3.3)
- [ ] Is it **on-brand** — warm, optimistic, editorial illustration? (§6)
- [ ] Are **Bengali alt text** and the **AI-generated caption** filled in? (§7.3)
- [ ] Is it **< 150 KB** and WebP? (`docs/performance-budget.md`)

---

## 12. Quick reference card

```
┌──────────────────────────────────────────────────────────────┐
│  PROMPT ORDER                                                │
│  subject → action → setting → composition → camera           │
│         → lighting → style → mood → negative space → quality │
│                                                              │
│  ALWAYS ENGLISH. 480 token max.                              │
│  NEVER: real events · real people · children · text · logos  │
│  ALWAYS: editorial illustration · warm palette · empty space │
│  THEN:   WebP · <150 KB · Bengali alt text · AI caption      │
└──────────────────────────────────────────────────────────────┘
```

**House-style suffix (paste after any prompt):**
> `, flat editorial illustration, warm optimistic palette with subtle terracotta
> and cream, soft natural light, clean composition with empty space in the lower
> third, no text, no lettering, no logos, no signage, professional
> illustration, high detail`
