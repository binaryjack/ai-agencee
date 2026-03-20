import * as path from 'path'

// Core directories
export const AGENCEE_DIR      = '.agencee' as const
export const CONFIG_DIR       = '.agencee/config' as const
export const AGENTS_DIR       = '.agencee/config/agents' as const
export const TECHNOLOGIES_DIR = '.agencee/config/technologies' as const
export const RUNTIME_DIR      = '.agencee/runtime' as const
export const MEMORY_DIR       = '.agencee/memory' as const
export const USER_DIR         = '.agencee/user' as const

// Runtime subdirectories
export const AUDIT_DIR        = '.agencee/runtime/audit' as const
export const RBAC_FILE        = '.agencee/runtime/rbac.json' as const
export const PLAN_STATE_DIR   = '.agencee/runtime/plan-state' as const
export const RESULTS_DIR      = '.agencee/runtime/results' as const
export const RUNS_DIR         = '.agencee/runtime/runs' as const
export const RATE_LIMITS_FILE = '.agencee/runtime/rate-limits.json' as const
export const TENANTS_DIR      = '.agencee/runtime/tenants' as const
export const EXAMPLES_DIR     = '.agencee/runtime/examples' as const
export const CHECKPOINTS_DIR  = '.agencee/runtime/checkpoints' as const

// Memory subdirectories
export const MEMORY_DB_FILE   = '.agencee/memory/memory.db' as const
export const CODERNIC_DB_FILE = '.agencee/memory/codernic.db' as const

export const agenceePaths = (projectRoot: string) => ({
  agenceeDir:       path.join(projectRoot, AGENCEE_DIR),
  configDir:        path.join(projectRoot, CONFIG_DIR),
  agentsDir:        path.join(projectRoot, AGENTS_DIR),
  technologiesDir:  path.join(projectRoot, TECHNOLOGIES_DIR),
  runtimeDir:       path.join(projectRoot, RUNTIME_DIR),
  memoryDir:        path.join(projectRoot, MEMORY_DIR),
  userDir:          path.join(projectRoot, USER_DIR),
  
  auditDir:       path.join(projectRoot, AUDIT_DIR),
  rbacFile:       path.join(projectRoot, RBAC_FILE),
  memoryDb:       path.join(projectRoot, MEMORY_DB_FILE),
  codernicDb:     path.join(projectRoot, CODERNIC_DB_FILE),
  planStateDir:   path.join(projectRoot, PLAN_STATE_DIR),
  resultsDir:     path.join(projectRoot, RESULTS_DIR),
  runsDir:        path.join(projectRoot, RUNS_DIR),
  rateLimitsFile: path.join(projectRoot, RATE_LIMITS_FILE),
  tenantsDir:     path.join(projectRoot, TENANTS_DIR),
  examplesDir:    path.join(projectRoot, EXAMPLES_DIR),
  checkpointsDir: path.join(projectRoot, CHECKPOINTS_DIR),
})
