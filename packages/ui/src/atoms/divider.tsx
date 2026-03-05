interface DividerProps {
  orientation?: 'horizontal' | 'vertical'
  className?:   string
  label?:       string
}

export function Divider({ orientation = 'horizontal', label, className = '' }: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <div
        className={[
          'w-px self-stretch bg-neutral-200 dark:bg-neutral-700',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        role="separator"
        aria-orientation="vertical"
      />
    )
  }

  if (label) {
    return (
      <div
        className={['flex items-center gap-3', className].filter(Boolean).join(' ')}
        role="separator"
      >
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
        <span className="text-xs text-neutral-400">{label}</span>
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
      </div>
    )
  }

  return (
    <hr
      className={[
        'border-t border-neutral-200 dark:border-neutral-700',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="separator"
    />
  )
}
