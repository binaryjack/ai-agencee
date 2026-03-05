import { SectionLabel } from '@/components/atoms/SectionLabel'
import { GradientText } from '@/components/atoms/GradientText'
import { FeatureCard } from '@/components/molecules/FeatureCard'
import { FEATURES } from '@/data/features'
import type { Feature } from '@/data/features'

const CATEGORY_LABELS: Record<Feature['category'], string> = {
  orchestration: 'Orchestration & Execution',
  enterprise:    'Enterprise & Security',
  dx:            'Developer Experience',
  observability: 'Observability',
}

/** Groups features by category and renders them in labelled grids. */
export function FeatureHighlights() {
  const categories = Object.keys(CATEGORY_LABELS) as Feature['category'][]

  return (
    <div className="flex flex-col gap-14">
      <div className="flex flex-col gap-2">
        <SectionLabel>Capabilities</SectionLabel>
        <h2 className="text-3xl font-extrabold text-neutral-100">
          Everything for <GradientText>enterprise AI workflows</GradientText>
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-400">
          12 production-grade capabilities — orchestration, resilience, compliance, and developer
          tooling — all in a single zero-configuration package.
        </p>
      </div>

      {categories.map((cat) => {
        const group = FEATURES.filter((f) => f.category === cat)
        if (!group.length) return null
        return (
          <div key={cat} className="flex flex-col gap-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
              {CATEGORY_LABELS[cat]}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((f) => (
                <FeatureCard key={f.id} feature={f} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
