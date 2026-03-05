'use client'

import { useState } from 'react'

interface Props {
  code:        string
  language?:   string
  label?:      string
  className?:  string
}

/** Terminal-style code block with a copy-to-clipboard button. */
export function CommandBlock({ code, language = 'sh', label, className = '' }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`rounded-node border border-neutral-700 bg-neutral-900 overflow-hidden ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-neutral-700 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-danger-500/70" />
          <span className="h-3 w-3 rounded-full bg-warning-500/70" />
          <span className="h-3 w-3 rounded-full bg-success-500/70" />
          {label && <span className="ml-2 text-xs text-neutral-500">{label}</span>}
        </div>
        <button
          onClick={() => { void handleCopy() }}
          className="text-xs text-neutral-500 hover:text-neutral-200 transition-colors"
          aria-label="Copy code"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      {/* Code */}
      <pre className={`overflow-x-auto px-4 py-3 text-xs leading-relaxed text-neutral-200 font-mono language-${language}`}>
        <code>{code}</code>
      </pre>
    </div>
  )
}
