import * as fs from 'fs/promises';
import * as path from 'path';
import type { CheckpointRecord } from '../../dag-types.js';
import type { ILaneExecutor } from '../lane-executor.js';

export async function saveCheckpoints(
  this:    ILaneExecutor,
  laneId:  string,
  records: CheckpointRecord[],
): Promise<void> {
  if (records.length === 0) return;

  const laneDir = path.join(this._checkpointBaseDir, laneId);
  try {
    await fs.mkdir(laneDir, { recursive: true });
    for (const record of records) {
      const filePath     = path.join(laneDir, `${record.checkpointId}.json`);
      const serializable = {
        ...record,
        contractsReceived: record.contractsReceived
          ? Object.fromEntries(record.contractsReceived)
          : undefined,
      };
      await fs.writeFile(filePath, JSON.stringify(serializable, null, 2), 'utf-8');
    }
  } catch {
    // Best-effort
  }
}
