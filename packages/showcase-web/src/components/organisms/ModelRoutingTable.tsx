import { GradientText } from '@/components/atoms/GradientText'
import { SectionLabel } from '@/components/atoms/SectionLabel'

const MODEL_ROWS = [
  { task: 'file-analysis',         family: 'haiku',  anthropic: 'claude-haiku-4-5',  openai: 'gpt-4o-mini', costPer1M: '$0.80' },
  { task: 'code-generation',       family: 'sonnet', anthropic: 'claude-sonnet-4-5', openai: 'gpt-4o',      costPer1M: '$3.00' },
  { task: 'code-review',           family: 'sonnet', anthropic: 'claude-sonnet-4-5', openai: 'gpt-4o',      costPer1M: '$3.00' },
  { task: 'architecture-decision', family: 'opus',   anthropic: 'claude-opus-4-5',   openai: 'gpt-4o',      costPer1M: '$15.00' },
  { task: 'security-review',       family: 'opus',   anthropic: 'claude-opus-4-5',   openai: 'gpt-4o',      costPer1M: '$15.00' },
]

const FAMILY_COLOR: Record<string, string> = {
  haiku:  'bg-success-700/20 text-success-400 border-success-700/40',
  sonnet: 'bg-brand-700/20   text-brand-400   border-brand-700/40',
  opus:   'bg-warning-700/20 text-warning-500 border-warning-700/40',
}

export function ModelRoutingTable() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <SectionLabel>Model Routing</SectionLabel>
        <h2 className="text-3xl font-extrabold text-neutral-100">
          Right model, <GradientText>right cost</GradientText>
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-400">
          The router automatically selects the cheapest model tier that satisfies each task's
          complexity requirement — and falls back to lower tiers when the budget is running low.
        </p>
      </div>

      <div className="overflow-x-auto rounded-node border border-neutral-700">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-700 bg-neutral-800/60">
              <th className="p-4 text-left font-semibold text-neutral-300">Task type</th>
              <th className="p-4 text-left font-semibold text-neutral-300">Tier</th>
              <th className="p-4 text-left font-semibold text-neutral-400">Anthropic</th>
              <th className="p-4 text-left font-semibold text-neutral-400">OpenAI</th>
              <th className="p-4 text-right font-semibold text-neutral-400">Cost / 1 M tokens</th>
            </tr>
          </thead>
          <tbody>
            {MODEL_ROWS.map((row, i) => (
              <tr
                key={row.task}
                className={['border-b border-neutral-700/60', i % 2 === 0 ? 'bg-neutral-800/20' : ''].join(' ')}
              >
                <td className="p-4 font-mono text-xs text-neutral-300">{row.task}</td>
                <td className="p-4">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${FAMILY_COLOR[row.family]}`}>
                    {row.family}
                  </span>
                </td>
                <td className="p-4 font-mono text-xs text-neutral-400">{row.anthropic}</td>
                <td className="p-4 font-mono text-xs text-neutral-400">{row.openai}</td>
                <td className="p-4 text-right font-semibold text-neutral-200">{row.costPer1M}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-neutral-500">
        Mock provider has zero cost and requires no API key — use it for evaluation, CI, and testing.
        Custom providers (Ollama, Bedrock, Gemini) available on Enterprise.
      </p>
    </div>
  )
}
