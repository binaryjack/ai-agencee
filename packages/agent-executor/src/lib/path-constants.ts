import * as path from 'path'

export const AGENTS_DIR       = '.agents' as const
export const AUDIT_DIR        = '.agents/audit' as const
export const RBAC_FILE        = '.agents/rbac.json' as const
export const MEMORY_DB_FILE   = '.agents/memory.db' as const
export const PLAN_STATE_DIR   = '.agents/plan-state' as const
export const RESULTS_DIR      = '.agents/results' as const
export const RUNS_DIR         = '.agents/runs' as const
export const RATE_LIMITS_FILE = '.agents/rate-limits.json' as const
export const TENANTS_DIR      = '.agents/tenants' as const
export const EXAMPLES_DIR     = '.agents/examples' as const
export const CHECKPOINTS_DIR  = '.agents/checkpoints' as const

export const agentsPaths = (projectRoot: string) => ({
  agentsDir:      path.join(projectRoot, AGENTS_DIR),
  auditDir:       path.join(projectRoot, AUDIT_DIR),
  rbacFile:       path.join(projectRoot, RBAC_FILE),
  memoryDb:       path.join(projectRoot, MEMORY_DB_FILE),
  planStateDir:   path.join(projectRoot, PLAN_STATE_DIR),
  resultsDir:     path.join(projectRoot, RESULTS_DIR),
  runsDir:        path.join(projectRoot, RUNS_DIR),
  rateLimitsFile: path.join(projectRoot, RATE_LIMITS_FILE),
  tenantsDir:     path.join(projectRoot, TENANTS_DIR),
  examplesDir:    path.join(projectRoot, EXAMPLES_DIR),
  checkpointsDir: path.join(projectRoot, CHECKPOINTS_DIR),
})
