import type { PricingFaqItem } from '@/data/pricing'

interface Props {
  items: PricingFaqItem[]
}

export function FaqList({ items }: Props) {
  return (
    <dl className="flex flex-col gap-5">
      {items.map((item, i) => (
        <div key={i} className="rounded-node border border-neutral-700 bg-neutral-800 p-5">
          <dt className="text-sm font-semibold text-neutral-100 mb-1.5">
            {item.question}
          </dt>
          <dd className="text-sm text-neutral-400 leading-relaxed">
            {item.answer}
          </dd>
        </div>
      ))}
    </dl>
  )
}
