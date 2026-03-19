export interface DryRunError {
  lane?:    string
  type:     'file-missing' | 'bare-filename' | 'cycle' | 'depends-on-invalid' | 'tech-unresolved'
  message:  string
}

export interface DryRunWarning {
  lane?:  string
  message: string
}

export interface DryRunReport {
  valid:      boolean
  errors:     DryRunError[]
  warnings:   DryRunWarning[]
  laneCount:  number
  agentFiles: string[]
}
