/**
 * G-50: LLM-as-judge Evaluation Harness
 *
 * Runs a suite of (input, expected) test cases through an agent pipeline and
 * scores each response using a judge model.  Produces a structured EvalReport
 * that can be written to disk, printed as a table, or compared across runs.
 *
 * Usage:
 *   import { runEval } from './eval-harness.js';
 *   const report = await runEval({
 *     name: 'code-review-quality',
 *     cases: [...],
 *     judgeProvider,
 *     judgeModelId: 'claude-opus-4',
 *     taskFn: async (input) => myAgent.complete(input),
 *   });
 *   console.table(report.cases.map(c => ({ id: c.id, score: c.score, pass: c.pass })));
 */

import type { LLMProvider } from './llm-provider.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EvalCase {
  /** Unique identifier for this test case */
  id: string;
  /** Raw input to feed to the task function */
  input: string;
  /** Human-written ideal answer or rubric (optional) */
  expected?: string;
  /** Metadata tags for grouping/filtering */
  tags?: string[];
}

export interface EvalCaseResult extends EvalCase {
  /** Actual response from the system under test */
  actual: string;
  /** Score 0–1 from the judge */
  score: number;
  /** Explanation from the judge */
  reasoning: string;
  /** Whether score >= passThreshold */
  pass: boolean;
  durationMs: number;
  error?: string;
}

export interface EvalReport {
  name: string;
  runId: string;
  startedAt: string;
  finishedAt: string;
  passThreshold: number;
  /** Number of passing cases */
  passed: number;
  /** Number of failing cases */
  failed: number;
  /** Average score across all cases */
  meanScore: number;
  cases: EvalCaseResult[];
}

export interface RunEvalOptions {
  /** Human-readable eval suite name */
  name: string;
  cases: EvalCase[];
  /**
   * Function under test — receives one EvalCase.input and returns a response.
   * May also return { content, cost } for cost tracking.
   */
  taskFn: (input: string) => Promise<string | { content: string; costUSD?: number }>;
  /** LLMProvider to use as the judge */
  judgeProvider: LLMProvider;
  /** Model ID for the judge (prefer a highly capable model) */
  judgeModelId: string;
  /** Score >= passThreshold counts as PASS. Default: 0.7 */
  passThreshold?: number;
  /** Run cases with this concurrency. Default: 3 */
  concurrency?: number;
}

// ─── Judge Prompt ─────────────────────────────────────────────────────────────

function buildJudgePrompt(c: EvalCase, actual: string): string {
  return `You are an impartial evaluation judge. Score the following AI response on a scale from 0.0 to 1.0.

${c.expected ? `**Ideal Answer / Rubric:**\n${c.expected}\n` : ''}

**Input:**
${c.input}

**Response to Score:**
${actual}

Reply with ONLY a JSON object with exactly these fields:
{
  "score": <number 0.0-1.0>,
  "reasoning": "<one-sentence justification>"
}

Do not include markdown fences in your reply.`;
}

// ─── Runner ───────────────────────────────────────────────────────────────────

export async function runEval(options: RunEvalOptions): Promise<EvalReport> {
  const {
    name,
    cases,
    taskFn,
    judgeProvider,
    judgeModelId,
    passThreshold = 0.7,
    concurrency = 3,
  } = options;

  const runId = `eval-${Date.now().toString(36)}`;
  const startedAt = new Date().toISOString();

  const results: EvalCaseResult[] = [];

  // Process in chunks to respect concurrency
  for (let i = 0; i < cases.length; i += concurrency) {
    const chunk = cases.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map((c) => runSingleCase(c, taskFn, judgeProvider, judgeModelId, passThreshold)));
    results.push(...chunkResults);
  }

  const scores = results.map((r) => r.score);
  const meanScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const passed = results.filter((r) => r.pass).length;

  return {
    name,
    runId,
    startedAt,
    finishedAt: new Date().toISOString(),
    passThreshold,
    passed,
    failed: results.length - passed,
    meanScore: Math.round(meanScore * 1000) / 1000,
    cases: results,
  };
}

async function runSingleCase(
  c: EvalCase,
  taskFn: RunEvalOptions['taskFn'],
  judgeProvider: LLMProvider,
  judgeModelId: string,
  passThreshold: number
): Promise<EvalCaseResult> {
  const start = Date.now();
  let actual = '';
  let error: string | undefined;

  try {
    const raw = await taskFn(c.input);
    actual = typeof raw === 'string' ? raw : raw.content;
  } catch (err) {
    error = String(err);
    actual = '';
  }

  const durationMs = Date.now() - start;

  // Judge
  let score = 0;
  let reasoning = error ? `Task errored: ${error}` : 'Could not obtain judge score';

  if (!error) {
    try {
      const judgeResp = await judgeProvider.complete(
        {
          messages: [{ role: 'user', content: buildJudgePrompt(c, actual) }],
          maxTokens: 200,
          temperature: 0,
        },
        judgeModelId
      );

      // Strip possible markdown fences
      const raw = judgeResp.content.replace(/^```[a-z]*\n?/i, '').replace(/```$/,'').trim();
      const parsed = JSON.parse(raw) as { score: number; reasoning: string };
      score = Math.max(0, Math.min(1, Number(parsed.score)));
      reasoning = parsed.reasoning ?? '';
    } catch (judgeErr) {
      reasoning = `Judge error: ${judgeErr}`;
    }
  }

  return {
    ...c,
    actual,
    score,
    reasoning,
    pass: score >= passThreshold,
    durationMs,
    error,
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Print a compact ASCII table of results to a string. */
export function formatEvalReport(report: EvalReport): string {
  const lines: string[] = [
    `Eval: ${report.name}  run=${report.runId}`,
    `Threshold: ${report.passThreshold}  Mean: ${report.meanScore.toFixed(3)}  Pass: ${report.passed}/${report.cases.length}`,
    '─'.repeat(80),
  ];

  for (const c of report.cases) {
    const status = c.pass ? 'PASS' : 'FAIL';
    const row = `  [${status}] ${c.id.padEnd(30)} score=${c.score.toFixed(2)} ${c.reasoning.slice(0, 50)}`;
    lines.push(row);
  }

  return lines.join('\n');
}
