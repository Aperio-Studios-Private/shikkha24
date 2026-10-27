import type { ListViewServerProps } from 'payload'
import type React from 'react'

import { MediaCardGrid } from './MediaCardGrid'

/**
 * Card-grid list view for the media collections (server component).
 *
 * Payload's own list view renders a table; the owner asked the asset
 * collections to show large thumbnail cards instead. Per the installed
 * ListViewServerProps type (payload/dist/admin/views/list.d.ts), the view
 * receives `data` (the paginated find result), `collectionSlug`,
 * `collectionConfig` and the standard `ServerProps` — it renders INSIDE the
 * admin template already, so no DefaultTemplate wrapper is needed (that
 * pattern belongs to standalone custom page views, not collection list
 * views). The client grid re-derives query state via `useListQuery()`, so
 * search, filters, sort and pagination keep Payload's behaviour.
 *
 * Docs: payloadcms.com/docs/custom-components/list-view (props, slots) and
 * the installed type source for the exact shapes. Security note from the
 * docs: custom views are public by default — this one only re-renders data
 * the collection's own access rules already gate.
 */
export function MediaListServerView(props: ListViewServerProps) {
  const { collectionSlug, data } = props

  // `data` on ListViewServerProps is the admin `Data` loose record; the real
  // paginated result reaches the client through ListQueryProvider, which the
  // grid reads via useListQuery(). Pass it through typed as the grid expects.
  const paginated = data as unknown as React.ComponentProps<typeof MediaCardGrid>['data']

  return <MediaCardGrid collectionSlug={collectionSlug} data={paginated} />
}
