import { exec } from 'child_process'
import * as fs from 'fs/promises'
import * as path from 'path'
import { promisify } from 'util'
import { CheckDefinition } from './agent-types.js'
import { TaskType } from './llm-provider.js'
import { ModelRouter, RoutedResponse } from './model-router.js'

const execAsync = promisify(exec);

// ─── StepResult ───────────────────────────────────────────────────────────────

export interface StepResult {
  findings: string[];
  recommendations: string[];
  detail?: { key: string; value: unknown };
}

// ─── runCheckStep ─────────────────────────────────────────────────────────────

/**
 * Execute a single check against the project root.
 *
 * Supports:
 *   - Filesystem checks: file-exists, dir-exists, count-dirs, count-files,
 *     json-field, json-has-key, grep
 *   - Shell checks: run-command (safe, timeout-bounded)
 *   - LLM checks: llm-generate, llm-review (gracefully skipped when no router)
 *
 * @param check             Check definition from the agent JSON
 * @param projectRoot       Absolute path to the project being analysed
 * @param retryInstructions Corrective context injected by the supervisor on RETRY
 * @param modelRouter       Optional router — required for llm-* check types
 * @param onLlmResponse     Optional callback fired after every LLM call (cost tracking)
 */
export async function runCheckStep(
  check: CheckDefinition,
  projectRoot: string,
  retryInstructions?: string,
  modelRouter?: ModelRouter,
  onLlmResponse?: (response: RoutedResponse) => void,
): Promise<StepResult> {
  // fullPath is only valid when check.path is provided. Check types that don't
  // use a file path (run-command, llm-generate) must NOT reference fullPath.
  const fullPath = check.path != null ? path.join(projectRoot, check.path) : '';
  const findings: string[] = [];
  const recommendations: string[] = [];

  if (retryInstructions) {
    findings.push(`ℹ️ Retry context: ${retryInstructions}`);
  }

  let passed = false;
  let value: string | number | undefined;

  try {
    switch (check.type) {
      case 'file-exists':
      case 'dir-exists': {
        try {
          await fs.access(fullPath);
          passed = true;
        } catch {
          passed = false;
        }
        break;
      }

      case 'count-dirs': {
        try {
          const entries = await fs.readdir(fullPath, { withFileTypes: true });
          const dirs = entries.filter((e) => e.isDirectory());
          value = dirs.length;
          passed = dirs.length > 0;
        } catch {
          passed = false;
          value = 0;
        }
        break;
      }

      case 'count-files': {
        try {
          const glob = check.glob ?? '**/*';
          const entries = (await fs.readdir(fullPath, { recursive: true })) as string[];
          const ext = glob.replace('**/*', '').replace('*', '');
          const matched = entries.filter((f) => typeof f === 'string' && f.endsWith(ext));
          value = matched.length;
          passed = matched.length > 0;
        } catch {
          passed = false;
          value = 0;
        }
        break;
      }

      case 'json-field': {
        try {
          const raw = await fs.readFile(fullPath, 'utf-8');
          const json = JSON.parse(raw);
          const parts = (check.field ?? '').split('.');
          let v: unknown = json;
          for (const part of parts) {
            v = (v as Record<string, unknown>)?.[part];
          }
          if (v === undefined || v === null) {
            passed = false;
          } else if (typeof v === 'object') {
            value = Object.keys(v as object).length;
            passed = value > 0;
          } else {
            value = String(v);
            passed = true;
          }
        } catch {
          passed = false;
        }
        break;
      }

      case 'json-has-key': {
        try {
          const raw = await fs.readFile(fullPath, 'utf-8');
          const json = JSON.parse(raw);
          const keyPath = check.key ?? check.field ?? '';
          const parts = keyPath.split('.');
          let v: unknown = json;
          for (const part of parts) {
            v = (v as Record<string, unknown>)?.[part];
          }
          passed = v !== undefined && v !== null;
        } catch {
          passed = false;
        }
        break;
      }

      case 'grep': {
        try {
          const entries = (await fs.readdir(fullPath, { recursive: true })) as string[];
          const pattern = check.pattern ?? '';
          for (const entry of entries) {
            if (typeof entry !== 'string') continue;
            try {
              const content = await fs.readFile(path.join(fullPath, entry), 'utf-8');
              if (content.includes(pattern)) {
                passed = true;
                value = entry;
                break;
              }
            } catch {
              // skip unreadable files
            }
          }
        } catch {
          passed = false;
        }
        break;
      }

      // ─── Shell command ──────────────────────────────────────────────────────

      case 'run-command': {
        const cmd = check.command ?? '';
        if (!cmd) {
          passed = false;
          findings.push('❌ run-command: no command specified');
          break;
        }
        try {
          let stdout = '';
          let stderr = '';
          try {
            const result = await execAsync(cmd, { cwd: projectRoot, timeout: 30_000 });
            stdout = result.stdout;
            stderr = result.stderr;
          } catch (execErr: unknown) {
            // execAsync rejects on non-zero exit. For search-style commands
            // (e.g. grep with passPattern/failPattern) the exit code is
            // meaningful (1 = no matches) — we still want to evaluate the output.
            if (
              execErr != null &&
              typeof execErr === 'object' &&
              'stdout' in execErr &&
              'stderr' in execErr
            ) {
              stdout = String((execErr as { stdout: string }).stdout);
              stderr = String((execErr as { stderr: string }).stderr);
              // If the stderr itself indicates the command wasn't available,
              // re-route to the outer catch for graceful skipping.
              const combinedErr = (stdout + stderr).toLowerCase();
              // Locale-agnostic: check for English, French, and other cmd.exe/shell
              // variants.  cmd.exe wraps the command name in single quotes, so
              // checking for the command name in the output is also reliable.
              const cmdName = cmd.trim().split(/[\s|&]/)[0];
              const quotedCmd = `'${cmdName.toLowerCase()}'`;
              const isUnavailable =
                /not recognized|command not found|no such file|n'est pas reconnu|wird nicht erkannt|introuvable|spawn.*enoent/i.test(
                  combinedErr
                ) ||
                (combinedErr.includes(quotedCmd) && combinedErr.length < 600);
              if (isUnavailable) {
                throw execErr;
              }
              // If we have no patterns to evaluate, treat non-zero as failure
              if (!check.passPattern && !check.failPattern) {
                passed = false;
                value = (stdout + stderr).trim().slice(0, 300);
                break;
              }
            } else {
              // Re-throw to outer catch for command-not-found handling
              throw execErr;
            }
          }
          const output = stdout.trim(); // evaluate patterns against stdout only (stderr has cmd errors)
          value = (stdout + stderr).trim().slice(0, 500);
          if (check.passPattern) {
            passed = new RegExp(check.passPattern).test(output);
          } else if (check.failPattern) {
            passed = !new RegExp(check.failPattern).test(output);
          } else {
            passed = true; // ran without error = pass
          }
        } catch (err: unknown) {
          const msg = String(err);
          // Command not installed / not in PATH → skip rather than hard-fail
          // Locale-agnostic detection: English, French, German cmd.exe/shell variants
          const isCommandMissing =
            /not recognized|command not found|No such file or directory|ENOENT|spawn.*ENOENT|n'est pas reconnu|wird nicht erkannt|introuvable/i.test(
              msg
            );
          if (isCommandMissing) {
            passed = true; // treat as skipped
            findings.push(`⚠️ run-command skipped (command not available): ${cmd.split(' ')[0]}`);
          } else {
            passed = false;
            value = msg.slice(0, 300);
          }
        }
        break;
      }

      // ─── LLM checks ─────────────────────────────────────────────────────────

      case 'llm-generate': {
        if (!modelRouter) {
          // Gracefully degrade — don't block the pipeline
          findings.push('⚠️ llm-generate skipped: no ModelRouter provided');
          passed = true;
          break;
        }
        try {
          const taskType = (check.taskType as TaskType | undefined) ?? 'code-generation';
          const promptText = (check.prompt ?? 'Analyze the project and provide actionable findings.')
            .replace('{retryContext}', retryInstructions ?? 'N/A')
            .replace('{path}', check.path ?? '');

          const response = await modelRouter.route(taskType, {
            messages: [
              {
                role: 'system',
                content:
                  'You are an expert software engineer. Be concise and specific. Output plain text findings only.',
              },
              { role: 'user', content: promptText },
            ],
          });
          onLlmResponse?.(response);

          value = response.content.trim();
          passed = value.length > 0;

          if (check.outputKey) {
            return {
              findings: [
                ...(check.pass ? [check.pass] : [`💡 Generated: ${value.slice(0, 200)}`]),
              ],
              recommendations: [...(check.recommendations ?? [])],
              detail: { key: check.outputKey, value: response.content },
            };
          }
        } catch (err) {
          passed = false;
          findings.push(`❌ LLM generate failed: ${err}`);
        }
        break;
      }

      case 'llm-review': {
        if (!modelRouter) {
          // Gracefully degrade — don't block the pipeline
          findings.push('⚠️ llm-review skipped: no ModelRouter provided');
          passed = true;
          break;
        }
        try {
          // Read target (file or directory listing)
          let content = '';
          try {
            const stat = await fs.stat(fullPath);
            if (stat.isFile()) {
              content = await fs.readFile(fullPath, 'utf-8');
            } else {
              const entries = (await fs.readdir(fullPath, { recursive: true })) as string[];
              content =
                `Directory listing (${entries.length} entries):\n` +
                entries.slice(0, 50).join('\n');
            }
          } catch {
            // path not found — still run the review with empty context
          }

          const taskType = (check.taskType as TaskType | undefined) ?? 'validation';
          const promptTemplate =
            check.prompt ??
            'Review the following and identify issues:\n\n{content}\n\nProvide specific, actionable findings.';
          const promptText = promptTemplate
            .replace('{content}', content.slice(0, 6_000))
            .replace('{retryContext}', retryInstructions ?? 'N/A')
            .replace('{path}', check.path ?? '');

          const response = await modelRouter.route(taskType, {
            messages: [
              {
                role: 'system',
                content:
                  'You are a code reviewer. Reply with findings as a bullet list. Be specific and actionable.',
              },
              { role: 'user', content: promptText },
            ],
          });
          onLlmResponse?.(response);

          const reviewText = response.content.trim();
          value = reviewText;
          // Fail if the review explicitly found critical security vulnerabilities
          passed =
            !reviewText.includes('CRITICAL:') &&
            !reviewText.toLowerCase().includes('security vulnerability found');

          if (check.outputKey) {
            return {
              findings: check.pass
                ? [reviewText.slice(0, 200), check.pass]
                : [reviewText.slice(0, 300)],
              recommendations: [...(check.recommendations ?? [])],
              detail: { key: check.outputKey, value: reviewText },
            };
          }
        } catch (err) {
          passed = false;
          findings.push(`❌ LLM review failed: ${err}`);
        }
        break;
      }

      default:
        passed = false;
    }
  } catch (err) {
    passed = false;
    findings.push(`❌ Check error: ${err}`);
  }

  // ─── Message interpolation ────────────────────────────────────────────────

  const interpolate = (tpl: string): string =>
    tpl
      .replace('{count}', String(value ?? 0))
      .replace('{value}', String(value ?? ''))
      .replace('{path}', check.path ?? '')
      .replace('{pattern}', check.pattern ?? '')
      .replace('{field}', check.field ?? '');

  const severityIcon =
    !passed && check.failSeverity === 'error'
      ? '❌'
      : !passed && check.failSeverity === 'warning'
        ? '⚠️ '
        : !passed
          ? 'ℹ️ '
          : '';

  if (passed && check.pass) {
    findings.push(interpolate(check.pass));
  } else if (!passed && check.fail) {
    findings.push(severityIcon + interpolate(check.fail));
  }

  if (check.recommendations) {
    recommendations.push(...check.recommendations.map(interpolate));
  }
  if (passed && check.passRecommendations) {
    recommendations.push(...check.passRecommendations.map(interpolate));
  }
  if (!passed && check.failRecommendations) {
    recommendations.push(...check.failRecommendations.map(interpolate));
  }

  return {
    findings,
    recommendations,
    detail: value !== undefined ? { key: (check.path ?? 'value').replace(/\W+/g, '_'), value } : undefined,
  };
}
