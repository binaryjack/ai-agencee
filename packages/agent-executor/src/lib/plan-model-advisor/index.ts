export { PHASE_TASK_MAP, PlanModelAdvisor, STATIC_REASONS } from './plan-model-advisor.js';
export type {
    IPlanModelAdvisor, ModelAdvisorReport, PhaseModelAdvice
} from './plan-model-advisor.js';

// Must import AFTER constructor export to avoid CJS circular-dep crash.
import './prototype/index.js'
