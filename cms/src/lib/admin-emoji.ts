import type { CollectionConfig, GlobalConfig } from 'payload'

type CollectionLabels = NonNullable<CollectionConfig['labels']>
type CollectionText = NonNullable<CollectionLabels['singular']>

const collectionEmojis = {
  articles: '📰',
  categories: '🗂️',
  levels: '🪜',
  districts: '📍',
  tags: '🏷️',
  authors: '✍️',
  assignments: '📋',
  pages: '📄',
  faqs: '❓',
  'fact-checks': '✅',
  scholarships: '💰',
  deadlines: '⏰',
  institutions: '🏫',
  circulars: '📢',
  'result-links': '🔗',
  'study-abroad-guides': '🌍',
  'live-blogs': '🟢',
  polls: '📊',
  quizzes: '🧠',
  media: '🖼️',
  'photo-galleries': '📸',
  'live-streams': '🎥',
  'ad-units': '🪧',
  comments: '💬',
  'newsletter-subscribers': '📬',
  'newsletter-campaigns': '📧',
  'saved-deadlines': '🔖',
  bookmarks: '🧷',
  'citizen-submissions': '📨',
  'push-subscriptions': '🔔',
  readers: '👥',
  'poll-votes': '🗳️',
  reactions: '👍',
  users: '🛡️',
} as const

const globalEmojis = {
  'site-settings': '⚙️',
} as const

function prefixText(labels: CollectionLabels | undefined, emoji: string): CollectionLabels {
  const prefix = (value?: CollectionText) => {
    if (!value || typeof value === 'function') return value
    if (typeof value === 'string') return `${emoji} ${value}`

    return Object.fromEntries(
      Object.entries(value).map(([locale, text]) => [locale, `${emoji} ${text}`]),
    )
  }

  return {
    ...labels,
    singular: prefix(labels?.singular),
    plural: prefix(labels?.plural),
  }
}

export function withAdminEmoji(collection: CollectionConfig): CollectionConfig {
  const emoji = collectionEmojis[collection.slug as keyof typeof collectionEmojis]

  return emoji ? { ...collection, labels: prefixText(collection.labels, emoji) } : collection
}

export function withAdminGlobalEmoji(global: GlobalConfig): GlobalConfig {
  const emoji = globalEmojis[global.slug as keyof typeof globalEmojis]
  const label = global.label

  if (!emoji || typeof label === 'function') return global

  if (label && typeof label !== 'string') {
    return {
      ...global,
      label: Object.fromEntries(
        Object.entries(label).map(([locale, text]) => [locale, `${emoji} ${text}`]),
      ),
    }
  }

  return { ...global, label: `${emoji} ${label}` }
}
