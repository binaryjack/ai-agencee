import * as fs from 'fs/promises';
import type { RunEntry } from '../../run-registry/run-registry.types.js';
import type { IRunAdvisor } from '../run-advisor.js';

export async function _readManifest(this: IRunAdvisor): Promise<RunEntry[]> {
  const raw = await fs.readFile(this._manifestPath, 'utf-8').catch(() => '[]');
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as RunEntry[];
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as Record<string, unknown>).runs)
    ) {
      return (parsed as { runs: RunEntry[] }).runs;
    }
    return [];
  } catch {
    return [];
  }
}
