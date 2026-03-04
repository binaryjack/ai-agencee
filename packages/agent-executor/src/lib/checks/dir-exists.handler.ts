import * as fs from 'fs/promises'
import type { CheckContext } from './check-context.js'
import type { ICheckHandler, RawCheckResult } from './check-handler.interface.js'

/** Passes when the path at `check.path` exists (same as file-exists but semantically a directory). */
export class DirExistsHandler implements ICheckHandler {
  readonly type = 'dir-exists' as const;

  async execute(ctx: CheckContext): Promise<RawCheckResult> {
    try {
      await fs.access(ctx.fullPath);
      return { passed: true };
    } catch {
      return { passed: false };
    }
  }
}
