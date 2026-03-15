import type { StateGraphDefinition } from '@ai-agencee/connectors/langgraph'
import { importStateGraph } from '@ai-agencee/connectors/langgraph'
import * as fs from 'fs/promises'
import * as path from 'path'

export interface ImportLangGraphOptions {
  out?: string
}

export async function runImportLangGraph(
  file: string,
  options: ImportLangGraphOptions = {},
): Promise<void> {
  const raw = await fs.readFile(path.resolve(file), 'utf-8')
  const graph = JSON.parse(raw) as StateGraphDefinition

  const dag = importStateGraph(graph, { name: path.basename(file, '.json') })

  const output = JSON.stringify(dag, null, 2)

  if (options.out) {
    await fs.writeFile(path.resolve(options.out), output, 'utf-8')
    console.log(`✅  DAG written to ${options.out}`)
  } else {
    console.log(output)
  }
}
