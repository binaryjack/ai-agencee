import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

export function DagEdgeComponent({
  id,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  label,
  markerEnd,
  style,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ strokeWidth: 1.5, stroke: '#94a3b8', ...style }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
            className="absolute pointer-events-none text-[10px] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-1.5 py-0.5 rounded text-neutral-500"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

DagEdgeComponent.displayName = 'DagEdge'
