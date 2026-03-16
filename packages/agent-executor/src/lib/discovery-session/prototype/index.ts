import { DiscoverySession } from '../discovery-session.js';
import { _acknowledgeAnswer }  from './_acknowledgeAnswer.js';
import { _extractProjectName } from './_extractProjectName.js';
import { _save }               from './_save.js';
import { _synthesizeInsights } from './_synthesizeInsights.js';
import { run }                 from './run.js';

Object.assign((DiscoverySession as Function).prototype, {
  run,
  _acknowledgeAnswer,
  _synthesizeInsights,
  _extractProjectName,
  _save,
});
