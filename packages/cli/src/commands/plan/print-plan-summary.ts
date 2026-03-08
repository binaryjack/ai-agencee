import type { PlanResult } from '@ai-agencee/engine';

export function printPlanSummary(result: PlanResult): void {
  const icon = result.status === 'success' ? '✅' : result.status === 'partial' ? '⚠️' : '❌';
  console.log('\n' + '═'.repeat(52));
  console.log(`  ${icon}  PLAN ${result.status.toUpperCase()}: ${result.planName}`);
  console.log('═'.repeat(52));
  console.log(`  Plan ID  : ${result.planId}`);
  console.log(`  Phase    : ${result.phase}`);
  console.log(`  Duration : ${(result.totalDurationMs / 1000).toFixed(1)}s`);
  console.log(`  Steps    : ${result.steps.length}`);
  console.log(`  Saved to : ${result.savedTo}`);
  if (result.steps.length > 0) {
    console.log('');
    console.log('  Step Results:');
    for (const s of result.steps) {
      const sIcon = s.status === 'success' ? '✅' : s.status === 'skipped' ? '⊘ ' : s.status === 'gated' ? '⏸' : '❌';
      console.log(`    ${sIcon}  ${s.stepName}`);
    }
  }
  console.log('═'.repeat(52));
  console.log(`\n  💾 Full state saved → ${result.savedTo}\n`);
}
