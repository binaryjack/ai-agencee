import { GradientText } from '@/components/atoms/GradientText'
import { SectionLabel } from '@/components/atoms/SectionLabel'
import { AgentCard } from '@/components/molecules/AgentCard'
import { AGENT_TYPES } from '@/data/agents'

export function AgentTypesShowcase() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <SectionLabel>Agent Roster</SectionLabel>
        <h2 className="text-3xl font-extrabold text-neutral-100">
          Specialised agents, <GradientText>coordinated by the DAG</GradientText>
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-400">
          Each agent is a focused expert. The DAG engine assigns tasks, enforces quality
          checkpoints, and routes failures — so agents never need to coordinate manually.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {AGENT_TYPES.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  )
}
