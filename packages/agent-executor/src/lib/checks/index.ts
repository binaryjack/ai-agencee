/**
 * Checks barrel — re-exports all check infrastructure.
 */

// ─── Context + Interface ──────────────────────────────────────────────────────
export type { CheckContext } from './check-context.js'
export type { ICheckHandler, RawCheckResult } from './check-handler.types.js'

// ─── Formatter (utility) ──────────────────────────────────────────────────────
export { formatCheckResult, interpolateTemplate } from './check-result-formatter.js'

// ─── Registry ────────────────────────────────────────────────────────────────
export { CheckHandlerRegistry } from './check-handler-registry/index.js'

// ─── Built-in handlers ────────────────────────────────────────────────────────
export { CountDirsHandler } from './count-dirs-handler/index.js'
export { CountFilesHandler } from './count-files-handler/index.js'
export { DirExistsHandler } from './dir-exists-handler/index.js'
export { FileExistsHandler } from './file-exists-handler/index.js'
export { GrepHandler } from './grep-handler/index.js'
export { JsonFieldHandler } from './json-field-handler/index.js'
export { JsonHasKeyHandler } from './json-has-key-handler/index.js'
export { LlmGenerateHandler } from './llm-generate-handler/index.js'
export { LlmReviewHandler } from './llm-review-handler/index.js'
export { LlmToolHandler } from './llm-tool-handler/index.js'
export { RunCommandHandler } from './run-command-handler/index.js'


