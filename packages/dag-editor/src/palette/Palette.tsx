import type { DagNode, DagNodeKind } from '@ai-agencee/ui/dag'
import { Icon, type IconName } from '@ai-agencee/ui/icons'
import { useCallback } from 'react'

interface PaletteItem {
  kind:     DagNodeKind
  icon:     IconName
  label:    string
  subtitle: string
}

const PALETTE_ITEMS: PaletteItem[] = [
  { kind: 'worker',     icon: 'worker',     label: 'Worker',     subtitle: 'Runs an agent' },
  { kind: 'supervisor', icon: 'supervisor', label: 'Supervisor', subtitle: 'Checkpoint + validate' },
  { kind: 'lane',       icon: 'branching',  label: 'Lane',       subtitle: 'Parallel container' },
  { kind: 'trigger',    icon: 'trigger',    label: 'Trigger',    subtitle: 'Start condition' },
  { kind: 'budget',     icon: 'budget',     label: 'Budget',     subtitle: 'Cost guard' },
]

interface PaletteProps {
  onAddNode:     (node: DagNode) => void
  existingNodes: DagNode[]
}

export function Palette({ onAddNode, existingNodes }: PaletteProps) {
  const handleAdd = useCallback(
    (item: PaletteItem) => {
      const id   = `${item.kind}-${Date.now()}`
      const node: DagNode = {
        id,
        type:     item.kind,
        position: {
          x: 120 + existingNodes.length * 20,
          y: 120 + existingNodes.length * 20,
        },
        data: {
          nodeType: item.kind,
          label:    `${item.label} ${existingNodes.filter((n) => n.type === item.kind).length + 1}`,
        },
      }
      onAddNode(node)
    },
    [onAddNode, existingNodes],
  )

  return (
    <aside className="w-48 flex-none border-r border-neutral-700 bg-neutral-800 flex flex-col p-3 gap-2 overflow-y-auto">
      <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-1">
        Add Node
      </span>

      {PALETTE_ITEMS.map((item) => (
        <button
          key={item.kind}
          onClick={() => handleAdd(item)}
          className="flex items-center gap-2 rounded-node px-2 py-2 text-left hover:bg-neutral-700 transition-colors group"
        >
          <Icon name={item.icon} theme="dark" size={20} className="flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-neutral-200 group-hover:text-white">
              {item.label}
            </div>
            <div className="text-[10px] text-neutral-500">{item.subtitle}</div>
          </div>
        </button>
      ))}
    </aside>
  )
}
