/**
 * AI Agencee Icon System
 * Branded SVG icons matching the AI Agencee design language
 */

import { type ComponentProps } from 'react'

export type IconName =
  // Node types
  | 'worker'
  | 'supervisor'
  | 'trigger'
  | 'budget'
  // Main agents
  | 'business-analyst'
  | 'architecture'
  | 'backend'
  | 'frontend'
  | 'testing'
  | 'e2e'
  // Features & misc
  | 'branching'
  | 'security'
  | 'performance'
  | 'auth'
  | 'document'
  | 'enterprise'
  | 'encryption'
  | 'plugin'
  | 'modular'
  | 'api'
  | 'code-review'
  | 'summary'
  | 'search'
  | 'user'
  | 'database'
  | 'mobile'
  | 'target'
  | 'rocket'
  | 'sync'
  | 'map'
  | 'bug'
  | 'idea'
  | 'package'
  | 'cloud'
  | 'network'
  | 'tools'
  | 'metrics'
  | 'mail'
  | 'calendar'
  // UI elements
  | 'check'
  | 'close'
  | 'warning'
  | 'checkbox'

interface IconProps extends Omit<ComponentProps<'img'>, 'src' | 'alt'> {
  name: IconName
  theme?: 'light' | 'dark' | 'auto'
  size?: number | string
  alt?: string
}

const ICON_CATEGORIES: Record<
  string,
  'nodes' | 'agents' | 'features' | 'ui'
> = {
  worker: 'nodes',
  supervisor: 'nodes',
  trigger: 'nodes',
  budget: 'nodes',
  'business-analyst': 'agents',
  architecture: 'agents',
  backend: 'agents',
  frontend: 'agents',
  testing: 'agents',
  e2e: 'agents',
  'code-review': 'agents',
  summary: 'agents',
  search: 'agents',
  user: 'agents',
  database: 'agents',
  mobile: 'agents',
  target: 'agents',
  rocket: 'agents',
  sync: 'agents',
  map: 'agents',
  bug: 'agents',
  idea: 'agents',
  package: 'agents',
  cloud: 'agents',
  network: 'agents',
  tools: 'agents',
  metrics: 'agents',
  mail: 'agents',
  calendar: 'agents',
  branching: 'features',
  security: 'features',
  performance: 'features',
  auth: 'features',
  document: 'features',
  enterprise: 'features',
  encryption: 'features',
  plugin: 'features',
  modular: 'features',
  api: 'features',
  check: 'ui',
  close: 'ui',
  warning: 'ui',
  checkbox: 'ui',
}

/**
 * Get the icon SVG path
 */
export function getIconPath(
  name: IconName,
  theme: 'light' | 'dark' = 'light',
): string {
  const category = ICON_CATEGORIES[name] || 'agents'
  return `/art-kit/icons/${category}/${name}-${theme}.svg`
}

/**
 * Icon component - renders branded SVG icons with theme support
 */
export function Icon({
  name,
  theme = 'auto',
  size = 24,
  alt,
  className = '',
  ...props
}: IconProps) {
  // Auto-detect theme from system/CSS if theme is 'auto'
  const resolvedTheme =
    theme === 'auto'
      ? typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme

  const iconPath = getIconPath(name, resolvedTheme)
  const defaultAlt = alt ?? name.replace(/-/g, ' ')

  return (
    <img
      src={iconPath}
      alt={defaultAlt}
      width={size}
      height={size}
      className={className}
      {...props}
    />
  )
}

/**
 * Icon mapping for backward compatibility with emoji-based systems
 */
export const EMOJI_TO_ICON: Record<string, IconName> = {
  '🤖': 'worker',
  '👁': 'supervisor',
  '⚡': 'trigger',
  '💰': 'budget',
  '📋': 'business-analyst',
  '🏗️': 'architecture',
  '⚙️': 'backend',
  '🎨': 'frontend',
  '🧪': 'testing',
  '🌐': 'e2e',
  '🔀': 'branching',
  '🛡️': 'security',
  '🔐': 'auth',
  '🏢': 'enterprise',
  '🔏': 'encryption',
  '🔌': 'plugin',
  '🧱': 'modular',
  '📡': 'api',
  '🔍': 'search',
  '📝': 'code-review',
  '📦': 'package',
  '✓': 'check',
  '✗': 'close',
  '⚠️': 'warning',
  '✅': 'checkbox',
}

/**
 * Convert emoji to icon name
 */
export function emojiToIcon(emoji: string): IconName | null {
  return EMOJI_TO_ICON[emoji] || null
}
