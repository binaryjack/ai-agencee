import { Badge } from '../atoms/badge.js'
import type { StatusKey } from '../tokens/index.js'

interface StatBoxProps {
  label:      string
  value:      string | number
  unit?:      string
  status?:    StatusKey
  className?: string
}

export function StatBox({ label, value, unit, status, className = '' }: StatBoxProps) {
  return (
    <div
      className={[
        'flex flex-col gap-1 rounded-node border border-neutral-200 dark:border-neutral-700',
        'bg-white dark:bg-neutral-800 px-4 py-3',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
          {value}
        </span>
        {unit && (
          <span className="text-xs text-neutral-400">{unit}</span>
        )}
      </div>
      {status && <Badge status={status} label={status} dot />}
    </div>
  )
}
