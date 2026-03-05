import { SectionWrapper } from '@/components/layout/SectionWrapper'
import { HeroSection } from '@/components/organisms/HeroSection'
import { FeatureHighlights } from '@/components/organisms/FeatureHighlights'
import { WorkflowSteps } from '@/components/organisms/WorkflowSteps'
import { ComparisonMatrix } from '@/components/organisms/ComparisonMatrix'
import { ModelRoutingTable } from '@/components/organisms/ModelRoutingTable'
import { AgentTypesShowcase } from '@/components/organisms/AgentTypesShowcase'
import { QuickInstall } from '@/components/organisms/QuickInstall'
import { CtaBanner } from '@/components/organisms/CtaBanner'

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
