import { Handle, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import { Badge } from '../atoms/badge.js'
import type { AnyNodeData, DagNode } from './types.js'

const kindBorder: Record<string, string> = {
  worker:     'border-brand-400',
  supervisor: 'border-warning-500',
  lane:       'border-neutral-400',
  trigger:    'border-success-500',
  budget:     'border-danger-400',
}

const kindIcon: Record<string, string> = {
  worker:     '🤖',
  supervisor: '👁',
  lane:       '↔',
  trigger:    '⚡',
  budget:     '💰',
}

function DagNodeInner({ data, selected }: NodeProps<DagNode>) {
  const nodeData = data as AnyNodeData
  const border  = kindBorder[nodeData.nodeType] ?? 'border-neutral-300'
  const icon    = kindIcon[nodeData.nodeType]   ?? '●'

  return (
    <div
      className={[
        'min-w-[140px] rounded-node border-2 bg-white dark:bg-neutral-800 shadow-sm',
        'px-3 py-2 flex flex-col gap-1 text-left',
        border,
        selected ? 'ring-2 ring-brand-500 ring-offset-1' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Handle type="target"  position={Position.Top}    className="!bg-neutral-400" />

      <div className="flex items-center gap-1.5">
        <span aria-hidden className="text-base leading-none">{icon}</span>
        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200 truncate max-w-[110px]">
          {nodeData.label}
        </span>
      </div>

      {nodeData.subtitle && (
        <span className="text-[10px] text-neutral-400 truncate">{nodeData.subtitle}</span>
      )}

      {nodeData.status && nodeData.status !== 'pending' && (
        <Badge status={nodeData.status} label={nodeData.status} dot className="self-start mt-0.5" />
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-neutral-400" />
    </div>
  )
}

export const DagNodeComponent = memo(DagNodeInner)
DagNodeComponent.displayName = 'DagNode'
