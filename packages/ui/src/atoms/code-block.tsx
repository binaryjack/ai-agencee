'use client'

import { useState } from 'react'
import { Button } from './button.js'

interface CodeBlockProps {
  code:       string
  language?:  string
  copyable?:  boolean
  className?: string
  maxHeight?: string
}

export function CodeBlock({
  code,
  language  = '',
  copyable  = true,
  className = '',
  maxHeight = '24rem',
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div
      className={[
        'relative rounded-node border border-neutral-200 dark:border-neutral-700',
        'bg-neutral-900',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {(language || copyable) && (
        <div className="flex items-center justify-between px-3 py-1 border-b border-neutral-700">
          {language && (
            <span className="text-xs text-neutral-400 font-mono">{language}</span>
          )}
          {copyable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="text-neutral-400 hover:text-neutral-100"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </Button>
          )}
        </div>
      )}
      <pre
        style={{ maxHeight, overflowY: 'auto' }}
        className="p-4 text-sm font-mono text-neutral-100 whitespace-pre overflow-x-auto"
      >
        <code>{code}</code>
      </pre>
    </div>
  )
}
