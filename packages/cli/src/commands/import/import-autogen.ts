import type { AutogenGroupChatConfig } from '@ai-agencee/connectors/autogen'
import { importGroupChat } from '@ai-agencee/connectors/autogen'
import * as fs from 'fs/promises'
import * as path from 'path'

export interface ImportAutogenOptions {
  out?: string
}

export async function runImportAutogen(
  file: string,
  options: ImportAutogenOptions = {},
): Promise<void> {
  const raw = await fs.readFile(path.resolve(file), 'utf-8')
  const config = JSON.parse(raw) as AutogenGroupChatConfig

  const dag = importGroupChat(config)

  const output = JSON.stringify(dag, null, 2)

  if (options.out) {
    await fs.writeFile(path.resolve(options.out), output, 'utf-8')
    console.log(`✅  DAG written to ${options.out}`)
  } else {
    console.log(output)
  }
}
