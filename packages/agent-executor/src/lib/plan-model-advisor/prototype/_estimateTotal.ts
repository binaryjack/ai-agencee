import type { QualityGrade } from '../../plan-types.js';
import type { IPlanModelAdvisor } from '../plan-model-advisor.js';

export function _estimateTotal(
  this:        IPlanModelAdvisor,
  grade:       QualityGrade,
  hasProvider: boolean,
): string {
  if (!hasProvider) return '$0.00 (no LLM provider — heuristic mode)';
  switch (grade) {
    case 'poc-stub':   return '~$0.01–0.05 (haiku throughout)';
    case 'mvp':        return '~$0.05–0.30 (haiku + sonnet mix)';
    case 'enterprise': return '~$0.30–2.00 (haiku + sonnet + opus)';
  }
}
