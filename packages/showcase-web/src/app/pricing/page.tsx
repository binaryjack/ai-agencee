import { SectionWrapper } from '@/components/layout/SectionWrapper'
import { CtaBanner } from '@/components/organisms/CtaBanner'
import { PricingSection } from '@/components/organisms/PricingSection'

export const metadata = {
  title:       'Pricing — ai-agencee',
  description: 'The CLI & engine are free and open-source today. Cloud tiers (Starter, Professional, Enterprise) are fully designed and coming soon — join the waitlist.',
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
