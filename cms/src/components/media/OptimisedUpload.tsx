import type React from 'react'

import { OptimisedUpload } from './OptimisedUpload.client'

/**
 * Server half of the media upload control.
 *
 * Referenced from `Media.ts` as the documented string descriptor
 * `'@/components/media/OptimisedUpload#OptimisedUploadServer'`. Payload's
 * `admin.components.edit.Upload` slot takes a *path*, not a component — it
 * resolves and loads this module at runtime, which is why the tsconfig `@/*`
 * alias exists.
 *
 * The docs are explicit that a bare `<input type="file" />` will not connect to
 * Payload's upload API, so this hands off to the client component, which wraps
 * Payload's own `<Upload>` and compresses the chosen file before it sees it.
 */
export const OptimisedUploadServer = (): React.ReactElement => {
  return <OptimisedUpload />
}
