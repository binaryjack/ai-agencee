import { SectionWrapper } from '@/components/layout/SectionWrapper'
import { CtaBanner } from '@/components/organisms/CtaBanner'
import { DocsTopicsGrid } from '@/components/organisms/DocsTopicsGrid'

export const metadata = {
  title:       'Documentation — ai-agencee',
  description: 'Complete reference documentation for ai-agencee: DAG orchestration, model routing, CLI, MCP, RBAC, audit logging, and more.',
}

export default function DocsPage() {
  return (
    <>
      <SectionWrapper width="wide">
        <DocsTopicsGrid />
      </SectionWrapper>

      <SectionWrapper className="border-t border-neutral-700/40 pt-12">
        <CtaBanner />
      </SectionWrapper>
    </>
  )
}
