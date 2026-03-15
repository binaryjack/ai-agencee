import type { SkPlanDefinition } from '@ai-agencee/connectors/semantic-kernel'
import { importSkPlan } from '@ai-agencee/connectors/semantic-kernel'
import * as fs from 'fs/promises'
import * as path from 'path'

export interface ImportSkOptions {
  out?: string
}

export async function runImportSkPlan(
  file: string,
  options: ImportSkOptions = {},
): Promise<void> {
  const raw = await fs.readFile(path.resolve(file), 'utf-8')
  const plan = JSON.parse(raw) as SkPlanDefinition

  const dag = importSkPlan(plan)

  const output = JSON.stringify(dag, null, 2)

  if (options.out) {
    await fs.writeFile(path.resolve(options.out), output, 'utf-8')
    console.log(`✅  DAG written to ${options.out}`)
  } else {
    console.log(output)
  }
}
