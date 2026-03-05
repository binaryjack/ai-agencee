import { SectionWrapper } from '@/components/layout/SectionWrapper'
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

export const metadata = {
  title:       'Features — ai-agencee',
  description: '12 enterprise-grade capabilities for production AI workflows: DAG orchestration, model routing, resilience, RBAC, audit logging, MCP, and more.',
}

export default function FeaturesPage() {
  const categories = Object.keys(CATEGORY_LABELS) as Feature['category'][]

  return (
    <>
      {/* Page header */}
      <SectionWrapper width="narrow" className="pb-8 pt-20">
        <SectionLabel>Features</SectionLabel>
        <h1 className="mt-2 text-4xl font-extrabold text-neutral-100 sm:text-5xl">
          <GradientText>12 enterprise-grade</GradientText> capabilities
        </h1>
        <p className="mt-4 text-base leading-relaxed text-neutral-400">
          Everything you need to build, deploy, and operate production AI workflows —
          from a single JSON file to fully compliance-ready multi-tenant orchestration.
        </p>
      </SectionWrapper>

      {/* Feature groups */}
      {categories.map((cat) => {
        const group = FEATURES.filter((f) => f.category === cat)
        if (!group.length) return null
        return (
          <SectionWrapper key={cat} className="pt-0">
            <div className="flex flex-col gap-5">
              <div className="border-b border-neutral-700/60 pb-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                  {CATEGORY_LABELS[cat]}
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.map((f) => (
                  <FeatureCard key={f.id} feature={f} />
                ))}
              </div>
            </div>
          </SectionWrapper>
        )
      })}
    </>
  )
}
