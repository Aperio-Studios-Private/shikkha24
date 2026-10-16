> ⚠️ **SUPERSEDED — do not act on the 30/100 score below.** This report was generated
> 2026-10-15 by the `sps-seo` audit engine, which reported `Universal / Generic Web`
> as the framework — it did not recognise Astro, so it under-scored the site. Live
> measurement contradicts it on every point that matters: Lighthouse **SEO = 100** on
> `/`, `/latest/` and the article template (2026-10-16); the homepage emits JSON-LD,
> a canonical, and a correct Bengali `<title>`; `/sitemap.xml` (63 URLs),
> `/news-sitemap.xml` (6 URLs) and `/llms.txt` all return 200, and `/faq` emits
> FAQPage. Kept only as a record of what the engine said at the time.

# SPS SEO Technical Audit Report

**Generated:** 2026-10-15T21:17:13.078Z  
**Detected Framework:** `Universal / Generic Web`  
**Overall Score:** **30/100** (Grade: **F**)  

---

## 1. Score Summary

| Category | Score | Max Points | Status |
| :--- | :--- | :--- | :--- |
| **Technical & Crawlability** | `0` | 25 | ⚠️ Attention Needed |
| **Meta Tags & Social Previews** | `9` | 25 | ⚠️ Attention Needed |
| **Semantic Hierarchy (H1-H6)** | `10` | 25 | ⚠️ Attention Needed |
| **Schema & AI Readiness (AEO)** | `11` | 25 | ⚠️ Attention Needed |
| **TOTAL** | **`30`** | **100** | **Grade: F** |

---

## 2. Technical & Crawlability Audit
- **robots.txt:** ❌ Missing (Priority: High)
- **sitemap.xml:** ❌ Missing (Priority: High)
- **SPS SEO Config:** ⚠️ Missing (`sps-seo-config.json`)

---

## 3. Metadata & Social Previews
- **Title Tag:** ✅ Configured
- **Meta Description:** ✅ Configured
- **Canonical URL:** ⚠️ Missing
- **OpenGraph Tags:** ✅ Configured
- **Twitter Card:** ✅ Configured

---

## 4. Semantic Hierarchy & Image Alt Attributes
- **H1 Tag Violations:** ❌ 29 pages with multiple or zero H1 tags
- **Skipped Heading Levels:** ✅ None
- **Images Scanned:** 47
- **Images Missing Alt:** ❌ 30 images missing alt text

---

## 5. Schema.org & AI Engine Optimization (GEO/AEO)
- **JSON-LD Rich Snippets:** ✅ Present
- **llms.txt AI Index:** ⚠️ Missing (Recommended for ChatGPT / Perplexity / Claude)

---
## 6. Worst-Offender Pages (Priority Fixes)

| Page | Issues |
| :--- | :--- |
| `.lighthouseci/lhr-1791555198025.html` | missing description, thin content (9 words) |
| `.lighthouseci/lhr-1791555212016.html` | missing description, thin content (9 words) |
| `.lighthouseci/lhr-1791555226170.html` | missing description, thin content (9 words) |
| `.lighthouseci/lhr-1791555238965.html` | missing description, thin content (9 words) |
| `.lighthouseci/lhr-1791555252765.html` | missing description, thin content (9 words) |
| `.lighthouseci/lhr-1791555265709.html` | missing description, thin content (9 words) |
| `.lighthouseci/lhr-1791555279166.html` | missing description, thin content (9 words) |
| `.lighthouseci/lhr-1791555295512.html` | missing description, thin content (9 words) |
| `.lighthouseci/lhr-1791555307891.html` | missing description, thin content (9 words) |
| `cms/src/app/(frontend)/page.tsx` | 2 H1 tags, thin content (96 words) |

---


## 6. Actionable Remediation Plan
1. **Framework Adapter:** Apply [adapters/universal-fallback.md](file:///Volumes/SSD/CODES/NewsPortal/adapters/universal-fallback.md) for idiomatic metadata injection.
2. **JSON-LD Schema:** Inject appropriate templates from `schemas/` into the root layout.
3. **Alt Attributes:** Add descriptive, contextual alt attributes to all flagged images.
4. **Crawlability:** Generate `sitemap.xml` and `robots.txt` using `npm run sitemap`.
5. **AI Search:** Generate `llms.txt` using the SPS SEO AEO guideline.
