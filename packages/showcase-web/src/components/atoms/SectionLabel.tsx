interface Props {
  children:   string
  className?: string
}

/** Small uppercase overline label used above section headings. */
export function SectionLabel({ children, className = '' }: Props) {
  return (
    <p className={`text-xs font-semibold uppercase tracking-widest text-brand-400 ${className}`}>
      {children}
    </p>
  )
}
