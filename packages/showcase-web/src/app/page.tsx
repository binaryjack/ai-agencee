import { Badge, Divider, Heading, Text } from '@ai-agencee/ui/atoms'

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <Badge status="success" label="Live" dot />
        <Heading level={1} className="mt-2">AI Starter Kit — Component Showcase</Heading>
        <Text variant="muted" className="mt-2">
          This Next.js app renders every component exported from{' '}
          <code className="text-brand-400">@ai-agencee/ui</code>{' '}
          with live formular.dev integration.
        </Text>
      </div>

      <Divider label="Pages" />

      <ul className="grid gap-4 sm:grid-cols-3">
        {[
          { href: '/dag',     title: 'DAG Canvas',     desc: 'Read-only ReactFlow viewer for agents/dag.json' },
          { href: '/contact', title: 'Contact Form',   desc: 'formular-bridge: Input / Select / CheckBox' },
          { href: '/atoms',   title: 'Atom Library',   desc: 'Button, Badge, Heading, Text, CodeBlock, Divider' },
        ].map((page) => (
          <a
            key={page.href}
            href={page.href}
            className="flex flex-col gap-1 rounded-node border border-neutral-700 bg-neutral-800 p-4 hover:border-brand-500 transition-colors"
          >
            <span className="text-sm font-semibold text-neutral-100">{page.title}</span>
            <span className="text-xs text-neutral-400">{page.desc}</span>
          </a>
        ))}
      </ul>
    </div>
  )
}
