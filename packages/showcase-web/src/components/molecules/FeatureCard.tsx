import type { Feature } from '@/data/features'

interface Props {
  feature: Feature
}

export function FeatureCard({ feature }: Props) {
  return (
    <article className="flex flex-col gap-3 rounded-node border border-neutral-700 bg-neutral-800 p-5 hover:border-brand-500 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden>{feature.icon}</span>
        <h3 className="text-sm font-semibold text-neutral-100">{feature.title}</h3>
      </div>
      <p className="text-xs leading-relaxed text-neutral-400">{feature.description}</p>
      {feature.docsPath && (
        <a
          href={feature.docsPath}
          className="mt-auto text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
        >
          Learn more →
        </a>
      )}
    </article>
  )
}
