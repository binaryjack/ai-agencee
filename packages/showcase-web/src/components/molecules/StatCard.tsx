interface Props {
  value:      string
  label:      string
  sublabel?:  string
  className?: string
}

/** A single metric — large bold value + descriptive label. */
export function StatCard({ value, label, sublabel, className = '' }: Props) {
  return (
    <div className={`flex flex-col items-center gap-1 text-center ${className}`}>
      <span className="text-3xl font-extrabold text-brand-400">{value}</span>
      <span className="text-sm font-semibold text-neutral-200">{label}</span>
      {sublabel && <span className="text-xs text-neutral-500">{sublabel}</span>}
    </div>
  )
}
