interface Props {
  icon:        string
  title:       string
  description: string
  href:        string
  cta:         string
}

export function ContributionCard({ icon, title, description, href, cta }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col gap-3 rounded-node border border-neutral-700 bg-neutral-800 p-5 hover:border-brand-500 transition-colors"
    >
      <span className="text-2xl" aria-hidden>{icon}</span>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-bold text-neutral-100">{title}</h3>
        <p className="text-xs leading-relaxed text-neutral-400">{description}</p>
      </div>
      <span className="mt-auto text-xs font-medium text-brand-400">{cta}</span>
    </a>
  )
}
