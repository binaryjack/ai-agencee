import { Badge, Heading } from '@ai-agencee/ui/atoms'
import type { AnyNodeData, DagNode } from '@ai-agencee/ui/dag'
import { SupervisorNodePanel } from './SupervisorNodePanel.js'
import { WorkerNodePanel } from './WorkerNodePanel.js'

interface NodePanelProps {
  node:     DagNode
  onUpdate: (id: string, data: AnyNodeData) => void
  onClose:  () => void
}

const kindLabel: Record<string, string> = {
  worker:     'Worker Node',
  supervisor: 'Supervisor Node',
  lane:       'Lane',
  trigger:    'Trigger',
  budget:     'Budget Guard',
}

export function NodePanel({ node, onUpdate, onClose }: NodePanelProps) {
  const data = node.data as AnyNodeData

  return (
    <aside className="w-72 flex-none border-l border-neutral-700 bg-neutral-800 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
        <div className="flex items-center gap-2">
          <Heading level={5} className="text-neutral-100">
            {kindLabel[data.nodeType] ?? data.nodeType}
          </Heading>
          <Badge status="pending" label={node.id} className="text-[10px]" />
        </div>
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="text-neutral-400 hover:text-neutral-100 transition-colors p-0.5 rounded"
        >
          ✕
        </button>
      </div>

      {/* Panel body — routed by nodeType */}
      {data.nodeType === 'worker' && (
        <WorkerNodePanel nodeId={node.id} data={data as never} onUpdate={onUpdate as never} />
      )}
      {data.nodeType === 'supervisor' && (
        <SupervisorNodePanel nodeId={node.id} data={data as never} onUpdate={onUpdate as never} />
      )}
      {(data.nodeType === 'lane' || data.nodeType === 'trigger' || data.nodeType === 'budget') && (
        <div className="p-4 text-sm text-neutral-400">
          Panel for <strong className="text-neutral-200">{data.nodeType}</strong> nodes — coming soon.
        </div>
      )}
    </aside>
  )
}
