'use client'

import { useState } from 'react'

/**
 * দ্রুত সংবাদ — the minimal mobile draft form.
 *
 * ## Why it is a plain controlled form and not Payload's field components
 *
 * The full editorial form is right for a desk, and wrong for a reporter filing
 * three paragraphs from a phone: it asks for a featured image, tags, SEO fields
 * and a publish date before it will save. This asks for the four things an
 * article cannot exist without, and creates a **draft** — the reporter can then
 * open the full editor for anything more.
 *
 * ## It cannot publish
 *
 * There is no publish control here, and that is not the control. The endpoint
 * hard-sets `_status: 'draft'` from a whitelist, and `hooks/publish.ts` refuses
 * the transition into `published` for a non-editor independently. Hiding a
 * button is not authorisation (`docs/security.md` §3).
 *
 * ## English-first with Bengali helpers (owner rule, T-38)
 *
 * Headlines in English; uncommon words keep a Bengali helper in parentheses. The `name` attributes are English
 * because they are the API contract, not copy.
 */

interface Category {
  id: number | string
  nameBn: string
}

interface Props {
  categories: Category[]
}

type State = 'idle' | 'saving' | 'saved' | 'error'

export function QuickDraftForm({ categories }: Props) {
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')
  const [editUrl, setEditUrl] = useState('')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState('saving')
    setMessage('')

    const form = new FormData(event.currentTarget)

    try {
      const response = await fetch('/api/reporter/quick-draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: form.get('title'),
          excerpt: form.get('excerpt'),
          category: form.get('category'),
          body: form.get('body'),
        }),
      })

      const result = (await response.json()) as { error?: string; editUrl?: string }

      if (!response.ok) {
        setState('error')
        setMessage(result.error ?? 'Could not create the draft (সংবাদ তৈরি করা যায়নি)')
        return
      }

      setState('saved')
      setMessage('Draft created (খসড়া তৈরি হয়েছে)')
      setEditUrl(result.editUrl ?? '')
      event.currentTarget.reset()
    } catch {
      setState('error')
      setMessage('Network problem — try again (নেটওয়ার্ক সমস্যা — আবার চেষ্টা করুন)')
    }
  }

  /** 48px minimum height throughout: this form exists to be used on a phone. */
  const field =
    'mt-1 w-full min-h-12 rounded-md border border-gray-300 px-3 py-2 text-base dark:border-gray-600 dark:bg-gray-900'
  const label = 'block text-sm font-medium'

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className={label} htmlFor="qd-title">
          Title (শিরোনাম)
        </label>
        <input id="qd-title" name="title" required maxLength={200} className={field} />
      </div>

      <div>
        <label className={label} htmlFor="qd-excerpt">
          Excerpt (সংক্ষিপ্তসার)
        </label>
        <textarea
          id="qd-excerpt"
          name="excerpt"
          required
          maxLength={300}
          rows={2}
          className={field}
        />
      </div>

      <div>
        <label className={label} htmlFor="qd-category">
          Category (বিভাগ)
        </label>
        <select id="qd-category" name="category" required className={field} defaultValue="">
          <option value="" disabled>
            Select a category (বিভাগ বাছুন)
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.nameBn}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={label} htmlFor="qd-body">
          Body (বিবরণ)
        </label>
        <textarea id="qd-body" name="body" required rows={8} className={field} />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          প্রতিটি অনুচ্ছেদের মাঝে একটি খালি লাইন রাখুন।
        </p>
      </div>

      <button
        type="submit"
        disabled={state === 'saving'}
        className="min-h-12 w-full rounded-md bg-blue-600 px-4 font-medium text-white disabled:opacity-60"
      >
        {state === 'saving' ? 'Submitting (জমা হচ্ছে…)' : 'Submit Draft (খসড়া জমা দিন)'}
      </button>

      {message && (
        <p
          role="status"
          className={
            state === 'error'
              ? 'text-sm text-red-600 dark:text-red-400'
              : 'text-sm text-green-700 dark:text-green-400'
          }
        >
          {message}{' '}
          {editUrl && (
            <a className="underline" href={editUrl}>
              Open full editor (সম্পূর্ণ এডিটরে খুলুন)
            </a>
          )}
        </p>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        This creates a draft — publishing needs editor approval (এটি একটি খসড়া তৈরি করে — প্রকাশ করতে সম্পাদকের অনুমোদন লাগবে)।
      </p>
    </form>
  )
}
