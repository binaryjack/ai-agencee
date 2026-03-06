export interface NpmPackageData {
  name:        string
  version:     string
  label:       string
  description: string
  npmUrl:      string
  docs:        string | null
}

interface Props {
  pkg: NpmPackageData
}

export function NpmPackageCard({ pkg }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-node border border-neutral-700 bg-neutral-800 p-5">
      <div className="flex items-start justify-between gap-2">
        <a
          href={pkg.npmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-brand-400 hover:text-brand-300 transition-colors break-all"
        >
          {pkg.name}
        </a>
        <span className="shrink-0 rounded-full border border-neutral-600 bg-neutral-700/40 px-2 py-0.5 text-[10px] font-semibold text-neutral-300">
          v{pkg.version}
        </span>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-brand-500">
        {pkg.label}
      </span>
      <p className="text-xs leading-relaxed text-neutral-400">{pkg.description}</p>
      {pkg.docs && (
        <a
          href={pkg.docs}
          className="mt-auto text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
        >
          Read docs →
        </a>
      )}
    </div>
  )
}
