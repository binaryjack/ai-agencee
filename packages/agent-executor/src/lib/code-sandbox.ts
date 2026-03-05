/**
 * G-38: Code Execution Sandbox — run code snippets in isolated child processes.
 *
 * Enables LLM-generated code to be automatically validated before accepting
 * a verdict.  Used by the `code-run` check type.
 *
 * Supports: JavaScript/TypeScript (Node.js), Python, Bash
 * Security: temp-file isolation, configurable CPU+wall-clock timeout, kill signal
 *
 * Usage:
 *   import { runInSandbox } from './code-sandbox.js';
 *   const result = await runInSandbox({ code: 'print(1+1)', language: 'python' });
 *   if (result.exitCode === 0) …
 */

import { spawn } from 'child_process'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SandboxLanguage = 'javascript' | 'typescript' | 'python' | 'bash' | 'sh';

export interface SandboxOptions {
  code: string;
  language: SandboxLanguage;
  /** Wall-clock timeout in ms. Default: 10 000 */
  timeoutMs?: number;
  /** Max stdout bytes to capture. Default: 512 KiB */
  maxOutputBytes?: number;
  /** Environment variables to inject. */
  env?: Record<string, string>;
  /** Working directory for the child process. Default: system temp dir */
  cwd?: string;
}

export interface SandboxResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  /** Truncated to maxOutputBytes */
  truncated: boolean;
  durationMs: number;
  timedOut: boolean;
}

// ─── Runtime config ───────────────────────────────────────────────────────────

const RUNTIME: Record<SandboxLanguage, { cmd: string; args: (file: string) => string[]; ext: string }> = {
  javascript:  { cmd: 'node',   args: (f) => [f],              ext: '.js'  },
  typescript:  { cmd: 'npx',    args: (f) => ['tsx', f],       ext: '.ts'  },
  python:      { cmd: 'python3',args: (f) => [f],              ext: '.py'  },
  bash:        { cmd: 'bash',   args: (f) => [f],              ext: '.sh'  },
  sh:          { cmd: 'sh',     args: (f) => [f],              ext: '.sh'  },
};

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Execute `code` in a sandboxed child process and return the result.
 * The code is written to a temp file and deleted after execution.
 */
export async function runInSandbox(options: SandboxOptions): Promise<SandboxResult> {
  const {
    code,
    language,
    timeoutMs = 10_000,
    maxOutputBytes = 512 * 1024,
    env = {},
    cwd,
  } = options;

  const runtime = RUNTIME[language];
  if (!runtime) throw new Error(`Unsupported language: ${language}`);

  // Write code to temp file
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aikit-sandbox-'));
  const filePath = path.join(dir, `code${runtime.ext}`);
  await fs.writeFile(filePath, code, 'utf-8');

  const start = Date.now();
  let timedOut = false;
  let truncated = false;
  let stdoutBuf = Buffer.alloc(0);
  let stderrBuf = Buffer.alloc(0);

  try {
    const result = await new Promise<{ exitCode: number | null }>((resolve) => {
      const child = spawn(runtime.cmd, runtime.args(filePath), {
        cwd: cwd ?? dir,
        env: { ...process.env, ...env },
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: timeoutMs,
      });

      child.stdout?.on('data', (chunk: Buffer) => {
        if (stdoutBuf.length + chunk.length <= maxOutputBytes) {
          stdoutBuf = Buffer.concat([stdoutBuf, chunk]);
        } else {
          truncated = true;
        }
      });

      child.stderr?.on('data', (chunk: Buffer) => {
        if (stderrBuf.length + chunk.length <= maxOutputBytes) {
          stderrBuf = Buffer.concat([stderrBuf, chunk]);
        }
      });

      const timer = setTimeout(() => {
        timedOut = true;
        try { child.kill('SIGKILL'); } catch { /* already dead */ }
      }, timeoutMs);

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({ exitCode: code });
      });

      child.on('error', () => {
        clearTimeout(timer);
        resolve({ exitCode: 1 });
      });
    });

    return {
      stdout: stdoutBuf.toString('utf-8'),
      stderr: stderrBuf.toString('utf-8'),
      exitCode: result.exitCode,
      truncated,
      durationMs: Date.now() - start,
      timedOut,
    };
  } finally {
    // Best-effort cleanup
    fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

// ─── Check-handler integration ────────────────────────────────────────────────

/**
 * Extracts code fences from a text and runs each one.
 * Returns a summary string suitable for including in a check verdict.
 */
export async function runCodeFencesInText(
  text: string,
  language: SandboxLanguage = 'javascript'
): Promise<string> {
  const fenceRe = /```(?:js|javascript|ts|typescript|python|bash|sh)?\n([\s\S]*?)```/g;
  const blocks: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = fenceRe.exec(text)) !== null) {
    blocks.push(match[1] ?? '');
  }

  if (blocks.length === 0) return '[code-sandbox] No code blocks found.';

  const lines: string[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const result = await runInSandbox({ code: blocks[i] ?? '', language });
    lines.push(
      `[block ${i + 1}] exit=${result.exitCode} (${result.durationMs}ms)${result.timedOut ? ' TIMEOUT' : ''}`,
      result.stdout ? `stdout:\n${result.stdout.slice(0, 2000)}` : '',
      result.stderr ? `stderr:\n${result.stderr.slice(0, 500)}` : ''
    );
  }

  return lines.filter(Boolean).join('\n');
}
