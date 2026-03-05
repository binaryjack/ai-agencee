import { useCallback }            from 'react'
import { useReactFlow }           from '@xyflow/react'
import { DagCanvas }              from '@ai-agencee/ui/dag'
import type { DagNode, DagEdge, AnyNodeData } from '@ai-agencee/ui/dag'

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
