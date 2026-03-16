import * as fs from 'fs/promises';
import * as path from 'path';
import type { LaneDefinition } from '../../dag-types.js';
import type { ILaneExecutor } from '../lane-executor.js';

export async function findHandoffLane(
  this:          ILaneExecutor,
  targetLaneId:  string,
  _sourceLane:   LaneDefinition,
): Promise<LaneDefinition | null> {
  const agentFile      = `${targetLaneId}.agent.json`;
  const supervisorFile = `${targetLaneId}.supervisor.json`;
  const agentFilePath  = path.resolve(this._agentsBaseDir, agentFile);

  try {
    await fs.access(agentFilePath);
  } catch {
    return null;
  }

  const supPath = path.resolve(this._agentsBaseDir, supervisorFile);
  let hasSupervisor = false;
  try {
    await fs.access(supPath);
    hasSupervisor = true;
  } catch { /* no supervisor */ }

  return {
    id:             targetLaneId,
    agentFile,
    supervisorFile: hasSupervisor ? supervisorFile : undefined,
  };
}
