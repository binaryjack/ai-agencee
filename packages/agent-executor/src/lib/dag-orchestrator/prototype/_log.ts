import type { IDagOrchestrator } from '../dag-orchestrator.js';

export function _log(this: IDagOrchestrator, msg: string): void {
  if (this._verbose) {
    process.stdout.write(msg + '\n');
  }
}
