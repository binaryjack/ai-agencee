import type { Config } from 'tailwindcss'
import sharedPreset    from '../ui/tailwind.preset.cjs'

const config: Config = {
  presets: [sharedPreset],
  content: [
    './src/**/*.{ts,tsx}',
    '../ui/src/**/*.{ts,tsx}',
  ],
}

export default config
