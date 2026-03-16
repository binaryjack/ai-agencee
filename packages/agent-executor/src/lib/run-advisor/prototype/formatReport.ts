import type { AdviceReport, IRunAdvisor } from '../run-advisor.js';
import { ms, pct } from './_helpers.js';

export function formatReport(this: IRunAdvisor, report: AdviceReport): string {
  const lines: string[] = [];
  lines.push(`\n📊  Run Advisor Report — ${report.dagName}`);
  lines.push(`    Generated: ${report.generatedAt}`);
  lines.push(`    Runs analysed: ${report.runsAnalysed} (lookback window: ${report.lookback})`);
  lines.push(`    DAG success rate: ${pct(report.dagSuccessRate)}`);
  lines.push('');

  if (report.perLane.length > 0) {
    lines.push('  Per-lane summary:');
    for (const lane of report.perLane) {
      lines.push(
        `    ${lane.laneId.padEnd(28)} ` +
        `runs=${lane.sampleCount}  ` +
        `avg_retries=${lane.avgRetries.toFixed(1)}  ` +
        `avg_duration=${ms(lane.avgDurationMs)}  ` +
        `failure_rate=${pct(lane.failureRate)}`,
      );
    }
    lines.push('');
  }

  if (report.recommendations.length === 0) {
    lines.push('  ✅  No issues found — system is performing well within all thresholds.');
  } else {
    lines.push(`  💡  ${report.recommendations.length} recommendation(s):`);
    for (const rec of report.recommendations) {
      const icon = {
        HIGH_RETRY_RATE:   '🔁',
        SLOW_LANE:         '🐢',
        FLAKY_LANE:        '🎲',
        DOWNGRADE_MODEL:   '💰',
        BUDGET_SUGGESTION: '💸',
        DAG_UNSTABLE:      '🚨',
      }[rec.kind];
      const prefix = rec.laneId ? `[${rec.laneId}] ` : '';
      lines.push(`\n  ${icon}  ${rec.kind} ${prefix}`);
      lines.push(`     ${rec.message}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}
