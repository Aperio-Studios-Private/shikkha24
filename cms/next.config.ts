import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  /**
   * `standalone` traces only the modules actually imported at runtime, so the
   * shipped bundle is ≈300–600 MB instead of a full `node_modules` (0.7–1.2 GB).
   * This is what makes the 2 GB DianaHost plan viable — see
   * `docs/hosting-and-deployment.md` §1 and the S0 "measure standalone size" gate.
   */
  output: 'standalone',
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    /**
     * Monorepo fix. Next detects the workspace root by finding the nearest
     * package-manager lockfile — here `pnpm-lock.yaml` at the repository root —
     * and pnpm hoists `next` there rather than into `cms/node_modules`.
     *
     * Payload's blank template pins this to the cms directory, which is correct
     * for a standalone app and breaks a pnpm monorepo with:
     *   "Could not find the Next.js package (next/package.json)"
     * Point it at the repository root instead.
     */
    root: path.resolve(dirname, '..'),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
