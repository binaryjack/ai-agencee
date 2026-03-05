import sharedPreset from '../ui/tailwind.preset.cjs'

/** @type {import('tailwindcss').Config} */
export default {
  presets: [sharedPreset],
  content:  [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../ui/src/**/*.{ts,tsx}',  // shared components also use these classes
  ],
  darkMode: 'class',
}
