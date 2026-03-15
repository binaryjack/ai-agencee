import type { CrewDefinition } from '@ai-agencee/connectors/crewai'
import { importCrew } from '@ai-agencee/connectors/crewai'
import * as fs from 'fs/promises'
import * as path from 'path'

export interface ImportCrewOptions {
  out?: string
}

export async function runImportCrew(
  file: string,
  options: ImportCrewOptions = {},
): Promise<void> {
  const raw = await fs.readFile(path.resolve(file), 'utf-8')
  const crew = JSON.parse(raw) as CrewDefinition

  const dag = importCrew(crew)

  const output = JSON.stringify(dag, null, 2)

  if (options.out) {
    await fs.writeFile(path.resolve(options.out), output, 'utf-8')
    console.log(`✅  DAG written to ${options.out}`)
  } else {
    console.log(output)
  }
}
