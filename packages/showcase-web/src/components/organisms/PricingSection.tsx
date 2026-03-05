import { GradientText } from '@/components/atoms/GradientText'
import { SectionLabel } from '@/components/atoms/SectionLabel'
import { FaqList } from '@/components/molecules/FaqList'
import { PricingTierCard } from '@/components/molecules/PricingTierCard'
import { PRICING_FAQ, PRICING_TIERS } from '@/data/pricing'

export function PricingSection() {
  return (
    <div className="flex flex-col gap-16">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <SectionLabel>Pricing</SectionLabel>
        <h2 className="text-3xl font-extrabold text-neutral-100 sm:text-4xl">
          Simple, <GradientText>transparent pricing</GradientText>
        </h2>
        <p className="max-w-lg text-sm leading-relaxed text-neutral-400">
          Start free — no credit card required. Upgrade when you need real LLM providers,
          managed keys, or enterprise compliance.
        </p>
      </div>

      {/* Tiers grid */}
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {PRICING_TIERS.map((tier) => (
          <PricingTierCard key={tier.id} tier={tier} />
        ))}
      </div>

      {/* Cost transparency note */}
      <div className="rounded-node border border-brand-700/40 bg-brand-900/20 px-6 py-5">
        <h3 className="mb-2 text-sm font-semibold text-brand-300">Token economics</h3>
        <p className="text-xs leading-relaxed text-neutral-400">
          On the <strong className="text-neutral-200">Starter</strong> tier we estimate ~$9/month
          in provider costs at 1 M tokens — giving us ~69 % margin at $29.
          On <strong className="text-neutral-200">Professional</strong> the token resale is
          break-even; margin comes from seat + support.
          <strong className="text-neutral-200"> Enterprise</strong> bulk provider discounts yield
          ~50 %+ margin at the $2 K+/month price point.{' '}
          <a
            href="https://github.com/binaryjack/ai-starter-kit"
            className="text-brand-400 hover:underline"
          >
            Open-source CLI is always free. ↗
          </a>
        </p>
      </div>

      {/* FAQ */}
      <div className="flex flex-col gap-6">
        <h3 className="text-xl font-bold text-neutral-100">Frequently asked questions</h3>
        <FaqList items={PRICING_FAQ} />
      </div>
    </div>
  )
}
