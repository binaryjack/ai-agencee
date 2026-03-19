import type { FormatOptions, PromptLayer } from '../prompt-compiler.types.js'

const MODEL_CHAR_BUDGETS: Record<string, number> = {
  haiku:  300 * 4,   // ~300 tokens → chars
  sonnet: 600 * 4,
  opus:   1200 * 4,
}

const truncate = (text: string, charLimit: number): string => {
  if (text.length <= charLimit) return text
  return text.slice(0, charLimit - 3) + '...'
}

export const formatForModel = (layers: PromptLayer[], opts: FormatOptions): string => {
  const budget = MODEL_CHAR_BUDGETS[opts.modelFamily] ?? MODEL_CHAR_BUDGETS.sonnet
  const perLayer = layers.length > 0 ? Math.floor(budget / layers.length) : budget

  if (opts.modelFamily === 'haiku') {
    return layers
      .map(l => `<${l.source}>\n${truncate(l.content, perLayer)}\n</${l.source}>`)
      .join('\n')
  }

  if (opts.modelFamily === 'sonnet') {
    return layers
      .map(l => `## ${l.name}\n${truncate(l.content, perLayer)}`)
      .join('\n\n')
  }

  // opus — full prose
  return layers
    .map(l => `### ${l.name}\n\n${l.content}`)
    .join('\n\n')
}

export { truncate }
