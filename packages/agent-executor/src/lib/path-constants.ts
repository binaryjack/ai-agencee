import * as path from 'path'

export const AGENCEE_DIR      = '.agencee' as const
export const AUDIT_DIR        = '.agencee/audit' as const
export const RBAC_FILE        = '.agencee/rbac.json' as const
export const MEMORY_DB_FILE   = '.agencee/memory.db' as const
export const PLAN_STATE_DIR   = '.agencee/plan-state' as const
export const RESULTS_DIR      = '.agencee/results' as const
export const RUNS_DIR         = '.agencee/runs' as const
export const RATE_LIMITS_FILE = '.agencee/rate-limits.json' as const
export const TENANTS_DIR      = '.agencee/tenants' as const
export const EXAMPLES_DIR     = '.agencee/examples' as const
export const CHECKPOINTS_DIR  = '.agencee/checkpoints' as const

export const agenceePaths = (projectRoot: string) => ({
  agenceeDir:     path.join(projectRoot, AGENCEE_DIR),
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
