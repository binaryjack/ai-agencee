import type { AgentType } from '@/data/agents'

interface Props {
  agent: AgentType
}

export function AgentCard({ agent }: Props) {
  return (
    <article className="flex flex-col gap-3 rounded-node border border-neutral-700 bg-neutral-800 p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-neutral-100">{agent.name}</h3>
        <span className="shrink-0 rounded-full bg-neutral-700 px-2 py-0.5 text-[10px] font-medium text-neutral-300">
          {agent.role}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-neutral-400">{agent.description}</p>
      <div className="flex flex-wrap gap-1.5 mt-auto">
        {agent.capabilities.map((cap) => (
          <span
            key={cap}
            className="rounded-full border border-brand-700 bg-brand-900/30 px-2 py-0.5 text-[10px] text-brand-300"
          >
            {cap}
          </span>
        ))}
      </div>
    </article>
  )
}
