import type { NextConfig } from 'next'
import path from 'node:path'

const config: NextConfig = {
  // Transpile the monorepo ui package (ESM source)
  transpilePackages: ['@ai-agencee/ui'],

  webpack(cfg, { webpack }) {
    cfg.resolve.alias = {
      ...cfg.resolve.alias,
      '@ai-agencee/ui': path.resolve(__dirname, '../ui/src'),
    }
    // When the ui package source imports './badge.js', webpack must also try
    // '.ts' and '.tsx' — required for ESM TypeScript source with bundler
    // moduleResolution (the .js extension is written in source but resolves
    // to the matching .ts/.tsx file at build time).
    cfg.resolve.extensionAlias = {
      ...cfg.resolve.extensionAlias,
      '.js': ['.js', '.ts', '.tsx'],
    }
    // @pulsar-framework/formular.dev ships a lazy require("./schema/presets")
    // inside createFormFromPreset() that was never included in the dist bundle.
    // Webpack statically analyses all require() calls and fails at build time.
    // Replace it with a no-op stub — createFormFromPreset is never called here.
    cfg.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /\/schema\/presets$/,
        (resource: { context?: string; request: string }) => {
          if (resource.context?.includes('formular.dev')) {
            resource.request = path.resolve(__dirname, 'src/stubs/formular-presets.js')
          }
        },
      ),
    )
    return cfg
  },
}

export default config
