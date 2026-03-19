export type ViolationType =
  | 'bare-filename'
  | 'file-missing'
  | 'tech-unresolved'
  | 'depends-on-invalid'
  | 'cycle'

export interface ContractViolation {
  type:    ViolationType
  message: string
  field?:  string
  value?:  string
}

export interface ContractResult {
  valid:      boolean
  violations: ContractViolation[]
  warnings:   string[]
}
