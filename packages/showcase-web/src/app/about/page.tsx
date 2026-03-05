import { SectionWrapper } from '@/components/layout/SectionWrapper'
import { SectionLabel } from '@/components/atoms/SectionLabel'
import { GradientText } from '@/components/atoms/GradientText'
import { CtaBanner } from '@/components/organisms/CtaBanner'
import { StatCard } from '@/components/molecules/StatCard'
import { STATS } from '@/data/comparisons'

export const metadata = {
  title:       'About — ai-agencee',
  description: 'Our mission: make enterprise-grade multi-agent AI orchestration accessible to every engineering team.',
}

const TIMELINE = [
  { period: 'Phase 1 — Month 1',  title: 'Open-source launch',  description: 'Free CLI + mock provider on npm. 424 tests, 13 enterprise features shipped.' },
  { period: 'Phase 2 — Month 3',  title: 'SaaS beta',           description: 'Starter tier ($29) with BYOK support. Stripe billing, usage dashboard.' },
  { period: 'Phase 3 — Month 6',  title: 'Professional tier',   description: 'Managed keys, advanced cost analytics, custom agents, 99 % SLA.' },
  { period: 'Phase 4 — Month 9',  title: 'Plugin marketplace',  description: 'Paid agent packs: security-auditor, compliance-checker, Jira sync.' },
  { period: 'Phase 5 — Month 12', title: 'Managed cloud',       description: 'Enterprise single-tenant, Ollama/Bedrock/Gemini, dedicated SRE support.' },
]

const TEAM_VALUES = [
  { icon: '⬡', title: 'Zero-key first',       body: 'Every capability must be evaluable without spending a cent. The mock provider is not an afterthought — it is a first-class citizen.' },
  { icon: '🔍', title: 'Deterministic quality', body: 'Supervisor checkpoints are not advisory. They enforce acceptance criteria, inject corrections, and halt pipelines when quality drops below threshold.' },
  { icon: '🔐', title: 'Enterprise from day 1', body: 'RBAC, audit logs, PII scrubbing, and multi-tenant isolation were designed into the engine — not retrofitted. Compliance should not be a separate product.' },
  { icon: '🧱', title: 'Composable over monolithic', body: 'Agents, checks, supervisors, and providers are small, focused, and independently replaceable. No lock-in; no magic framework.' },
]

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <SectionWrapper width="narrow" className="pb-10 pt-20">
        <SectionLabel>About ai-agencee</SectionLabel>
        <h1 className="mt-2 text-4xl font-extrabold text-neutral-100 sm:text-5xl">
          <GradientText>Enterprise AI orchestration</GradientText>
          <br />for every engineering team
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-400">
          ai-agencee was built because most AI coding tools stop at the file level.
          We operate at the project level — structured plans, parallel agents, hard quality
          enforcement, and full compliance — without requiring a platform team to set up.
        </p>
      </SectionWrapper>

      {/* Stats */}
      <SectionWrapper className="bg-neutral-800/20 border-y border-neutral-700/40 py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {STATS.map((s) => (
            <StatCard key={s.label} value={s.value} label={s.label} />
          ))}
        </div>
      </SectionWrapper>

      {/* Vision */}
      <SectionWrapper width="narrow">
        <h2 className="mb-5 text-2xl font-extrabold text-neutral-100">Our mission</h2>
        <p className="mb-4 text-sm leading-relaxed text-neutral-400">
          AI has given individual developers unprecedented leverage — but most of that
          leverage stops at the one-file, one-prompt boundary. Real software projects need
          coordination between specialised roles, deterministic quality gates, repeatable
          workflows, and audit trails that satisfy legal and compliance teams.
        </p>
        <p className="text-sm leading-relaxed text-neutral-400">
          ai-agencee™ brings enterprise orchestration patterns — DAGs, supervisors, barriers,
          retries, circuit breakers, RBAC, and hash-chained audit logs — to any team willing
          to write a JSON file. The engine handles all the hard distributed-systems problems;
          you describe what you want to build.
        </p>
      </SectionWrapper>

      {/* Values */}
      <SectionWrapper className="bg-neutral-800/20 border-y border-neutral-700/40">
        <h2 className="mb-8 text-2xl font-extrabold text-neutral-100">
          Engineering values
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {TEAM_VALUES.map((v) => (
            <div key={v.title} className="flex flex-col gap-2 rounded-node border border-neutral-700 bg-neutral-800 p-5">
              <div className="flex items-center gap-3">
                <span className="text-xl" aria-hidden>{v.icon}</span>
                <h3 className="text-sm font-bold text-neutral-100">{v.title}</h3>
              </div>
              <p className="text-xs leading-relaxed text-neutral-400">{v.body}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Roadmap timeline */}
      <SectionWrapper width="narrow">
        <h2 className="mb-8 text-2xl font-extrabold text-neutral-100">
          Go-to-market roadmap
        </h2>
        <ol className="relative flex flex-col gap-0">
          {TIMELINE.map((step, i) => (
            <li key={i} className="relative flex gap-6">
              {i < TIMELINE.length - 1 && (
                <span className="absolute left-4 top-8 h-full w-px bg-neutral-700" aria-hidden />
              )}
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-brand-600 bg-brand-900/30 text-xs font-bold text-brand-300">
                {i + 1}
              </div>
              <div className="pb-8 flex flex-col gap-0.5">
                <span className="text-[11px] font-medium text-neutral-500">{step.period}</span>
                <span className="text-sm font-bold text-neutral-100">{step.title}</span>
                <span className="text-xs text-neutral-400">{step.description}</span>
              </div>
            </li>
          ))}
        </ol>
      </SectionWrapper>

      {/* CTA */}
      <SectionWrapper className="border-t border-neutral-700/40 pt-12">
        <CtaBanner />
      </SectionWrapper>
    </>
  )
}
