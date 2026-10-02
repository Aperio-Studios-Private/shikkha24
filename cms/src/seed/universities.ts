import type { Payload } from 'payload'

import type { InstitutionDiscipline, InstitutionType } from '../lib/institution-options'

/**
 * The Wikidata import — S19.
 *
 * ## One query, not a scrape
 *
 * `docs/university-directory.md` §5 requires a **re-runnable** seed built on a
 * single Wikidata SPARQL query. That is a licence decision as much as a
 * technical one: Wikidata is **CC0**, so there is no attribution or share-alike
 * obligation, unlike the Wikipedia-derived GitHub dataset the survey rejected.
 * Nothing here fetches a page, follows a link, or works around a CSRF token.
 *
 * Re-running it is the refresh mechanism — the same query returns newer data, so
 * the directory ages by neglect rather than by design.
 *
 * ## Why the candidate set is narrower than "all higher education"
 *
 * Walking `wdt:P31/wdt:P279* wd:Q38723` (higher-education institution) returns
 * **1,283** items and includes 52 government girls' high schools, 44 schools and
 * 14 cadet colleges. Publishing those would put secondary schools in a university
 * directory — the same class of error the survey flagged in the GitHub dataset.
 * So the set is `university` + `college` subclasses, and everything that is also
 * a school is rejected by name below.
 *
 * ## Why some real institutions are rejected
 *
 * `type` is required, and it is **not guessed**. Where Wikidata does not state
 * ownership — the ~39 items whose only class is a bare `university`, and the 44
 * `polytechnic institute`s — the row is rejected and counted, not defaulted.
 * The owner fills those by hand in S21. A wrong `type` on a directory students
 * act on is worse than a missing row.
 */
const ENDPOINT = 'https://query.wikidata.org/sparql'

/**
 * Wikidata asks for a descriptive User-Agent and will throttle anonymous bulk
 * traffic without one. The contact is the site itself — there is no secret here.
 */
const USER_AGENT = 'Shikkha24-directory-import/1.0 (https://shikkha24.com)'

/** The one query. `?adminBn`/`?parentAdminBn` are the district and its parent. */
export const WIKIDATA_QUERY = `
SELECT ?u ?bn ?en ?website ?inception ?p31Label ?adminBn ?parentAdminBn ?facultyBn ?deptBn WHERE {
  { ?u wdt:P31/wdt:P279* wd:Q3918 . } UNION { ?u wdt:P31 wd:Q189004 . }
  ?u wdt:P17 wd:Q902 .
  OPTIONAL { ?u rdfs:label ?bn . FILTER(lang(?bn) = "bn") }
  OPTIONAL { ?u rdfs:label ?en . FILTER(lang(?en) = "en") }
  OPTIONAL { ?u wdt:P856 ?website . }
  OPTIONAL { ?u wdt:P571 ?inception . }
  OPTIONAL { ?u wdt:P31 ?p31 . OPTIONAL { ?p31 rdfs:label ?p31Label . FILTER(lang(?p31Label) = "en") } }
  OPTIONAL {
    ?u wdt:P131 ?admin .
    OPTIONAL { ?admin rdfs:label ?adminBn . FILTER(lang(?adminBn) = "bn") }
    OPTIONAL {
      ?admin wdt:P131 ?parentAdmin .
      OPTIONAL { ?parentAdmin rdfs:label ?parentAdminBn . FILTER(lang(?parentAdminBn) = "bn") }
    }
  }
  OPTIONAL {
    ?u wdt:P527 ?faculty .
    ?faculty wdt:P31/wdt:P279* wd:Q180958 .
    ?faculty rdfs:label ?facultyBn . FILTER(lang(?facultyBn) = "bn")
    OPTIONAL {
      ?faculty wdt:P527 ?dept .
      ?dept rdfs:label ?deptBn . FILTER(lang(?deptBn) = "bn")
    }
  }
}`.trim()

/**
 * Genuine education-**level** signals: the item is a school, whatever else it is.
 *
 * A BD `college` is often *also* a `school` in Wikidata (St Gregory's is
 * `college` + `high school`), so these reject **before** any include rule — an
 * item that is both is a school.
 */
const SCHOOL_CLASSES = new Set([
  'school',
  'high school',
  'secondary school',
  'higher secondary school',
  'primary school',
  'public school',
  'cadet college',
])

/**
 * Classes that describe something other than an institution. Wikidata applies
 * them loosely, so they reject a candidate **only when nothing else identifies
 * it as higher education** — see the order in `rejectionReason`.
 *
 * ⚠️ This split is not tidiness. **University of Rajshahi is tagged
 * `open-access publisher`** alongside `public university`, and while these sat in
 * one set the publisher tag won and **a major public university was dropped from
 * the directory**. The check order was the bug, not the class list.
 */
const WEAK_CLASSES = new Set([
  'academic institution',
  'educational institution',
  'private educational institution',
  'faculty',
  'staff college',
  'open-access publisher',
])

/** Classes for things that do not exist or are outside the country's system. */
const OUT_OF_SCOPE = new Set(['proposed entity', 'proposed university', 'international university'])

/**
 * Ownership, from the item's own classes. First match wins.
 *
 * ⚠️ A bare `university` is deliberately absent: it says nothing about who runs
 * the institution, and Bangladesh has both public and private ones.
 */
const TYPE_RULES: Array<[string[], InstitutionType]> = [
  [['private university'], 'private'],
  [
    [
      'public university',
      'national university',
      'ministry-owned university',
      'public research university',
      'autonomous university',
      'distance education university',
      'maritime university',
      'ground forces university',
    ],
    'public',
  ],
  // A BD "college" is an affiliated degree college — the National University case
  // this type exists for. `docs/university-directory.md` §6.2.
  [['college', 'constituent college', 'collegiate university'], 'nu-college'],
  [['madrasa', 'Alia Madrasa', 'Qawmi Madrasa'], 'madrasa'],
]

/** Subject, from the item's own classes. Unmatched stays null — never guessed. */
const DISCIPLINE_RULES: Array<[string[], InstitutionDiscipline]> = [
  [
    [
      'University of Engineering & Technology',
      'university of technology',
      'polytechnic',
      'polytechnic institute',
      'engineering school',
    ],
    'engineering',
  ],
  [['medical university', 'medical school'], 'medical'],
  [['Islamic university', 'madrasa', 'Alia Madrasa', 'Qawmi Madrasa'], 'islamic'],
]

/** Wikidata appends the administrative level to a place name; ours does not. */
const ADMIN_SUFFIXES = [' জেলা', ' সদর উপজেলা', ' উপজেলা', ' সিটি কর্পোরেশন', ' পৌরসভা']

/**
 * ⚠️ **A BD "School and College" is classed by Wikidata as a bare `college`**, so
 * the class list cannot separate it from a degree college — 40 such rows came
 * through before this check existed (`আই.পি.এইচ স্কুল এন্ড কলেজ`,
 * `খুলনা মডেল স্কুল এন্ড কলেজ`, …). They are secondary institutions and do not
 * belong in a university directory.
 *
 * ⚠️ The phrase must be the **full** `উচ্চ বিদ্যালয়`, never a bare `বিদ্যালয়`:
 * `বিশ্ববিদ্যালয়` (university) contains it, and a bare check would delete the
 * entire university listing.
 */
const SCHOOL_NAME = /স্কুল|উচ্চ বিদ্যালয়/

/**
 * The demo-content marker, as `seed/demo-purge.ts` defines it: a `demo-` slug is
 * throwaway content and the purge deletes it by that pattern.
 *
 * ⚠️ Repeated here rather than imported because `demo-purge.ts` is a script with
 * top-level side effects — importing its constant would run the purge.
 */
const DEMO_SLUG = 'demo-'

/** `"ঢাকা জেলা"` → `"ঢাকা"`, so it matches our district name. */
function normaliseAdmin(name: string): string {
  const trimmed = name.trim()
  for (const suffix of ADMIN_SUFFIXES) {
    if (trimmed.endsWith(suffix)) return trimmed.slice(0, -suffix.length).trim()
  }
  return trimmed
}

/**
 * An ASCII slug. The site is Bengali-first but URLs stay ASCII, and Bengali does
 * not transliterate — so the English name is the source, and an institution
 * without one falls back to its Wikidata id rather than to a transliteration
 * nobody can type.
 */
function slugFor(nameEn: string | null, qid: string): string {
  const base = (nameEn ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || `wd-${qid.toLowerCase()}`
}

/** A candidate, reduced from the query's cross-product rows. */
interface Candidate {
  qid: string
  nameBn: string | null
  nameEn: string | null
  website: string | null
  established: number | null
  classes: Set<string>
  /** The institution's own P131, and that entity's P131 — district then division. */
  admins: Set<string>
  /** Bengali faculty name → its Bengali department names. */
  faculties: Map<string, Set<string>>
}

/** Collapse the query's rows (one per P31 value) into one record per item. */
function collect(bindings: Array<Record<string, { value: string }>>): Map<string, Candidate> {
  const items = new Map<string, Candidate>()
  for (const row of bindings) {
    const qid = row.u.value.split('/').pop() as string
    const item = items.get(qid) ?? {
      qid,
      nameBn: null,
      nameEn: null,
      website: null,
      established: null,
      classes: new Set<string>(),
      admins: new Set<string>(),
      faculties: new Map<string, Set<string>>(),
    }
    if (row.bn) item.nameBn = row.bn.value
    if (row.en) item.nameEn = row.en.value
    if (row.website && !item.website) item.website = row.website.value
    if (row.inception && !item.established)
      item.established = Number(row.inception.value.slice(0, 4))
    if (row.p31Label) item.classes.add(row.p31Label.value)
    if (row.adminBn) item.admins.add(row.adminBn.value)
    if (row.parentAdminBn) item.admins.add(row.parentAdminBn.value)
    if (row.facultyBn) {
      if (!item.faculties.has(row.facultyBn.value)) {
        item.faculties.set(row.facultyBn.value, new Set<string>())
      }
      if (row.deptBn) item.faculties.get(row.facultyBn.value)?.add(row.deptBn.value)
    }
    items.set(qid, item)
  }
  return items
}

/**
 * Strip the owning university from a faculty label.
 *
 * Wikidata labels these `"চারুকলা অনুষদ, ঢাকা বিশ্ববিদ্যালয়"`, and the profile
 * already says which university the page is about — so the suffix is noise on
 * every card. Only a suffix that names a university (or this one) is removed, so
 * a faculty legitimately containing a comma keeps its name.
 */
function facultyName(label: string, institutionNames: Array<string | null>): string {
  const cut = label.lastIndexOf(',')
  if (cut === -1) return label.trim()
  const tail = label.slice(cut + 1).trim()
  const names = institutionNames.filter(Boolean) as string[]
  const isOwner = tail.includes('বিশ্ববিদ্যালয়') || names.some((name) => tail.includes(name))
  return isOwner ? label.slice(0, cut).trim() : label.trim()
}

/**
 * Drop Payload's generated row `id`s before comparing, so a re-run reports
 * "unchanged" rather than rewriting every array on every run. Array sub-rows get
 * a fresh id each read, and comparing them raw would make the import look like it
 * changed something when nothing had.
 */
function comparable(value: unknown): unknown {
  if (!Array.isArray(value)) return value
  return value.map((entry) => {
    if (!entry || typeof entry !== 'object') return entry
    return Object.fromEntries(
      Object.entries(entry as Record<string, unknown>)
        .filter(([key]) => key !== 'id')
        .map(([key, nested]) => [key, comparable(nested)]),
    )
  })
}

/** Why a candidate was not imported — the report groups by this string. */
function rejectionReason(item: Candidate): string | null {
  // 1. A school is a school, whatever else Wikidata says about it.
  const school = [...item.classes].filter((c) => SCHOOL_CLASSES.has(c))
  if (school.length > 0) return `not a higher-education institution (${school.join(', ')})`

  // 2. Things that do not exist, or are outside the country's system.
  const outOfScope = [...item.classes].filter((c) => OUT_OF_SCOPE.has(c))
  if (outOfScope.length > 0) return `non-existent or out of scope (${outOfScope.join(', ')})`

  // 3. ⚠️ Bengali name is the binding constraint — the site is Bengali-only.
  if (!item.nameBn) return 'no Bengali name'

  // 4. Wikidata classes a BD "School and College" as a bare `college`.
  if (SCHOOL_NAME.test(item.nameBn)) return 'named as a school, not a college'

  /*
   * 5. Ownership must be stated — and this is checked **before** the weak
   * classes, because a stated ownership beats a loose tag. Checking it after is
   * what dropped University of Rajshahi (see `WEAK_CLASSES`).
   */
  if (TYPE_RULES.some(([names]) => names.some((n) => item.classes.has(n)))) return null

  const weak = [...item.classes].filter((c) => WEAK_CLASSES.has(c))
  if (weak.length > 0) return `not a higher-education institution (${weak.join(', ')})`

  return `ownership not determinable (${[...item.classes].sort().join(', ') || 'no class'})`
}

export interface ImportReport {
  fetched: number
  created: number
  updated: number
  /** Existing rows that had no Wikidata identity and were adopted rather than duplicated. */
  adopted: number
  unchanged: number
  /** Rejection reason → how many candidates it removed. */
  rejected: Map<string, number>
  /** How many imported rows carry a faculty list. */
  withFaculties: number
  districtResolved: number
  districtUnresolved: number
}

/** Fetch and flatten the candidate set. */
async function fetchCandidates(): Promise<Map<string, Candidate>> {
  const response = await fetch(`${ENDPOINT}?query=${encodeURIComponent(WIKIDATA_QUERY)}`, {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT },
    // A hung request must not hang a seed run; the query takes ~20s when warm.
    signal: AbortSignal.timeout(240_000),
  })
  if (!response.ok) {
    throw new Error(`Wikidata returned ${response.status} ${response.statusText}`)
  }
  const body = (await response.json()) as {
    results: { bindings: Array<Record<string, { value: string }>> }
  }
  return collect(body.results.bindings)
}

/**
 * Import (or refresh) every institution Wikidata can describe.
 *
 * Idempotent, and de-duplicated on **two** keys, because either one alone is
 * wrong: `wikidataId` catches a re-run, and the Bengali name catches the row
 * that was already there under a different identity — the demo placeholders, and
 * the two Wikidata items that describe one college. A name match on a row with
 * no Wikidata identity is **adopted** rather than duplicated; a name match on a
 * row that already belongs to another Wikidata item is left alone.
 */
export async function importUniversities(payload: Payload): Promise<ImportReport> {
  const candidates = await fetchCandidates()

  const districts = await payload.find({
    collection: 'districts',
    limit: 200,
    pagination: false,
    overrideAccess: true,
  })
  const districtIdByName = new Map<string, number>()
  for (const district of districts.docs) districtIdByName.set(district.nameBn, district.id)

  const existing = await payload.find({
    collection: 'institutions',
    limit: 10_000,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const idByWikidata = new Map<string, number>()
  const rowByName = new Map<string, { id: number; slug: string; wikidataId: string | null }>()
  const takenSlugs = new Set<string>()
  for (const doc of existing.docs) {
    if (doc.wikidataId) idByWikidata.set(doc.wikidataId, doc.id)
    rowByName.set(doc.nameBn, { id: doc.id, slug: doc.slug, wikidataId: doc.wikidataId ?? null })
    takenSlugs.add(doc.slug)
  }

  const report: ImportReport = {
    fetched: candidates.size,
    created: 0,
    updated: 0,
    adopted: 0,
    unchanged: 0,
    rejected: new Map(),
    withFaculties: 0,
    districtResolved: 0,
    districtUnresolved: 0,
  }
  const reject = (reason: string) =>
    report.rejected.set(reason, (report.rejected.get(reason) ?? 0) + 1)

  /** A slug nothing else has taken, falling back to the Wikidata id. */
  const freeSlug = (item: Candidate, preferred?: string): string => {
    let slug = preferred ?? slugFor(item.nameEn, item.qid)
    if (takenSlugs.has(slug)) slug = `${slug}-${item.qid.toLowerCase()}`
    takenSlugs.add(slug)
    return slug
  }

  for (const item of candidates.values()) {
    const reason = rejectionReason(item)
    if (reason) {
      reject(reason)
      continue
    }

    const districtId =
      [...item.admins].map((n) => districtIdByName.get(n)).find(Boolean) ??
      [...item.admins].map((n) => districtIdByName.get(normaliseAdmin(n))).find(Boolean)
    if (districtId) report.districtResolved++
    else report.districtUnresolved++

    /*
     * Faculties and departments come from `P527` on the institution itself,
     * filtered to parts Wikidata types as a `faculty` and to those with a Bengali
     * label — the site is Bengali-only, so an English-only faculty name cannot be
     * published (`docs/university-directory.md` §8.1).
     *
     * ⚠️ They are **partial**: Dhaka has more than the 12 Wikidata lists. That is
     * why the row stays `isVerified: false`, and why the profile page says so.
     */
    const faculties = [...item.faculties.entries()]
      .map(([name, departments]) => ({
        name: facultyName(name, [item.nameBn, item.nameEn]),
        departments: [...departments]
          .sort((a, b) => a.localeCompare(b, 'bn'))
          .map((dept) => ({ name: dept })),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'bn'))
    if (faculties.length > 0) report.withFaculties++

    const data = {
      nameBn: item.nameBn as string,
      nameEn: item.nameEn,
      type: TYPE_RULES.find(([names]) =>
        names.some((n) => item.classes.has(n)),
      )?.[1] as InstitutionType,
      discipline:
        DISCIPLINE_RULES.find(([names]) => names.some((n) => item.classes.has(n)))?.[1] ?? null,
      district: districtId ?? null,
      established: item.established,
      website: item.website,
      faculties,
      // ⚠️ Imported rows are UNVERIFIED. The badge means "a person checked this",
      // which is the only claim worth making on a directory students act on.
      isVerified: false,
      dataSource: 'Wikidata (CC0)',
      wikidataId: item.qid,
    }

    // ── Already imported: this is a re-run, so refresh it ─────────────────────
    const ownedId = idByWikidata.get(item.qid)
    if (ownedId) {
      const current = existing.docs.find((d) => d.id === ownedId)
      const changed = Object.entries(data).some(
        ([key, value]) =>
          JSON.stringify(comparable((current as unknown as Record<string, unknown>)?.[key])) !==
          JSON.stringify(comparable(value)),
      )
      if (changed) {
        await payload.update({
          collection: 'institutions',
          id: ownedId,
          data,
          overrideAccess: true,
        })
        report.updated++
      } else {
        report.unchanged++
      }
      continue
    }

    // ── The same institution, already in the directory ────────────────────────
    const sameName = rowByName.get(data.nameBn)
    if (sameName) {
      if (sameName.wikidataId) {
        // Two Wikidata items describing one institution (ডুমুরিয়া মহাবিদ্যালয় is
        // two). The first one won; the second is not a second college.
        reject('duplicate of an existing row (same Bengali name)')
        continue
      }
      /*
       * ⚠️ **Adopt — and re-slug when the row is demo content.**
       *
       * The demo seed created placeholder rows for real institutions, so
       * `demo-du` *is* ঢাকা বিশ্ববিদ্যালয়: importing without this would publish
       * the university twice, which is the de-duplication the spec asks for.
       *
       * The slug must change when it carries the demo marker, and that is not
       * cosmetic. `seed/demo-purge.ts` deletes institutions whose slug matches
       * `demo-`, so a row that is now real data would be deleted along with the
       * throwaway content it was created as.
       */
      const slug = sameName.slug.startsWith(DEMO_SLUG) ? freeSlug(item) : sameName.slug
      await payload.update({
        collection: 'institutions',
        id: sameName.id,
        data: { ...data, slug },
        overrideAccess: true,
      })
      rowByName.set(data.nameBn, { id: sameName.id, slug, wikidataId: item.qid })
      idByWikidata.set(item.qid, sameName.id)
      report.adopted++
      continue
    }

    // ── New ───────────────────────────────────────────────────────────────────
    const slug = freeSlug(item)
    const created = await payload.create({
      collection: 'institutions',
      data: { ...data, slug },
      overrideAccess: true,
    })
    rowByName.set(data.nameBn, { id: created.id, slug, wikidataId: item.qid })
    idByWikidata.set(item.qid, created.id)
    report.created++
  }

  return report
}
