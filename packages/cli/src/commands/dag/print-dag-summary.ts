import type { DagResult } from '@ai-agencee/engine';
import * as path from 'path';

export function printDagSummary(result: DagResult, projectRoot: string): void {
  const W = 60;
  const line = '─'.repeat(W);

  console.log(`\n${'\u2550'.repeat(W)}`);
  console.log(`  📊  DAG RESULT: ${result.dagName}`);
  console.log(`${'\u2550'.repeat(W)}`);

  const statusIcon =
    result.status === 'success' ? '✅' : result.status === 'partial' ? '⚠️ ' : '❌';
  console.log(`  Status     : ${statusIcon}  ${result.status.toUpperCase()}`);
  console.log(`  Run ID     : ${result.runId}`);
  console.log(`  Duration   : ${result.totalDurationMs}ms`);
  console.log(`  Lanes      : ${result.lanes.length}`);

  console.log(`\n${line}`);
  console.log(
    `  ${'Lane'.padEnd(22)} ${'Status'.padEnd(12)} ${'Chk'.padStart(4)} ${'Ret'.padStart(4)} ${'ms'.padStart(7)}`,
  );
  console.log(line);

  for (const lane of result.lanes) {
    const icon =
      lane.status === 'success'
        ? '✅'
        : lane.status === 'escalated'
          ? '🚨'
          : lane.status === 'timed-out'
            ? '⏱️ '
            : '❌';
    const name = lane.laneId.padEnd(22);
    const status = (icon + ' ' + lane.status).padEnd(12);
    const chk = String(lane.checkpoints.length).padStart(4);
    const ret = String(lane.totalRetries).padStart(4);
    const ms = String(lane.durationMs).padStart(7);
    console.log(`  ${name} ${status} ${chk} ${ret} ${ms}`);
    if (lane.error) {
      console.log(`     └─ ${lane.error}`);
    }
  }
  console.log(line);

  if (result.findings.length > 0) {
    console.log(`\n  📋 Findings (${result.findings.length}):`);
    result.findings.slice(0, 20).forEach((f) => console.log(`    ${f}`));
    if (result.findings.length > 20) {
      console.log(`    … and ${result.findings.length - 20} more`);
    }
  }

  if (result.recommendations.length > 0) {
    console.log(`\n  💡 Recommendations (${result.recommendations.length}):`);
    result.recommendations.slice(0, 10).forEach((r) => console.log(`    • ${r}`));
    if (result.recommendations.length > 10) {
      console.log(`    • … and ${result.recommendations.length - 10} more`);
    }
  }

  const resultFile = path.join('.agents', 'results', `dag-${result.runId}.json`);
  console.log(`\n  💾 Full result: ${resultFile}`);
  console.log(`${'\u2550'.repeat(W)}\n`);
}
