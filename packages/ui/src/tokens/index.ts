/** Design token constants — shared source of truth for non-Tailwind contexts. */

export const colors = {
  brand:   { 500: '#6366f1', 700: '#4338ca' },
  success: { 500: '#22c55e' },
  warning: { 500: '#f59e0b' },
  danger:  { 500: '#ef4444' },
  neutral: { 500: '#64748b', 800: '#1e293b' },
} as const

/** Status → Tailwind color class mapping (used by Badge, DagNode overlays). */
export const statusColor = {
  success: 'bg-success-100 text-success-700 border-success-500',
  warning: 'bg-warning-100 text-warning-700 border-warning-500',
  failed:  'bg-danger-100  text-danger-700  border-danger-500',
  running: 'bg-brand-100   text-brand-700   border-brand-500',
  pending: 'bg-neutral-100 text-neutral-600 border-neutral-300',
  partial: 'bg-warning-100 text-warning-700 border-warning-500',
} as const

/** Status → Tailwind hex themeColor map (used by Teams MessageCard). */
export const statusHex = {
  success: '22c55e',
  failed:  'ef4444',
  partial: 'f59e0b',
  running: '6366f1',
  pending: '64748b',
} as const

export type StatusKey = keyof typeof statusColor
