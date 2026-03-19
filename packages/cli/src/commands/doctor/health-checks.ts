import * as fs from 'fs'
import * as path from 'path'
import type { HealthCheckResult } from './health-check.types.js'

export const checkMcpServer = async (_projectRoot: string): Promise<HealthCheckResult> => {
  const name = 'mcp-server'
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2000)
    if (typeof timer === 'object' && 'unref' in timer) timer.unref()
    const res = await fetch('http://localhost:3001/health', { signal: controller.signal })
    clearTimeout(timer)
    if (res.ok) {
      return { name, status: 'ok', message: 'MCP server reachable at localhost:3001' }
    }
    return { name, status: 'error', message: `MCP server returned ${res.status}`, fix: 'pnpm mcp:start' }
  } catch {
    return { name, status: 'error', message: 'MCP server not running', fix: 'pnpm mcp:start' }
  }
}

export const checkModelRouter = async (projectRoot: string): Promise<HealthCheckResult> => {
  const name = 'model-router'
  const configPath = path.join(projectRoot, '.agencee', 'model-router.json')
  try {
    const raw = fs.readFileSync(configPath, 'utf-8')
    const config = JSON.parse(raw) as Record<string, unknown>
    const provider = typeof config.defaultProvider === 'string' ? config.defaultProvider : 'unknown'
    return { name, status: 'ok', message: `Model router configured: ${provider}` }
  } catch {
    return { name, status: 'warn', message: 'No model router config found', fix: 'ai-kit init' }
  }
}

export const checkTechRegistry = async (_projectRoot: string): Promise<HealthCheckResult> => {
  const name = 'tech-registry'
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const registry = require('@ai-agencee/tech-registry') as { catalog: () => { packs: unknown[] }; version?: string }
    const cat = registry.catalog()
    const ver = registry.version ?? 'unknown'
    return { name, status: 'ok', message: `@ai-agencee/tech-registry@${ver} — ${cat.packs.length} packs` }
  } catch {
    return { name, status: 'warn', message: '@ai-agencee/tech-registry not installed', fix: 'pnpm add -D @ai-agencee/tech-registry' }
  }
}

export const checkAgenceeInit = async (projectRoot: string): Promise<HealthCheckResult> => {
  const name = 'agencee-init'
  const agenceeDir = path.join(projectRoot, '.agencee')
  if (fs.existsSync(agenceeDir)) {
    return { name, status: 'ok', message: '.agencee/ initialised' }
  }
  return { name, status: 'error', message: '.agencee/ not found', fix: 'ai-kit init' }
}

export const checkAgentFiles = async (projectRoot: string): Promise<HealthCheckResult> => {
  const name = 'agent-files'
  const agentsDir = path.join(projectRoot, 'agents')
  if (!fs.existsSync(agentsDir)) {
    return { name, status: 'warn', message: 'No agent files found', fix: 'ai-kit agent:create' }
  }
  const files = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.agent.json'))
  if (files.length === 0) {
    return { name, status: 'warn', message: 'No agent files found', fix: 'ai-kit agent:create' }
  }
  for (const file of files) {
    try {
      JSON.parse(fs.readFileSync(path.join(agentsDir, file), 'utf-8'))
    } catch {
      return { name, status: 'error', message: `Agent file ${file} invalid JSON`, fix: 'Check file syntax' }
    }
  }
  return { name, status: 'ok', message: `${files.length} agent file${files.length === 1 ? '' : 's'} found, all valid JSON` }
}

export const checkCloudApi = async (_projectRoot: string): Promise<HealthCheckResult> => {
  const name = 'cloud-api'
  const token = process.env['AI_AGENCEE_TOKEN'] ?? process.env['AGENCEE_AUTH_TOKEN']
  if (!token) {
    return { name, status: 'warn', message: 'Not connected to cloud (no auth token)', fix: 'ai-kit login' }
  }
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)
    if (typeof timer === 'object' && 'unref' in timer) timer.unref()
    const baseUrl = process.env['AGENCEE_CLOUD_URL'] ?? 'https://api.ai-agencee.io'
    const res = await fetch(`${baseUrl}/api/health`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    })
    clearTimeout(timer)
    if (res.ok) {
      const body = await res.json() as Record<string, unknown>
      const tenantId = typeof body.tenantId === 'string' ? body.tenantId : 'unknown'
      return { name, status: 'ok', message: `Cloud API connected (tenant: ${tenantId})` }
    }
    return { name, status: 'error', message: 'Cloud API unreachable', fix: 'Check network or ai-kit login' }
  } catch {
    return { name, status: 'error', message: 'Cloud API unreachable', fix: 'Check network or ai-kit login' }
  }
}

export const checkCodernic = async (projectRoot: string): Promise<HealthCheckResult> => {
  const name = 'codernic'
  const indexPath = path.join(projectRoot, '.ai', 'project-intelligence.json')
  if (!fs.existsSync(indexPath)) {
    return { name, status: 'warn', message: 'Project not indexed', fix: 'ai-kit analyze' }
  }
  try {
    const raw = fs.readFileSync(indexPath, 'utf-8')
    const data = JSON.parse(raw) as Record<string, unknown>
    const generatedAt = typeof data.generatedAt === 'string' ? data.generatedAt : null
    if (!generatedAt) {
      return { name, status: 'warn', message: 'Codernic index missing generatedAt', fix: 'ai-kit analyze' }
    }
    const ageMs = Date.now() - Date.parse(generatedAt)
    const ageH = Math.round(ageMs / 3_600_000)
    if (ageMs < 86_400_000) {
      return { name, status: 'ok', message: `Codernic index fresh (${ageH}h old)` }
    }
    return { name, status: 'warn', message: `Codernic index stale (${ageH}h old)`, fix: 'ai-kit analyze' }
  } catch {
    return { name, status: 'warn', message: 'Codernic index unreadable', fix: 'ai-kit analyze' }
  }
}
