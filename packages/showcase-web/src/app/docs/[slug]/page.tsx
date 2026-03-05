import { notFound } from 'next/navigation'
import { SectionWrapper } from '@/components/layout/SectionWrapper'
import { SectionLabel } from '@/components/atoms/SectionLabel'
import { GradientText } from '@/components/atoms/GradientText'
import { DocCard } from '@/components/molecules/DocCard'
import { DOC_TOPICS } from '@/data/docs'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return DOC_TOPICS.map((t) => ({ slug: t.slug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const topic = DOC_TOPICS.find((t) => t.slug === slug)
  if (!topic) return {}
  return {
    title:       `${topic.title} — ai-agencee Docs`,
    description: topic.description,
  }
}

/** Minimal markdown renderer — converts code fences and tables to HTML-ish JSX. */
function DocContent({ text }: { text: string }) {
  // Split into blocks: code fences, table blocks, and prose paragraphs
  const blocks = text.split(/(```[\s\S]*?```)/g)

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, i) => {
        if (block.startsWith('```')) {
          const lines   = block.split('\n')
          const lang    = lines[0].replace('```', '').trim()
          const code    = lines.slice(1, -1).join('\n')
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-node border border-neutral-700 bg-neutral-900 px-4 py-3 text-xs font-mono text-neutral-200 leading-relaxed"
            >
              <code data-lang={lang}>{code}</code>
            </pre>
          )
        }

        // Table rendering (| ... | lines)
        if (block.trim().startsWith('|')) {
          const rows = block.trim().split('\n').filter((l) => l.trim().startsWith('|'))
          const header = rows[0]?.split('|').filter(Boolean).map((c) => c.trim()) ?? []
          const body   = rows.slice(2)  // skip separator row
          return (
            <div key={i} className="overflow-x-auto rounded-node border border-neutral-700">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-700 bg-neutral-800/60">
                    {header.map((h) => (
                      <th key={h} className="p-3 text-left text-xs font-semibold text-neutral-300">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.map((row, ri) => {
                    const cells = row.split('|').filter(Boolean).map((c) => c.trim())
                    return (
                      <tr key={ri} className="border-b border-neutral-700/60">
                        {cells.map((cell, ci) => (
                          <td key={ci} className="p-3 text-xs text-neutral-400">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        }

        // Prose — render paragraphs, bold, inline code
        const paras = block.split(/\n\n+/).filter((p) => p.trim())
        return (
          <div key={i} className="flex flex-col gap-3">
            {paras.map((para, pi) => {
              // Bold **text**
              const parts = para.split(/\*\*(.*?)\*\*/g)
              return (
                <p key={pi} className="text-sm leading-relaxed text-neutral-400">
                  {parts.map((part, si) =>
                    si % 2 === 1
                      ? <strong key={si} className="font-semibold text-neutral-200">{part}</strong>
                      : <span key={si}>{part}</span>
                  )}
                </p>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

export default async function DocTopicPage({ params }: Props) {
  const { slug } = await params
  const topic = DOC_TOPICS.find((t) => t.slug === slug)
  if (!topic) notFound()

  const related = DOC_TOPICS.filter((t) => topic.relatedSlugs?.includes(t.slug))

  return (
    <SectionWrapper width="narrow">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-xs text-neutral-500">
        <a href="/docs" className="hover:text-neutral-200 transition-colors">Docs</a>
        <span>/</span>
        <span className="text-neutral-300">{topic.title}</span>
      </nav>

      {/* Header */}
      <header className="mb-10 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>{topic.icon}</span>
          <SectionLabel>{topic.category}</SectionLabel>
        </div>
        <h1 className="text-3xl font-extrabold text-neutral-100 sm:text-4xl">
          <GradientText>{topic.title}</GradientText>
        </h1>
        <p className="text-base text-neutral-400">{topic.description}</p>
      </header>

      {/* Sections */}
      <article className="flex flex-col gap-10">
        {topic.sections.map((section) => (
          <section key={section.id} id={section.id}>
            <h2 className="mb-4 text-lg font-bold text-neutral-100 border-b border-neutral-700 pb-2">
              {section.label}
            </h2>
            <DocContent text={section.content} />
          </section>
        ))}
      </article>

      {/* Related topics */}
      {related.length > 0 && (
        <div className="mt-14 flex flex-col gap-4 border-t border-neutral-700 pt-10">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Related topics
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {related.map((t) => <DocCard key={t.id} topic={t} />)}
          </div>
        </div>
      )}
    </SectionWrapper>
  )
}
