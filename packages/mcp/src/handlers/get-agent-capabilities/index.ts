export interface AgentCapabilities {
  checkTypes: CheckTypeDescriptor[]
}

export interface CheckTypeDescriptor {
  type:        string
  description: string
  inputSchema: Record<string, unknown>
}

const CHECK_TYPE_DESCRIPTORS: CheckTypeDescriptor[] = [
  { type: 'file-exists',    description: 'Does a file or directory exist?',                         inputSchema: { path: { type: 'string' } } },
  { type: 'count-dirs',     description: 'Count sub-directories in a path',                         inputSchema: { path: { type: 'string' } } },
  { type: 'count-files',    description: 'Count files matching a glob pattern',                     inputSchema: { path: { type: 'string' }, glob: { type: 'string' } } },
  { type: 'json-field',     description: 'Read a field from a JSON file',                           inputSchema: { path: { type: 'string' }, field: { type: 'string' } } },
  { type: 'json-has-key',   description: 'Does a JSON file contain a specific key?',               inputSchema: { path: { type: 'string' }, key: { type: 'string' } } },
  { type: 'grep',           description: 'Does any file content match a string or pattern?',       inputSchema: { path: { type: 'string' }, pattern: { type: 'string' } } },
  { type: 'dir-exists',     description: 'Does a directory exist?',                                inputSchema: { path: { type: 'string' } } },
  { type: 'run-command',    description: 'Run a shell command and check exit code / output pattern', inputSchema: { command: { type: 'string' } } },
  { type: 'llm-generate',   description: 'Generate content via LLM; stores result under outputKey', inputSchema: { prompt: { type: 'string' }, outputKey: { type: 'string' } } },
  { type: 'llm-review',     description: 'Review a file or directory via LLM and report findings', inputSchema: { path: { type: 'string' }, prompt: { type: 'string' } } },
  { type: 'llm-tool',       description: 'LLM generation with full tool-use loop',                  inputSchema: { prompt: { type: 'string' } } },
  { type: 'github-comment', description: 'Post a comment to a GitHub PR or issue via the REST API', inputSchema: { repo: { type: 'string' }, prNumber: { type: 'number' } } },
]

export const getAgentCapabilities = (): AgentCapabilities => ({
  checkTypes: CHECK_TYPE_DESCRIPTORS,
})
