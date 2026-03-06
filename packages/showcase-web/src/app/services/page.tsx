import { SectionWrapper } from '@/components/layout/SectionWrapper'
import { CtaBanner } from '@/components/organisms/CtaBanner'
import { ServicesSection } from '@/components/organisms/ServicesSection'

export const metadata = {
  title:       'Professional Services — ai-agencee',
  description: 'Enterprise onboarding, team coaching, custom agent development, and architecture reviews — expert help to get your engineering team production-ready with ai-agencee.',
  keywords:    'ai-agencee consulting, enterprise AI coaching, multi-agent orchestration services, DAG workflow setup',
}

export default function ServicesPage() {
  return (
    <>
      <SectionWrapper>
        <ServicesSection />
      </SectionWrapper>

      <SectionWrapper className="border-t border-neutral-700/40 pt-12">
        <CtaBanner />
      </SectionWrapper>
    </>
  )
}
