import type { CheckDefinition } from '../../agent-types.js';
import type { ToolExecutorFn } from '../../llm-provider.js';
import type { RoutedResponse } from '../../model-router/index.js';
import type { IModelRouter } from '../../model-router/model-router.js';
import type { CheckType } from '../../agent-types.js';
import type { StepResult } from '../../check-runner.js';
import type { CheckContext } from '../check-context.js';
import type { ICheckHandler } from '../check-handler.types.js';

export interface ICheckHandlerRegistry {
  new(): ICheckHandlerRegistry;
  createDefault(modelRouter?: IModelRouter, onLlmResponse?: (response: RoutedResponse) => void): ICheckHandlerRegistry;
  buildContext(
    check: CheckDefinition,
    projectRoot: string,
    retryInstructions?: string,
    modelRouter?: IModelRouter,
    onLlmResponse?: (response: RoutedResponse) => void,
    onLlmStream?: (token: string) => void,
    toolExecutor?: ToolExecutorFn,
  ): CheckContext;
  register(handler: ICheckHandler): ICheckHandlerRegistry;
  discover(nodeModulesDir?: string): Promise<void>;
  run(ctx: CheckContext): Promise<StepResult>;
  /** Internal instance state — not part of the public API. */
  _handlers: Map<CheckType, ICheckHandler>;
}
