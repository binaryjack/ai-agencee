interface Props {
  label:      string
  className?: string
}

/** A red cross bullet — used for "not included" lists on pricing cards. */
export function CrossItem({ label, className = '' }: Props) {
  return (
    <li className={`flex items-start gap-2 text-sm text-neutral-500 ${className}`}>
      <span className="mt-0.5 shrink-0 text-danger-500" aria-hidden>✗</span>
      {label}
    </li>
  )
}
