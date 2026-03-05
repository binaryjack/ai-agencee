import type { StatusKey } from '../tokens/index.js'

interface BadgeProps {
  status?:    StatusKey
  label:      string
  className?: string
  dot?:       boolean
}

const statusClasses: Record<StatusKey, string> = {
  success: 'bg-success-100 text-success-700 border border-success-500',
  failed:  'bg-danger-100  text-danger-700  border border-danger-500',
  warning: 'bg-warning-100 text-warning-700 border border-warning-500',
  running: 'bg-brand-100   text-brand-700   border border-brand-500',
  pending: 'bg-neutral-100 text-neutral-600 border border-neutral-300',
  partial: 'bg-warning-100 text-warning-700 border border-warning-500',
}

const dotClasses: Record<StatusKey, string> = {
  success: 'bg-success-500',
  failed:  'bg-danger-500',
  warning: 'bg-warning-500',
  running: 'bg-brand-500 animate-pulse',
  pending: 'bg-neutral-400',
  partial: 'bg-warning-500',
}

export function Badge({
  status    = 'pending',
  label,
  dot       = false,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        statusClasses[status],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${dotClasses[status]}`}
          aria-hidden
        />
      )}
      {label}
    </span>
  )
}
