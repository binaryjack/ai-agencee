import type { AnyNodeData, DagNode } from '@ai-agencee/ui/dag'
import { ReactFlowProvider } from '@xyflow/react'
import { useCallback, useState } from 'react'
import { CanvasArea } from './canvas/CanvasArea.js'
import { useDagFile } from './hooks/useDagFile.js'
import { Palette } from './palette/Palette.js'
import { NodePanel } from './panel/NodePanel.js'
import { Toolbar } from './toolbar/Toolbar.js'

export function App() {
  const { nodes, edges, setNodes, setEdges, loadFile, exportFile } = useDagFile()

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null

  const handleNodeClick = useCallback((id: string) => setSelectedNodeId(id), [])
  const handleCanvasClick = useCallback(() => setSelectedNodeId(null), [])

  const handleNodeUpdate = useCallback(
    (id: string, data: AnyNodeData) => {
      setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, data } : n)))
    },
    [setNodes],
  )

  const handleAddNode = useCallback(
    (node: DagNode) => setNodes((prev) => [...prev, node]),
    [setNodes],
  )

  return (
    <div className="flex h-screen w-screen flex-col bg-neutral-900 text-neutral-100">
      <Toolbar onLoad={loadFile} onExport={exportFile} nodeCount={nodes.length} />

      <div className="flex flex-1 overflow-hidden">
        {/* Palette sidebar */}
        <Palette onAddNode={handleAddNode} existingNodes={nodes} />

        {/* Canvas */}
        <div className="flex-1 relative" onClick={handleCanvasClick}>
          <ReactFlowProvider>
            <CanvasArea
              nodes={nodes}
              edges={edges}
              onNodesChange={setNodes}
              onEdgesChange={setEdges}
              onNodeClick={handleNodeClick}
            />
          </ReactFlowProvider>
        </div>

        {/* Property panel */}
        {selectedNode && (
          <NodePanel
            node={selectedNode}
            onUpdate={handleNodeUpdate}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    </div>
  )
}
