export interface PostPrCommentOptions {
  /** Markdown body of the comment */
  body: string;
  /**
   * If true, deletes any existing comments left by the same bot token before
   * posting.  Prevents duplicate comments on re-runs. Default: true
   */
  replacePrevious?: boolean;
  /** GitHub token. Falls back to GITHUB_TOKEN env. */
  token?: string;
  /** 'owner/repo'. Falls back to GITHUB_REPOSITORY env. */
  repository?: string;
  /** PR number. Falls back to GITHUB_PR_NUMBER env. */
  prNumber?: number;
}
