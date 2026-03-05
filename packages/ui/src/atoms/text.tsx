import type { HTMLAttributes, ReactNode } from 'react'

type Variant = 'default' | 'muted' | 'danger' | 'success'

const variantClass: Record<Variant, string> = {
  default: 'text-neutral-800 dark:text-neutral-200',
  muted:   'text-neutral-500 dark:text-neutral-400',
  danger:  'text-danger-700  dark:text-danger-500',
  success: 'text-success-700 dark:text-success-500',
}

interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  variant?: Variant
  size?:    'xs' | 'sm' | 'base' | 'lg'
  children: ReactNode
}

export function Text({
  variant   = 'default',
  size      = 'base',
  className = '',
  children,
  ...rest
}: TextProps) {
  return (
    <p
      {...rest}
      className={[
        `text-${size}`,
        variantClass[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </p>
  )
}
