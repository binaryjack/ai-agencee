import { CheckItem } from '@/components/atoms/CheckItem'
import { CrossItem } from '@/components/atoms/CrossItem'
import type { PricingTier } from '@/data/pricing'

interface Props {
  tier: PricingTier
}

export function PricingTierCard({ tier }: Props) {
  const isCustom  = tier.monthlyUsd === null
  const isFree    = tier.monthlyUsd === 0

  return (
    <article
      className={[
        'relative flex flex-col gap-5 rounded-node border p-6',
        tier.highlighted
          ? 'border-brand-500 bg-brand-900/30 shadow-lg shadow-brand-900/40'
          : 'border-neutral-700 bg-neutral-800',
      ].join(' ')}
    >
      {/* Popular badge */}
      {tier.badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-0.5 text-xs font-semibold text-white">
          {tier.badge}
        </span>
      )}

      {/* Tier name + price */}
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-bold text-neutral-100">{tier.name}</h3>
        <div className="flex items-baseline gap-1">
          {isCustom ? (
            <span className="text-3xl font-extrabold text-neutral-100">Custom</span>
          ) : (
            <>
              <span className="text-4xl font-extrabold text-neutral-100">
                {isFree ? 'Free' : `$${tier.monthlyUsd}`}
              </span>
              {!isFree && (
                <span className="text-sm text-neutral-400">/ month</span>
              )}
            </>
          )}
        </div>
        {tier.yearlyUsd && !isCustom && (
          <p className="text-xs text-neutral-500">
            ${tier.yearlyUsd} billed annually (save ${(tier.monthlyUsd! * 12) - tier.yearlyUsd})
          </p>
        )}
        <p className="mt-1 text-xs text-neutral-400">{tier.description}</p>
      </div>

      {/* CTA */}
      <a
        href={tier.ctaHref}
        className={[
          'block rounded-node px-4 py-2.5 text-center text-sm font-semibold transition-colors',
          tier.highlighted
            ? 'bg-brand-500 text-white hover:bg-brand-400'
            : 'border border-neutral-600 text-neutral-200 hover:border-brand-500 hover:text-brand-400',
        ].join(' ')}
      >
        {tier.ctaLabel}
      </a>

      {/* Key limits */}
      <div className="flex flex-col gap-0.5 rounded-node bg-neutral-700/40 px-3 py-2 text-xs">
        <span className="text-neutral-400">
          <strong className="text-neutral-200">Tokens:</strong>{' '}
          {tier.tokenLimitPerMonth}
        </span>
        <span className="text-neutral-400">
          <strong className="text-neutral-200">Concurrent runs:</strong>{' '}
          {tier.concurrentRuns === null ? 'Unlimited' : tier.concurrentRuns}
        </span>
      </div>

      {/* Included features */}
      <ul className="flex flex-col gap-1.5">
        {tier.features.map((f) => (
          <CheckItem key={f.label} label={f.label} />
        ))}
      </ul>

      {/* Not included */}
      {tier.notIncluded.length > 0 && (
        <ul className="flex flex-col gap-1.5 border-t border-neutral-700 pt-3">
          {tier.notIncluded.map((item) => (
            <CrossItem key={item} label={item} />
          ))}
        </ul>
      )}
    </article>
  )
}
