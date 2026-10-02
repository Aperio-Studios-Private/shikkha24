# University Directory — specification

**Status:** ✅ **APPROVED 2026-09-30** — scope and model decided (§6). ✅ **S18, S19 and S20 BUILT**; S21's admin experience is built and its **authoring is owner work** (§0).
**Requested:** 2026-09-30 · **Supersedes:** the N4 "institution directory" starter set (S10)

---

## 0. Where this stands — read this first

✅ **S18 (the model), S19 (the import) and S20 (the frontend) are built.** S21's admin experience is
built; its **authoring half is owner work**, because every remaining field is one no source carries.
The section plan and the exact field list are in `.sps/task.md` → "S18–S21".

**What shipped:** the two-axis model · a re-runnable Wikidata import (CC0, one query) that created
**724 institutions** and rejected 216 with named reasons · profile sections with a mandatory
**সর্বশেষ যাচাই** date on every fee · the news linkage · JSON-LD · a hub whose categories are filters
over the two axes.

⚠️ **Two findings that changed what could be built:**

1. **Wikidata carries no discipline.** 706 of the 724 imported rows have none, so §2.1's
   "seven browse categories, each a filter over the two axes" could not be built as written — a
   discipline-based navigation would have had four categories holding 0–7 entries. The owner chose
   **"best practice"**, so the nav is the ownership axis (4 populated categories) with the discipline
   axis as a second filter row that appears only where it has data.
2. **The seven categories are never named**, here or anywhere else. §2.1 gives the *shape* (a filter
   over an axis) and one example each, not a list. If a specific list existed in the original
   request, it is not in the repository.

⚠️ **A third of §2.1's promise is still unrealised, and it is not a code problem.** "Engineering =
`discipline:engineering`" needs someone to fill `discipline` in. Until S21 does, the engineering
browse path is a filter with 7 entries.

### ⚠️ The earlier "hung schema push" was misdiagnosed — read before blaming the database

S18 was started on 2026-09-30 and reverted when the **Payload schema push appeared to hang** (4+
minutes, twice, including after clearing the WAL). **The push was never the problem.**
`pnpm run` in that environment triggers pnpm 11's pre-run dependency check, which shells out to
`pnpm install` — and that either failed with `CODEBUDDY_BROKER_DENY EEXIST` or **hung indefinitely**
(10 minutes observed). Running the Payload CLI **directly**, with the dependency check disabled,
completes the push in seconds.

Two separate things were being conflated, and they have different triggers:

| Failure | Trigger | Fix |
|---|---|---|
| `pnpm install` hangs / `EEXIST` | **any** `pnpm run` in this sandbox | run the Payload CLI directly with `--config.verify-deps-before-run=false` |
| `index … already exists` (drizzle) | a **pre-existing** DB whose schema predates the change | drop the named index and retry, until it converges |

⚠️ **A fresh database pushes cleanly and is idempotent** (verified by booting one twice), so CI —
which seeds a fresh `ci.db` — was never at risk. Only an existing archive needs the iterate-and-retry
treatment.

Everything below is the design. §1–§7 are complete and approved; §2 is now implemented.

---

> ⚠️ **Read §3 before §4.** The data survey found that the originally requested scope — *"full
> listing including all NU colleges"* — is **not fully achievable**, for a reason specific to this
> site: **the site is Bengali-only, and the NU college list exists only in English.** The numbers are
> below, and §6 records the scope that was chosen instead.

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
5. ⚠️ **Faculties and departments ARE partly sourced — measured 2026-10-01, correcting this
   document's earlier claim.** Wikidata carries `P527` (has part) for **64** of the 940 BD
   higher-education items, and of those parts **58 are typed `faculty`, 41 with a Bengali label**,
   holding **179 Bengali-labelled departments**. That is not "no source" — it is thin, uneven coverage
   concentrated in the large public universities (Dhaka 12 faculties, Rajshahi 10, BUET 5), which is
   exactly where the worked example starts. **S19 imports it.**
   Admission information, tuition/fees, important links and a real contact block remain in **no**
   source. Those are per-institution editorial work, full stop.
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

## 6. Decisions taken (2026-09-30)

| # | Question | Decision |
|---|---|---|
| 1 | **Scope** | ✅ **Option A — two-tier.** Seed every institution with a Bengali name (~271 universities + Wikidata's higher-ed set), then build the rich profile editorially starting with the ~55 public universities. |
| 2 | **NU-affiliated colleges** | `type: 'nu-college'`, with profile sections that do not apply **hidden rather than empty** — a college has no faculty list. |
| 3 | **Logo at Tier 1** | Leave to Tier 2. Wikidata's logo coverage is thin, and a missing logo is better than a wrong one. |
| 4 | **`isVerified`** | ✅ **Imported rows start unverified.** The badge keeps meaning *"a person checked this"* — which is the only claim worth making on a directory students act on. |
| 5 | **Fees** | ✅ **Exact figure per programme**, structured (programme + amount + period + academic year + source link + verified date). |

⚠️ **The fee decision carries a known risk and it is being accepted deliberately.** An exact figure
is the most useful thing a student can see when comparing universities, and it is also the thing that
goes wrong first: universities revise fees, and a stale number is worse than no number because it
looks authoritative. The mitigations are therefore **not optional**:

- the **"সর্বশেষ যাচাই" date renders next to every fee**, always — never a bare figure;
- a **source link** field points at the university's own fee page, so a reader can confirm;
- the **academic year** is part of the row, so a 2026 figure is visibly a 2026 figure;
- a fee row **cannot be saved without a date**, enforced in the collection, so the safeguard cannot
  be skipped by a hurried editor.

---

## 7. What I will NOT do without a decision

- Import the GitHub dataset wholesale — it is English-only, licence-encumbered relative to
  Wikidata, stale, and includes proposed universities.
- Scrape the NU portal past its CSRF check for district data.
- Publish English-named pages on a Bengali-only site.
- Guess a fee, a faculty list or a department list for any institution. **Importing a sourced list is
  not guessing** — see §8 — but filling in a gap from the institution's *name* is, and it is wrong
  (§8.2).

---

## 8. What the source actually carries — measured 2026-10-01, and the decisions that followed

Written after the import ran, because three things this document asserted or assumed turned out to be
false once there was data to check them against.

### 8.1 Faculties and departments are partly sourced (§3.1.5 corrected)

Wikidata's `P527` (has part) covers **64** of the 940 BD higher-education items. Of those parts,
**58 are typed `faculty` (41 with a Bengali label)** and they carry **179 Bengali-labelled
departments**. Coverage is thin and concentrated: Dhaka 12 faculties, Rajshahi 10, Chittagong 10,
BUET 5, Agricultural 6, Barishal 6.

**Decision: the import takes them.** They are facts from a CC0 source, they carry Bengali names, and
they land exactly where the worked example starts. ⚠️ They arrive **partial** — Dhaka has more than
12 faculties — so they are imported **unverified**, and the profile page says so (§8.3).

### 8.2 `discipline` is author-only, and the obvious automation is provably wrong

This is the feature's largest remaining gap: **706 of 724 imported rows have no `discipline`**, so
§2.1's "Engineering = `discipline:engineering`" browse path is a filter with 7 entries.

Two automations were tested and **both were rejected on the evidence**:

- **From the institution's name.** A conservative keyword rule (`মেডিকেল` → medical, `প্রকৌশল` /
  `ইঞ্জিনিয়ারিং` / `টেকনোলজি` → engineering, `কৃষি` → agricultural, …) would classify 77 more rows —
  and it files **বাংলাদেশ ইউনিভার্সিটি অব বিজনেস অ্যান্ড টেকনোলজি** (a *business* university) as
  engineering, and **ইসলামিয়া কলেজ** (a general degree college) as Islamic. It is wrong for exactly
  the institutions whose names carry two subjects.
- **From the institution's own faculties.** A university with a Faculty of Engineering is not an
  engineering university — Dhaka has one. Deriving `discipline` from parts would file Dhaka as
  engineering.

`discipline` answers *what an institution primarily is*, and **no source states that**. It is a
judgement, so it stays with the editor. The nav is built to survive its absence (§8.4).

### 8.3 Unverified rows now say so on the page

`isVerified` previously only added a ✓ when true, which made its absence ambiguous — a reader could
not tell "checked" from "never looked at". Every unverified profile now prints **যাচাই করা হয়নি** in
the same badge row, so an imported partial faculty list cannot pass for a checked one.

### 8.4 The navigation is filters over the two axes, on the hub

§2.1 asks for "the 7-category navigation, each a filter over the two axes". ⚠️ **The seven are never
enumerated — not here, not anywhere in the repository.** §2.1 gives the *shape* and one example per
axis, not a list. Asked directly, the owner chose **"best practice"**.

The data then ruled out the obvious reading: with 706 of 724 rows lacking a discipline, a
discipline-based navigation would have had four categories holding **0–7 entries** each.

**Decision:** the nav is the **ownership axis** — four categories, all populated
(সরকারি 56 · বেসরকারি 112 · জাতীয় বিশ্ববিদ্যালয় অধিভুক্ত কলেজ 554 · মাদ্রাসা 3) — plus a
**discipline filter row that renders only where it has data**. A filter matching nothing is honest; a
nav category matching nothing is a dead end.

The categories are **filters on `/institutions`, not separate routes**, and that is a CSP constraint
rather than a preference: `.htaccess` tags *any* three-segment path `SHIKKHA24_CSP_ARTICLE`, which
grants video framing a listing has no use for, and the file forbids fixing that with an enumeration of
reserved roots (`/study-abroad` is the cautionary tale). `/institutions/<type>` would also collide
with `/institutions/[slug]`.

⚠️ **If the original request had a specific list of seven, it is not in the repository and should be
written here.**
