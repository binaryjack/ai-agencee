import { SectionWrapper } from '@/components/layout/SectionWrapper'
import { CtaBanner } from '@/components/organisms/CtaBanner'
import { PricingSection } from '@/components/organisms/PricingSection'

export const metadata = {
  title:       'Pricing — ai-agencee',
  description: 'Simple, transparent pricing. Free CLI + 3 SaaS tiers. No API key required to evaluate.',
}

export default function PricingPage() {
  return (
    <>
      <SectionWrapper width="wide">
        <PricingSection />
      </SectionWrapper>

      <SectionWrapper className="border-t border-neutral-700/40 pt-12">
        <CtaBanner />
      </SectionWrapper>
    </>
  )
}
