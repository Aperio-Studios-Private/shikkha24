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
 *   pnpm --filter @shikkha24/cms seed:demo:purge              # report only
 *   pnpm --filter @shikkha24/cms seed:demo:purge -- --confirm # delete
 *
 * See `./demo-purge.ts`. It is a dry run unless `--confirm` is passed, and it
 * matches the `deadlines` / `quizzes` / `polls` rows using the key lists
 * exported at the bottom of this file, so the two cannot drift apart.
 *
 * Nothing in the site depends on the demo rows. The taxonomies seeded by
 * `pnpm seed` are the real, approved data and are untouched by the purge.
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
  tags: number
  articles: number
  deadlines: number
  liveBlog: number
  poll: number
  quiz: number
  skipped: number
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Lexical richText helpers
 *
 * The `body` field is a Payload richText (Lexical) field, which stores JSON —
 * not HTML. These helpers build the node shapes Payload expects. They are
 * intentionally minimal: paragraph, heading, bullet list, quote — the blocks our
 * editors actually use, and the ones `frontend/src/lib/richtext.ts` renders.
 * ───────────────────────────────────────────────────────────────────────────── */

type LexNode = Record<string, unknown>

const text = (value: string): LexNode => ({ type: 'text', version: 1, text: value })

const para = (value: string): LexNode => ({
  type: 'paragraph',
  version: 1,
  format: '',
  indent: 0,
  direction: 'ltr',
  children: [text(value)],
})

const heading = (value: string, tag = 'h2'): LexNode => ({
  type: 'heading',
  version: 1,
  tag,
  format: '',
  indent: 0,
  direction: 'ltr',
  children: [text(value)],
})

const bullets = (items: string[]): LexNode => ({
  type: 'list',
  version: 1,
  listType: 'bullet',
  format: '',
  indent: 0,
  direction: 'ltr',
  children: items.map((item) => ({
    type: 'listitem',
    version: 1,
    value: 1,
    format: '',
    indent: 0,
    direction: 'ltr',
    children: [text(item)],
  })),
})

const quote = (value: string): LexNode => ({
  type: 'quote',
  version: 1,
  format: '',
  indent: 0,
  direction: 'ltr',
  children: [text(value)],
})

/** Wrap block nodes into the `{ root: ... }` shape Payload stores. */
const richText = (...blocks: LexNode[]): LexNode => ({
  root: { type: 'root', version: 1, format: '', indent: 0, direction: 'ltr', children: blocks },
})

/**
 * Demo articles — realistic Bengali education news across all 8 categories.
 *
 * ## Why there are more than `PAGE_SIZE` of them
 *
 * `PAGE_SIZE` is 12. While the corpus held exactly 12 articles, `totalPages` was
 * always 1 and **no pagination control ever rendered anywhere** — so the
 * `/latest/page/:n` route and the `Pagination` component were never exercised by
 * any build, and two defects hid behind that (see M17 in `.sps/mistakes.md`).
 * The corpus now deliberately exceeds the limit, and `verify:links` checks the
 * `/page/2` links it generates.
 *
 * `tags` and `author` exist for the same reason: the author, tag and date
 * archive routes were deferred because the demo content had one author and no
 * tags, so there was nothing for them to show.
 */
const ARTICLES: Array<{
  slug: string
  title: string
  excerpt: string
  category: string
  level?: string
  isBreaking?: boolean
  isLead?: boolean
  readingTimeMinutes?: number
  /** Demo author slug. Defaults to the first author. */
  author?: string
  /** Demo tag slugs — created on demand by `seedDemo`. */
  tags?: string[]
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

  /* ── Second dozen: added 2026-09-15 so the corpus exceeds `PAGE_SIZE` ──────
   *
   * Twelve was exactly `PAGE_SIZE`, which meant `totalPages` was always 1 and
   * the pagination path was never executed. These also carry `tags` and a
   * second/third `author`, which the tag and author routes need to have
   * anything to show. See the array's own doc comment.
   */
  {
    slug: 'demo-hsc-routine-2027',
    title: 'এইচএসসি ২০২৭ পরীক্ষার সময়সূচি চূড়ান্ত, প্রথম পরীক্ষা ৩০ জুন',
    excerpt:
      'শিক্ষা বোর্ড এইচএসসি ও সমমানের পরীক্ষার চূড়ান্ত সময়সূচি প্রকাশ করেছে। বিভাগভিত্তিক সময়সূচি ও ব্যবহারিক পরীক্ষার তারিখও এতে রয়েছে।',
    category: 'exams-results',
    level: 'higher-secondary',
    readingTimeMinutes: 3,
    author: 'demo-desk',
    tags: ['demo-hsc', 'demo-routine'],
  },
  {
    slug: 'demo-result-recheck-process',
    title: 'ফলাফল পুনঃনিরীক্ষণ: আবেদনের নিয়ম ও ফি কত',
    excerpt:
      'পরীক্ষার ফলাফল নিয়ে সন্তুষ্ট না হলে পুনঃনিরীক্ষণের আবেদন করা যায়। আবেদনের সময়সীমা, ফি ও ফলাফল প্রকাশের সময় জানুন।',
    category: 'exams-results',
    level: 'secondary',
    readingTimeMinutes: 4,
    author: 'demo-correspondent',
    tags: ['demo-result', 'demo-ssc'],
  },
  {
    slug: 'demo-board-challenge-result',
    title: 'বোর্ড চ্যালেঞ্জ: পুনর্মূল্যায়নের ফলাফল প্রকাশিত',
    excerpt:
      'পুনর্মূল্যায়নের আবেদনকারীদের ফলাফল প্রকাশ করা হয়েছে। কতজন শিক্ষার্থীর নম্বর পরিবর্তন হয়েছে তার পরিসংখ্যানও প্রকাশ করেছে বোর্ড।',
    category: 'exams-results',
    level: 'higher-secondary',
    readingTimeMinutes: 3,
    tags: ['demo-result', 'demo-hsc'],
  },
  {
    slug: 'demo-scholarship-girls-stipend',
    title: 'মেয়েদের উপবৃত্তি: নতুন কিস্তি ছাড়, যাচাইয়ের নিয়ম কঠোর',
    excerpt:
      'সরকারি স্কুলে পড়ুয়া মেয়েদের উপবৃত্তির নতুন কিস্তি ছাড় করা হয়েছে। উপস্থিতি যাচাইয়ের নিয়ম কঠোর করা হয়েছে বলে জানিয়েছে সংশ্লিষ্ট দপ্তর।',
    category: 'scholarship',
    level: 'secondary',
    readingTimeMinutes: 4,
    author: 'demo-correspondent',
    tags: ['demo-scholarship'],
  },
  {
    slug: 'demo-scholarship-mphil',
    title: 'এমফিল ও পিএইচডি বৃত্তি: আবেদন শুরু, আসন সীমিত',
    excerpt:
      'উচ্চশিক্ষা ও গবেষণার জন্য সরকারি বৃত্তিতে আবেদন শুরু হয়েছে। আসনসংখ্যা সীমিত হওয়ায় আগে আবেদন করার পরামর্শ দিয়েছেন শিক্ষকরা।',
    category: 'scholarship',
    level: 'postgraduate',
    readingTimeMinutes: 5,
    tags: ['demo-scholarship', 'demo-research'],
  },
  {
    slug: 'demo-admission-medical-2027',
    title: 'মেডিকেল ভর্তি পরীক্ষা ২০২৭: প্রস্তুতির পূর্ণাঙ্গ নির্দেশিকা',
    excerpt:
      'মেডিকেল ও ডেন্টাল কলেজে ভর্তি পরীক্ষার প্রস্তুতি নিতে হলে কোন বিষয়ে কতটা জোর দিতে হবে — শিক্ষার্থীদের জন্য ধাপে ধাপে পরামর্শ।',
    category: 'admission',
    level: 'higher-secondary',
    readingTimeMinutes: 7,
    author: 'demo-desk',
    tags: ['demo-admission', 'demo-medical'],
  },
  {
    slug: 'demo-admission-engineering-2027',
    title: 'ইঞ্জিনিয়ারিং ভর্তি: সরকারি প্রযুক্তি বিশ্ববিদ্যালয়ে আসন বাড়ছে',
    excerpt:
      'নতুন শিক্ষাবর্ষে কয়েকটি সরকারি প্রযুক্তি বিশ্ববিদ্যালয়ে আসনসংখ্যা বাড়ানোর সিদ্ধান্ত হয়েছে। বিভাগভিত্তিক আসনের তালিকা প্রকাশিত হবে শীঘ্রই।',
    category: 'admission',
    level: 'higher-secondary',
    readingTimeMinutes: 4,
    tags: ['demo-admission', 'demo-engineering'],
  },
  {
    slug: 'demo-madrasa-new-syllabus',
    title: 'মাদ্রাসা শিক্ষা বোর্ড: নতুন সিলেবাস অনুমোদন, ২০২৭ থেকে কার্যকর',
    excerpt:
      'মাদ্রাসা শিক্ষা বোর্ড নতুন সিলেবাস অনুমোদন করেছে। আগামী শিক্ষাবর্ষ থেকে ধাপে ধাপে এটি কার্যকর হবে বলে জানানো হয়েছে।',
    category: 'education-news',
    level: 'secondary',
    readingTimeMinutes: 4,
    author: 'demo-correspondent',
    tags: ['demo-syllabus'],
  },
  {
    slug: 'demo-university-teacher-training',
    title: 'বিশ্ববিদ্যালয় শিক্ষকদের জন্য নতুন প্রশিক্ষণ কর্মসূচি',
    excerpt:
      'উচ্চশিক্ষার গুণগত মান বাড়াতে শিক্ষকদের জন্য গবেষণাভিত্তিক প্রশিক্ষণ কর্মসূচি চালু হচ্ছে। অনলাইন ও সরাসরি—দুই ধরনের সেশন থাকবে।',
    category: 'university',
    level: 'graduate',
    readingTimeMinutes: 5,
    author: 'demo-desk',
    tags: ['demo-teacher', 'demo-research'],
  },
  {
    slug: 'demo-teacher-recruitment-2026',
    title: 'শিক্ষক নিয়োগ: ১২ হাজার পদের বিজ্ঞপ্তি প্রকাশ',
    excerpt:
      'সরকারি প্রাথমিক ও মাধ্যমিক পর্যায়ে শিক্ষক নিয়োগের বড় বিজ্ঞপ্তি প্রকাশিত হয়েছে। যোগ্যতা, বয়সসীমা ও আবেদন প্রক্রিয়ার বিস্তারিত।',
    category: 'jobs-career',
    level: 'graduate',
    readingTimeMinutes: 5,
    author: 'demo-correspondent',
    tags: ['demo-job', 'demo-teacher'],
  },
  {
    slug: 'demo-study-abroad-australia',
    title: 'অস্ট্রেলিয়ায় উচ্চশিক্ষা: আর্থিক প্রমাণপত্রের নিয়ম বদলাচ্ছে',
    excerpt:
      'অস্ট্রেলিয়া আন্তর্জাতিক শিক্ষার্থীদের জন্য আর্থিক প্রমাণপত্রের নিয়ম পরিবর্তন করছে। আবেদনের আগে কী কী কাগজ প্রস্তুত রাখতে হবে জেনে নিন।',
    category: 'study-abroad',
    level: 'postgraduate',
    readingTimeMinutes: 6,
    tags: ['demo-study-abroad'],
  },
  {
    slug: 'demo-research-thesis-writing',
    title: 'গবেষণা প্রবন্ধ লেখার নিয়ম: প্রথমবার যাঁরা লিখছেন তাঁদের জন্য',
    excerpt: 'গবেষণা প্রবন্ধের কাঠামো, তথ্যসূত্র লেখার নিয়ম ও সাধারণ ভুলগুলো—নতুন গবেষকদের জন্য ব্যবহারিক পরামর্শ।',
    category: 'higher-study',
    level: 'postgraduate',
    readingTimeMinutes: 8,
    tags: ['demo-research', 'demo-writing'],
  },
]

/**
 * Build a plausible Bengali article body for a demo story.
 *
 * This is scaffolding to make the article page reviewable. Its job is to
 * exercise every block type `frontend/src/lib/richtext.ts` renders — paragraph,
 * heading, bullet list, quote — not to read like real reporting.
 */
function buildBody(article: { title: string; excerpt: string }): LexNode {
  return richText(
    para(article.excerpt),
    para(
      'বিষয়টি নিয়ে শিক্ষা মন্ত্রণালয়ের সংশ্লিষ্ট কর্মকর্তারা জানিয়েছেন, সংশ্লিষ্ট সকল পক্ষের মতামত বিবেচনায় নিয়ে চূড়ান্ত সিদ্ধান্ত গ্রহণ করা হবে। ইতিমধ্যে প্রাথমিক প্রস্তুতি শুরু হয়েছে বলে তারা নিশ্চিত করেছেন।',
    ),
    heading('কী জানতে চান শিক্ষার্থীরা'),
    para(
      'এ বিষয়ে শিক্ষার্থী ও অভিভাবকদের মধ্যে ব্যাপক আগ্রহ দেখা দিয়েছে। বিশেষজ্ঞদের মতে, সময়মতো তথ্য পাওয়া গেলে প্রস্তুতি নিতে সুবিধা হবে।',
    ),
    bullets([
      'আবেদন বা আবেদনের সময়সীমা সংক্রান্ত নির্দিষ্ট তারিখ',
      'প্রয়োজনীয় কাগজপত্র ও যোগ্যতার শর্তাবলি',
      'যোগাযোগের ঠিকানা ও হেল্পলাইন নম্বর',
      'সর্বশেষ হালনাগাদ পাওয়ার নির্ভরযোগ্য উৎস',
    ]),
    quote(
      'সঠিক তথ্য সময়মতো পেলে শিক্ষার্থীরা সঠিক সিদ্ধান্ত নিতে পারে। তাই নির্ভরযোগ্য সূত্র থেকে খবর নেওয়া জরুরি।',
    ),
    para(
      'নিয়মিত আপডেটের জন্য শিক্ষা২৪-এর সাথেই থাকুন। বিষয়টিতে নতুন কোনো তথ্য পাওয়া গেলে আমরা দ্রুত হালনাগাদ করব।',
    ),
  )
}

/** Short takeaway bullets shown in the "মূল বিষয়সমূহ" box. */
const TAKEAWAYS: string[] = [
  'বিষয়টির সর্বশেষ হালনাগাদ নিয়মিত যাচাই করুন',
  'প্রয়োজনীয় কাগজপত্র আগেভাগেই প্রস্তুত রাখুন',
  'নির্ভরযোগ্য সূত্র ছাড়া তথ্য গ্রহণ করবেন না',
  'সময়সীমার আগেই আবেদন সম্পন্ন করার চেষ্টা করুন',
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

/* ─────────────────────────────────────────────────────────────────────────────
 * Interactive demo content (S8)
 *
 * Entries are spaced minutes apart and include key events on purpose, so the
 * demo exercises the timeline ordering, the key-events filter and the
 * "মূল ঘটনা" badge rather than leaving those paths only reachable in production.
 * ───────────────────────────────────────────────────────────────────────────── */

/** Relative so the demo always looks like it is happening today. */
const minutesAgo = (minutes: number): string =>
  new Date(Date.now() - minutes * 60_000).toISOString()

const LIVE_BLOG = {
  title: 'এইচএসসি ২০২৬ ফলাফল — লাইভ আপডেট',
  slug: 'demo-hsc-result-live',
  entries: [
    {
      minutesAgo: 3,
      isKeyEvent: true,
      text: 'ফলাফল প্রকাশিত হয়েছে। এইচএসসি ২০২৬-এ পাসের হার ৭৮.৪০ শতাংশ, জিপিএ ৫ পেয়েছেন ১,৪২,৩১৭ জন।',
    },
    {
      minutesAgo: 11,
      isKeyEvent: false,
      text: 'শিক্ষা বোর্ডের ওয়েবসাইটে চাপ বাড়ছে। বিকল্প হিসেবে এসএমএস ও মোবাইল অ্যাপের মাধ্যমে ফল জানার পরামর্শ দিয়েছে বোর্ড।',
    },
    {
      minutesAgo: 24,
      isKeyEvent: true,
      text: 'সকাল ১০টায় ফলাফল প্রকাশের ঘোষণা দিয়েছেন শিক্ষা মন্ত্রণালয়ের কর্মকর্তারা। শিক্ষা বোর্ডের ওয়েবসাইট ও প্রতিষ্ঠান প্রধানদের কাছ থেকে ফল জানা যাবে।',
    },
    {
      minutesAgo: 38,
      isKeyEvent: false,
      text: 'ফলাফল প্রকাশের আগেই বোর্ডের সার্ভার প্রস্তুত করা হয়েছে বলে জানিয়েছে সংশ্লিষ্ট দপ্তর।',
    },
    {
      minutesAgo: 52,
      isKeyEvent: false,
      text: 'পরীক্ষার্থীদের রেজিস্ট্রেশন কার্ড ও রোল নম্বর হাতে রাখতে বলা হয়েছে — এসএমএসে ফল জানতে দুটিই লাগবে।',
    },
    {
      minutesAgo: 71,
      isKeyEvent: true,
      text: 'আজ সকাল থেকেই অভিভাবকদের ভিড় শুরু হয়েছে প্রতিষ্ঠানগুলোতে। ফল প্রকাশের পর দ্রুত ভর্তি প্রক্রিয়া শুরু হবে।',
    },
  ],
}

const POLL = {
  questionBn: 'নতুন ভর্তি নীতিতে লটারি পদ্ধতি কি ন্যায্য বলে মনে করেন?',
  options: ['হ্যাঁ, ন্যায্য', 'না, পরিবর্তন দরকার', 'নিশ্চিত নই'],
}

const QUIZ = {
  title: 'আজকের কুইজ — ভর্তি ও বিসিএস প্রস্তুতি',
  questions: [
    {
      question: 'জাতিসংঘের শিক্ষা, বিজ্ঞান ও সংস্কৃতি সংস্থার সংক্ষিপ্ত নাম কী?',
      options: ['ইউনেস্কো', 'ইউনিসেফ', 'ডব্লিউএইচও', 'আইএলও'],
      correctAnswer: 'ইউনেস্কো',
      explanation: 'ইউনেস্কো (UNESCO) ১৯৪৫ সালে প্রতিষ্ঠিত হয়; সদর দপ্তর প্যারিসে।',
    },
    {
      question: 'বাংলাদেশের প্রথম বিশ্ববিদ্যালয় কোনটি?',
      options: ['ঢাকা বিশ্ববিদ্যালয়', 'রাজশাহী বিশ্ববিদ্যালয়', 'চট্টগ্রাম বিশ্ববিদ্যালয়', 'জাহাঙ্গীরনগর বিশ্ববিদ্যালয়'],
      correctAnswer: 'ঢাকা বিশ্ববিদ্যালয়',
      explanation: 'ঢাকা বিশ্ববিদ্যালয় ১৯২১ সালে প্রতিষ্ঠিত হয়।',
    },
    {
      question: 'এসএসসি পরীক্ষা কোন শ্রেণি শেষে অনুষ্ঠিত হয়?',
      options: ['অষ্টম শ্রেণি', 'নবম শ্রেণি', 'দশম শ্রেণি', 'দ্বাদশ শ্রেণি'],
      correctAnswer: 'দশম শ্রেণি',
      explanation: 'মাধ্যমিক স্তরের সমাপনী পরীক্ষা দশম শ্রেণি শেষে অনুষ্ঠিত হয়।',
    },
    {
      question: 'বিসিএস পরীক্ষার প্রথম ধাপ কোনটি?',
      options: ['প্রিলিমিনারি', 'লিখিত', 'মৌখিক', 'ব্যক্তিগত সাক্ষাৎকার'],
      correctAnswer: 'প্রিলিমিনারি',
      explanation: 'প্রিলিমিনারি (প্রাথমিক) পরীক্ষায় উত্তীর্ণ হলে লিখিত পরীক্ষায় অংশ নেওয়া যায়।',
    },
    {
      question: 'একটি বর্গক্ষেত্রের ক্ষেত্রফল নির্ণয়ের সঠিক সূত্র কোনটি?',
      options: ['বাহু × বাহু', '২ × বাহু', '৪ × বাহু', 'বাহু ÷ ২'],
      correctAnswer: 'বাহু × বাহু',
      explanation: 'বর্গক্ষেত্রের সব বাহু সমান, তাই ক্ষেত্রফল = বাহু × বাহু।',
    },
  ],
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Purge keys — what `demo-purge.ts` matches on
 *
 * Most demo content carries a marker of its own: a `demo-` slug (articles,
 * authors, institutions, study-abroad guides, live blogs, galleries), a
 * `demo-` filename (media) or a `ডেমো:` title prefix (scholarships, result
 * links, circulars). The three below carry **no** marker — `deadlines`,
 * `quizzes` and `polls` are identified only by their title / question text — so
 * the purge imports these values rather than duplicating the Bengali strings.
 *
 * Exported so the seed and the purge cannot drift apart: change the seed data
 * here and the purge follows automatically.
 * ───────────────────────────────────────────────────────────────────────────── */

/** Exact titles the demo seed writes to `deadlines`. */
export const DEMO_DEADLINE_TITLES: string[] = DEADLINES.map((d) => d.title)

/** Exact title the demo seed writes to `quizzes`. */
export const DEMO_QUIZ_TITLE: string = QUIZ.title

/** Exact `questionBn` the demo seed writes to `polls`. */
export const DEMO_POLL_QUESTION: string = POLL.questionBn

export async function seedDemo(payload: Payload): Promise<DemoReport> {
  const db = payload as unknown as SlugAgnosticPayload
  const report: DemoReport = {
    author: 0,
    tags: 0,
    articles: 0,
    deadlines: 0,
    liveBlog: 0,
    poll: 0,
    quiz: 0,
    skipped: 0,
  }

  /* ── Demo authors ─────────────────────────────────────────────────────── *
   *
   * Three, not one. The author-profile route was deferred because a single
   * byline gives a profile page nothing to list, so the demo had to have more
   * than one before that route could be judged. Every slug is `demo-` prefixed
   * so `seed:demo:purge` removes them by pattern rather than by name.
   *
   * ── S13: the three verification states are covered on purpose ────────────
   *
   * `/reporters/:slug` and the `VerificationBadge` branches are only exercised
   * if the demo corpus contains the states they render. A route nothing
   * generates is a route that has never run (`.sps/handoff.md`, M17 — the
   * boundary-sized fixture that hid two defects). So:
   *
   *   demo-reporter       verified, card in date   → badge + listed + profile
   *   demo-desk           verified, card EXPIRED   → the "মেয়াদোত্তীর্ণ" branch
   *   demo-correspondent  unverified               → must be absent from /reporters
   *
   * `reporterId` is deliberately **not** set: the `assignReporterId` hook fills
   * it, so the demo also exercises the hook rather than hardcoding its output.
   */
  const DEMO_AUTHORS = [
    {
      slug: 'demo-reporter',
      nameBn: 'ডেমো রিপোর্টার',
      nameEn: 'Demo Reporter',
      designation: 'নিজস্ব প্রতিবেদক',
      bio: 'হোমপেজ ডিজাইন পর্যালোচনার জন্য তৈরি ডেমো লেখক। লঞ্চের আগে মুছে ফেলা হবে।',
      verificationStatus: 'verified',
      validUntil: '2027-12-31T00:00:00.000Z',
      joiningDate: '2024-03-01T00:00:00.000Z',
      beat: ['school', 'college', 'admission'],
    },
    {
      slug: 'demo-desk',
      nameBn: 'ডেমো ডেস্ক',
      nameEn: 'Demo Desk',
      designation: 'ডেস্ক রিপোর্ট',
      bio: 'ডেস্ক থেকে প্রকাশিত ডেমো প্রতিবেদনের বাইলাইন। লঞ্চের আগে মুছে ফেলা হবে।',
      // Verified but lapsed — the badge must render "মেয়াদোত্তীর্ণ", not a tick.
      verificationStatus: 'verified',
      validUntil: '2025-12-31T00:00:00.000Z',
      joiningDate: '2023-01-10T00:00:00.000Z',
      beat: ['university'],
    },
    {
      slug: 'demo-correspondent',
      nameBn: 'ডেমো প্রতিনিধি',
      nameEn: 'Demo Correspondent',
      designation: 'জেলা প্রতিনিধি',
      bio: 'জেলা পর্যায়ের ডেমো প্রতিবেদনের বাইলাইন। লঞ্চের আগে মুছে ফেলা হবে।',
      // Left unverified on purpose: proves /reporters filters, not just labels.
      verificationStatus: 'unverified',
    },
  ]

  const authorIds = new Map<string, unknown>()
  for (const spec of DEMO_AUTHORS) {
    const existing = await db.find({
      collection: 'authors',
      where: { slug: { equals: spec.slug } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs[0]) {
      /*
       * Converge the S13 fields on an author that already exists.
       *
       * The seed is idempotent — it skips what is already there — but that alone
       * would mean the verification states above never appear on a database
       * seeded before they were added, so `/reporters/:slug` would keep
       * generating nothing and the route would stay unexercised. Re-running the
       * seed must reach the same end state, not merely avoid duplicating rows.
       */
      await db.update({
        collection: 'authors',
        id: existing.docs[0].id,
        data: {
          verificationStatus: spec.verificationStatus,
          validUntil: spec.validUntil ?? null,
          joiningDate: spec.joiningDate ?? null,
          beat: spec.beat ?? [],
        },
        overrideAccess: true,
      })
      authorIds.set(spec.slug, existing.docs[0].id)
      continue
    }
    const created = await db.create({ collection: 'authors', data: spec, overrideAccess: true })
    authorIds.set(spec.slug, created.id)
    report.author++
  }

  /** Byline for articles that do not name one. */
  const defaultAuthorId = authorIds.get('demo-reporter')

  /* ── Demo tags ────────────────────────────────────────────────────────── *
   *
   * `tags` is deliberately empty in the production taxonomy seed — tags are
   * editorial labels, created while writing, not fixed taxonomy. So the demo
   * brings its own, and `seed:demo:purge` removes them (they were previously
   * absent from the purge list, which is why that list now names `tags`).
   */
  const DEMO_TAGS: Array<{ slug: string; nameBn: string }> = [
    { slug: 'demo-hsc', nameBn: 'এইচএসসি' },
    { slug: 'demo-ssc', nameBn: 'এসএসসি' },
    { slug: 'demo-result', nameBn: 'ফলাফল' },
    { slug: 'demo-routine', nameBn: 'পরীক্ষার রুটিন' },
    { slug: 'demo-scholarship', nameBn: 'বৃত্তি' },
    { slug: 'demo-admission', nameBn: 'ভর্তি' },
    { slug: 'demo-medical', nameBn: 'মেডিকেল' },
    { slug: 'demo-engineering', nameBn: 'ইঞ্জিনিয়ারিং' },
    { slug: 'demo-job', nameBn: 'চাকরি' },
    { slug: 'demo-teacher', nameBn: 'শিক্ষক' },
    { slug: 'demo-study-abroad', nameBn: 'বিদেশে পড়াশোনা' },
    { slug: 'demo-research', nameBn: 'গবেষণা' },
    { slug: 'demo-syllabus', nameBn: 'সিলেবাস' },
    { slug: 'demo-writing', nameBn: 'লেখালেখি' },
  ]

  const tagIds = new Map<string, unknown>()
  for (const spec of DEMO_TAGS) {
    const existing = await db.find({
      collection: 'tags',
      where: { slug: { equals: spec.slug } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs[0]) {
      tagIds.set(spec.slug, existing.docs[0].id)
      continue
    }
    const created = await db.create({ collection: 'tags', data: spec, overrideAccess: true })
    tagIds.set(spec.slug, created.id)
    report.tags++
  }

  /** Resolve a list of demo tag slugs to ids, dropping any that failed to create. */
  const resolveTags = (slugs: string[] | undefined): unknown[] =>
    (slugs ?? []).map((slug) => tagIds.get(slug)).filter((id): id is unknown => id !== undefined)

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

  /* ── Articles ─────────────────────────────────────────────────────────── *
   *
   * Publish times step back four days per article, so the corpus spans roughly
   * three months. The earlier ~37-minute stagger put every article inside a
   * single day, which left the date archive exactly one bucket to show.
   */
  const PUBLISH_INTERVAL_MS = 4 * 24 * 60 * 60_000

  for (const [index, article] of ARTICLES.entries()) {
    const categoryId = categoryIds.get(article.category)
    if (!categoryId) {
      report.skipped++
      continue
    }

    const authorForArticle = authorIds.get(article.author ?? 'demo-reporter') ?? defaultAuthorId
    const publishedAt = new Date(Date.now() - index * PUBLISH_INTERVAL_MS).toISOString()

    const existing = await db.find({
      collection: 'articles',
      where: { slug: { equals: article.slug } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs.length > 0) {
      // A re-run converges earlier demo rows on the current spec instead of
      // leaving them as first created. This is throwaway content deleted before
      // launch, so overwriting is intended — but only when something is
      // actually stale, so a second run reports "skipped" rather than
      // rewriting every row.
      const doc = existing.docs[0]
      const bodyMissing = !doc.body
      const tagsMissing = Boolean(article.tags?.length) && !doc.tags
      const dateStale =
        Math.abs(new Date(String(doc.publishedAt)).getTime() - Date.parse(publishedAt)) >
        24 * 60 * 60_000

      if (bodyMissing || tagsMissing || dateStale) {
        // ⚠️ Send only the fields being changed. Do **not** echo `doc.body`
        // back: the read above runs at the default `depth`, so relationship
        // nodes inside the Lexical body come back as populated objects, and
        // re-sending them fails validation with "Body > Poster image". Only
        // build a body when there is not one.
        const data: Record<string, unknown> = {
          tags: resolveTags(article.tags),
          author: authorForArticle,
          publishedAt,
        }
        if (bodyMissing) {
          data.body = buildBody(article)
          data.keyTakeaways = TAKEAWAYS.map((point) => ({ point }))
        }

        await db.update({
          collection: 'articles',
          id: doc.id,
          data,
          overrideAccess: true,
        })
        report.articles++
      } else {
        report.skipped++
      }
      continue
    }

    await db.create({
      collection: 'articles',
      data: {
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        body: buildBody(article),
        keyTakeaways: TAKEAWAYS.map((point) => ({ point })),
        category: categoryId,
        author: authorForArticle,
        level: article.level ? levelIds.get(article.level) : undefined,
        tags: resolveTags(article.tags),
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

  /* ── Live blog (S8) ───────────────────────────────────────────────────── */
  const existingLive = await db.find({
    collection: 'live-blogs',
    where: { slug: { equals: LIVE_BLOG.slug } },
    limit: 1,
    overrideAccess: true,
  })

  if (existingLive.docs.length > 0) {
    report.skipped++
  } else {
    await db.create({
      collection: 'live-blogs',
      data: {
        title: LIVE_BLOG.title,
        slug: LIVE_BLOG.slug,
        isActive: true,
        entries: LIVE_BLOG.entries.map((entry) => ({
          timestamp: minutesAgo(entry.minutesAgo),
          // `richText(...)` supplies the `root` wrapper Payload's richText field
          // requires — a bare paragraph node is rejected as invalid.
          content: richText(para(entry.text)),
          isKeyEvent: entry.isKeyEvent,
        })),
      },
      overrideAccess: true,
    })
    report.liveBlog = 1
  }

  /* ── Poll (S8) ────────────────────────────────────────────────────────── */
  const existingPoll = await db.find({
    collection: 'polls',
    where: { questionBn: { equals: POLL.questionBn } },
    limit: 1,
    overrideAccess: true,
  })

  if (existingPoll.docs.length > 0) {
    report.skipped++
  } else {
    await db.create({
      collection: 'polls',
      data: {
        questionBn: POLL.questionBn,
        // Deliberately zero votes. Seeding a standing would be inventing reader
        // opinion and showing it as fact — the poll must open empty.
        options: POLL.options.map((label) => ({ label, voteCount: 0 })),
        isActive: true,
      },
      overrideAccess: true,
    })
    report.poll = 1
  }

  /* ── Quiz (S8) ────────────────────────────────────────────────────────── */
  const existingQuiz = await db.find({
    collection: 'quizzes',
    where: { title: { equals: QUIZ.title } },
    limit: 1,
    overrideAccess: true,
  })

  if (existingQuiz.docs.length > 0) {
    report.skipped++
  } else {
    await db.create({
      collection: 'quizzes',
      data: {
        title: QUIZ.title,
        date: new Date().toISOString(),
        isActive: true,
        questions: QUIZ.questions.map((question) => ({
          question: question.question,
          options: question.options.map((label) => ({ label })),
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
        })),
      },
      overrideAccess: true,
    })
    report.quiz = 1
  }

  return report
}
