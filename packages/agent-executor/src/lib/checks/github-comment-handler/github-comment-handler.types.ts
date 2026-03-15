import type { ICheckHandler, RawCheckResult } from '../check-handler.types.js';

export interface IGithubCommentHandler extends ICheckHandler {
  new(): IGithubCommentHandler;
  readonly type: 'github-comment';
  execute(ctx: import('../check-context.js').CheckContext): Promise<RawCheckResult>;
}
