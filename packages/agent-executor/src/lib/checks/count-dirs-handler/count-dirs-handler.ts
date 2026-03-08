import { execute } from './prototype/index.js';
import type { ICountDirsHandler } from './count-dirs-handler.types.js';

export const CountDirsHandler = function (this: ICountDirsHandler) {
} as unknown as ICountDirsHandler;

Object.assign(CountDirsHandler.prototype, {
  type: 'count-dirs' as const,
  execute,
});
