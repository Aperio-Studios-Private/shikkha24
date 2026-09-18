import type { Endpoint, PayloadRequest } from 'payload'

import { isEditorialUser, relationId } from '../access/roles'
import { json, readJsonBody, text } from '../lib/http'

/**
 * `POST /api/reporter/quick-draft` — the mobile "দ্রুত সংবাদ" form.
 *
 * ## Why this is not the generated `POST /api/articles`
 *
 * A reporter writing on a phone should not have to fill in the full editorial
 * form (featured image, tags, SEO fields, publish date) to file three
 * paragraphs. But the generated create route accepts **every** writable field,
 * so "the simple form" and "the full form" would otherwise be the same API
 * surface — and the simple one would be reachable with the full one's payload.
 *
 * So the body is built **key by key from a whitelist**. A caller can send
 * `isBreaking: true`, `isLead: true`, `publishedAt`, `_status: 'published'` or
 * `reviewStatus: 'approved'` and none of it reaches the create call. This is the
 * same structural control `endpoints/comments.ts` documents, for the same
 * reason: `overrideAccess` is not what protects a public-ish handler — the
 * whitelist is.
 *
 * ## What a reporter can and cannot do here
 *
 *   can     — create a draft owned by their own author profile
 *   cannot  — publish (`_status` is hard-set to `draft`, and
 *             `hooks/publish.ts` refuses the transition independently)
 *   cannot  — file under someone else's byline (the author is resolved from
 *             their own `Users.authorProfile`, never from the request body)
 *   cannot  — approve their own work (`reviewStatus` is hard-set to `draft`)
 *
 * ## Why the author comes from the session
 *
 * Trusting an `author` field in the body would let any reporter file a story
 * under a colleague's name — a byline is an attribution of responsibility, and
 * it must not be forgeable by the person being attributed.
 */

/** A plain-text body as the minimal Lexical document Payload's editor expects. */
function plainTextToLexical(value: string) {
  const paragraphs = value
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  /*
   * The literal types (`'ltr'`, `''`, `'normal'`) are asserted because Payload's
   * Lexical type narrows `direction` to `'ltr' | 'rtl' | null` and `format` to a
   * fixed union — widening them to `string` fails the field's type even though
   * the value is correct.
   */
  return {
    root: {
      type: 'root',
      format: '' as const,
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      children: paragraphs.map((block) => ({
        type: 'paragraph',
        format: '' as const,
        indent: 0,
        version: 1,
        direction: 'ltr' as const,
        textFormat: 0,
        children: [
          {
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal' as const,
            style: '',
            version: 1,
            text: block,
          },
        ],
      })),
    },
  }
}

export const reporterQuickDraftEndpoint: Endpoint = {
  path: '/reporter/quick-draft',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    if (!req.user) {
      return json({ error: 'লগইন করা নেই।' }, { status: 401 })
    }
    if (!isEditorialUser(req.user)) {
      return json({ error: 'এই কাজের অনুমতি নেই।' }, { status: 403 })
    }

    /*
     * Resolve the reporter's own byline. A user without a linked author profile
     * cannot file — an article requires an author, and guessing one would be
     * worse than refusing.
     */
    const authorId = relationId((req.user as { authorProfile?: unknown }).authorProfile)
    if (authorId === null) {
      return json(
        {
          error: 'আপনার অ্যাকাউন্টের সাথে কোনো লেখক প্রোফাইল যুক্ত নেই। সম্পাদকের সাথে যোগাযোগ করুন।',
        },
        { status: 400 },
      )
    }

    const body = await readJsonBody(req)

    // Length caps match the collection's own field limits, so a payload that
    // would fail validation anyway is rejected before it reaches the database.
    const title = text(body.title, 200)?.trim() ?? ''
    const excerpt = text(body.excerpt, 300)?.trim() ?? ''
    const content = text(body.body, 20_000)?.trim() ?? ''

    /*
     * Narrow the category before it reaches the create call. It arrives as
     * `unknown`, and passing it through unchecked is how a body like
     * `{ category: { evil: true } }` becomes a database write. The id column is
     * numeric, so a non-numeric string is rejected rather than coerced — a
     * `Number('abc')` of `NaN` would fail later with a confusing message.
     */
    const rawCategory = body.category
    const categoryId =
      typeof rawCategory === 'number'
        ? rawCategory
        : typeof rawCategory === 'string' && /^\d+$/.test(rawCategory.trim())
          ? Number(rawCategory.trim())
          : null

    if (!title || !excerpt || !content || categoryId === null) {
      return json({ error: 'শিরোনাম, সংক্ষিপ্তসার, বিভাগ ও বিবরণ — সবগুলো প্রয়োজন।' }, { status: 400 })
    }

    try {
      const created = await req.payload.create({
        collection: 'articles',
        // ⚠️ Whitelisted key by key. Never spread the request body here.
        data: {
          title,
          excerpt,
          category: categoryId,
          /*
           * The byline comes from the session, never from the request body — a
           * reporter must not be able to file under a colleague's name.
           * `Number()` because the column is numeric and `relationId` may hand
           * back a string id.
           */
          author: Number(authorId),
          body: plainTextToLexical(content),
          reviewStatus: 'draft',
          _status: 'draft',
        },
        // The reporter's own session runs the real access control, so the
        // collection's `create: isEditorial` rule is what authorises this.
        user: req.user,
        overrideAccess: false,
        req,
      })

      return json(
        {
          ok: true,
          id: created.id,
          // Deep-links straight into the full editor for anything more.
          editUrl: `/admin/collections/articles/${created.id}`,
        },
        { status: 201 },
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'সংবাদ তৈরি করা যায়নি।'
      return json({ error: message }, { status: 400 })
    }
  },
}
