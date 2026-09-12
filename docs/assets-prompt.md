# Shikkha24 — AI Visual Asset Prompts (Google Flow)

**Photorealistic, text-free, category-expressing images — one per category, reused for every article in that category.**

---

## 0. What changed and why

Two problems with the first version of this document:

1. **The prompts used negative phrasing.** The house-style suffix ended with
   *"no text, no lettering, no logos, no signage"*. Imagen has **no
   negative-prompt parameter** — repeated "no X" is read as subject matter and
   actively degrades output. That contradiction was in my own §5.11 and I then
   wrote it into the suffix anyway. **This is the most likely cause of failed
   generations.**
2. **The style was wrong for the job.** Flat illustration was my suggestion;
   you want photorealistic.

Both are fixed below. Every prompt in §5 is **positive-only** and
**photorealistic**.

---

## 1. The core idea: one archetype image per category

You are not generating an image per article. You are generating **one image per
category** that expresses what that category *is*, and reusing it for every
article in that category.

| | Per-article images | **Category archetypes (our approach)** |
|---|---|---|
| Images needed | thousands | **~20** |
| Cost | continuous | one afternoon |
| Consistency | drifts | locked |
| Works when CMS has no image | no | **yes — always** |

**How reuse works:** an article with its own `featuredImage` uses it. An article
without one falls back to its category's archetype. So no article ever publishes
with a broken or missing image slot.

> **Implementation note (optional, not built yet):** add a `defaultImage` upload
> field to the Categories collection and have `ArticleCard` fall back to it.
> That is a small S5-era change; the images in this document work either way.

---

## 2. Three non-negotiable rules

### 2.1 Photorealistic — but **generic**, never a specific event

Photorealistic is fine. Photorealistic *of a real event* is fabrication.

| ✅ Photorealistic and safe | ❌ Never |
|---|---|
| A student at a library desk | "Students celebrating HSC results at Notre Dame College" |
| A hand holding a scholarship envelope | "The Dhaka college fire" |
| A generic queue outside an admission office | "Flooding in Sylhet, submerged homes" |
| An empty exam hall before an exam | "Portrait of [real named person]" |

**The test:** could a reader mistake this for a photograph *of the event in the
headline*? If yes, do not generate it — use a real photo, or the archetype.

The archetypes in §5 are safe precisely because they are generic: a scholarship
photo is a scholarship photo whether the story is about PMT, Fulbright or a
university award.

### 2.2 No text, ever — and phrase it positively

Bengali conjuncts (যুক্তাক্ষর) garble in image models. All headlines and labels
are overlaid with HTML/CSS.

So instead of writing "no text", describe what you *want*:

> ✅ `clean uncluttered background` · `plain wooden surface` · `simple empty wall behind`
> ❌ `no text, no lettering, no words, no signage`

### 2.3 Never real, named people

Generic people are fine. Named individuals are not — use their real photograph.

---

## 3. The prompt formula (photorealistic)

```
[SUBJECT] + [SETTING] + [COMPOSITION/CAMERA] + [LIGHTING]
         + [COLOUR/MOOD] + [CLEAN BACKGROUND] + [PHOTOREALISM MODIFIERS]
```

**Every prompt in §5 follows this. Write them as plain descriptive sentences —
not as a list of exclusions.**

### Worked example

> ✅ *"A close-up photograph of a hand holding a sealed cream envelope on a
> wooden desk beside a stack of textbooks, warm afternoon window light from the
> left, shallow depth of field with the background softly blurred, neutral warm
> tones, plain wooden surface, photorealistic, shot on 50mm lens, high detail,
> professional photography"*

> ❌ *"scholarship image, no text, no logos, no people"*

---

## 4. Instruction vocabulary (positive phrasing only)

| Slot | Use these |
|---|---|
| **Camera** | `shot on 50mm lens` · `35mm wide angle` · `85mm portrait lens` · `macro detail` |
| **Framing** | `close-up` · `medium shot` · `wide establishing shot` · `overhead flat lay` · `shallow depth of field` |
| **Light** | `warm afternoon window light` · `soft overcast daylight` · `golden hour` · `soft studio light` · `gentle side light` |
| **Colour/Mood** | `neutral warm tones` · `muted earthy palette` · `cool calm blue tones` · `bright and hopeful` · `quiet and focused` |
| **Clean background** | `plain wooden surface` · `simple empty wall behind` · `softly blurred background` · `uncluttered surroundings` |
| **Photorealism** | `photorealistic` · `professional photography` · `high detail` · `sharp focus` · `natural colours` · `realistic texture` |

**Excluding something:** describe the desired state, never the absence.

| Want | Write |
|---|---|
| No words | `plain surface, uncluttered background` |
| No people | `empty room, still life composition` *(and set `personGeneration = dont_allow`)* |
| No branding | `plain unmarked objects` |
| Not illustrated | `photorealistic, professional photography` |

---

## 5. The image set

**Ratio: `16:9`** for every archetype (16:9 crops down cleanly to 4:3, 1:1 and
3:2 for cards and social).

**Settings:** `aspectRatio 16:9` · `imageSize 2K` · `numberOfImages 4` ·
`personGeneration allow_adult` *(never `allow_all`)*.

Generate 4 per prompt and keep the best — variation is significant.

---

### 5.1 The 8 education categories

#### 1. শিক্ষা সংবাদ — Education News
```
A photograph of an open notebook and a pen on a wooden school desk beside a
stack of textbooks, warm morning light through a window, shallow depth of field
with the background softly blurred, neutral warm tones, plain wooden surface,
photorealistic, shot on 50mm lens, high detail, professional photography
```

#### 2. বৃত্তি ও স্কলারশিপ — Scholarship
```
A close-up photograph of a hand holding a sealed cream envelope on a wooden
desk beside a stack of books, warm afternoon window light from the left,
shallow depth of field, neutral warm tones, plain wooden surface,
photorealistic, shot on 50mm lens, high detail, professional photography
```

#### 3. ভর্তি — Admission
```
A photograph of a queue of students seen from behind outside a plain
institutional building doorway, holding paper forms, soft overcast daylight,
muted earthy tones, simple architectural background with plain walls,
photorealistic, shot on 35mm lens, high detail, professional photography
```

#### 4. বিশ্ববিদ্যালয় — University
```
A wide photograph of a red brick university building with arched windows and a
clock tower under a clear sky, warm golden afternoon light, symmetrical
composition, muted earthy tones, open sky above, photorealistic, shot on 24mm
wide angle lens, high detail, professional photography
```

#### 5. উচ্চশিক্ষা — Higher Study
```
A photograph of a microscope and open research notebooks on a clean laboratory
bench, cool soft overhead daylight, shallow depth of field, cool calm tones,
plain uncluttered bench surface, photorealistic, macro detail shot, high detail,
professional photography
```

#### 6. বিদেশে পড়াশোনা — Study Abroad
```
A photograph of a suitcase and a backpack standing beside a large airport
window with a distant aircraft, cool morning light through tall glass, soft
reflections, cool calm blue tones, simple empty terminal background,
photorealistic, shot on 35mm lens, high detail, professional photography
```

#### 7. পরীক্ষা ও ফলাফল — Exams & Results
```
A photograph of a sharpened pencil and an answer script lying on a wooden exam
desk under a warm desk lamp, gentle side light with soft shadows, warm focused
tones, plain wooden surface, photorealistic, shot on 50mm lens, high detail,
professional photography
```
*Alternative, more celebratory — use for result-day stories:*
```
A photograph of a printed result sheet held in two hands against a softly
blurred bright interior background, warm natural daylight, shallow depth of
field, bright and hopeful mood, plain uncluttered surroundings, photorealistic,
shot on 50mm lens, high detail, professional photography
```

#### 8. চাকরি ও ক্যারিয়ার — Jobs & Career
```
A photograph of a plain folder, a pen and a pair of glasses arranged on a clean
office desk, soft studio daylight, shallow depth of field, neutral warm tones,
plain unmarked desk surface, photorealistic, shot on 50mm lens, high detail,
professional photography
```

---

### 5.2 General news categories (reusable the same way)

#### Breaking / Urgent
```
A close-up photograph of a blank dark slate surface with a single warm beam of
light falling across it, dramatic soft side lighting, deep neutral tones,
plain empty surface, photorealistic, macro detail shot, high detail,
professional photography
```

#### Politics / Government
```
A wide photograph of an empty assembly chamber with rows of wooden benches and
a high ceiling, soft diffused daylight from tall windows, symmetrical
composition, muted institutional tones, plain unadorned walls, photorealistic,
shot on 24mm wide angle lens, high detail, professional photography
```

#### Economy / Business
```
A close-up photograph of stacked plain coins and folded documents on a wooden
desk, warm directional side light, shallow depth of field, neutral warm tones,
plain wooden surface, photorealistic, macro detail shot, high detail,
professional photography
```

#### Health
```
A photograph of a stethoscope and a plain notebook resting on a clean white
clinical surface, soft even daylight, cool calm tones, simple uncluttered
surface, photorealistic, shot on 50mm lens, high detail, professional photography
```

#### Science & Technology
```
A photograph of laboratory glassware with soft light passing through it on a
clean bench, cool blue accent lighting, shallow depth of field, cool calm tones,
plain uncluttered background, photorealistic, macro detail shot, high detail,
professional photography
```

#### Climate / Environment
```
A wide photograph of a green paddy field under a wide open sky with soft
morning haze, gentle natural daylight, muted green and earthy tones, open sky
above, photorealistic, shot on 24mm wide angle lens, high detail, professional
photography
```

#### Weather
```
A wide photograph of rain clouds over a flat green Bengal landscape with a
distant tree line, soft overcast daylight, muted grey-green tones, open sky
above, photorealistic, shot on 24mm wide angle lens, high detail, professional
photography
```

#### Sports
```
A close-up photograph of a running shoe on a red athletics track surface, warm
low golden light, shallow depth of field, warm earthy tones, plain track
surface, photorealistic, shot on 85mm lens, high detail, professional photography
```

#### Culture / Festival
```
A photograph of warm string lights and plain paper lanterns hanging above an
empty evening street, soft glowing warm light, deep warm tones, softly blurred
background, photorealistic, shot on 50mm lens, high detail, professional
photography
```

#### Crime / Court
```
A photograph of an empty wooden courtroom bench and a gavel on plain dark wood,
soft diffused daylight from a high window, muted desaturated tones, plain
unadorned wooden surface, photorealistic, shot on 50mm lens, high detail,
professional photography
```

#### Obituary / Memorial
```
A close-up photograph of a single lit candle in a plain holder on a dark wooden
surface, warm gentle flame light with soft falloff, deep warm tones, plain dark
surroundings, photorealistic, macro detail shot, high detail, professional
photography
```

#### Opinion / Editorial
```
A photograph of an open plain notebook with a fountain pen resting across it on
a wooden desk, warm afternoon window light, shallow depth of field, neutral
warm tones, plain wooden surface, photorealistic, shot on 50mm lens, high
detail, professional photography
```

#### Election
```
A close-up photograph of a plain sealed ballot box on a wooden table, soft even
daylight, neutral calm tones, simple uncluttered surroundings, photorealistic,
shot on 50mm lens, high detail, professional photography
```

#### International
```
A close-up photograph of a plain desk globe with soft window light falling
across it, warm directional light, shallow depth of field, neutral warm tones,
plain uncluttered background, photorealistic, shot on 50mm lens, high detail,
professional photography
```

---

### 5.3 Site furniture (generate once)

| Asset | Prompt | Ratio |
|---|---|---|
| **Default OG image** | *"A photograph of an open book on a wooden desk with warm morning light, shallow depth of field, neutral warm tones, plain wooden surface, photorealistic, shot on 50mm lens, high detail"* | 16:9 |
| **Newsletter header** | *"A photograph of a plain envelope and a small potted plant on a clean bright desk surface, soft daylight, neutral warm tones, simple uncluttered surface, photorealistic, high detail"* | 16:9 |
| **404 / error** | *"A photograph of an empty wooden chair in a quiet sunlit room with dust in the air, soft warm daylight, muted warm tones, plain empty walls, photorealistic, shot on 35mm lens, high detail"* | 16:9 |
| **Author avatar placeholder** | *"A soft-focus photograph of a plain neutral fabric background with gentle warm light, minimal composition, neutral warm tones, photorealistic, high detail"* | 1:1 |
| **Scholarship badge** | *"A close-up photograph of a plain gold medal on a soft neutral fabric, warm gentle light, shallow depth of field, warm gold tones, simple uncluttered background, photorealistic, macro detail, high detail"* | 1:1 |

---

## 6. Workflow

1. **Pick the category** the article belongs to.
2. **Copy that category's prompt** from §5 verbatim.
3. **Generate 4**, choose the best one.
4. **Regenerate if** you see text, a recognisable person, a brand, or a
   specific real place.
5. **Export → convert to WebP → resize** (hero < 150 KB).
6. **Name it:** `category--<slug>.webp` — e.g. `category--scholarship.webp`
7. **Upload to Payload Media.**
8. **Fill in:** Bengali alt text, and caption `AI-জেনারেটেড ছবি`.
9. **Assign** as the category's default image (once the fallback field exists),
   or attach to individual articles for now.

---

## 7. QA — reject the image if

- [ ] It shows **text** of any kind → regenerate
- [ ] It shows a **recognisable real person** or **brand** → regenerate
- [ ] It depicts a **specific real event or place** → regenerate (§2.1)
- [ ] It looks **illustrated or painterly** rather than photographic → add `photorealistic, professional photography`
- [ ] It is **busy/cluttered** → add `plain uncluttered background`
- [ ] Bengali **alt text** and `AI-জেনারেটেড` caption are missing
- [ ] File is **> 150 KB** or not WebP

---

## 8. Quick reference

```
┌────────────────────────────────────────────────────────────────┐
│  ONE IMAGE PER CATEGORY. REUSE FOREVER.                        │
│                                                                │
│  subject → setting → camera → lighting → colour                │
│          → clean background → photorealism modifiers            │
│                                                                │
│  PHOTOREALISTIC, but generic — never a specific real event.    │
│  POSITIVE phrasing only. "plain wooden surface", NOT "no text".│
│  16:9 · 2K · 4 variations · pick the best.                     │
│  WebP · <150 KB · Bengali alt text · AI-জেনারেটেড caption      │
└────────────────────────────────────────────────────────────────┘
```

**Standard tail (append to any prompt above):**
> `, photorealistic, professional photography, natural colours, sharp focus,
> high detail`
