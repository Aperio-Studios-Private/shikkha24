import type { Payload } from 'payload'

/**
 * Demo content seed — `pnpm --filter @shikkha24/cms seed:demo`
 *
 * ## This is scaffolding, not content
 *
 * The production seed (`pnpm seed`) deliberately seeds **taxonomies only**:
 * editorial content is the team's job, not a script's. But the homepage cannot be
 * reviewed as an empty shell — a design gate needs something to look at.
 *
 * So demo content lives behind its own command, clearly named, and is meant to be
 * deleted before launch. Every item is prefixed so it is unmistakable and
 * greppable: article slugs start with `demo-`.
 *
 * ## Deleting it
 *
 *   pnpm --filter @shikkha24/cms exec payload run src/seed/demo-purge.ts
 *
 * ...or just delete the demo rows from the admin. Nothing in the site depends on
 * them. The taxonomies seeded by `pnpm seed` are the real, approved data and are
 * untouched by this script.
 */

/** Reuses the confined cast from the production seed — see `./index.ts`. */
interface SlugAgnosticPayload {
  find(args: Record<string, unknown>): Promise<{ docs: Array<Record<string, unknown>> }>
  create(args: Record<string, unknown>): Promise<Record<string, unknown>>
  update(args: Record<string, unknown>): Promise<Record<string, unknown>>
  delete(args: Record<string, unknown>): Promise<unknown>
}

export interface DemoReport {
  author: number
  articles: number
  deadlines: number
  skipped: number
}

/** Demo articles — realistic Bengali education news across all 8 categories. */
const ARTICLES: Array<{
  slug: string
  title: string
  excerpt: string
  category: string
  level?: string
  isBreaking?: boolean
  isLead?: boolean
  readingTimeMinutes?: number
}> = [
  {
    slug: 'demo-hsc-result-2026',
    title: 'এইচএসসি ২০২৬ ফলাফল আগামীকাল প্রকাশ: কীভাবে দেখবেন',
    excerpt:
      'শিক্ষা মন্ত্রণালয় সূত্রে জানা গেছে, আগামীকাল সকাল ১০টায় এইচএসসি ও সমমানের পরীক্ষার ফলাফল প্রকাশ করা হবে। ফলাফল দেখার তিনটি উপায় ও মোবাইলে এসএমএসের মাধ্যমে ফল জানার নিয়ম জেনে নিন।',
    category: 'exams-results',
    level: 'higher-secondary',
    isBreaking: true,
    isLead: true,
    readingTimeMinutes: 4,
  },
  {
    slug: 'demo-scholarship-pmt-2026',
    title: 'প্রধানমন্ত্রীর শিক্ষা বৃত্তি ২০২৬: আবেদন শুরু, শেষ তারিখ জানুন',
    excerpt:
      'প্রাথমিক ও মাধ্যমিক স্তরের মেধাবী শিক্ষার্থীদের জন্য প্রধানমন্ত্রীর শিক্ষা সহায়তা বৃত্তির আবেদন শুরু হয়েছে। আবেদনের যোগ্যতা, প্রয়োজনীয় কাগজপত্র ও শেষ তারিখের বিস্তারিত।',
    category: 'scholarship',
    level: 'secondary',
    isBreaking: true,
    readingTimeMinutes: 5,
  },
  {
    slug: 'demo-university-admission-2026',
    title: 'সরকারি বিশ্ববিদ্যালয়ে ভর্তি: আবেদনের সময়সীমা বাড়ানোর দাবি',
    excerpt:
      'ভর্তি পরীক্ষার প্রস্তুতির সময় কম থাকায় শিক্ষার্থীরা আবেদনের সময়সীমা বাড়ানোর দাবি জানিয়েছেন। বিশ্ববিদ্যালয় কর্তৃপক্ষের পক্ষ থেকে এ বিষয়ে সিদ্ধান্তের অপেক্ষা রয়েছে।',
    category: 'admission',
    level: 'graduate',
    readingTimeMinutes: 3,
  },
  {
    slug: 'demo-study-abroad-canada',
    title: 'কানাডায় উচ্চশিক্ষা: ২০২৬ সেশনে ভিসা নিয়মে বড় পরিবর্তন',
    excerpt:
      'কানাডা সরকার আন্তর্জাতিক শিক্ষার্থীদের জন্য নতুন ভিসা নীতিমালা ঘোষণা করেছে। আর্থিক প্রমাণপত্রের পরিমাণ বাড়ানোসহ কয়েকটি গুরুত্বপূর্ণ পরিবর্তন জেনে নিন।',
    category: 'study-abroad',
    level: 'postgraduate',
    readingTimeMinutes: 6,
  },
  {
    slug: 'demo-job-circular-bank',
    title: 'ব্যাংকে চাকরি: ২ হাজার পদের বিজ্ঞপ্তি প্রকাশ',
    excerpt:
      'একাধিক রাষ্ট্রায়ত্ত ব্যাংকে সহকারী কর্মকর্তা পদে নিয়োগ বিজ্ঞপ্তি প্রকাশিত হয়েছে। শিক্ষাগত যোগ্যতা, বয়সসীমা ও আবেদন প্রক্রিয়ার বিস্তারিত।',
    category: 'jobs-career',
    level: 'graduate',
    readingTimeMinutes: 4,
  },
  {
    slug: 'demo-education-budget-2026',
    title: 'শিক্ষা খাতে বরাদ্দ বাড়ল, প্রাথমিক শিক্ষায় অগ্রাধিকার',
    excerpt:
      'নতুন বাজেটে শিক্ষা খাতে বরাদ্দ বাড়ানো হয়েছে। প্রাথমিক শিক্ষা ও শিক্ষক প্রশিক্ষণে অতিরিক্ত তহবিল দেওয়ার পরিকল্পনা রয়েছে।',
    category: 'education-news',
    level: 'primary',
    readingTimeMinutes: 5,
  },
  {
    slug: 'demo-ssc-exam-routine',
    title: 'এসএসসি ২০২৭ পরীক্ষার রুটিন প্রকাশ, পরীক্ষা শুরু ফেব্রুয়ারিতে',
    excerpt:
      'শিক্ষা বোর্ড এসএসসি ও সমমানের পরীক্ষার সম্পূর্ণ রুটিন প্রকাশ করেছে। পরীক্ষা শুরু হবে আগামী ফেব্রুয়ারির প্রথম সপ্তাহে।',
    category: 'exams-results',
    level: 'secondary',
    readingTimeMinutes: 3,
  },
  {
    slug: 'demo-university-ranking',
    title: 'বাংলাদেশের ৩ বিশ্ববিদ্যালয় এশিয়ার শীর্ষ ১০০ তালিকায়',
    excerpt:
      'এশিয়ার বিশ্ববিদ্যালয় র‍্যাংকিংয়ের সর্বশেষ সংস্করণে বাংলাদেশের তিনটি বিশ্ববিদ্যালয় স্থান পেয়েছে। গবেষণা ও আন্তর্জাতিকীকরণে উন্নতিই এর মূল কারণ।',
    category: 'university',
    level: 'postgraduate',
    readingTimeMinutes: 4,
  },
  {
    slug: 'demo-higher-study-research',
    title: 'উচ্চশিক্ষায় গবেষণার সুযোগ: বৃত্তি পাওয়ার কৌশল',
    excerpt:
      'দেশীয় ও আন্তর্জাতিক গবেষণা বৃত্তি পাওয়ার জন্য প্রস্তুতি, প্রস্তাবনা লেখা ও তত্ত্বাবধায়ক নির্বাচনের ব্যবহারিক পরামর্শ।',
    category: 'higher-study',
    level: 'postgraduate',
    readingTimeMinutes: 7,
  },
  {
    slug: 'demo-admission-circular-dhaka',
    title: 'ঢাকা বিশ্ববিদ্যালয়ের ভর্তি বিজ্ঞপ্তি প্রকাশ',
    excerpt:
      'ঢাকা বিশ্ববিদ্যালয়ের স্নাতক প্রথম বর্ষের ভর্তি বিজ্ঞপ্তি প্রকাশিত হয়েছে। আবেদন শুরু ও শেষ তারিখসহ পূর্ণাঙ্গ তথ্য।',
    category: 'admission',
    level: 'graduate',
    isBreaking: true,
    readingTimeMinutes: 3,
  },
  {
    slug: 'demo-scholarship-abroad-fulbright',
    title: 'ফুলব্রাইট স্কলারশিপ ২০২৭: আবেদন চলছে',
    excerpt:
      'মার্কিন যুক্তরাষ্ট্রের মর্যাদাপূর্ণ ফুলব্রাইট স্কলারশিপে আবেদন চলছে। যোগ্যতা, নির্বাচন প্রক্রিয়া ও প্রস্তুতির ধাপ জেনে নিন।',
    category: 'scholarship',
    level: 'postgraduate',
    readingTimeMinutes: 6,
  },
  {
    slug: 'demo-primary-teacher-training',
    title: 'প্রাথমিক শিক্ষক প্রশিক্ষণ: নতুন কারিকুলাম অনুমোদন',
    excerpt:
      'প্রাথমিক শিক্ষকদের প্রশিক্ষণ কারিকুলাম হালনাগাদ করা হয়েছে। নতুন কারিকুলামে ডিজিটাল শিক্ষাদানের ওপর জোর দেওয়া হয়েছে।',
    category: 'education-news',
    level: 'primary',
    readingTimeMinutes: 4,
  },
]

/**
 * Demo deadlines for the N1/N2 strip.
 *
 * `type` values must match `DEADLINE_TYPES` in `collections/Deadlines.ts` —
 * the field is a `select`, so an unknown value is rejected at validation time.
 */
const DEADLINES: Array<{
  title: string
  type: 'admission' | 'result' | 'examRoutine' | 'scholarshipDeadline' | 'holiday' | 'circular'
  dateStart: string
  dateEnd: string
  description?: string
  level?: string
}> = [
  {
    title: 'প্রধানমন্ত্রীর শিক্ষা বৃত্তি — আবেদন',
    type: 'scholarshipDeadline',
    dateStart: new Date().toISOString(),
    dateEnd: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    description: 'প্রাথমিক ও মাধ্যমিক স্তরের মেধাবী শিক্ষার্থীদের জন্য।',
    level: 'secondary',
  },
  {
    title: 'ঢাকা বিশ্ববিদ্যালয় স্নাতক ভর্তি আবেদন',
    type: 'admission',
    dateStart: new Date().toISOString(),
    dateEnd: new Date(Date.now() + 5 * 86_400_000).toISOString(),
    description: 'ক, খ ও গ ইউনিটের আবেদন চলছে।',
    level: 'graduate',
  },
  {
    title: 'এইচএসসি ২০২৬ ফলাফল প্রকাশ',
    type: 'result',
    dateStart: new Date().toISOString(),
    dateEnd: new Date(Date.now() + 1 * 86_400_000).toISOString(),
    description: 'সকাল ১০টায় ফলাফল প্রকাশিত হবে।',
    level: 'higher-secondary',
  },
  {
    title: 'ফুলব্রাইট স্কলারশিপ — আবেদন',
    type: 'scholarshipDeadline',
    dateStart: new Date().toISOString(),
    dateEnd: new Date(Date.now() + 21 * 86_400_000).toISOString(),
    description: 'স্নাতকোত্তর ও গবেষণার জন্য।',
    level: 'postgraduate',
  },
  {
    title: 'এসএসসি ২০২৭ পরীক্ষার রুটিন',
    type: 'examRoutine',
    dateStart: new Date().toISOString(),
    dateEnd: new Date(Date.now() + 45 * 86_400_000).toISOString(),
    description: 'ফেব্রুয়ারিতে পরীক্ষা শুরু।',
    level: 'secondary',
  },
]

export async function seedDemo(payload: Payload): Promise<DemoReport> {
  const db = payload as unknown as SlugAgnosticPayload
  const report: DemoReport = { author: 0, articles: 0, deadlines: 0, skipped: 0 }

  /* ── A single demo author ─────────────────────────────────────────────── */
  const existingAuthors = await db.find({
    collection: 'authors',
    where: { slug: { equals: 'demo-reporter' } },
    limit: 1,
    overrideAccess: true,
  })

  let authorId: unknown = existingAuthors.docs[0]?.id
  if (!authorId) {
    const author = await db.create({
      collection: 'authors',
      data: {
        nameBn: 'ডেমো রিপোর্টার',
        nameEn: 'Demo Reporter',
        slug: 'demo-reporter',
        designation: 'নিজস্ব প্রতিবেদক',
        bio: 'হোমপেজ ডিজাইন পর্যালোচনার জন্য তৈরি ডেমো লেখক। লঞ্চের আগে মুছে ফেলা হবে।',
      },
      overrideAccess: true,
    })
    authorId = author.id
    report.author = 1
  }

  /* ── Resolve taxonomy ids by slug ─────────────────────────────────────── */
  const categoryIds = new Map<string, unknown>()
  const levelIds = new Map<string, unknown>()

  for (const slug of new Set(ARTICLES.map((a) => a.category))) {
    const found = await db.find({
      collection: 'categories',
      where: { slug: { equals: slug } },
      limit: 1,
      overrideAccess: true,
    })
    if (found.docs[0]) categoryIds.set(slug, found.docs[0].id)
  }

  for (const slug of new Set(ARTICLES.map((a) => a.level).filter(Boolean) as string[])) {
    const found = await db.find({
      collection: 'levels',
      where: { slug: { equals: slug } },
      limit: 1,
      overrideAccess: true,
    })
    if (found.docs[0]) levelIds.set(slug, found.docs[0].id)
  }

  /* ── Articles ─────────────────────────────────────────────────────────── */
  for (const [index, article] of ARTICLES.entries()) {
    const categoryId = categoryIds.get(article.category)
    if (!categoryId) {
      report.skipped++
      continue
    }

    const existing = await db.find({
      collection: 'articles',
      where: { slug: { equals: article.slug } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs.length > 0) {
      report.skipped++
      continue
    }

    // Stagger publish times so "latest" ordering is visible and stable.
    const publishedAt = new Date(Date.now() - index * 37 * 60_000).toISOString()

    await db.create({
      collection: 'articles',
      data: {
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        category: categoryId,
        author: authorId,
        level: article.level ? levelIds.get(article.level) : undefined,
        isBreaking: article.isBreaking ?? false,
        isLead: article.isLead ?? false,
        reviewStatus: 'approved',
        readingTimeMinutes: article.readingTimeMinutes ?? 4,
        publishedAt,
        _status: 'published',
      },
      overrideAccess: true,
    })
    report.articles++
  }

  /* ── Deadlines ────────────────────────────────────────────────────────── */
  for (const deadline of DEADLINES) {
    const existing = await db.find({
      collection: 'deadlines',
      where: { title: { equals: deadline.title } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs.length > 0) {
      report.skipped++
      continue
    }

    await db.create({
      collection: 'deadlines',
      data: {
        title: deadline.title,
        type: deadline.type,
        dateStart: deadline.dateStart,
        dateEnd: deadline.dateEnd,
        description: deadline.description,
        level: deadline.level ? levelIds.get(deadline.level) : undefined,
      },
      overrideAccess: true,
    })
    report.deadlines++
  }

  return report
}
