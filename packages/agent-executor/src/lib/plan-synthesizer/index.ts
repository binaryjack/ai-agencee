
export { AGENT_FILES, PlanSynthesizer, buildSteps, selectAgents } from './plan-synthesizer.js';
export type { IPlanSynthesizer } from './plan-synthesizer.js';

// Must import AFTER constructor export to avoid CJS circular-dep crash.
import './prototype/index.js'
