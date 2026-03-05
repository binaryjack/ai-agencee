import type { ReactNode } from 'react'

interface Props {
  children:    ReactNode
  className?:  string
  id?:         string
  /** Controls the max-width of the inner container */
  width?:      'narrow' | 'default' | 'wide' | 'full'
}

const widthMap: Record<NonNullable<Props['width']>, string> = {
  narrow:  'max-w-3xl',
  default: 'max-w-5xl',
  wide:    'max-w-7xl',
  full:    'max-w-none',
}

/** Consistent section padding + centred max-width container. */
export function SectionWrapper({ children, className = '', id, width = 'default' }: Props) {
  return (
    <section id={id} className={`w-full px-6 py-20 ${className}`}>
      <div className={`mx-auto ${widthMap[width]}`}>
        {children}
      </div>
    </section>
  )
}
