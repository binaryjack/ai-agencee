import { SectionLabel } from '@/components/atoms/SectionLabel'
import { GradientText } from '@/components/atoms/GradientText'
import { DocCard } from '@/components/molecules/DocCard'
import { DOC_TOPICS } from '@/data/docs'
import type { DocTopic } from '@/data/docs'

const CATEGORY_LABELS: Record<DocTopic['category'], string> = {
  orchestration: 'Orchestration',
  enterprise:    'Enterprise',
  dx:            'Developer Tools',
  observability: 'Observability',
}

export function DocsTopicsGrid() {
  const categories = Object.keys(CATEGORY_LABELS) as DocTopic['category'][]

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-2">
        <SectionLabel>Documentation</SectionLabel>
        <h2 className="text-3xl font-extrabold text-neutral-100">
          <GradientText>Deep-dive reference</GradientText> for every capability
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-400">
          Every feature is fully documented with code samples, configuration references,
          and integration guides.
        </p>
      </div>

      {categories.map((cat) => {
        const topics = DOC_TOPICS.filter((t) => t.category === cat)
        if (!topics.length) return null
        return (
          <div key={cat} className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
              {CATEGORY_LABELS[cat]}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {topics.map((t) => <DocCard key={t.id} topic={t} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
