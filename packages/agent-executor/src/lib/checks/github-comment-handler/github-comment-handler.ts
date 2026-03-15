import { execute } from './prototype/index.js'
import type { IGithubCommentHandler } from './github-comment-handler.types.js'

export const GithubCommentHandler = function(this: IGithubCommentHandler) {
  // no-op constructor
} as unknown as IGithubCommentHandler;

Object.assign(GithubCommentHandler.prototype, {
  type: 'github-comment' as const,
  execute,
});
