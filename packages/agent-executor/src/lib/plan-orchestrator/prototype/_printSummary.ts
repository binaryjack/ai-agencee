import type { IChatRenderer } from '../../chat-renderer/index.js';
import type { IPlanOrchestrator, PlanResult } from '../plan-orchestrator.js';

export function _printSummary(
  this:   IPlanOrchestrator,
  result: PlanResult,
  r:      IChatRenderer,
): void {
  const statusIcon = result.status === 'success' ? '✅' : result.status === 'partial' ? '⚠️' : '❌';
  r.newline();
  r.separator('═');
  r.say('system', `${statusIcon} PLAN ${result.status.toUpperCase()}: ${result.planName}`);
  r.separator('─');
  r.say('system', `  Steps:    ${result.steps.length}`);
  r.say('system', `  Duration: ${(result.totalDurationMs / 1000).toFixed(1)}s`);
  r.say('system', `  Saved to: ${result.savedTo}`);
  r.separator('─');
  for (const s of result.steps) {
    const icon = s.status === 'success' ? '✅' : s.status === 'skipped' ? '⊘' : s.status === 'gated' ? '⏸' : '❌';
    r.say('system', `  ${icon}  ${s.stepName.padEnd(28)} ${(s.durationMs / 1000).toFixed(1)}s`);
  }
  r.separator('═');
  r.newline();
}
