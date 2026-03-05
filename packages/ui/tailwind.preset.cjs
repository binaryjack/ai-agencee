/**
 * Shared Tailwind CSS preset — consumed by dag-editor and showcase-web.
 *
 * Usage in tailwind.config.ts:
 *   import sharedPreset from '@ai-agencee/ui/tailwind.preset'
 *   export default { presets: [sharedPreset], content: ['./src/**\/*.tsx'] }
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        success: {
          100: '#dcfce7',
          500: '#22c55e',
          700: '#15803d',
        },
        warning: {
          100: '#fef9c3',
          500: '#f59e0b',
          700: '#b45309',
        },
        danger: {
          100: '#fee2e2',
          500: '#ef4444',
          700: '#b91c1c',
        },
        neutral: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      borderRadius: {
        node: '0.5rem',
      },
    },
  },
  plugins: [],
}
