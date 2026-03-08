export interface BenchmarkOptions {
  /** Comma-separated list of provider names to benchmark. Default: all registered */
  providers?: string;
  /** Suite name. Default: 'minimal' */
  suite?: string;
  /** Number of repetitions per prompt. Default: 1 */
  runs?: number;
  /** Path to model-router.json. Default: agents/model-router.json */
  routerFile?: string;
  /** Project root. Default: cwd */
  project?: string;
  /** Write JSON report to this file */
  output?: string;
}
