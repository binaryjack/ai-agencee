import * as fs from 'fs'
import * as path from 'path'
import type { SecretFinding } from '../../lib/project-context.types.js'
import { SECRETS_PATTERNS } from './secrets-patterns.js'

export const scanFile = (filePath: string): SecretFinding[] => {
  let content: string
  try {
    content = fs.readFileSync(filePath, 'utf8')
  } catch {
    return []
  }
  const lines = content.split('\n')
  const findings: SecretFinding[] = []
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx] ?? ''
    for (const pat of SECRETS_PATTERNS) {
      const m = line.match(pat.regex)
      if (m) {
        const raw = m[0]
        const masked = raw.slice(0, 4) + '****'
        findings.push({ file: filePath, line: lineIdx + 1, pattern: pat.name, severity: pat.severity, masked })
      }
    }
  }
  return findings
}

const SCAN_IGNORED = ['node_modules', '.git', '.agencee', 'dist', '.pnpm']
const SCAN_EXTENSIONS = new Set(['.ts', '.js', '.env', '.json', '.md', '.yaml', '.yml', '.sh'])

const walkDir = (dir: string, root: string, files: string[]): void => {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const rel = path.relative(root, path.join(dir, entry.name))
    const parts = rel.split(path.sep)
    if (parts.some(p => SCAN_IGNORED.includes(p))) continue
    if (entry.isDirectory()) {
      walkDir(path.join(dir, entry.name), root, files)
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name)
      const base = entry.name
      if (SCAN_EXTENSIONS.has(ext) || base.startsWith('.env')) {
        files.push(path.join(dir, entry.name))
      }
    }
  }
}

export const scanProject = (projectRoot: string): SecretFinding[] => {
  const files: string[] = []
  walkDir(projectRoot, projectRoot, files)
  return files.flatMap(f => scanFile(f))
}
