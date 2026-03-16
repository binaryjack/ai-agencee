import { RunAdvisor } from '../run-advisor.js';
import { _loadResults }  from './_loadResults.js';
import { _readManifest } from './_readManifest.js';
import { analyse }       from './analyse.js';
import { formatReport }  from './formatReport.js';

Object.assign((RunAdvisor as Function).prototype, {
  analyse, formatReport, _readManifest, _loadResults,
});
