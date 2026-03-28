/**
 * Approval gate system - public API
 */

export type {
    ApprovalAction, ApprovalGateConfig,
    ApprovalHandler, ApprovalRequest,
    ApprovalResponse,
    ApprovalStats, ApprovalTrustLevel, CliApprovalHandler as CliApprovalHandlerType, PatchApproval
} from './approval.types.js';

export { CliApprovalHandler } from './cli-approval-handler.js';

export {
    executeApprovalGate, filterApprovedPatches, requestPatchApproval, requiresApproval
} from './approval-orchestrator.js';

