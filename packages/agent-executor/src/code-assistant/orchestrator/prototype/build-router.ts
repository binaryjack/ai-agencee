/**
 * Prototype method: _buildRouter
 *
 * Bootstraps an IModelRouter from the options supplied to the orchestrator.
 * Resolution order:
 *   1. options.modelRouter (pre-wired by caller — zero overhead)
 *   2. options.dagPath      (explicit config file path)
 *   3. <projectRoot>/agents/model-router.json  (convention-based discovery)
 *   4. Inline minimal config using options.modelProvider (default: 'anthropic')
 *
 * Returns undefined when no provider can be auto-registered, letting execute()
 * surface a clear, actionable error instead of throwing from deep inside.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

import type { IModelRouter } from '../../../lib/model-router/index.js';
import { ModelRouter } from '../../../lib/model-router/index.js';

import type { ICodeAssistantOrchestrator } from '../code-assistant-orchestrator.js';

export async function _buildRouter(
  this: ICodeAssistantOrchestrator,
): Promise<IModelRouter | undefined> {
  const { modelRouter, dagPath, projectRoot, modelProvider } = this._options;

  // Fast path — pre-wired router requires no I/O
  if (modelRouter) return modelRouter;

  try {
    const configPath = dagPath
      ?? path.join(projectRoot, 'agents', 'model-router.json');

    const exists = await fs.access(configPath).then(() => true, () => false);

    const MR = ModelRouter as unknown as {
      fromFile(p: string):    Promise<IModelRouter>;
      fromConfig(c: object):  IModelRouter;
    };

    const router: IModelRouter = exists
      ? await MR.fromFile(configPath)
      : MR.fromConfig({
          defaultProvider: modelProvider ?? 'anthropic',
          taskProfiles:    {},
          providers:       {},
        });

    await router.autoRegister();

    const providers = router.registeredProviders();
    return providers.length > 0 ? router : undefined;
  } catch {
    return undefined;
  }
}
