import type { NextConfig } from 'next'
import path from 'node:path'

const config: NextConfig = {
  // Transpile the monorepo ui package (ESM source)
  transpilePackages: ['@ai-agencee/ui'],

  webpack(cfg) {
    cfg.resolve.alias = {
      ...cfg.resolve.alias,
      '@ai-agencee/ui': path.resolve(__dirname, '../ui/src'),
    }
    return cfg
  },
}

export default config
