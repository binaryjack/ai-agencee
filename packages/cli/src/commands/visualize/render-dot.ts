import type { GraphEdge } from './graph-edge.types.js';
import type { GraphNode } from './graph-node.types.js';

export function renderDot(
  nodes: GraphNode[],
  edges: GraphEdge[],
  dagName?: string,
): string {
  const lines: string[] = [];
  const graphName = (dagName ?? 'dag').replace(/[^a-zA-Z0-9]/g, '_');
  lines.push(`digraph ${graphName} {`);
  lines.push('  rankdir=LR;');
  lines.push('  node [fontname="Helvetica"];');

  for (const node of nodes) {
    if (node.isBarrier) {
      lines.push(`  ${node.id} [label="${node.label}", shape=diamond, style=filled, fillcolor="#fef9c3"];`);
    } else {
      lines.push(`  ${node.id} [label="${node.label}", shape=box, style=filled, fillcolor="#dbeafe"];`);
    }
  }

  for (const edge of edges) {
    lines.push(`  ${edge.from} -> ${edge.to};`);
  }

  lines.push('}');
  return lines.join('\n');
}
