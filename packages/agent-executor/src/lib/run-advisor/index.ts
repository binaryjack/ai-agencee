export { RunAdvisor } from './run-advisor.js';
export type {
    AdviceReport, IRunAdvisor, LaneStats, Recommendation, RecommendationKind, RunAdvisorOptions
} from './run-advisor.js';

// Must import AFTER constructor export to avoid CJS circular-dep crash.
import './prototype/index.js'
