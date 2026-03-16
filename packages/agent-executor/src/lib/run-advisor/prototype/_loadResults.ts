import * as fs from 'fs/promises';
import * as path from 'path';
import type { DagResult } from '../../dag-types.js';
import type { RunEntry } from '../../run-registry/run-registry.types.js';
import type { IRunAdvisor } from '../run-advisor.js';

export async function _loadResults(this: IRunAdvisor, entries: RunEntry[]): Promise<DagResult[]> {
  const results: DagResult[] = [];
  for (const entry of entries) {
    const resultsDir = path.join(this._runsDir, entry.runId, 'results');
    const resultFile = path.join(resultsDir, `dag-${entry.runId}.json`);
    try {
      const raw  = await fs.readFile(resultFile, 'utf-8');
      const data = JSON.parse(raw) as DagResult;
      results.push(data);
    } catch {
      // skip unreadable
    }
  }
  return results;
}
