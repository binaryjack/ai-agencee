import * as readline from 'readline'
import type { CheckpointPayload, SupervisorVerdict } from '../../../dag-types.js'
import { VERDICT } from '../../../dag-types.js'
import type { IInteractiveHumanReviewGate } from '../interactive-human-review-gate.js'

export async function prompt(
  this: IInteractiveHumanReviewGate,
  payload: CheckpointPayload,
  verdict: SupervisorVerdict,
): Promise<SupervisorVerdict> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const findings = payload.partialResult.findings ?? [];

  process.stdout.write('\n');
  process.stdout.write('  🔔  HUMAN REVIEW CHECKPOINT\n');
  process.stdout.write(`  Checkpoint : ${payload.checkpointId}\n`);
  process.stdout.write(`  Supervisor : ${verdict.type}`);
  if (verdict.type === VERDICT.RETRY) {
    process.stdout.write(` ("${verdict.instructions ?? ''}")`);
  }
  process.stdout.write('\n');

  if (findings.length > 0) {
    process.stdout.write('  Findings   :\n');
    findings.slice(-5).forEach((f) => process.stdout.write(`    ${f}\n`));
  }

  process.stdout.write(
    '\n  [a] Approve  [r] Retry  [e] Escalate  (Enter = accept verdict)\n> ',
  );

  return new Promise<SupervisorVerdict>((resolve) => {
    rl.once('line', (input) => {
      rl.close();
      const ch = input.trim().toLowerCase();
      if (ch === 'a') return resolve({ type: VERDICT.APPROVE });
      if (ch === 'r') return resolve({ type: VERDICT.RETRY, instructions: 'Human-requested retry' });
      if (ch === 'e') {
        return resolve({
          type: VERDICT.ESCALATE,
          reason: 'Human escalated at review checkpoint',
        });
      }
      resolve(verdict);
    });
  });
}
