import { SectionWrapper } from '@/components/layout/SectionWrapper'
import { AgentTypesShowcase } from '@/components/organisms/AgentTypesShowcase'
import { ComparisonMatrix } from '@/components/organisms/ComparisonMatrix'
import { CtaBanner } from '@/components/organisms/CtaBanner'
import { FeatureHighlights } from '@/components/organisms/FeatureHighlights'
import { HeroSection } from '@/components/organisms/HeroSection'
import { ModelRoutingTable } from '@/components/organisms/ModelRoutingTable'
import { QuickInstall } from '@/components/organisms/QuickInstall'
import { WorkflowSteps } from '@/components/organisms/WorkflowSteps'

export default function HomePage() {
  return (
    <>
      {/* Hero — full-width, no SectionWrapper (handles its own padding) */}
      <HeroSection />

      {/* Features by category */}
      <SectionWrapper id="features" className="border-t border-neutral-700/40">
        <FeatureHighlights />
      </SectionWrapper>

      {/* 5-phase workflow */}
      <SectionWrapper id="workflow" className="bg-neutral-800/20 border-y border-neutral-700/40">
        <WorkflowSteps />
      </SectionWrapper>

      {/* Agent roster */}
      <SectionWrapper id="agents">
        <AgentTypesShowcase />
      </SectionWrapper>

      {/* Model routing table */}
      <SectionWrapper id="model-routing" className="bg-neutral-800/20 border-y border-neutral-700/40">
        <ModelRoutingTable />
      </SectionWrapper>

      {/* Us vs alternatives */}
      <SectionWrapper id="comparison">
        <ComparisonMatrix />
      </SectionWrapper>

      {/* Quick install */}
      <SectionWrapper id="install" className="bg-neutral-800/20 border-y border-neutral-700/40">
        <QuickInstall />
      </SectionWrapper>

      {/* CTA banner */}
      <SectionWrapper id="cta">
        <CtaBanner />
      </SectionWrapper>
    </>
  )
}
