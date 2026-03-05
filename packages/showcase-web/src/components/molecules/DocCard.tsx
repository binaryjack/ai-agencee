import type { DocTopic } from '@/data/docs'

interface Props {
  topic: DocTopic
}

export function DocCard({ topic }: Props) {
  return (
    <a
      href={`/docs/${topic.slug}`}
      className="flex flex-col gap-2 rounded-node border border-neutral-700 bg-neutral-800 p-5 hover:border-brand-500 transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="text-xl" aria-hidden>{topic.icon}</span>
        <span className="text-sm font-semibold text-neutral-100">{topic.title}</span>
      </div>
      <p className="text-xs leading-relaxed text-neutral-400">{topic.description}</p>
      <span className="mt-auto text-xs font-medium text-brand-400">Read docs →</span>
    </a>
  )
}
