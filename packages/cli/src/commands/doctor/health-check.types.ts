export type CheckStatus = 'ok' | 'warn' | 'error'

export interface HealthCheckResult {
  name:    string
  status:  CheckStatus
  message: string
  fix?:    string
}

export interface DoctorReport {
  allOk:  boolean
  checks: HealthCheckResult[]
}
