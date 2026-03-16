import { Arbiter } from '../arbiter.js'
import { _save } from './_save.js'
import { getDecisions } from './getDecisions.js'
import { microAlign } from './microAlign.js'
import { raise } from './raise.js'
import { runStandardDecisions } from './runStandardDecisions.js'

Object.assign((Arbiter as Function).prototype, { raise, microAlign, getDecisions, runStandardDecisions, _save });

