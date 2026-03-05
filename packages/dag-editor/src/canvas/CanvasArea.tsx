import type { AnyNodeData, DagEdge, DagNode } from '@ai-agencee/ui/dag'
import { DagCanvas } from '@ai-agencee/ui/dag'
import { useCallback } from 'react'

interface CanvasAreaProps {
  nodes:         DagNode[]
  edges:         DagEdge[]
  onNodesChange: (nodes: DagNode[]) => void
  onEdgesChange: (edges: DagEdge[]) => void
  onNodeClick:   (id: string) => void
}

export function CanvasArea({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
}: CanvasAreaProps) {
  const handleNodeClick = useCallback(
    (id: string, _data: AnyNodeData) => onNodeClick(id),
    [onNodeClick],
  )

  return (
    <DagCanvas
      nodes={nodes}
      edges={edges}
      readonly={false}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      className="w-full h-full"
    />
  )
}
