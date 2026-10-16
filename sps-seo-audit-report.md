# SPS SEO Technical Audit Report

> ⚠️ **Read the banner before quoting the F grade.** This is the raw
> `sps-seo` engine output from 2026-10-16T02:57Z, and — like the 2026-10-15
> run it supersedes (commit `28c8368`, engine 30/100 "generic") — the grade is
> a framework-detection artefact: the report itself says `Detected Framework:
> Universal / Generic Web`. It is a snapshot of static heuristics, **not** a
> measurement of the live site. The authoritative SEO state remains the CI
> gate: 100/100 per template (see T-21, commits `ab4b649`, `347dc44`). Kept
> for the audit trail; treat the per-category notes below as leads to check,
> not as fail verdicts.

> ℹ️ Engine dump follows, unmodified.

**Generated:** 2026-10-16T02:57:01.788Z  
**Detected Framework:** `Universal / Generic Web`  
**Overall Score:** **29/100** (Grade: **F**)  

---

## 1. Score Summary

| Category | Score | Max Points | Status |
| :--- | :--- | :--- | :--- |
| **Technical & Crawlability** | `2` | 25 | ⚠️ Attention Needed |
| **Meta Tags & Social Previews** | `9` | 25 | ⚠️ Attention Needed |
| **Semantic Hierarchy (H1-H6)** | `8` | 25 | ⚠️ Attention Needed |
| **Schema & AI Readiness (AEO)** | `10` | 25 | ⚠️ Attention Needed |
| **TOTAL** | **`29`** | **100** | **Grade: F** |

---

## 2. Technical & Crawlability Audit
- **robots.txt:** ❌ Missing (Priority: High)
- **sitemap.xml:** ❌ Missing (Priority: High)
- **SPS SEO Config:** ✅ Present

---

## 3. Metadata & Social Previews
- **Title Tag:** ✅ Configured
- **Meta Description:** ✅ Configured
- **Canonical URL:** ⚠️ Missing
- **OpenGraph Tags:** ✅ Configured
- **Twitter Card:** ✅ Configured

---

## 4. Semantic Hierarchy & Image Alt Attributes
- **H1 Tag Violations:** ❌ 28 pages with multiple or zero H1 tags
- **Skipped Heading Levels:** ⚠️ 1 skipped levels (e.g. H1 to H3)
- **Images Scanned:** 63
- **Images Missing Alt:** ❌ 47 images missing alt text

---

## 5. Schema.org & AI Engine Optimization (GEO/AEO)
- **JSON-LD Rich Snippets:** ✅ Present
- **llms.txt AI Index:** ⚠️ Missing (Recommended for ChatGPT / Perplexity / Claude)

---
## 6. Worst-Offender Pages (Priority Fixes)

| Page | Issues |
| :--- | :--- |
| `.lighthouseci/lhr-1792108939917.html` | missing description, thin content (9 words) |
| `.lighthouseci/lhr-1792108951770.html` | missing description, thin content (9 words) |
| `.lighthouseci/lhr-1792108963532.html` | missing description, thin content (9 words) |
| `cms/src/app/(frontend)/page.tsx` | 2 H1 tags, thin content (96 words) |
| `frontend/src/components/KeyTakeaways.astro` | zero H1, thin content (106 words) |
| `frontend/src/pages/reporters/[slug].astro` | 2 H1 tags, 1 missing alt |
| `.agents/skills/neon/references/auth.md` | thin content (74 words) |
| `.agents/skills/neon/references/parse-env.md` | thin content (114 words) |
| `.agents/skills/neon/references/sdk.md` | thin content (82 words) |
| `.sps/handoff.md` | 9 missing alt |

---


## 6. Actionable Remediation Plan
1. **Framework Adapter:** Apply [adapters/universal-fallback.md](file:///Volumes/SSD/CODES/NewsPortal/adapters/universal-fallback.md) for idiomatic metadata injection.
2. **JSON-LD Schema:** Inject appropriate templates from `schemas/` into the root layout.
3. **Alt Attributes:** Add descriptive, contextual alt attributes to all flagged images.
4. **Crawlability:** Generate `sitemap.xml` and `robots.txt` using `npm run sitemap`.
5. **AI Search:** Generate `llms.txt` using the SPS SEO AEO guideline.
