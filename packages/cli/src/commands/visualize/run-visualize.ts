import * as fs from 'fs/promises';
import * as path from 'path';
import type { DagDefinition } from './dag-definition.types.js';
import { parseDag } from './parse-dag.js';
import { renderDot } from './render-dot.js';
import { renderMermaid } from './render-mermaid.js';
import type { VisualizeFormat } from './visualize-format.types.js';
import type { VisualizeOptions } from './visualize-options.types.js';

export async function runVisualize(
  dagFile: string,
  options: VisualizeOptions = {},
): Promise<void> {
  const format: VisualizeFormat = options.format ?? 'mermaid';
  const resolvedPath = path.resolve(dagFile);

  let raw: string;
  try {
    raw = await fs.readFile(resolvedPath, 'utf-8');
  } catch {
    console.error(`Error: Cannot read DAG file: ${resolvedPath}`);
    process.exit(1);
  }

  let dag: DagDefinition;
  try {
    dag = JSON.parse(raw) as DagDefinition;
  } catch {
    console.error(`Error: Invalid JSON in ${resolvedPath}`);
    process.exit(1);
  }

  const { nodes, edges } = parseDag(dag);

  if (nodes.length === 0) {
    console.warn(`Warning: No nodes found in ${resolvedPath}. Is this a valid DAG file?`);
  }

  let output: string;
  if (format === 'dot') {
    output = renderDot(nodes, edges, dag.name);
  } else {
    output = renderMermaid(nodes, edges, dag.name);
    output = '```mermaid\n' + output + '\n```';
  }

  if (options.output) {
    const outPath = path.resolve(options.output);
    await fs.writeFile(outPath, output + '\n', 'utf-8');
    console.log(`Diagram written to ${outPath}`);
  } else {
    console.log(output);
  }
}
