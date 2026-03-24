/**
 * Result Merger Factory
 */

import { ResultMerger } from './result-merger'
import type { ResultMergerInstance } from './result-merger.types'

export function createResultMerger(maxResults: number = 50): ResultMergerInstance {
  return new ResultMerger(maxResults)
}
