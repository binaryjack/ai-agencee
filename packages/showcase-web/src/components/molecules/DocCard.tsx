import type { DocTopic } from '@/data/docs'
import { Icon } from '@ai-agencee/ui/icons'

interface Props {
  readonly topic: DocTopic
}

export function DocCard({ topic }: Props) {
  return (
    <a
      href={`/docs/${topic.slug}`}
      className="flex flex-col gap-3 rounded-node border border-neutral-700 bg-neutral-800 p-5 hover:border-brand-500 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon name={topic.icon} theme="dark" size={20} />
        <span className="text-sm font-semibold text-neutral-100">{topic.title}</span>
      </div>
      <p className="text-xs leading-relaxed text-neutral-400">{topic.description}</p>
      <span className="mt-auto text-xs font-medium text-brand-400">Read docs →</span>
    </a>
  )
}
