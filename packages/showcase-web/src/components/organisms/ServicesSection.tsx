import { GradientText } from '@/components/atoms/GradientText'
import { SectionLabel } from '@/components/atoms/SectionLabel'
import { ServiceCard } from '@/components/molecules/ServiceCard'

const SERVICES = [
  {
    icon:         '🏢',
    title:        'Enterprise Onboarding',
    description:  'We configure ai-agencee from scratch in your environment — providers, RBAC, audit logging, CI/CD integration, and your first production DAG — in a focused 2-day on-site or remote engagement.',
    deliverables: [
      'Provider & API key configuration',
      'RBAC + OIDC setup',
      'First production DAG built together',
      'Team handover & Q&A session',
    ],
  },
  {
    icon:         '🎓',
    title:        'Team Coaching',
    description:  'A structured coaching programme for engineering teams learning DAG-based orchestration, agent design patterns, supervisor quality models, and resilience patterns.',
    deliverables: [
      '4-session live curriculum',
      'Hands-on workshop exercises',
      'Custom agent recipe library',
      '30-day async Q&A channel',
    ],
  },
  {
    icon:         '🔧',
    title:        'Custom Agent Development',
    description:  'We design and build production-grade agents tailored to your domain — security auditors, compliance checkers, data pipeline orchestrators, or any bespoke workflow you need.',
    deliverables: [
      'Requirements discovery workshop',
      'Agent + supervisor implementation',
      'Full Jest test suite',
      'Usage documentation',
    ],
  },
  {
    icon:         '🗺️',
    title:        'Architecture Review',
    description:  'A senior engagement assessing your current AI workflow architecture and producing a concrete, phased migration plan to DAG-supervised multi-agent orchestration.',
    deliverables: [
      'Current-state assessment',
      'Gap analysis against best practices',
      'Phased migration roadmap',
      'Written report + walkthrough call',
    ],
  },
]

export function ServicesSection() {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <SectionLabel>Professional Services</SectionLabel>
        <h2 className="text-3xl font-extrabold text-neutral-100">
          Expert help to get your team <GradientText>production-ready</GradientText>
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-400">
          Open-source is free forever — but getting a team of 20 engineers confidently building
          DAG-supervised agents takes more than documentation. Our focused, time-boxed engagements
          de-risk adoption and accelerate time to value.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {SERVICES.map((service) => (
          <ServiceCard key={service.title} service={service} />
        ))}
      </div>

      <div className="flex flex-col items-center gap-4 rounded-node border border-brand-700/40 bg-brand-900/20 px-8 py-10 text-center">
        <h3 className="text-lg font-bold text-neutral-100">
          Every engagement is scoped to your needs
        </h3>
        <p className="max-w-lg text-sm leading-relaxed text-neutral-400">
          From a single-day architecture review to a full multi-month coaching programme — start
          with a free 30-minute discovery call to scope the right engagement.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="/contact"
            className="rounded-node bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-brand-400 transition-colors"
          >
            Book a free discovery call
          </a>
          <a
            href="mailto:services@ai-agencee.com"
            className="text-sm font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            services@ai-agencee.com
          </a>
        </div>
      </div>
    </div>
  )
}
