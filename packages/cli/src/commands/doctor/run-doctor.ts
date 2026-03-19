import type { DoctorReport } from './health-check.types.js'
import {
    checkAgenceeInit,
    checkAgentFiles,
    checkCloudApi,
    checkCodernic,
    checkMcpServer,
    checkModelRouter,
    checkTechRegistry,
} from './health-checks.js'

const ICONS: Record<string, string> = { ok: '✅', warn: '⚠️', error: '🔴' }

export const runDoctor = async (projectRoot: string = process.cwd()): Promise<DoctorReport> => {
  const checks = await Promise.all([
    checkMcpServer(projectRoot),
    checkModelRouter(projectRoot),
    checkTechRegistry(projectRoot),
    checkAgenceeInit(projectRoot),
    checkAgentFiles(projectRoot),
    checkCloudApi(projectRoot),
    checkCodernic(projectRoot),
  ])

  const allOk = checks.every((c) => c.status === 'ok')

  console.log('\nai-kit doctor\n')
  for (const check of checks) {
    const icon = ICONS[check.status] ?? '?'
    console.log(`  ${icon}  ${check.name.padEnd(20)} ${check.message}`)
    if (check.fix) {
      console.log(`         → ${check.fix}`)
    }
  }
  console.log()

  return { allOk, checks }
}
