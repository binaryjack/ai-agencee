import { Icon } from '@ai-agencee/ui/icons'

interface Props {
  label:      string
  className?: string
}

/** A green checkmark bullet used inside feature lists. */
export function CheckItem({ label, className = '' }: Props) {
  return (
    <li className={`flex items-start gap-2 text-sm text-neutral-300 ${className}`}>
      <Icon name="check" theme="dark" size={14} className="mt-0.5 shrink-0 text-success-500" />
      {label}
    </li>
  )
}
