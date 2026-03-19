import * as fs from 'fs'
import * as path from 'path'
import { resolveProjectContext } from '../../lib/project-context.js'
import type { ProjectIntelligence } from '../../lib/project-context.types.js'
import { scanProject } from './secrets-scanner.js'

const countFiles = (dir: string, count = 0): number => {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return count
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue
    if (entry.isDirectory()) {
      count = countFiles(path.join(dir, entry.name), count)
    } else {
      count++
    }
  }
  return count
}

export const runAnalyzeProject = async (projectRoot: string): Promise<ProjectIntelligence> => {
  const ctx = await resolveProjectContext(projectRoot)
  const findings = scanProject(projectRoot)
  const fileCount = countFiles(projectRoot)

  const intelligence: ProjectIntelligence = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    projectRoot,
    techStack: ctx.techStack,
    fileCount,
    agentFiles: ctx.agentFiles,
    secrets: findings,
  }

  const aiDir = path.join(projectRoot, '.ai')
  fs.mkdirSync(aiDir, { recursive: true })
  fs.writeFileSync(path.join(aiDir, 'project-intelligence.json'), JSON.stringify(intelligence, null, 2), 'utf8')

  return intelligence
}
