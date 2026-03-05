import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { SiteHeader } from '@/components/organisms/SiteHeader'
import { SiteFooter } from '@/components/organisms/SiteFooter'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title:       'ai-agencee — Enterprise Multi-Agent Orchestration',
  description: 'DAG-supervised parallel agents with streaming LLM output, intelligent model routing, RBAC, audit logging, and a zero-API-key demo mode.',
  keywords:    'multi-agent, DAG orchestration, LLM, AI workflow, Claude, OpenAI, CI, enterprise',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="min-h-screen bg-neutral-900 text-neutral-100 font-sans antialiased flex flex-col">
        <SiteHeader />
        <main className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  )
}
