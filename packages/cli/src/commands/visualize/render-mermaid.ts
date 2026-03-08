import type { GraphEdge } from './graph-edge.types.js';
import type { GraphNode } from './graph-node.types.js';

export function renderMermaid(
  nodes: GraphNode[],
  edges: GraphEdge[],
  dagName?: string,
): string {
  const lines: string[] = [];
  if (dagName) {
    lines.push(`%% ${dagName}`);
  }
  lines.push('flowchart LR');
  lines.push('  classDef lane fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f');
  lines.push('  classDef barrier fill:#fef9c3,stroke:#ca8a04,color:#713f12,shape:diamond');

  for (const node of nodes) {
    if (node.isBarrier) {
      lines.push(`  ${node.id}{{"${node.label}"}}:::barrier`);
    } else {
      lines.push(`  ${node.id}["${node.label}"]:::lane`);
    }
  }

  for (const edge of edges) {
    lines.push(`  ${edge.from} --> ${edge.to}`);
  }

  return lines.join('\n');
}
