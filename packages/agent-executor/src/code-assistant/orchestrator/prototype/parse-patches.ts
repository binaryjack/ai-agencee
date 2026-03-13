/**
 * Prototype method: _parsePatches
 *
 * Converts the raw LLM response string into an ordered list of FilePatch
 * descriptors.  The parser is intentionally strict about the output contract
 * declared in SYSTEM_PROMPT — it only recognises ## FILE and ## DELETE blocks,
 * discarding any prose the model may prepend.
 *
 * Both directives are captured in declaration order so mixed sequences like
 * (delete A, create B, replace C) are applied correctly by execute().
 */

import type { FilePatch } from '../../code-assistant-orchestrator.types.js';
import type { ICodeAssistantOrchestrator } from '../code-assistant-orchestrator.js';

export function _parsePatches(
  this: ICodeAssistantOrchestrator,
  response: string,
): FilePatch[] {
  const patches: FilePatch[] = [];

  // Capture DELETE directives first so they precede FILE blocks at the same
  // logical position (avoids write-then-delete accidents).
  const deleteRe = /^## DELETE:\s*(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = deleteRe.exec(response)) !== null) {
    patches.push({ relativePath: m[1].trim(), content: '', delete: true });
  }

  // Capture FILE blocks — code fence language tag is optional and ignored.
  const fileRe = /^## FILE:\s*(.+?)\n```[^\n]*\n([\s\S]*?)```/gm;
  while ((m = fileRe.exec(response)) !== null) {
    patches.push({ relativePath: m[1].trim(), content: m[2] });
  }

  return patches;
}
