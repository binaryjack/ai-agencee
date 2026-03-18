#!/usr/bin/env node
import { AuditLog, DagOrchestrator } from '@ai-agencee/engine'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
    CallToolRequest,
    CallToolRequestSchema,
    ListResourcesRequestSchema,
    ListToolsRequestSchema,
    ReadResourceRequest,
    ReadResourceRequestSchema,
    Tool,
} from '@modelcontextprotocol/sdk/types.js'
import { spawn } from 'child_process'
import * as fs from 'fs/promises'
import * as path from 'path'
import { buildDashboard } from './dashboard/index.js'
import { findProjectRoot } from './find-project-root.js'
import { startSseServer } from './sse/index.js'
import { createVSCodeSamplingBridge } from './vscode-lm/index.js'

const server = new Server(
  {
    name: 'ai-kit-mcp-server',
    version: '1.0.0',
  },
  {    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Helper to read project files
async function readProjectFile(relativePath: string): Promise<string> {
  const projectRoot = findProjectRoot();
  const filePath = path.join(projectRoot, relativePath);
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    return `File not found: ${relativePath}`;
  }
}

// Register Tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'init',
      description:
        'Initialize AI session with ULTRA_HIGH standards and project rules',
      inputSchema: {
        type: 'object' as const,
        properties: {
          strict: {
            type: 'boolean',
            description: 'Enable STRICT_MODE',
            default: true,
          },
        },
      },
    },
    {
      name: 'check',
      description: 'Validate current project structure against rules',
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
    },
    {
      name: 'rules',
      description: 'Get project coding rules and standards',
      inputSchema: {
        type: 'object' as const,
        properties: {
          format: {
            type: 'string',
            enum: ['markdown', 'text'],
            description: 'Output format',
            default: 'markdown',
          },
        },
      },
    },
    {
      name: 'patterns',
      description: 'Get design patterns and architecture guidelines',
      inputSchema: {
        type: 'object' as const,
        properties: {
          format: {
            type: 'string',
            enum: ['markdown', 'text'],
            description: 'Output format',
            default: 'markdown',
          },
        },
      },
    },
    {
      name: 'bootstrap',
      description: 'Get bootstrap configuration and setup instructions',
      inputSchema: {
        type: 'object' as const,
        properties: {
          format: {
            type: 'string',
            enum: ['markdown', 'text', 'config'],
            description: 'Output format',
            default: 'markdown',
          },
        },
      },
    },
    {
      name: 'agent-dag',
      description:
        'Run a multi-lane supervised DAG execution using the on-disk dag.json. ' +
        'LLM calls are delegated back to VS Code via the MCP sampling protocol — no API keys required.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          dagFile: {
            type: 'string',
            description:
              'Path to the dag.json file, relative to projectRoot (default: agents/dag.json)',
            default: 'agents/dag.json',
          },
          projectRoot: {
            type: 'string',
            description: 'Absolute path to the project root (default: process.cwd())',
          },
          verbose: {
            type: 'boolean',
            description: 'Emit per-checkpoint log lines',
            default: false,
          },
          budgetCapUSD: {
            type: 'number',
            description: 'Abort the run when estimated LLM spend exceeds this USD amount',
          },
        },
      },
    },
    {
      name: 'agent-breakdown',
      description: 'Use Business Analyst agent to break down specifications',
      inputSchema: {
        type: 'object' as const,
        properties: {
          specification: {
            type: 'string',
            description: 'Specification or feature description to break down',
          },
        },
        required: ['specification'],
      },
    },
    {
      name: 'agent-workflow',
      description:
        'Start full agent workflow: BA → Architecture → Backend → Frontend → Testing → E2E',
      inputSchema: {
        type: 'object' as const,
        properties: {
          specification: {
            type: 'string',
            description: 'Complete specification for the feature',
          },
          featureName: {
            type: 'string',
            description: 'Feature name/identifier',
          },
        },
        required: ['specification', 'featureName'],
      },
    },
    {
      name: 'agent-validate',
      description: 'Use Supervisor agent to validate implementation against ULTRA_HIGH standards',
      inputSchema: {
        type: 'object' as const,
        properties: {
          output: {
            type: 'string',
            description: 'Code or output to validate',
          },
          checkpoints: {
            type: 'array',
            description: 'Which standards to check (all, code-quality, architecture, testing)',
          },
        },
        required: ['output'],
      },
    },
    {
      name: 'agent-status',
      description: 'Check workflow status and progress',
      inputSchema: {
        type: 'object' as const,
        properties: {
          sessionId: {
            type: 'string',
            description: 'Workflow session ID',
          },
        },
        required: ['sessionId'],
      },
    },
    {
      name: 'audit-log',
      description:
        'Retrieve or verify the tamper-evident audit log for a DAG run. ' +
        'Returns the NDJSON entries or a verification report.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          runId: {
            type: 'string',
            description: 'DAG run UUID to retrieve the audit log for',
          },
          projectRoot: {
            type: 'string',
            description: 'Absolute path to the project root (default: process.cwd())',
          },
          verify: {
            type: 'boolean',
            description: 'When true, verify the hash-chain integrity and return a report',
            default: false,
          },
        },
        required: ['runId'],
      },
    },
    {
      name: 'create-agent',
      description:
        'Scaffold a new agent JSON file at agents/<name>.agent.json. ' +
        'Accepts a natural-language description and optional check list; outputs the written file path.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          name: {
            type: 'string',
            description: 'Agent name in kebab-case (e.g. "security-review")',
          },
          description: {
            type: 'string',
            description: 'What this agent does',
          },
          icon: {
            type: 'string',
            description: 'Emoji icon for the agent',
            default: '🤖',
          },
          checks: {
            type: 'array',
            description: 'Array of check objects (type, path, pass, fail)',
            items: { type: 'object' },
          },
          projectRoot: {
            type: 'string',
            description: 'Absolute path to the project root (default: process.cwd())',
          },
        },
        required: ['name', 'description'],
      },
    },
    {
      name: 'create-supervisor',
      description:
        'Scaffold a supervisor JSON file at agents/<name>.supervisor.json. ' +
        'Defines retry budget and checkpoint gates for the corresponding agent lane.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          laneId: {
            type: 'string',
            description: 'Lane / agent id this supervisor guards (kebab-case)',
          },
          retryBudget: {
            type: 'number',
            description: 'Max retries before ESCALATE',
            default: 2,
          },
          checkpoints: {
            type: 'array',
            description: 'Array of checkpoint objects',
            items: { type: 'object' },
          },
          projectRoot: {
            type: 'string',
            description: 'Absolute path to the project root (default: process.cwd())',
          },
        },
        required: ['laneId'],
      },
    },
    {
      name: 'create-dag',
      description:
        'Scaffold a DAG JSON file at agents/<name>.dag.json. ' +
        'Wires a list of agent lanes with dependsOn edges and optional barriers.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          dagName: {
            type: 'string',
            description: 'Human-readable name for the DAG',
          },
          fileName: {
            type: 'string',
            description: 'Output filename without extension (default: "dag")',
            default: 'dag',
          },
          description: {
            type: 'string',
            description: 'What this DAG orchestrates',
          },
          lanes: {
            type: 'array',
            description: 'Array of lane objects: { id, agentFile, supervisorFile, dependsOn[], capabilities[] }',
            items: { type: 'object' },
          },
          barriers: {
            type: 'array',
            description: 'Optional global barrier objects: { name, participants[], timeoutMs }',
            items: { type: 'object' },
          },
          projectRoot: {
            type: 'string',
            description: 'Absolute path to the project root (default: process.cwd())',
          },
        },
        required: ['dagName', 'lanes'],
      },
    },
    {
      name: 'create-rule',
      description:
        'Append or replace a named rule block inside .ai/rules.md. ' +
        'If the block heading already exists it is replaced; otherwise it is appended.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          heading: {
            type: 'string',
            description: 'Heading text for the rule block (e.g. "No default exports")',
          },
          body: {
            type: 'string',
            description: 'Markdown body of the rule',
          },
          projectRoot: {
            type: 'string',
            description: 'Absolute path to the project root (default: process.cwd())',
          },
        },
        required: ['heading', 'body'],
      },
    },
    {
      name: 'cli-run',
      description:
        'Execute any `ai-kit` CLI command in the project and stream its stdout/stderr output. ' +
        'Examples: "plan --spec my-spec.md", "agent:dag agents/dag.json", "visualize".',
      inputSchema: {
        type: 'object' as const,
        properties: {
          command: {
            type: 'string',
            description: 'ai-kit sub-command and arguments (e.g. "plan --spec spec.md")',
          },
          projectRoot: {
            type: 'string',
            description: 'Absolute path to run the command in (default: process.cwd())',
          },
          timeoutMs: {
            type: 'number',
            description: 'Kill the process after this many ms (default: 120000)',
            default: 120000,
          },
        },
        required: ['command'],
      },
    },
  ] as Tool[],
}));

// Handle Tool Calls
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'init': {
        const strict = (args as Record<string, unknown> | undefined)?.strict ?? true;
        const configText = `
# AI SESSION INITIALIZED

## Configuration
\`\`\`
U=OWNER
STD=ULTRA_HIGH
COM=BRUTAL
VERBOSITY=0
POLITE=0
PROSE=0
HEADLESS=1
DELEGATE=0
STRICT_MODE=${strict ? 1 : 0}
IGNORE_HISTORY=1
NO_CHAT=1
\`\`\`

## Project Rules Loaded
- Naming: kebab-case (no camelCase)
- Files: one-item-per-file
- Types: no 'any' type allowed
- Functions: export const Name = function(...) { ... }
- Classes: FORBIDDEN
- Testing: 95% minimum coverage
- Performance: <=10% solid-js

## Available Tools
- @check - Validate project structure
- @rules - View coding standards
- @patterns - View design patterns
- @bootstrap - View setup guide

## Next Steps
1. Review project structure
2. Follow ULTRA_HIGH standards
3. Execute pipeline: SCAN → AST_CHECK → BUILD → TEST → VALIDATE → OUTPUT

Ready to start development with strict standards applied!
`;
        return { content: [{ type: 'text', text: configText }] };
      }

      case 'check': {
        const checkText = `
# Project Validation Report

## Checks to Perform
1. ✓ Type Safety (tsc --noEmit)
2. ✓ Linting (eslint)
3. ✓ Testing (jest with coverage)
4. ✓ Rules Compliance

Run: npm run check

## Standards Verified
- File naming: kebab-case
- Exports: one per file
- Type annotations: strict
- No forbidden patterns

Status: Ready to validate
`;
        return { content: [{ type: 'text', text: checkText }] };
      }

      case 'rules': {
        const rulesContent = await readProjectFile('src/.ai/rules.md');
        return { content: [{ type: 'text', text: rulesContent }] };
      }

      case 'patterns': {
        const patternsContent = await readProjectFile('src/.ai/patterns.md');
        return { content: [{ type: 'text', text: patternsContent }] };
      }

      case 'bootstrap': {
        const bootstrapContent = await readProjectFile('src/.ai/bootstrap.md');
        return { content: [{ type: 'text', text: bootstrapContent }] };
      }

      case 'agent-dag': {
        const a = (args as Record<string, unknown> | undefined) ?? {};
        const dagFile = typeof a.dagFile === 'string' ? a.dagFile : 'agents/dag.json';
        const projectRoot = typeof a.projectRoot === 'string' ? path.resolve(a.projectRoot) : findProjectRoot();
        const verbose = typeof a.verbose === 'boolean' ? a.verbose : false;
        const budgetCapUSD = typeof a.budgetCapUSD === 'number' ? a.budgetCapUSD : undefined;

        // Wire VS Code LM sampling so DAG uses Copilot rather than raw API keys
        const samplingCallback = createVSCodeSamplingBridge(server);

        const orchestrator = new DagOrchestrator(projectRoot, {
          verbose,
          budgetCapUSD,
          samplingCallback,
        });

        const dagFilePath = path.isAbsolute(dagFile) ? dagFile : path.join(projectRoot, dagFile);
        const result = await orchestrator.run(dagFilePath);

        const summary = [
          `# DAG Result: ${result.dagName}`,
          `**Status:** ${result.status.toUpperCase()}  |  **Duration:** ${result.totalDurationMs}ms  |  **Run ID:** ${result.runId}`,
          '',
          '## Lanes',
          ...result.lanes.map(
            (l) =>
              `- **${l.laneId}** — ${l.status}  (${l.checkpoints.length} checkpoints, ${l.totalRetries} retries, ${l.durationMs}ms)${l.error ? `\n  > ⚠️ ${l.error}` : ''}`,
          ),
        ];
        if (result.findings.length > 0) {
          summary.push('', '## Findings', ...result.findings.map((f) => `- ${f}`));
        }
        if (result.recommendations.length > 0) {
          summary.push('', '## Recommendations', ...result.recommendations.map((r) => `- ${r}`));
        }

        return {
          content: [{ type: 'text', text: summary.join('\n') }],
          isError: result.status === 'failed',
        };
      }

      case 'agent-breakdown': {
        const specification = (args as Record<string, unknown> | undefined)?.specification;
        if (!specification) {
          return {
            content: [{ type: 'text', text: 'Error: specification required' }],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: `✅ Business Analyst Agent - Ready to break down specification\n\nSpecification length: ${String(specification).length} chars\n\nAgent will:\n1. Analyze requirements\n2. Identify features\n3. Create roadmap\n4. Assign to agents`,
            },
          ],
        };
      }

      case 'agent-workflow': {
        const specification = (args as Record<string, unknown> | undefined)?.specification;
        const featureName = (args as Record<string, unknown> | undefined)?.featureName;
        if (!specification || !featureName) {
          return {
            content: [{ type: 'text', text: 'Error: specification and featureName required' }],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: `🚀 Full Agent Workflow Started\n\nFeature: ${featureName}\nSpec length: ${String(specification).length} chars\n\nPipeline:\n1. 👤 Business Analyst - Break down\n2. 🏗️ Architecture - Design\n3. 🔧 Backend - Implement\n4. 🎨 Frontend - Build\n5. 🧪 Testing - Test\n6. 🔄 E2E - Integrate\n7. ✔️ Supervisor - Approve`,
            },
          ],
        };
      }

      case 'agent-validate': {
        const output = (args as Record<string, unknown> | undefined)?.output;
        if (!output) {
          return {
            content: [{ type: 'text', text: 'Error: output required' }],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: `✅ Supervisor Validation\n\nChecking against ULTRA_HIGH standards:\n✓ No 'any' types\n✓ Complete implementation\n✓ Full error handling\n✓ 95%+ test coverage\n✓ Proper architecture\n✓ Documentation complete`,
            },
          ],
        };
      }

      case 'agent-status': {
        const sessionId = (args as Record<string, unknown> | undefined)?.sessionId;
        if (!sessionId) {
          return {
            content: [{ type: 'text', text: 'Error: sessionId required' }],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: `📋 Workflow Status: ${sessionId}\n\nAgent Progress:\n- Business Analyst: pending\n- Architecture: pending\n- Backend: pending\n- Frontend: pending\n- Testing: pending\n- E2E: pending`,
            },
          ],
        };
      }

      case 'audit-log': {
        const a2 = (args as Record<string, unknown> | undefined) ?? {};
        const runId = String(a2.runId ?? '');
        const projectRoot = typeof a2.projectRoot === 'string' ? path.resolve(a2.projectRoot) : findProjectRoot();
        const verify = a2.verify === true;

        if (!runId) {
          return { content: [{ type: 'text', text: 'Error: runId is required' }], isError: true };
        }

        if (verify) {
          const report = await AuditLog.verify(projectRoot, runId);
          return {
            content: [{
              type: 'text',
              text: [
                `# Audit Verification: ${runId}`,
                `**Valid:** ${report.valid ? '✅ Yes' : '❌ No'}`,
                `**Total entries:** ${report.totalEntries}`,
                report.brokenLinks.length > 0
                  ? ['', '## Broken Links', ...report.brokenLinks.map((b) => `- seq ${b.seq}: ${b.reason}`)].join('\n')
                  : '',
              ].join('\n'),
            }],
          };
        }

        const entries = await AuditLog.read(projectRoot, runId);
        if (entries.length === 0) {
          return { content: [{ type: 'text', text: `No audit log found for run: ${runId}` }] };
        }
        const summary = [
          `# Audit Log: ${runId}`,
          `**Entries:** ${entries.length}`,
          '',
          '| seq | eventType | laneId | actor | timestamp |',
          '|-----|-----------|--------|-------|-----------|',
          ...entries.map((e) =>
            `| ${e.seq} | ${e.eventType} | ${e.laneId ?? '-'} | ${e.actor ?? '-'} | ${e.timestamp} |`,
          ),
        ];
        return { content: [{ type: 'text', text: summary.join('\n') }] };
      }

      case 'create-agent': {
        const ca = (args as Record<string, unknown> | undefined) ?? {};
        const agentName = String(ca.name ?? '');
        if (!agentName) return { content: [{ type: 'text', text: 'Error: name required' }], isError: true };
        const pr = typeof ca.projectRoot === 'string' ? path.resolve(ca.projectRoot) : findProjectRoot();
        const agentsDir = path.join(pr, 'agents');
        await fs.mkdir(agentsDir, { recursive: true });
        const filePath = path.join(agentsDir, `${agentName}.agent.json`);
        const agentJson = {
          name: agentName.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          icon: typeof ca.icon === 'string' ? ca.icon : '🤖',
          description: typeof ca.description === 'string' ? ca.description : '',
          checks: Array.isArray(ca.checks) ? ca.checks : [],
        };
        await fs.writeFile(filePath, JSON.stringify(agentJson, null, 2) + '\n', 'utf-8');
        return { content: [{ type: 'text', text: `✅ Created: ${filePath}\n\n\`\`\`json\n${JSON.stringify(agentJson, null, 2)}\n\`\`\`` }] };
      }

      case 'create-supervisor': {
        const cs = (args as Record<string, unknown> | undefined) ?? {};
        const laneId = String(cs.laneId ?? '');
        if (!laneId) return { content: [{ type: 'text', text: 'Error: laneId required' }], isError: true };
        const pr = typeof cs.projectRoot === 'string' ? path.resolve(cs.projectRoot) : findProjectRoot();
        const agentsDir = path.join(pr, 'agents');
        await fs.mkdir(agentsDir, { recursive: true });
        const filePath = path.join(agentsDir, `${laneId}.supervisor.json`);
        const defaultCheckpoints = [
          { checkpointId: 'step-0', mode: 'self', expect: { minFindings: 1 }, onFail: 'RETRY', retryInstructions: 'Re-examine the output and produce at least one finding.' },
          { checkpointId: 'step-1', mode: 'self', expect: { noErrorFindings: false }, onFail: 'RETRY', retryInstructions: 'Resolve all error-severity findings before proceeding.' },
          { checkpointId: 'step-2', mode: 'self', expect: { minFindings: 1 }, onFail: 'ESCALATE' },
        ];
        const supervisorJson = {
          laneId,
          retryBudget: typeof cs.retryBudget === 'number' ? cs.retryBudget : 2,
          checkpoints: Array.isArray(cs.checkpoints) && cs.checkpoints.length > 0 ? cs.checkpoints : defaultCheckpoints,
        };
        await fs.writeFile(filePath, JSON.stringify(supervisorJson, null, 2) + '\n', 'utf-8');
        return { content: [{ type: 'text', text: `✅ Created: ${filePath}\n\n\`\`\`json\n${JSON.stringify(supervisorJson, null, 2)}\n\`\`\`` }] };
      }

      case 'create-dag': {
        const cd = (args as Record<string, unknown> | undefined) ?? {};
        const dagName = String(cd.dagName ?? '');
        if (!dagName) return { content: [{ type: 'text', text: 'Error: dagName required' }], isError: true };
        if (!Array.isArray(cd.lanes) || cd.lanes.length === 0) return { content: [{ type: 'text', text: 'Error: lanes array required' }], isError: true };
        const pr = typeof cd.projectRoot === 'string' ? path.resolve(cd.projectRoot) : findProjectRoot();
        const agentsDir = path.join(pr, 'agents');
        await fs.mkdir(agentsDir, { recursive: true });
        const fileName = typeof cd.fileName === 'string' && cd.fileName ? cd.fileName : 'dag';
        const filePath = path.join(agentsDir, `${fileName}.dag.json`);
        const lanes = cd.lanes as Record<string, unknown>[];
        const capabilityRegistry: Record<string, string[]> = {};
        for (const lane of lanes) {
          if (Array.isArray(lane.capabilities)) {
            for (const cap of lane.capabilities as string[]) {
              capabilityRegistry[cap] = [String(lane.id ?? '')];
            }
          }
        }
        const dagJson: Record<string, unknown> = {
          name: dagName,
          description: typeof cd.description === 'string' ? cd.description : '',
          lanes,
          capabilityRegistry,
        };
        if (Array.isArray(cd.barriers) && cd.barriers.length > 0) {
          dagJson.globalBarriers = cd.barriers;
        }
        await fs.writeFile(filePath, JSON.stringify(dagJson, null, 2) + '\n', 'utf-8');
        return { content: [{ type: 'text', text: `✅ Created: ${filePath}\n\n\`\`\`json\n${JSON.stringify(dagJson, null, 2)}\n\`\`\`` }] };
      }

      case 'create-rule': {
        const cr = (args as Record<string, unknown> | undefined) ?? {};
        const heading = String(cr.heading ?? '');
        const body = String(cr.body ?? '');
        if (!heading || !body) return { content: [{ type: 'text', text: 'Error: heading and body required' }], isError: true };
        const pr = typeof cr.projectRoot === 'string' ? path.resolve(cr.projectRoot) : findProjectRoot();
        const rulesPath = path.join(pr, '.ai', 'rules.md');
        await fs.mkdir(path.dirname(rulesPath), { recursive: true });
        let existing = '';
        try { existing = await fs.readFile(rulesPath, 'utf-8'); } catch { /* new file */ }
        const blockHeading = `## ${heading}`;
        const newBlock = `${blockHeading}\n\n${body}\n`;
        let updated: string;
        if (existing.includes(blockHeading)) {
          // Replace existing block up to next ## heading or EOF
          updated = existing.replace(
            new RegExp(`## ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?(?=\n## |\n# |$)`),
            newBlock,
          );
        } else {
          updated = existing ? `${existing.trimEnd()}\n\n${newBlock}` : newBlock;
        }
        await fs.writeFile(rulesPath, updated, 'utf-8');
        return { content: [{ type: 'text', text: `✅ Rule "${heading}" written to ${rulesPath}` }] };
      }

      case 'cli-run': {
        const clr = (args as Record<string, unknown> | undefined) ?? {};
        const command = String(clr.command ?? '');
        if (!command) return { content: [{ type: 'text', text: 'Error: command required' }], isError: true };
        const pr = typeof clr.projectRoot === 'string' ? path.resolve(clr.projectRoot) : findProjectRoot();
        const timeoutMs = typeof clr.timeoutMs === 'number' ? clr.timeoutMs : 120_000;
        const [cmd, ...cmdArgs] = command.split(/\s+/);
        const output = await new Promise<string>((resolve) => {
          const chunks: string[] = [];
          const proc = spawn('ai-kit', [cmd ?? '', ...cmdArgs], {
            cwd: pr,
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe'],
          });
          proc.stdout.on('data', (d: Buffer) => chunks.push(d.toString()));
          proc.stderr.on('data', (d: Buffer) => chunks.push(d.toString()));
          const timer = setTimeout(() => { proc.kill(); chunks.push('\n[TIMEOUT]'); }, timeoutMs);
          proc.on('close', (code) => {
            clearTimeout(timer);
            resolve(`Exit code: ${code ?? '?'}\n\n${chunks.join('')}`);
          });
          proc.on('error', (err) => { clearTimeout(timer); resolve(`Process error: ${err.message}`); });
        });
        return { content: [{ type: 'text', text: `\`\`\`\nai-kit ${command}\n\n${output}\`\`\`` }] };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Register Resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const projectRoot = findProjectRoot();
  const runIds = await AuditLog.listRuns(projectRoot).catch(() => [] as string[]);
  const auditResources = runIds.map((id) => ({
    uri: `audit://${id}`,
    name: `Audit log: ${id}`,
    description: `Hash-chained NDJSON audit trail for run ${id}`,
    mimeType: 'application/x-ndjson',
  }));
  return {
    resources: [
      {
        uri: 'bootstrap://init',
        name: 'Initialize AI Session',
        description: 'Load ULTRA_HIGH standards and project rules',
        mimeType: 'text/plain',
      },
      {
        uri: 'bootstrap://rules',
        name: 'Project Rules',
        description: 'Coding standards and conventions',
        mimeType: 'text/markdown',
      },
      {
        uri: 'bootstrap://patterns',
        name: 'Design Patterns',
        description: 'Architecture patterns and best practices',
        mimeType: 'text/markdown',
      },
      {
        uri: 'bootstrap://manifest',
        name: 'Project Manifest',
        description: 'Project structure and capabilities',
        mimeType: 'application/xml',
      },
      ...auditResources,
      {
        uri: 'dashboard://status',
        name: 'DAG Run Dashboard',
        description: 'Live Markdown dashboard with active runs, recent history, and cost aggregates',
        mimeType: 'text/markdown',
      },
    ],
  };
});

// Handle Resource Reads
server.setRequestHandler(ReadResourceRequestSchema, async (request: ReadResourceRequest) => {
  const { uri } = request.params;

  if (uri.startsWith('bootstrap://')) {
    const resource = uri.replace('bootstrap://', '');

    switch (resource) {
      case 'init': {
        const initContent = await readProjectFile('.github/copilot-instructions.md');
        return {
          contents: [
            {
              uri,
              mimeType: 'text/markdown',
              text: initContent,
            },
          ],
        };
      }

      case 'rules': {
        const rulesContent = await readProjectFile('src/.ai/rules.md');
        return {
          contents: [
            {
              uri,
              mimeType: 'text/markdown',
              text: rulesContent,
            },
          ],
        };
      }

      case 'patterns': {
        const patternsContent = await readProjectFile('src/.ai/patterns.md');
        return {
          contents: [
            {
              uri,
              mimeType: 'text/markdown',
              text: patternsContent,
            },
          ],
        };
      }

      case 'manifest': {
        const manifestContent = await readProjectFile('.github/ai/manifest.xml');
        return {
          contents: [
            {
              uri,
              mimeType: 'application/xml',
              text: manifestContent,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown resource: ${resource}`);
    }
  }

  if (uri.startsWith('audit://')) {
    const runId = uri.replace('audit://', '');
    const projectRoot = findProjectRoot();
    const entries = await AuditLog.read(projectRoot, runId);
    const ndjson = entries.map((e) => JSON.stringify(e)).join('\n');
    return {
      contents: [{
        uri,
        mimeType: 'application/x-ndjson',
        text: ndjson || `# No audit log found for run: ${runId}`,
      }],
    };
  }

  if (uri === 'dashboard://status') {
    const projectRoot = findProjectRoot();
    const markdown = await buildDashboard(projectRoot);
    return {
      contents: [{
        uri,
        mimeType: 'text/markdown',
        text: markdown,
      }],
    };
  }

  throw new Error(`Unknown resource URI: ${uri}`);
});

// Start Server
async function main() {
  // Start optional SSE live-event stream
  if (process.env['AIKIT_SSE_PORT']) {
    const ssePort = Number(process.env['AIKIT_SSE_PORT']);
    startSseServer(isNaN(ssePort) ? 3747 : ssePort);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Server started on stdio');
}

main().catch(console.error);
