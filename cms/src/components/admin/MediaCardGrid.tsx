'use client'

import { ListControls, Pagination, useConfig, useListQuery } from '@payloadcms/ui'

/**
 * Card-grid list view for upload collections — large thumbnails instead of a
 * table row per document.
 *
 * ## Composition (documented building blocks, types verified against the
 * installed @payloadcms/ui 3.90.2)
 *
 * Payload wraps every collection list view in `ListQueryProvider`, so this
 * client component reads the live query state (search, page, sort, filters)
 * from `useListQuery()` — the same state `ListControls` and `Pagination`
 * mutate (`IListQueryContext.data` is the `PaginatedDocs` result).
 * `ListControls` renders the standard toolbar and `Pagination` the pager, so
 * search/filters/sort/pagination keep Payload's behaviour with zero custom
 * wiring.
 *
 * ## Data shape
 *
 * Each media doc carries `url` (its R2 URL), `filename`, `mimeType`,
 * `width`/`height` and `alt`. Cards link to the edit view; the collection
 * slug arrives from the server view (which reads it from its own props —
 * the slug is also on the context, but the prop keeps the component honest
 * about which collection it renders).
 *
 * ## Why a full view override
 *
 * Payload's list view is a table; the owner asked for card-based pages with
 * large thumbnails for the asset collections. Cells inside a table cannot
 * become a grid — the view itself must render the grid.
 */
export type MediaCardGridProps = {
  collectionSlug: string
  /** The server view passes the page's already-fetched result through. */
  data?: {
    docs: Array<Record<string, unknown>>
    hasNextPage?: boolean
    hasPrevPage?: boolean
    nextPage?: null | number
    page?: number
    prevPage?: null | number
    totalDocs: number
    totalPages: number
  }
}

export function MediaCardGrid({ collectionSlug, data: serverData }: MediaCardGridProps) {
  // Prefer the live query state (updates on search/sort/page); the server
  // prop is the initial render's snapshot and the fallback for first paint.
  const { data: queryData } = useListQuery()
  const data = queryData ?? serverData
  const config = useConfig()
  const collectionConfig = config.getEntityConfig({ collectionSlug })

  const docs = data?.docs ?? []
  const _totalDocs = data?.totalDocs ?? 0
  const totalPages = data?.totalPages ?? 0
  const page = data?.page ?? 1

  return (
    <div className="media-grid">
      {collectionConfig && (
        <ListControls
          collectionConfig={collectionConfig}
          collectionSlug={collectionSlug}
          enableColumns={false}
          enableSort={false}
        />
      )}
      {docs.length === 0 ? (
        <div className="media-grid__empty">
          <p aria-hidden className="media-grid__empty-emoji">
            🖼️
          </p>
          <p className="media-grid__empty-title">No results found</p>
        </div>
      ) : (
        <ul className="media-grid__cards">
          {docs.map((doc) => {
            const isImage = typeof doc.mimeType === 'string' && doc.mimeType.startsWith('image/')
            const src = typeof doc.url === 'string' ? doc.url : ''
            const filename = typeof doc.filename === 'string' ? doc.filename : String(doc.id)
            const label = typeof doc.alt === 'string' && doc.alt ? doc.alt : filename
            return (
              <li className="media-grid__card" key={String(doc.id)}>
                <a
                  aria-label={label}
                  className="media-grid__card-link"
                  href={`/admin/collections/${collectionSlug}/${doc.id}`}
                >
                  <div className="media-grid__thumb">
                    {isImage && src ? (
                      // biome-ignore lint/performance/noImgElement: the admin panel is a private Next app, not the storefront — next/image adds nothing here and thumbnails come from R2 at native size.
                      <img alt="" className="media-grid__img" loading="lazy" src={src} />
                    ) : (
                      <span aria-hidden className="media-grid__fallback">
                        📄
                      </span>
                    )}
                  </div>
                  <div className="media-grid__meta">
                    <p className="media-grid__filename">{filename}</p>
                    {typeof doc.width === 'number' && typeof doc.height === 'number' && (
                      <p className="media-grid__dims">
                        {doc.width}×{doc.height}
                      </p>
                    )}
                  </div>
                </a>
              </li>
            )
          })}
        </ul>
      )}
      {totalPages > 1 && (
        <Pagination
          hasNextPage={data?.hasNextPage}
          hasPrevPage={data?.hasPrevPage}
          nextPage={data?.nextPage ?? undefined}
          page={page}
          prevPage={data?.prevPage ?? undefined}
          totalPages={totalPages}
        />
      )}
    </div>
  )
}
