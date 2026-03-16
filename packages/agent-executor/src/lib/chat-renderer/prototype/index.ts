import { ChatRenderer } from '../chat-renderer.js';
import { _progressBar }       from './_progressBar.js';
import { _statusIcon }        from './_statusIcon.js';
import { _wrap }              from './_wrap.js';
import { approvalPrompt }     from './approvalPrompt.js';
import { checklist }          from './checklist.js';
import { decision }           from './decision.js';
import { error }              from './error.js';
import { modelRecommendation } from './modelRecommendation.js';
import { newline }            from './newline.js';
import { phaseHeader }        from './phaseHeader.js';
import { phaseSummary }       from './phaseSummary.js';
import { question }           from './question.js';
import { say }                from './say.js';
import { separator }          from './separator.js';
import { system }             from './system.js';
import { warn }               from './warn.js';

Object.assign((ChatRenderer as Function).prototype, {
  phaseHeader, say, question, system, warn, error,
  separator, newline, checklist, decision,
  modelRecommendation, approvalPrompt, phaseSummary,
  _statusIcon, _progressBar, _wrap,
});
