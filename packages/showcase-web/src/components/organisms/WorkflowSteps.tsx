import { SectionLabel } from '@/components/atoms/SectionLabel'
import { GradientText } from '@/components/atoms/GradientText'
import { PLAN_WORKFLOW_PHASES } from '@/data/agents'

const PHASE_COLORS = [
  'border-brand-600 bg-brand-700/20',
  'border-brand-500 bg-brand-700/20',
  'border-brand-400 bg-brand-600/20',
  'border-brand-300 bg-brand-500/20',
  'border-success-500 bg-success-700/20',
]

export function WorkflowSteps() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <SectionLabel>Plan System</SectionLabel>
        <h2 className="text-3xl font-extrabold text-neutral-100">
          From vague idea to <GradientText>running code</GradientText>
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-400">
          The 5-phase plan system takes a raw requirement through BA-led discovery,
          parallel decomposition, dependency wiring, and DAG execution — with every agent knowing
          their scope before writing a line.
        </p>
      </div>

      {/* Phase steps */}
      <ol className="relative flex flex-col gap-0">
        {PLAN_WORKFLOW_PHASES.map((phase, i) => (
          <li key={phase.phase} className="relative flex gap-6">
            {/* Connector line */}
            {i < PLAN_WORKFLOW_PHASES.length - 1 && (
              <span
                className="absolute left-5 top-10 h-full w-px bg-neutral-700"
                aria-hidden
              />
            )}

            {/* Phase number bubble */}
            <div
              className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-bold text-sm text-neutral-100 ${PHASE_COLORS[i]}`}
            >
              {phase.phase}
            </div>

            {/* Content */}
            <div className="pb-10 flex flex-col gap-1.5">
              <h3 className="text-sm font-bold text-neutral-100">
                Phase {phase.phase} — {phase.name}
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-lg">
                {phase.description}
              </p>
              <div className="mt-1 flex flex-wrap gap-3 text-xs">
                <span className="text-neutral-500">
                  <strong className="text-neutral-300">Input:</strong> {phase.input}
                </span>
                <span className="text-neutral-500">
                  <strong className="text-neutral-300">Output:</strong> {phase.output}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {phase.agents.map((a) => (
                  <span
                    key={a}
                    className="rounded-full border border-brand-700 bg-brand-900/30 px-2 py-0.5 text-[10px] font-medium text-brand-300"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
