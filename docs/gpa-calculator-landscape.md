# GPA / CGPA calculator landscape — and where ours sits

**Created:** 2026-09-28 · **Status:** ✅ research complete **and both calculators built and live** at `/gpa` and `/cgpa`. *(Corrected 2026-10-04 — this line previously said "no build commitments made".)*
**Question it answers:** what grade-calculation tools already exist for Bangladeshi and
international students, which of them are genuinely useful, and how do `/gpa` and `/cgpa`
compare?

> ⚠️ **Method and its limits.** Every system below was found through web search; the
> Bangladeshi and Indian ones marked *(read)* were fetched and read in full, the rest are
> described from search results and their own page summaries. Nothing here was tested
> hands-on. Where a figure is load-bearing — a grading boundary, a pass mark — it was taken
> from the institution, not from the tool (see §5). Re-verify before quoting any of it.

---

## 1. Why this matters for positioning

Bangladesh runs **two different grade-point systems**, and almost every tool on the market
covers one or the other:

| Level | Scale | A+ | Pass mark | An F |
|---|---|---|---|---|
| SSC / HSC (school-leaving) | 5.00 | 5.00 | 33% | **zeroes the whole result** |
| University (UGC / NU) | 4.00 | 4.00 | 40% | **included as 0.00** |
| University (private, `+/-` variant) | 4.00 | 4.00 | 60% | included as 0.00 |

The two most valuable things this study found are both about that table: **very few tools
cover both systems**, and **the university table is not one table** — private universities
use different boundaries, and at least one widely-linked third-party calculator gets them
wrong (§5).

---

## 2. Bangladesh

| Name | What it calculates | How it benefits students |
|---|---|---|
| **nucgpa.com** | NU Honours/BBA/BSS CGPA, **per department, with every course and credit hour pre-loaded** from the 2024–2025 syllabus *(read)* | Removes the single biggest friction: no typing 30+ course rows. A student picks their department and enters grades only. Also explains the system in plain language — the source explicitly notes that colleges hand out no key. |
| **gpacalculatebd.com** | NU grading explainer + Honours and Degree CGPA calculators *(read)* | The clearest published statement of the NU table and promotion policy found in this study — it documents the class/division bands and the retake rules alongside the calculator. |
| **students.bd** | Separate calculators for NU, IUB, NSU, HSC and a generic CGPA tool; advertises a **"Target Analyzer"** and a **retake analyzer** | The broadest university coverage found in one place, and the only BD site seen offering a target/what-if mode. |
| **banglatools.com** | SSC GPA from **marks or letter grades**, with **combined 200-mark Bangla/English**, and **shows the result with and without the 4th subject** *(read)* | The most careful SSC tool found. Handling the 200-mark papers matters — it is the difference between accepting a real marksheet and rejecting it — and the side-by-side 4th-subject comparison answers the question students actually ask. |
| **hscgpacalculator.com** | HSC GPA with group (Science/Business/Humanities) and elective selection, 4th-subject selector *(read)* | Group-aware subject lists, so a student does not have to work out which subjects their programme includes. |
| **gradecalculators.org** | SSC GPA on the 5.00 scale, plus a Bangladesh 4.00 page *(read)* | Two things done well: it states the formula explicitly rather than only showing a result, and it names the failures people actually make (an F in the 4th subject does *not* zero the result). |
| **calculatox.com · cgpacalculation.store · jcalculator.com** | NU CGPA; UGC-scale CGPA for "50+ universities"; generic CGPA | Volume coverage of universities, useful mainly as a second opinion. |
| **nsuer.club** | NSU-only CGPA calculator, club-run *(read: search summary)* | Narrow but authoritative-ish: a student society publishing the tool its own members need. |
| **knidox.com** | A **converter** — percentage → UGC letter grade and grade point *(read)* | Not a calculator, and unusually honest about the distinction between the two BD scales. Its guidance on *how to report* a BD CGPA abroad ("quote it as it stands and state the maximum") is better than most calculators' entire content. |

**Not calculators, but the systems students actually verify against:** the official board
result portals (`educationboardresults.gov.bd`) and university result portals. These publish
results; they do not compute or explain. That gap is the whole reason the third-party tools
exist.

---

## 3. International

| Name | Region | What it calculates | How it benefits students |
|---|---|---|---|
| **India: VTU / Anna / Mumbai / CBSE / KTU / GTU / DU / RGPV presets** — e.g. `ezecalculators.com`, `cgpa-calculator.net`, `studenttoolkit.online` *(ezecalculators read)* | India | Subject-wise credit-weighted **SGPA and CGPA**, plus **per-university percentage conversion** using each university's own formula (CBSE ×9.5; Mumbai 7.1×CGPA+11; VTU (CGPA−0.75)×10 …) | Two features worth naming. **Percentage conversion is university-specific and formula-driven** — Indian employers and universities ask for a percentage, and there is no single correct multiplier. And the **previous-CGPA merge** ("I already have a CGPA over N credits; add this semester") turns a semester tool into a degree-long one. |
| **Target / "what do I need" calculators** — `gpacal.com`, `studentgpa.com`, `smartgradecalculator.com` *(gpacal read)* | US / global | The GPA required on **remaining** credits to hit a target: `GPA needed = (Target − Current × weightCurrent) ÷ weightFuture` | The genuinely useful idea here is that it can say a target is **impossible** — its worked example computes a required 4.85 on a 4.00 scale and tells the student to aim lower instead. That is advice, not just arithmetic, and it is the difference between a calculator and a planning tool. |
| **Weighted vs unweighted GPA** — `calcilo.com`, `gpacalculators.net`, `gradebookcalculator.com` | US | High-school GPA both ways, with AP / Honors / IB / dual-enrolment weighting | Solves a US-specific problem (course rigour changes the weight). Not transferable to Bangladesh, where the weighting is by credit hours, not by course difficulty. |
| **WES** | US / Canada | **Official** credential evaluation — converts international transcripts to a US 4.00 GPA for admissions, immigration and employment | The authoritative conversion for a Bangladeshi student applying abroad. Paid, and the evaluation is the product; the "WES GPA calculator" pages are third-party imitations, not WES. |
| **ECE** | US | Official credential evaluation, similar role | Alternative to WES where an institution specifies it. |
| **Scholaro** | US / global | Credential evaluation **plus a public country grading-system database and an instant GPA calculator** *(read)* | The country database is the useful public part: it documents each country's scales so a student can see how their own result is read abroad. |
| **iienstitu.com, admissionarena.com** | Turkey / global | Multi-scale GPA conversion (4.0 / 1–5 / 100% / 0–10) and WES-style conversion | Useful for the "what does my grade look like on another country's scale" question, which is a different question from "what is my GPA". |

---

## 4. What is genuinely useful — and what is not

### Worth adopting

1. **Previous-record merge.** Enter an existing CGPA and completed credits, then add this
   semester and get the updated cumulative. India's tools do this; most Bangladeshi ones do
   not. Cheap to build, and it is what a student in their third semester actually needs.
2. **Target GPA / "what do I need".** Cheap, high value, and it can say *impossible* — which
   is the most useful sentence such a tool can produce.
3. **"With and without the 4th subject" side by side.** `banglatools.com` does this for SSC.
   It directly answers the question the 4th-subject rule creates, and we already have both
   numbers in hand.
4. **Pre-loaded course and credit data per department** (`nucgpa.com`). This is the single
   strongest differentiator found anywhere in this study — it eliminates the data entry that
   makes every other CGPA calculator tedious. ⚠️ It is also the only one with an ongoing
   maintenance cost: it needs a syllabus source per programme and must be updated when
   curricula change. **Not worth starting without an explicit decision.**
5. **Class/division output and the retake/improvement rule.** `nucgpa.com` and
   `gpacalculatebd.com` both explain that an improvement exam **replaces** the grade rather
   than averaging it. Students act on this, and getting it wrong changes a decision.

### Popular but not worth copying

- **Per-university percentage conversion (the Indian model).** In India this is essential
  because employers ask for a percentage and each university defines its own formula. In
  Bangladesh it is **not needed**: the university CGPA is already on a 4.00 maximum, so it
  needs no conversion for an application abroad — the correct answer is "quote it as it is
  and state the scale", which is exactly what `knidox.com` says. Adding conversion presets
  here would be inventing a problem.
- **Weighted vs unweighted GPA.** A US concept (course rigour changes the weight). In
  Bangladesh the weight is credit hours, which both our calculators already handle.
- **Generic "50+ universities" coverage.** Volume without verification. A calculator that is
  confidently wrong for a student's university is worse than one that admits it covers two.

### Anti-patterns observed — the reasons ours can be better

- **A single scale asserted for every university.** The most common defect. One source in
  this study said plainly that BD universities "may vary by institution".
- **No working shown.** A result with no formula and no intermediate numbers makes a wrong
  answer indistinguishable from a right one. Several tools do this.
- **Ad-heavy, thin pages.** The calculators that rank highest are frequently the slowest,
  which matters on the mobile connections a large share of Bangladeshi students are on.
- **Third-party tools wrong on regulations** — see §5. This is the most important finding.

---

## 5. ⚠️ The finding that should shape our positioning

**Third-party calculators are not authorities on someone else's regulations, and at least one
of them is demonstrably wrong.**

While verifying the private-university scale, a third-party calculator placed **A at 95
marks**. North South University's **own published grading policy** says **93**. A student
trusting the third-party tool would mis-grade every mark between 93 and 94.

The same study found the reverse elsewhere: one NU grading page carries a caveat that "a small
number of departments and older (pre-2013) syllabuses apply slightly different boundaries",
which is honest — and is exactly the kind of caveat a calculator that hardcodes one table
cannot make.

**This is the positioning.** Not "more features" — **verifiable correctness**:

| | Typical third-party tool | `/gpa` and `/cgpa` |
|---|---|---|
| Where the rules come from | Unstated | Named in the page, per scale, and asserted by a test |
| Grading boundaries | One table, sometimes wrong | Two verified presets; the source is printed next to the scale |
| The F rule | Often the school rule applied to a university CGPA | School and university rules kept apart, each asserted |
| Correctness evidence | None visible | `verify:gpa` and `verify:cgpa`, 60+ checks each, with the published worked examples reproduced |
| Ads and weight | Frequently heavy | None; static page, no third-party request until a calculation is run |

That last row is not a slogan — it is the same zero-CLS, no-third-party-request discipline the
rest of the site is built on, and it is measurable on the page a student loads over 3G.

---

## 6. Where the two calculators sit

**`/gpa` — SSC / HSC (the 5.00 school scale).** Competes with `banglatools.com`,
`hscgpacalculator.com` and `gradecalculators.org`. Its edge is that the rules are **verified
and asserted** (the 4th-subject bonus is `max(0, GP − 2)`, an F in a compulsory subject is a
hard 0.00, and the letter grade is read off the point scale, not the marks scale — all three
were wrong in our own first version and are now counter-proved), it accepts **200-mark
combined Bangla and English**, and it shows the unrounded figure rather than hiding the
rounding convention.

**`/cgpa` — university (the 4.00 scale).** Competes with `gpacalculatebd.com`, `nucgpa.com`,
`students.bd` and `jcalculator.com`. Its edge is **two verified scales with their sources
named**, a correct treatment of a failed course (included as 0.00, credits still in the
denominator — *not* the school rule), and a per-term GPA breakdown alongside the cumulative
figure. Its **gap** against `nucgpa.com` is pre-loaded syllabi; its **gap** against the
Indian tools is the previous-CGPA merge and a target mode.

**Not competitors:** WES, ECE and Scholaro. Those are credential *evaluation* for study
abroad — a paid, official service that answers "how is my degree read elsewhere". A student
needs both, and pointing at them is more useful than trying to replace them.

---

## 7. Ranked opportunities (no commitment made)

| # | Opportunity | Cost | Why |
|---|---|---|---|
| 1 | **Previous-CGPA merge** on `/cgpa` | Small | Turns a one-semester tool into a degree-long one. Standard in India, rare in Bangladesh. |
| 2 | **Target GPA / "what do I need"** | Small | Can say a target is impossible, which is the most useful output available. |
| 3 | **"With and without the 4th subject"** on `/gpa` | Small | Answers the question the rule creates, from numbers already computed. |
| 4 | **Retake/improvement explanation** on `/cgpa` | Small | The rule is counter-intuitive (the new grade *replaces* the old) and students act on it. |
| 5 | **Pre-loaded syllabi per department** | Large, ongoing | The strongest differentiator found — and the only one with a maintenance cost. Needs an owner decision and a syllabus source. |

⚠️ Deliberately **not** recommended: per-university percentage conversion (§4).

---

## 8. Sources

Fetched and read in full: `gpacalculatebd.com`, `nucgpa.com`, `banglatools.com`,
`students.bd`, `hscgpacalculator.com`, `gradecalculators.org`, `knidox.com`,
`northsouth.edu` (the university's own grading policy — the authority for the NSU scale),
`ezecalculators.com`, `gpacal.com`.
Identified from search results: the remaining tools in §2 and §3, and `wes.org`,
`scholaro.com`, `ece.org`.
