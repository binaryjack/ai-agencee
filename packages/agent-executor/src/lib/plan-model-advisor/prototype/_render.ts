import type { IPlanModelAdvisor, ModelAdvisorReport } from '../plan-model-advisor.js';

export function _render(this: IPlanModelAdvisor, report: ModelAdvisorReport): void {
  const r = this._renderer;

  r.separator('═');
  r.say('system', '🧠 MODEL ADVISOR — Phase-by-Phase Recommendation');
  r.separator('─');

  if (report.availableProviders.length > 0) {
    r.say('system', `Active provider : ${report.activeProvider}`);
    r.say('system', `Available       : ${report.availableProviders.join(', ')}`);
  } else {
    r.warn('No providers registered — running in heuristic (no-LLM) mode');
    r.say('system', 'To enable AI: set ANTHROPIC_API_KEY or OPENAI_API_KEY');
  }

  r.newline();
  r.say('system', 'Recommended model per phase:');
  r.newline();

  for (const p of report.phases) {
    const familyIcon = p.family === 'opus' ? '🔵' : p.family === 'sonnet' ? '🟡' : '🟢';
    r.say('system', `  ${familyIcon} ${p.phase.padEnd(12)} ${p.family.padEnd(8)} ${p.modelId}`);
    r.say('system', `     ↳ ${p.reason}`);
    r.say('system', `     💰 ${p.costNote}`);
    r.newline();
  }

  r.separator('─');
  r.say('system', `Total plan estimate: ${report.totalEstimate}`);

  if (report.warnings.length > 0) {
    r.newline();
    for (const w of report.warnings) r.warn(w);
  }

  r.say('system', 'Override provider with: --provider anthropic | openai | vscode');
  r.separator('═');
  r.newline();
}
