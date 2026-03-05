import { SectionLabel } from '@/components/atoms/SectionLabel'
import { GradientText } from '@/components/atoms/GradientText'
import { COMPARISON_ROWS } from '@/data/comparisons'
import type { ComparisonStatus } from '@/data/comparisons'

function StatusCell({ status }: { status: ComparisonStatus }) {
  if (status === 'yes')     return <span className="text-success-500 text-base" title="Yes">✓</span>
  if (status === 'no')      return <span className="text-danger-500  text-base" title="No">✗</span>
  return <span className="text-warning-500 text-base" title="Partial">⚠</span>
}

export function ComparisonMatrix() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <SectionLabel>Why ai-agencee</SectionLabel>
        <h2 className="text-3xl font-extrabold text-neutral-100">
          Built for <GradientText>production workflows</GradientText>,
          <br className="hidden sm:block" /> not chat prompts
        </h2>
      </div>

      <div className="overflow-x-auto rounded-node border border-neutral-700">
        <table className="w-full min-w-[540px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-700 bg-neutral-800/60">
              <th className="p-4 text-left font-semibold text-neutral-300">Capability</th>
              <th className="p-4 text-center font-semibold text-neutral-400">Generic AI chat</th>
              <th className="p-4 text-center font-semibold text-neutral-400">Code-gen copilots</th>
              <th className="p-4 text-center font-bold text-brand-400">ai-agencee</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row, i) => (
              <tr
                key={row.need}
                className={[
                  'border-b border-neutral-700/60',
                  i % 2 === 0 ? 'bg-neutral-800/20' : '',
                ].join(' ')}
              >
                <td className="p-4 text-neutral-300">
                  <span>{row.need}</span>
                  {row.notes && (
                    <span className="ml-2 text-[11px] text-neutral-500">({row.notes})</span>
                  )}
                </td>
                <td className="p-4 text-center">
                  <StatusCell status={row.genericChat} />
                </td>
                <td className="p-4 text-center">
                  <StatusCell status={row.codegenCopilot} />
                </td>
                <td className="p-4 text-center">
                  <StatusCell status={row.aiAgencee} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
