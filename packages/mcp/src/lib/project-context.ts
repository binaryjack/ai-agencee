import { execSync } from 'child_process'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import type { ProjectContext } from './project-context.types.js'

const HEURISTIC_MAP: Record<string, (deps: Set<string>) => boolean> = {
  typescript:  d => d.has('typescript'),
  react:       d => d.has('react'),
  vue:         d => d.has('vue'),
  prisma:      d => d.has('@prisma/client'),
  zod:         d => d.has('zod'),
  vitest:      d => d.has('vitest'),
  jest:        d => d.has('jest') || d.has('@jest/core'),
  playwright:  d => d.has('@playwright/test'),
  node:        () => true,
}

const detectTechStack = (projectRoot: string): string[] => {
  let pkg: Record<string, Record<string, string>> = {}
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')) as typeof pkg
  } catch { /* no package.json */ }
  const allDeps = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ])
  return Object.entries(HEURISTIC_MAP)
    .filter(([, check]) => check(allDeps))
    .map(([name]) => name)
}

const computeFingerprint = (projectRoot: string): string => {
  let gitHead = 'no-git'
  try {
    gitHead = execSync('git rev-parse HEAD', { cwd: projectRoot, timeout: 3000 }).toString().trim()
  } catch { /* not a git repo */ }
  let pkgMtime = '0'
  try {
    pkgMtime = fs.statSync(path.join(projectRoot, 'package.json')).mtimeMs.toString()
  } catch { /* no package.json */ }
  return crypto.createHash('sha256').update(gitHead + pkgMtime).digest('hex')
}

const getAgentFiles = (projectRoot: string): string[] => {
  const agentsDir = path.join(projectRoot, 'agents')
  if (!fs.existsSync(agentsDir)) return []
  return fs.readdirSync(agentsDir)
    .filter(f => f.endsWith('.agent.json'))
    .map(f => path.basename(f))
}

export const resolveProjectContext = async (projectRoot: string): Promise<ProjectContext> => {
  const cachePath = path.join(projectRoot, '.agencee', 'project-context.json')
  const currentFp = computeFingerprint(projectRoot)

  if (fs.existsSync(cachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8')) as ProjectContext
      if (cached.fingerprint === currentFp) return cached
    } catch { /* invalid cache — rebuild */ }
  }

  const techStack = detectTechStack(projectRoot)
  const agentFiles = getAgentFiles(projectRoot)
  const rulesPath = fs.existsSync(path.join(projectRoot, '.ai', 'rules.md')) ? '.ai/rules.md' : null

  const ctx: ProjectContext = {
    projectRoot,
    fingerprint: currentFp,
    techStack,
    agentFiles,
    rulesPath,
    cachedAt: Date.now(),
  }

  fs.mkdirSync(path.dirname(cachePath), { recursive: true })
  fs.writeFileSync(cachePath, JSON.stringify(ctx, null, 2), 'utf8')
  return ctx
}

export { computeFingerprint, detectTechStack }

