import { PlanSynthesizer } from '../plan-synthesizer.js';
import { _agentIntroduction }       from './_agentIntroduction.js';
import { _buildStepsWithFallback }  from './_buildStepsWithFallback.js';
import { _ensurePromptRegistry }    from './_ensurePromptRegistry.js';
import { _processApprovalFeedback } from './_processApprovalFeedback.js';
import { _save }                    from './_save.js';
import { synthesize }               from './synthesize.js';

Object.assign((PlanSynthesizer as Function).prototype, {
  synthesize,
  _buildStepsWithFallback,
  _agentIntroduction,
  _processApprovalFeedback,
  _ensurePromptRegistry,
  _save,
});
