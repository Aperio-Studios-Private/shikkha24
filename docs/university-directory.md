# University Directory — specification

**Status:** 📋 **PROPOSED — awaiting owner approval.** No code written.
**Requested:** 2026-09-30 · **Supersedes:** the N4 "institution directory" starter set (S10)

> ⚠️ **Read §3 before §4.** The data survey found that the requested scope — *"full listing
> including all NU colleges"* — is **not fully achievable**, for a reason that is specific to this
> site: **the site is Bengali-only, and the NU college list exists only in English.** The numbers
> are below. §4 gives the options; nothing is built until one is chosen.

---

## 1. What already exists (this is an extension, not a new feature)

S10 built N4, the institution directory. **5 institutions are seeded** (3 public, 2 private).

| Component | Path |
|---|---|
| Collection | `cms/src/collections/Institutions.ts` |
| Index | `frontend/src/pages/institutions/index.astro` |
| Profile | `frontend/src/pages/institutions/[slug].astro` |

**Already modelled:** `nameBn`, `nameEn`, `slug`, `type` (public / private / madrasa / college),
`levelOffered` → `levels`, `district` → `districts`, `established`, `website`, `logo`, `address`,
`description`, `isVerified`. `ItemList` JSON-LD on the index, `CollegeOrUniversity`-shaped JSON-LD
on the profile, `anyone` read access.

**Missing for this request:** the 7-category navigation, faculties, departments, admission
information, tuition/fees, important links, a real contact block, a "last verified" date, and **any
link between an institution and the articles about it**.

---

## 2. The agreed model changes

| # | Decision | Choice |
|---|---|---|
| 1 | **Categories** | **Two axes.** Keep `type` (Public / Private / NU-affiliated college / Islamic-religious) and add a separate `discipline` (General / Engineering / Medical / Agricultural / …). BUET is then filed as *Public* **and** *Engineering* — which is how a student searches. A single exclusive category would have hidden BUET from "Public Universities". |
| 2 | **News linkage** | **Automatic.** Add a `university` relationship to `Articles`; the profile lists articles already linked to it, grouped by the article's own category (news / circular / result / notice). No second entry job, and publishing updates the profile. |
| 3 | **Profile fields** | **Hybrid + a verified date.** Faculties and departments structured; admission information, tuition/fees and important links as simple repeatable rows, with a visible **"সর্বশেষ যাচাই"** date per section. |

⚠️ **Why the verified date is not optional.** Fees and admission rules change every year, and a
wrong fee is not a cosmetic error — a student may act on it. A page that shows *when* the figure was
checked is honest; one that shows a three-year-old number with no date is not.

---

## 3. The data survey — measured, not assumed

Four candidate sources were fetched and inspected on 2026-09-30. This is what they actually contain.

| Source | Records | Bengali names | Licence | Usable fields |
|---|---|---|---|---|
| **Wikidata** (SPARQL) | **272 universities**, 1,283 higher-ed institutions | ✅ **271 / 272** universities; 880 higher-ed | **CC0** (public domain) | name (bn + en), official website (178/272), inception year (217/272), type |
| `bangladesh-education-datasets` (GitHub) | 216 universities | ❌ English only | Wikipedia-derived → **CC BY-SA 4.0** | name, acronym, established, location, division, specialization, wikipedia_url |
| **NU College Portal** (official) | **2,274** colleges (602 govt, 1,692 non-govt) | ❌ **0** | Government publication, no stated licence | college_code, name (ENGLISH UPPERCASE), email, portal URL — **no district, no division, no address, no phone** |
| UGC (ugc-universities.gov.bd) | official university lists | ❌ | Government publication | name only |

### 3.1 The findings that change the plan

1. ⚠️ **Bengali names are the binding constraint.** The site is Bengali-only. The NU college list
   gives **2,274 English uppercase names and not one Bengali name**, and no district field — the
   portal's own district filter is applied server-side and the data endpoint requires a CSRF token,
   so it is not a clean source. Wikidata has Bengali names for ~880 higher-education institutions,
   but that set overlaps the universities and covers only a minority of NU-affiliated colleges.
2. ⚠️ **`specialization` in the GitHub dataset cannot be used as-is.** Measured distribution:
   `General` 105, `STEM` 30, `Engineering` 10, `Agricultural Science` 5 **and** `Agricultural science`
   4 (two casings), `Medical` 5, then ~20 one-off values, and **25 nulls**. It needs normalising
   against a fixed list, not importing.
3. ⚠️ **The dataset includes non-institutions.** Its sections include *Proposed universities*,
   *International universities*, *Off-campus* and *Affiliate institutes*. Importing it whole would
   publish pages for universities that do not exist.
4. ⚠️ **The dataset is ~20 months stale** (`last_updated: 2025-01-27`), and the university count has
   already moved (216 there vs 272 in Wikidata).
5. ⚠️ **No source has any of the rich profile fields.** Faculties, departments, admission
   information, tuition/fees, important links and contact exist in **none** of them. They are
   per-institution editorial work, full stop.
6. ✅ **Wikidata is CC0** — no attribution or share-alike obligation, unlike the Wikipedia-derived
   file. Where the two disagree, **prefer Wikidata**, and take only *facts* from either (names,
   dates, locations are not copyrightable; prose is, and we will not copy any).

---

## 4. Scope options

### Option A — Two-tier (recommended)

- **Tier 1 — the listing, seeded.** Every institution we can source with a **Bengali name**, a
  type, a discipline and a location: **~271 universities** plus the higher-education institutions
  Wikidata carries with Bengali labels (**~880–1,200 total**). Each gets a real page: name (bn/en),
  type, discipline, district/division, established, website, logo where available, and its
  auto-linked articles.
- **Tier 2 — the rich profile, editorial.** Faculties, departments, admission information,
  tuition/fees, important links and contact, filled in per institution — **starting with the ~55
  public universities**, with a "last verified" date.

**Why this is the recommendation:** it delivers the full directory surface (the SEO value, and what
students actually search) for every institution we can *name in Bengali*, without publishing 2,274
English-named stub pages on a Bengali site or pretending a college has a "faculties" section.

### Option B — Universities only, deeply

The ~271 universities from Wikidata, each with the full rich profile over time. Smaller surface,
much higher average quality. **Choose this if quality per page matters more than breadth.**

### Option C — Full NU college listing as thin pages

All 2,274 NU colleges as code + English name + email + portal link, no Bengali names.
⚠️ **I advise against this.** It publishes 2,274 pages in a language the site does not use, which
is bad for readers and, on a Bengali-only site, a genuine SEO and quality risk. It would also
require scraping a government portal past a CSRF check to get district data.

### Option D — Wait for a Bengali college source

Build Option A now, and add NU colleges later if a Bengali source appears (a UGC/NU Bengali export,
or a bulk contribution). **This is Option A with an explicit follow-up, and is what I would do.**

---

## 5. Proposed section breakdown

Per the project's one-section-at-a-time rule. Each ends with evidence and an owner gate.

| Section | Scope | Gate |
|---|---|---|
| **S18** | Model: `type` + `discipline` axes, faculties, departments, admission, fees, links, contact, verified dates; the `university` relationship on `Articles`; access rules + `verify:access` extended | Typecheck, build, access matrix |
| **S19** | The import: a **repeatable, re-runnable** seed from Wikidata (CC0) with normalisation, de-duplication against the existing 5, and an explicit exclusion list for *proposed* / *international* entries. Never hand-edited data. | Import report: counts in, counts rejected and why, spot-checked |
| **S20** | Frontend: the 7-category navigation, filtered index, profile sections, article linkage, JSON-LD (`CollegeOrUniversity` + `ItemList`), sitemap | Build, links, Apache, JSON-LD validation |
| **S21** | Tier-2 authoring: the admin experience for filling a rich profile, plus the first ~10 public universities | Owner review of real pages |

⚠️ **S19 is a seed, not a scrape.** One Wikidata SPARQL query, re-runnable, no per-page requests, no
CSRF workaround. If a future refresh is wanted it re-runs the same query — which is also how the
data stays current instead of ageing like the GitHub file.

---

## 6. Open decisions

1. **Which scope** — A (two-tier), B (universities only, deep), C (thin NU colleges, advised
   against), or D (A now, NU later). **This blocks S18.**
2. **NU-affiliated colleges** — do they need their own `type`, given they have no faculties and
   their profiles are inherently thin? (Proposed: yes, `type: 'nu-college'`, with the profile
   sections that do not apply hidden rather than empty.)
3. **Logo** — Wikidata has few. Do we want logos at all at Tier 1, or leave them to Tier 2?
4. **`isVerified`** — what does it mean now that data is imported? (Proposed: *verified* = a human
   has checked it, and imported rows start **unverified**, so the badge keeps its meaning.)
5. **Fees** — display a figure, a range, or a link to the university's own fee page? (Proposed:
   a range plus a link and a date; a single precise figure implies an accuracy we cannot maintain.)

---

## 7. What I will NOT do without a decision

- Import the GitHub dataset wholesale — it is English-only, licence-encumbered relative to
  Wikidata, stale, and includes proposed universities.
- Scrape the NU portal past its CSRF check for district data.
- Publish English-named pages on a Bengali-only site.
- Guess a fee, a faculty list or a department list for any institution.
