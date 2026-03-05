import type { ReactNode } from 'react'

interface Props {
  children:   ReactNode
  className?: string
}

/** Renders children with the brand indigo gradient applied as a text colour. */
export function GradientText({ children, className = '' }: Props) {
  return (
    <span
      className={`bg-gradient-to-r from-brand-400 to-brand-300 bg-clip-text text-transparent ${className}`}
    >
      {children}
    </span>
  )
}
