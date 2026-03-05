'use client'

import { ReactFlowProvider } from '@xyflow/react'
import { DagCanvas }         from '@ai-agencee/ui/dag'
import dagJson               from '../../../../agents/dag.json'
import { jsonToDagFlow }     from '../../lib/dagLoader.js'
import { Heading, Text }     from '@ai-agencee/ui/atoms'

const { nodes, edges } = jsonToDagFlow(dagJson as never)

export default function DagPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Heading level={2}>DAG Canvas</Heading>
        <Text variant="muted">Read-only view of <code className="text-brand-400">agents/dag.json</code></Text>
      </div>

      <div className="h-[600px] rounded-lg border border-neutral-700 overflow-hidden">
        <ReactFlowProvider>
          <DagCanvas nodes={nodes} edges={edges} readonly={true} />
        </ReactFlowProvider>
      </div>
    </div>
  )
}
