import { PlanModelAdvisor } from '../plan-model-advisor.js';
import { _estimateTotal } from './_estimateTotal.js';
import { _render } from './_render.js';
import { display } from './display.js';

Object.assign((PlanModelAdvisor as Function).prototype, {
  display, _render, _estimateTotal,
});
