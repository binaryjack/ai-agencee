import { Button } from '@ai-agencee/ui/atoms'

interface ToolbarProps {
  onLoad:     () => void
  onExport:   () => void
  nodeCount:  number
}

export function Toolbar({ onLoad, onExport, nodeCount }: ToolbarProps) {
  return (
    <header className="h-11 flex-none flex items-center gap-3 px-4 border-b border-neutral-700 bg-neutral-800">
      {/* Logotype */}
      <span className="text-sm font-semibold text-brand-400 mr-2">
        ⬡  DAG Editor
      </span>

      <div className="h-4 w-px bg-neutral-600" aria-hidden />

      <Button variant="secondary" size="sm" onClick={onLoad}>
        Open JSON
      </Button>

      <Button variant="secondary" size="sm" onClick={onExport} disabled={nodeCount === 0}>
        Export JSON
      </Button>

      <div className="flex-1" />

      <span className="text-xs text-neutral-500">
        {nodeCount} node{nodeCount !== 1 ? 's' : ''}
      </span>
    </header>
  )
}
