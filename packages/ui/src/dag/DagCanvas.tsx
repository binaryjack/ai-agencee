import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  MarkerType,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { DagNodeComponent } from './DagNode.js'
import { DagEdgeComponent } from './DagEdge.js'
import { useDagLayout } from './useDagLayout.js'
import type { DagCanvasProps, DagNode, DagEdge, AnyNodeData } from './types.js'

const nodeTypes = {
  worker:     DagNodeComponent,
  supervisor: DagNodeComponent,
  lane:       DagNodeComponent,
  trigger:    DagNodeComponent,
  budget:     DagNodeComponent,
} as const

const edgeTypes = {
  default: DagEdgeComponent,
} as const

const defaultEdgeOptions = {
  markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
}

/**
 * DagCanvas — shared by dag-editor (editable) and showcase-web (readonly).
 *
 * readonly=true  → display-only, no interaction (showcase workflow diagrams)
 * readonly=false → full React Flow editing (dag-editor)
 */
export function DagCanvas({
  nodes,
  edges,
  readonly       = false,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  className = '',
}: DagCanvasProps) {
  const { nodes: layoutedNodes, edges: layoutedEdges } = useDagLayout(nodes, edges)

  const handleNodesChange = useCallback(
    (changes: NodeChange<DagNode>[]) => {
      if (readonly || !onNodesChange) return
      onNodesChange(applyNodeChanges(changes, nodes))
    },
    [readonly, onNodesChange, nodes],
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<DagEdge>[]) => {
      if (readonly || !onEdgesChange) return
      onEdgesChange(applyEdgeChanges(changes, edges))
    },
    [readonly, onEdgesChange, edges],
  )

  const handleConnect = useCallback(
    (params: Connection) => {
      if (readonly || !onConnect) return
      onConnect({ source: params.source ?? '', target: params.target ?? '' })
    },
    [readonly, onConnect],
  )

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: DagNode) => {
      if (onNodeClick) onNodeClick(node.id, node.data as AnyNodeData)
    },
    [onNodeClick],
  )

  return (
    <div
      className={[
        'w-full h-full bg-neutral-50 dark:bg-neutral-900',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <ReactFlow
        nodes={layoutedNodes}
        edges={layoutedEdges}
        nodeTypes={nodeTypes as never}
        edgeTypes={edgeTypes as never}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodesChange={readonly ? undefined : handleNodesChange}
        onEdgesChange={readonly ? undefined : handleEdgesChange}
        onConnect={readonly ? undefined : handleConnect}
        onNodeClick={handleNodeClick}
        nodesDraggable={!readonly}
        nodesConnectable={!readonly}
        elementsSelectable={!readonly}
        panOnDrag
        zoomOnScroll
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="opacity-30" />
        <Controls showInteractive={!readonly} />
        {!readonly && <MiniMap nodeStrokeWidth={2} zoomable pannable />}
      </ReactFlow>
    </div>
  )
}
