import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title:       'AI Starter Kit — Showcase',
  description: 'Live demos of the shared ui library and DAG canvas',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="min-h-screen bg-neutral-900 text-neutral-100 font-sans antialiased">
        {/* Nav */}
        <nav className="border-b border-neutral-700 bg-neutral-800 px-6 h-12 flex items-center gap-6">
          <span className="text-sm font-semibold text-brand-400">⬡ ai-starter-kit</span>
          <a href="/"        className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors">Home</a>
          <a href="/dag"     className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors">DAG Canvas</a>
          <a href="/contact" className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors">Contact Form</a>
          <a href="/atoms"   className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors">Atoms</a>
        </nav>

        <main className="mx-auto max-w-5xl px-6 py-10">
          {children}
        </main>
      </body>
    </html>
  )
}
