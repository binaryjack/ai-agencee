import type { ReactNode, ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

const variantClass: Record<Variant, string> = {
  primary:   'bg-brand-500 hover:bg-brand-600 text-white border-transparent',
  secondary: 'bg-white dark:bg-neutral-800 hover:bg-neutral-50 text-neutral-800 dark:text-neutral-100 border-neutral-300 dark:border-neutral-600',
  ghost:     'bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-transparent',
  danger:    'bg-danger-500 hover:bg-danger-600 text-white border-transparent',
}

const sizeClass: Record<Size, string> = {
  sm: 'px-2.5 py-1   text-xs',
  md: 'px-4   py-1.5 text-sm',
  lg: 'px-6   py-2   text-base',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant
  size?:     Size
  loading?:  boolean
  children:  ReactNode
}

export function Button({
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading
  return (
    <button
      {...rest}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center gap-1.5',
        'rounded-node border font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        variantClass[variant],
        sizeClass[size],
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {loading && (
        <span
          className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"
          aria-hidden
        />
      )}
      {children}
    </button>
  )
}
