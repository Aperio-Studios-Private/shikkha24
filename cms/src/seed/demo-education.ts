/**
 * Demo education content for S10 — scholarships, results, institutions,
 * circulars and study-abroad guides.
 *
 * Follows the same pattern as `./demo-engagement.ts`: idempotent, prefixed
 * `demo-`, deleted by the same purge path. The data is enough to make the
 * S10 pages reviewable; real content is the editorial team's job.
 */
import type { Payload } from 'payload'

interface SlugAgnosticPayload {
  find(args: Record<string, unknown>): Promise<{ docs: Array<Record<string, unknown>> }>
  create(args: Record<string, unknown>): Promise<Record<string, unknown>>
}

export interface EducationReport {
  scholarships: number
  results: number
  institutions: number
  circulars: number
  studyAbroad: number
}

/** Minimal Lexical paragraph node. */
function para(value: string): unknown {
  return { type: 'paragraph', version: 1, format: '', indent: 0, direction: 'ltr',
    children: [{ type: 'text', version: 1, text: value }] }
}

/** RichText body from an array of paragraph strings. */
function body(...paras: string[]): unknown {
  return { root: { type: 'root', format: '', indent: 0, version: 1, direction: 'ltr',
    children: paras.map(para) } }
}

const SCHOLARSHIPS = [
  { title: 'ডেমো: শেরেবাংলা বৃত্তি ২০২৬', provider: 'শিক্ষা মন্ত্রণালয়', levelSlug: 'undergraduate',
    country: 'বাংলাদেশ', fundingType: 'partial', amount: '২০,০০০ টাকা/বছর', deadline: '2026-10-15',
    eligibility: 'স্নাতক ১ম বর্ষের শিক্ষার্থী', isInternational: false, isActive: true },
  { title: 'ডেমো: জাপান সরকারি বৃত্তি (MEXT)', provider: 'জাপান সরকার', levelSlug: 'postgraduate',
    country: 'জাপান', fundingType: 'full', amount: 'বৃত্তি + ভাতা', deadline: '2026-05-30',
    eligibility: 'স্নাতক পাশ', isInternational: true, isActive: true },
  { title: 'ডেমো: ঢাকা বিশ্ববিদ্যালয় কল্যাণ তহবিল', provider: 'ঢাকা বিশ্ববিদ্যালয়',
    levelSlug: 'undergraduate', country: 'বাংলাদেশ', fundingType: 'tuition', amount: 'টিউশন ফি মওকফ',
    deadline: '2026-09-30', eligibility: 'অর্থনৈতিকভাবে অসচ্ছল শিক্ষার্থী', isInternational: false, isActive: true },
  { title: 'ডেমো: এসএসসি পুরস্কার বৃত্তি', provider: 'মাধ্যমিক ও উচ্চশিক্ষা অধিদপ্তর',
    levelSlug: 'higher-secondary', country: 'বাংলাদেশ', fundingType: 'partial', amount: '১,০০০ টাকা/মাস',
    deadline: '2026-12-31', eligibility: 'এসএসসি পাশ শিক্ষার্থী', isInternational: false, isActive: true },
]

const RESULTS = [
  { title: 'ডেমো: এসএসসি ফলাফল ২০২৬', examName: 'এসএসসি ২০২৬', boardOrInstitution: 'মাধ্যমিক শিক্ষা বোর্ড',
    levelSlug: 'higher-secondary', publicationDate: '2026-05-06', officialUrl: 'https://eboardresults.com',
    meritListUrl: 'https://eboardresults.com/merit', isPublished: true,
    howTo: 'প্রথমে বোর্ড নির্বাচন করুন। তারপর রোল নম্বর ও বছর দিন।' },
  { title: 'ডেমো: এইচএসসি ফলাফল ২০২৬', examName: 'এইচএসসি ২০২৬', boardOrInstitution: 'মাধ্যমিক শিক্ষা বোর্ড',
    levelSlug: 'undergraduate', publicationDate: '2026-08-15', officialUrl: 'https://eboardresults.com',
    meritListUrl: null, isPublished: true,
    howTo: 'বোর্ড ও বছর নির্বাচন করে রোল নম্বর প্রবেশ করান।' },
  { title: 'ডেমো: ভর্তি পরীক্ষা ফলাফল ২০২৬', examName: 'ভর্তি পরীক্ষা ২০২৬',
    boardOrInstitution: 'ঢাকা বিশ্ববিদ্যালয়', levelSlug: 'undergraduate', publicationDate: '2026-10-01',
    officialUrl: 'https://admission.eis.du.ac.bd', meritListUrl: 'https://admission.eis.du.ac.bd/merit',
    isPublished: true, howTo: 'ভর্তি কার্ডের রোল নম্বর ও পিন দিয়ে ফলাফল দেখুন।' },
]

const INSTITUTIONS = [
  { nameBn: 'ঢাকা বিশ্ববিদ্যালয়', nameEn: 'University of Dhaka', slug: 'demo-du',
    type: 'public', levelSlugs: ['undergraduate', 'postgraduate'], districtSlug: 'dhaka',
    established: 1921, website: 'https://du.ac.bd', isVerified: true,
    address: 'ঢাকা-১০০০', desc: 'বাংলাদেশের প্রাচীনতম বিশ্ববিদ্যালয়।' },
  { nameBn: 'বাংলাদেশ প্রকৌশল ও প্রযুক্তি বিশ্ববিদ্যালয়', nameEn: 'BUET', slug: 'demo-buet',
    type: 'public', levelSlugs: ['undergraduate', 'postgraduate'], districtSlug: 'dhaka',
    established: 1912, website: 'https://buet.ac.bd', isVerified: true,
    address: 'ঢাকা-১০০০', desc: '্রকৌশল শিক্ষার শীর্ষ প্রতিষ্ঠান।' },
  { nameBn: 'রাজশাহী বিশ্ববিদ্যালয়', nameEn: 'University of Rajshahi', slug: 'demo-ru',
    type: 'public', levelSlugs: ['undergraduate', 'postgraduate'], districtSlug: 'rajshahi',
    established: 1953, website: 'https://ru.ac.bd', isVerified: true,
    address: 'রাজশাহী-৬২০৫', desc: 'উত্তরবঙ্গের বৃহত্তম বিশ্ববিদ্যালয়।' },
  { nameBn: 'নর্থ সাউথ বিশ্ববিদ্যালয়', nameEn: 'North South University', slug: 'demo-nsu',
    type: 'private', levelSlugs: ['undergraduate', 'postgraduate'], districtSlug: 'dhaka',
    established: 1992, website: 'https://northsouth.edu', isVerified: true,
    address: 'ঢাকা-১২২৯', desc: 'বেসরকারি বিশ্ববিদ্যালয়।' },
  { nameBn: 'ব্র্যাক বিশ্ববিদ্যালয়', nameEn: 'BRAC University', slug: 'demo-bracu',
    type: 'private', levelSlugs: ['undergraduate', 'postgraduate'], districtSlug: 'dhaka',
    established: 2001, website: 'https://bracu.ac.bd', isVerified: true,
    address: 'ঢাকা-১২১২', desc: 'ব্র্যাক বিশ্ববিদ্যালয়।' },
]

const CIRCULARS = [
  { title: 'ডেমো: ৪৭তম বিসিএস নিয়োগ বিজ্ঞপ্তি', organisation: 'বাংলাদেশ সিভিল সার্ভিস কমিশন',
    type: 'bcs', levelSlugs: ['undergraduate'], publishedDate: '2026-09-01', deadline: '2026-10-30',
    vacancyCount: 2500, applyUrl: 'https://bpsc.gov.bd', isDesc: '৪৭তম বিসিএস প্রিলিমিনারি পরীক্ষার বিজ্ঞপ্তি।' },
  { title: 'ডেমো: শিক্ষা বোর্ড নিয়োগ', organisation: 'মাধ্যমিক শিক্ষা বোর্ড',
    type: 'education', levelSlugs: ['undergraduate'], publishedDate: '2026-08-15', deadline: '2026-09-20',
    vacancyCount: 50, applyUrl: 'https://www.educationboard.gov.bd', isDesc: 'শিক্ষা বোর্ডে শিক্ষক নিয়োগ।' },
  { title: 'ডেমো: স্থানীয় সরকার বিভাগ নিয়োগ', organisation: 'স্থানীয় সরকার বিভাগ',
    type: 'governmentJob', levelSlugs: ['higher-secondary'], publishedDate: '2026-09-05',
    deadline: '2026-09-25', vacancyCount: 120, applyUrl: 'https://www.lgd.gov.bd',
    isDesc: 'ইউনিয়ন পরিষদে সচিব নিয়োগ।' },
]

const STUDY_ABROAD = [
  { country: 'যুক্তরাজ্য', slug: 'demo-uk', tuitionRange: '১৫–৪০ লক্ষ টাকা/বছর',
    livingCostRange: '১০–১৫ লক্ষ টাকা/বছর', intakes: 'সেপ্টেম্বর, জানুয়ারি', isFeatured: true,
    visa: 'টায়ার ৪ স্টুডেন্ট ভিসা প্রয়োজন।', steps: 'কোর্স নির্বাচন → আবেদন → সিএএএস → ভিসা।',
    scholarship: 'চেভেনিং স্কলারশিপ সরকারি অনুদানে পাওয়া যায়।' },
  { country: 'যুক্তরাষ্ট্র', slug: 'demo-usa', tuitionRange: '২০–৫০ লক্ষ টাকা/বছর',
    livingCostRange: '১০–২০ লক্ষ টাকা/বছর', intakes: 'ফল, স্প্রিং', isFeatured: true,
    visa: 'এফ-১ স্টুডেন্ট ভিসা প্রয়োজন।', steps: 'এসএটি/জিআরই → আবেদন → আই-২০ → ভিসা।',
    scholarship: 'ফুলব্রাইট স্কলারশিপ উপলব্ধ।' },
  { country: 'কানাডা', slug: 'demo-canada', tuitionRange: '১২–৩০ লক্ষ টাকা/বছর',
    livingCostRange: '৮–১২ লক্ষ টাকা/বছর', intakes: 'সেপ্টেম্বর, জানুয়ারি, মে', isFeatured: true,
    visa: 'স্টাডি পারমিট প্রয়োজন।', steps: 'আবেদন → অফার লেটার → পারমিট → ভিসা।',
    scholarship: 'ভ্যানিয়ার কানাডা গ্র্যাজুয়েট স্কলারশিপ।' },
  { country: 'অস্ট্রেলিয়া', slug: 'demo-australia', tuitionRange: '১৮–৩৫ লক্ষ টাকা/বছর',
    livingCostRange: '১০–১৫ লক্ষ টাকা/বছর', intakes: 'ফেব্রুয়ারি, জুলাই', isFeatured: false,
    visa: 'সাবক্লাস ৫০০ স্টুডেন্ট ভিসা।', steps: 'কোর্স → আবেদন → সিওই → ভিসা।',
    scholarship: 'অস্ট্রেলিয়া অ্যাওয়ার্ড স্কলারশিপ।' },
  { country: 'মালয়েশিয়া', slug: 'demo-malaysia', tuitionRange: '৫–১৫ লক্ষ টাকা/বছর',
    livingCostRange: '৪–৬ লক্ষ টাকা/বছর', intakes: 'ফেব্রুয়ারি, সেপ্টেম্বর', isFeatured: false,
    visa: 'স্টুডেন্ট পাস প্রয়োজন।', steps: 'কোর্স → আবেদন → ভিসা অ্যাপ্রুভাল লেটার।',
    scholarship: 'মিতস স্কলারশিপ উপলব্ধ।' },
  { country: 'জাপান', slug: 'demo-japan', tuitionRange: '৮–২০ লক্ষ টাকা/বছর',
    livingCostRange: '৮–১২ লক্ষ টাকা/বছর', intakes: 'এপ্রিল, অক্টোবর', isFeatured: false,
    visa: 'স্টুডেন্ট ভিসা প্রয়োজন।', steps: 'কোর্স → আবেদন → সিওই → ভিসা।',
    scholarship: 'এমইএক্সটি সরকারি স্কলারশিপ।' },
  { country: 'দক্ষিণ কোরিয়া', slug: 'demo-south-korea', tuitionRange: '৬–১৫ লক্ষ টাকা/বছর',
    livingCostRange: '৫–৮ লক্ষ টাকা/বছর', intakes: 'মার্চ, সেপ্টেম্বর', isFeatured: false,
    visa: 'ডি-২ স্টুডেন্ট ভিসা।', steps: 'কোর্স → আবেদন → ভিসা।',
    scholarship: 'জিএসপি গ্লোবাল কোরিয়া স্কলারশিপ।' },
  { country: 'জার্মানি', slug: 'demo-germany', tuitionRange: 'বিনামূল্য – ৩ লক্ষ টাকা/বছর',
    livingCostRange: '৮–১০ লক্ষ টাকা/বছর', intakes: 'অক্টোবর, এপ্রিল', isFeatured: false,
    visa: 'স্টুডেন্ট ভিসা প্রয়োজন।', steps: 'কোর্স → আবেদন → ব্লক অ্যাকাউন্ট → ভিসা।',
    scholarship: 'ডিএএডি স্কলারশিপ উপলব্ধ।' },
]

export async function seedDemoEducation(payload: Payload): Promise<EducationReport> {
  const db = payload as unknown as SlugAgnosticPayload
  const report: EducationReport = { scholarships: 0, results: 0, institutions: 0, circulars: 0, studyAbroad: 0 }

  // Resolve level IDs by slug.
  const levelIds = new Map<string, unknown>()
  for (const slug of ['primary', 'secondary', 'higher-secondary', 'undergraduate', 'postgraduate']) {
    const found = await db.find({ collection: 'levels', where: { slug: { equals: slug } }, limit: 1, overrideAccess: true })
    if (found.docs[0]) levelIds.set(slug, found.docs[0].id)
  }
  // Resolve district IDs by slug.
  const districtIds = new Map<string, unknown>()
  for (const slug of ['dhaka', 'rajshahi']) {
    const found = await db.find({ collection: 'districts', where: { slug: { equals: slug } }, limit: 1, overrideAccess: true })
    if (found.docs[0]) districtIds.set(slug, found.docs[0].id)
  }

  async function seedOne(collection: string, where: Record<string, unknown>, data: Record<string, unknown>, key: keyof EducationReport) {
    const existing = await db.find({ collection, where, limit: 1, overrideAccess: true })
    if (existing.docs.length > 0) return
    await db.create({ collection, data, overrideAccess: true })
    report[key]++
  }

  for (const s of SCHOLARSHIPS) {
    await seedOne('scholarships', { title: { equals: s.title } }, {
      title: s.title, provider: s.provider, level: [levelIds.get(s.levelSlug)],
      country: s.country, fundingType: s.fundingType, amount: s.amount, deadline: s.deadline,
      eligibility: s.eligibility, isInternational: s.isInternational, isActive: s.isActive,
      description: body(s.eligibility, `আবেদনের শেষ তারিখ: ${s.deadline}`),
    }, 'scholarships')
  }

  for (const r of RESULTS) {
    await seedOne('result-links', { title: { equals: r.title } }, {
      title: r.title, examName: r.examName, boardOrInstitution: r.boardOrInstitution,
      level: levelIds.get(r.levelSlug), publicationDate: r.publicationDate,
      officialUrl: r.officialUrl, meritListUrl: r.meritListUrl, isPublished: r.isPublished,
      howToSteps: body(r.howTo),
    }, 'results')
  }

  for (const i of INSTITUTIONS) {
    await seedOne('institutions', { slug: { equals: i.slug } }, {
      nameBn: i.nameBn, nameEn: i.nameEn, slug: i.slug, type: i.type,
      levelOffered: i.levelSlugs.map((s) => levelIds.get(s)),
      district: districtIds.get(i.districtSlug), established: i.established,
      website: i.website, address: i.address, isVerified: i.isVerified,
      description: body(i.desc),
    }, 'institutions')
  }

  for (const c of CIRCULARS) {
    await seedOne('circulars', { title: { equals: c.title } }, {
      title: c.title, organisation: c.organisation, type: c.type,
      level: c.levelSlugs.map((s) => levelIds.get(s)), publishedDate: c.publishedDate,
      deadline: c.deadline, vacancyCount: c.vacancyCount, applyUrl: c.applyUrl,
      description: body(c.isDesc),
    }, 'circulars')
  }

  for (const g of STUDY_ABROAD) {
    await seedOne('study-abroad-guides', { slug: { equals: g.slug } }, {
      country: g.country, slug: g.slug, tuitionRange: g.tuitionRange,
      livingCostRange: g.livingCostRange, intakes: g.intakes, isFeatured: g.isFeatured,
      visaRequirements: body(g.visa), applicationSteps: body(g.steps), scholarshipNotes: body(g.scholarship),
    }, 'studyAbroad')
  }

  return report
}
