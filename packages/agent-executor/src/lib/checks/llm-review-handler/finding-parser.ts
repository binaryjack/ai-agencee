/**
 * LLM Finding — structured extraction of diagnostic information from LLM review output.
 * Parsed from standardized format: [SEVERITY] file:line[:col] — message
 */
export interface LlmFinding {
  /** ERROR | WARNING | INFO */
  severity: 'ERROR' | 'WARNING' | 'INFO'
  /** Relative file path */
  file: string
  /** 1-based line number */
  line: number
  /** 1-based column number, if present */
  column?: number
  /** Diagnostic message text */
  message: string
  /** Source this came from (agent name) */
  agentName?: string
}

/**
 * Parse findings from raw LLM review output.
 * Pattern: [ERROR|WARNING|INFO] path/to/file:line[:col] — message
 * Example: [ERROR] src/index.ts:42:5 — Function too complex
 */
export const parseFindingsFromLlmOutput = (
  rawText: string,
  agentName?: string,
): LlmFinding[] => {
  const FINDING_PATTERN =
    /\[(?<sev>ERROR|WARNING|INFO)\]\s+(?<file>[^\s:]+):(?<line>\d+)(?::(?<col>\d+))?\s+[—-]+\s+(?<msg>.+?)(?=\n\[|$)/gs

  const findings: LlmFinding[] = []

  let match
  while ((match = FINDING_PATTERN.exec(rawText)) !== null) {
    const groups = match.groups!

    findings.push({
      severity: (groups.sev as 'ERROR' | 'WARNING' | 'INFO'),
      file: groups.file,
      line: parseInt(groups.line, 10),
      column: groups.col ? parseInt(groups.col, 10) : undefined,
      message: groups.msg.trim(),
      agentName,
    })
  }

  return findings
}
