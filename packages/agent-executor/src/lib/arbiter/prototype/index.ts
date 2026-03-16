import { Arbiter } from '../arbiter.js'
import { raise } from './raise.js'
import { microAlign } from './microAlign.js'
import { getDecisions } from './getDecisions.js'
import { runStandardDecisions } from './runStandardDecisions.js'
import { _save } from './_save.js'

Object.assign((Arbiter as Function).prototype, { raise, microAlign, getDecisions, runStandardDecisions, _save });

