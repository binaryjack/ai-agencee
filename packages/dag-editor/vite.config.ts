import { defineConfig } from 'vite'
import react            from '@vitejs/plugin-react'
import path             from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Allow @ai-agencee/ui to be resolved from workspace sources
      '@ai-agencee/ui': path.resolve(__dirname, '../ui/src'),
    },
  },
  server: {
    port: 5174,
  },
  build: {
    outDir:    'dist',
    sourcemap: true,
  },
})
