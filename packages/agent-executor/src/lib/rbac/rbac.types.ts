export type RbacAction =
  | 'run'
  | 'audit:read'
  | 'audit:verify'
  | 'verdict:override'
  | 'budget:override'
  | 'interactive:pause'
  | '*';

export type LaneRestriction = 'allow' | 'deny';

export interface RbacRoleDefinition {
  permissions: string[];
}

export interface RbacPrincipalDefinition {
  role: string;
  laneRestrictions?: Record<string, LaneRestriction>;
  rateLimits?: {
    tokenBudgetPerDay?:  number;
    maxConcurrentRuns?:  number;
    maxRunsPerHour?:     number;
  };
}

export interface RbacPolicyFile {
  version:      1;
  defaultRole?: string;
  roles:        Record<string, RbacRoleDefinition>;
  principals:   Record<string, RbacPrincipalDefinition>;
}

type RbacDeniedErrorMutable = Error & { principal: string; action: string; resource?: string }
export type RbacDeniedErrorInstance = Error & {
  readonly principal: string
  readonly action:    string
  readonly resource?: string
}

export const RbacDeniedError = function(
  this: RbacDeniedErrorMutable,
  principal: string,
  action:    string,
  resource?: string,
): void {
  const target   = resource ? ` on "${resource}"` : ''
  this.name      = 'RbacDeniedError'
  this.message   = `RBAC: principal "${principal}" is denied action "${action}"${target}`
  this.principal = principal
  this.action    = action
  this.resource  = resource
  this.stack     = new Error(this.message).stack
} as unknown as new (principal: string, action: string, resource?: string) => RbacDeniedErrorInstance

Object.setPrototypeOf(RbacDeniedError.prototype, Error.prototype)

export type RbacDeniedError = RbacDeniedErrorInstance
