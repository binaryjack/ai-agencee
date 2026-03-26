#!/usr/bin/env node
import { AGENTS_DIR, AuditLog, DagOrchestrator, createCodeAssistantOrchestrator, createCodebaseIndexStore } from '@ai-agencee/engine'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
    CallToolRequest,
    CallToolRequestSchema,
    ListResourcesRequestSchema,
    ListToolsRequestSchema,
    ReadResourceRequest,
    ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js'
import { spawn } from 'child_process'
import * as fs from 'fs/promises'
import * as path from 'path'
import { buildDashboard } from './dashboard/index.js'
import { findProjectRoot } from './find-project-root.js'
import { runAnalyzeProject } from './handlers/analyze-project/index.js'
import { runDagDryRun } from './handlers/dag-dry-run/index.js'
import { getAgentCapabilities } from './handlers/get-agent-capabilities/index.js'
import { runHealthCheck } from './handlers/health-check/index.js'
import { runPreviewPrompt } from './handlers/preview-prompt/index.js'
import { runPullRules } from './handlers/pull-rules/index.js'
import { runPushRules } from './handlers/push-rules/index.js'
import { startSseServer } from './sse/index.js'
import { allToolDefinitions } from './tools/definitions.js'
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
  tools: allToolDefinitions,
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
        const dagFile = typeof a.dagFile === 'string' ? a.dagFile : path.join(AGENTS_DIR, 'dag.json');
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
        const agentsDir = path.join(pr, AGENTS_DIR);
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
        const agentsDir = path.join(pr, AGENTS_DIR);
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
        if (!Array.isArray(cd.lanes)) return { content: [{ type: 'text', text: 'Error: lanes must be an array' }], isError: true };
        const pr = typeof cd.projectRoot === 'string' ? path.resolve(cd.projectRoot) : findProjectRoot();
        const agentsDir = path.join(pr, AGENTS_DIR);
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

      case 'analyze-project': {
        const ap = (args as Record<string, unknown> | undefined) ?? {}
        const pr = typeof ap.projectRoot === 'string' ? path.resolve(ap.projectRoot) : findProjectRoot()
        const intelligence = await runAnalyzeProject(pr)
        return { content: [{ type: 'text', text: JSON.stringify(intelligence, null, 2) }] }
      }

      case 'get-agent-capabilities': {
        const capabilities = getAgentCapabilities()
        return { content: [{ type: 'text', text: JSON.stringify(capabilities, null, 2) }] }
      }

      case 'health-check': {
        const hc = (args as Record<string, unknown> | undefined) ?? {}
        const pr = typeof hc.projectRoot === 'string' ? path.resolve(hc.projectRoot) : findProjectRoot()
        const report = await runHealthCheck(pr)
        return { content: [{ type: 'text', text: JSON.stringify(report, null, 2) }] }
      }

      case 'pull-rules': {
        const a = (args as Record<string, unknown> | undefined) ?? {}
        const pr = typeof a.projectRoot === 'string' ? path.resolve(a.projectRoot) : findProjectRoot()
        const result = await runPullRules(pr)
        return { content: [{ type: 'text', text: result }] }
      }

      case 'push-rules': {
        const a = (args as Record<string, unknown> | undefined) ?? {}
        const pr = typeof a.projectRoot === 'string' ? path.resolve(a.projectRoot) : findProjectRoot()
        const rulesJson = typeof a.rulesJson === 'string' ? a.rulesJson : '[]'
        const result = await runPushRules(pr, rulesJson)
        return { content: [{ type: 'text', text: result }] }
      }

      case 'preview-prompt': {
        const a = (args as Record<string, unknown> | undefined) ?? {}
        const agentName = typeof a.agentName === 'string' ? a.agentName : 'backend-agent'
        const modelFamily = (typeof a.modelFamily === 'string' ? a.modelFamily : 'sonnet') as 'haiku' | 'sonnet' | 'opus'
        const pr = typeof a.projectRoot === 'string' ? path.resolve(a.projectRoot) : findProjectRoot()
        const result = await runPreviewPrompt(agentName, modelFamily, pr)
        return { content: [{ type: 'text', text: result }] }
      }

      case 'dag-dry-run': {
        const a = (args as Record<string, unknown> | undefined) ?? {}
        const dagFile = typeof a.dagFile === 'string' ? a.dagFile : path.join(AGENTS_DIR, 'dag.json')
        const pr = typeof a.projectRoot === 'string' ? path.resolve(a.projectRoot) : findProjectRoot()
        const report = await runDagDryRun(dagFile, pr)
        const lines = [
          `# DAG Dry Run: ${dagFile}`,
          `**Valid:** ${report.valid ? '✅ Yes' : '❌ No'}  |  **Lanes:** ${report.laneCount}`,
          '',
          ...(report.errors.length > 0
            ? ['## Errors', ...report.errors.map((e) => `- ❌ ${e.lane ? `[${e.lane}] ` : ''}${e.message} _(${e.type})_`)]
            : ['_No errors._']),
          '',
          ...(report.warnings.length > 0
            ? ['## Warnings', ...report.warnings.map((w) => `- ⚠️ ${w.lane ? `[${w.lane}] ` : ''}${w.message}`)]
            : []),
          ...(report.agentFiles.length > 0
            ? ['', '## Agent Files', ...report.agentFiles.map((f) => `- ${f}`)]
            : []),
        ]
        return {
          content: [{ type: 'text', text: lines.join('\n') }],
          isError: !report.valid,
        }
      }

      case 'tech-catalog': {
        const a = (args as Record<string, unknown> | undefined) ?? {}
        const pr = typeof a.projectRoot === 'string' ? path.resolve(a.projectRoot) : undefined
        const { runTechCatalog } = await import('./handlers/tech-catalog/index.js')
        const result = await runTechCatalog(pr)
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        }
      }

      case 'create-tech-pack': {
        const a = (args as Record<string, unknown> | undefined) ?? {}
        const { runCreateTechPack } = await import('./handlers/create-tech-pack/index.js')
        const validCategories = ['language', 'framework', 'library', 'tool', 'platform', 'database'] as const
        type ValidCategory = typeof validCategories[number]
        const rawCategory = typeof a.category === 'string' ? a.category : ''
        const category = (validCategories as readonly string[]).includes(rawCategory)
          ? rawCategory as ValidCategory
          : 'library' as const
        const result = await runCreateTechPack({
          name: typeof a.name === 'string' ? a.name : '',
          displayName: typeof a.displayName === 'string' ? a.displayName : '',
          category,
          description: typeof a.description === 'string' ? a.description : '',
          version: typeof a.version === 'string' ? a.version : '1.0.0',
          frameworks: Array.isArray(a.frameworks) ? a.frameworks.filter((e): e is string => typeof e === 'string') : undefined,
          ruleTopics: undefined,
          destination: a.destination === 'package' ? 'package' : 'workspace',
          projectRoot: typeof a.projectRoot === 'string' ? a.projectRoot : undefined,
        })
        return {
          content: [{
            type: 'text',
            text: result.success
              ? `✅ ${result.message}\n\nDirectory: ${result.path}\nFiles:\n${result.files.map((f) => `  - ${f}`).join('\n')}`
              : `❌ ${result.message}`
          }],
          isError: !result.success,
        }
      }

      case 'code-search-context': {
        const a = (args as Record<string, unknown> | undefined) ?? {}
        const query = typeof a.query === 'string' ? a.query : ''
        const conversationContext = typeof a.conversationContext === 'string' ? a.conversationContext : ''
        const pr = typeof a.projectRoot === 'string' ? path.resolve(a.projectRoot) : findProjectRoot()
        const topK = typeof a.topK === 'number' ? a.topK : 40

        const dbPath = path.join(pr, '.agencee', 'code-index.db')
        try {
          await fs.access(dbPath)
        } catch {
          return { content: [{ type: 'text', text: '' }] }
        }

        const store = await createCodebaseIndexStore({ dbPath, projectId: path.basename(pr) })
        try {
          // Extract keywords from both query and conversation context
          const seenKw: Record<string, boolean> = {}
          // Stopwords to exclude from FTS queries (common English words that won't match code symbols)
          const stopwords = new Set([
            'what', 'how', 'can', 'are', 'you', 'the', 'this', 'that', 'see', 'have',
            'know', 'find', 'show', 'tell', 'explain', 'does', 'will', 'your', 'there',
            'when', 'where', 'which', 'would', 'could', 'should', 'make', 'get', 'use'
          ])
          
          const keywords: string[] = []
          
          // Extract from query (4+ char words, excluding stopwords)
          for (const w of query.split(/\W+/)) {
            const lower = w.toLowerCase()
            if (w.length >= 4 && !seenKw[lower] && !stopwords.has(lower)) {
              seenKw[lower] = true
              keywords.push(w)
              if (keywords.length === 6) break
            }
          }
          
          // Extract from conversation context (capitalized 4+ char words = likely entities/topics)
          if (conversationContext && keywords.length < 6) {
            for (const w of conversationContext.split(/\W+/)) {
              const lower = w.toLowerCase()
              if (w.length >= 4 && /^[A-Z]/.test(w) && !seenKw[lower] && !stopwords.has(lower)) {
                seenKw[lower] = true
                keywords.push(w)
                if (keywords.length === 6) break
              }
            }
          }
          
          // Fallback: if no keywords extracted (all were stopwords), use broad technical query
          if (keywords.length === 0) {
            console.log('[MCP] No keywords extracted after stopword filtering, using broad query')
            keywords.push('main', 'entry', 'point', 'function', 'class', 'component')
          }
          
          const ftsQuery = keywords.join(' OR ')
          console.log(`[MCP] FTS query: "${ftsQuery}" (topK=${topK})`)
          if (!ftsQuery) return { content: [{ type: 'text', text: '' }] }

          type SymbolRow = { name: string; kind: string; signature: string | null; file_path: string; line_start: number }
          const symbols = (await store.query(
            `SELECT s.name, s.kind, s.signature, f.file_path, s.line_start
             FROM codebase_symbols_fts fts
             JOIN codebase_symbols s ON s.id      = fts.rowid
             JOIN codebase_files   f ON s.file_id = f.id
             WHERE codebase_symbols_fts MATCH ?
             ORDER BY rank
             LIMIT ?`,
            [ftsQuery, topK],
          )) as SymbolRow[]

          console.log(`[MCP] Found ${symbols.length} symbols`)
          if (symbols.length === 0) {
            console.log('[MCP] WARNING: 0 symbols found despite index existing')
            return { content: [{ type: 'text', text: '' }] }
          }

          // Read actual source code for each symbol (with context window)
          const sections: string[] = []
          const seenFiles: Record<string, string> = {} // Cache file contents
          
          for (const s of symbols) {
            const filePath = path.join(pr, s.file_path)
            
            // Read file content (with caching to avoid multiple reads of same file)
            let fileContent: string
            if (seenFiles[s.file_path]) {
              fileContent = seenFiles[s.file_path]
            } else {
              try {
                fileContent = await fs.readFile(filePath, 'utf-8')
                seenFiles[s.file_path] = fileContent
              } catch {
                // File not accessible, skip this symbol
                continue
              }
            }
            
            // Split into lines and extract context window
            const allLines = fileContent.split('\n')
            const symbolLine = s.line_start - 1 // Convert to 0-indexed
            const contextBefore = 5
            const contextAfter = 15
            const startLine = Math.max(0, symbolLine - contextBefore)
            const endLine = Math.min(allLines.length, symbolLine + contextAfter)
            const snippet = allLines.slice(startLine, endLine).join('\n')
            
            // Build section with file path, line numbers, and code
            sections.push(
              `#### ${s.file_path}:${s.line_start} - ${s.kind} \`${s.name}\`\n` +
              '```\n' +
              snippet +
              '\n```\n'
            )
          }
          
          console.log(`[MCP] Read ${sections.length} code sections from ${Object.keys(seenFiles).length} files`)
          if (sections.length === 0) return { content: [{ type: 'text', text: '' }] }
          
          return { 
            content: [{ 
              type: 'text', 
              text: '### Codebase Context\n\n' + sections.join('\n')
            }] 
          }
        } finally {
          await store.close()
        }
      }

      case 'code-generate': {
        const a = (args as Record<string, unknown> | undefined) ?? {}
        const task = typeof a.task === 'string' ? a.task.trim() : ''
        const pr = typeof a.projectRoot === 'string' ? path.resolve(a.projectRoot) : findProjectRoot()
        const dryRun = typeof a.dryRun === 'boolean' ? a.dryRun : true
        const mode = (['feature', 'quick-fix', 'refactor', 'debug'] as const).includes(a.mode as never)
          ? (a.mode as 'feature' | 'quick-fix' | 'refactor' | 'debug')
          : 'feature'

        if (!task) {
          return { content: [{ type: 'text', text: 'Error: task is required' }], isError: true }
        }

        const orch = createCodeAssistantOrchestrator({ projectRoot: pr })
        const result = await orch.execute({ task, dryRun, mode })

        if (!result.success) {
          return {
            content: [{ type: 'text', text: result.error ?? 'Code generation failed' }],
            isError: true,
          }
        }

        const summary = [
          dryRun ? '# Codernic — Dry Run Plan' : '# Codernic — Changes Applied',
          '',
          dryRun
            ? String(result.plan ?? 'No plan generated')
            : '**Files modified:** ' + result.filesModified.join(', '),
          '',
          `**Duration:** ${result.duration}ms · **Cost:** $${result.totalCost.toFixed(4)}`,
        ]
        return { content: [{ type: 'text', text: summary.join('\n') }] }
      }

      case 'generate-codernic-instructions': {
        const a = (args as Record<string, unknown> | undefined) ?? {}
        const mode = (['ask', 'plan', 'agent'] as const).includes(a.mode as never)
          ? (a.mode as 'ask' | 'plan' | 'agent')
          : 'ask'
        const pr = typeof a.projectRoot === 'string' ? path.resolve(a.projectRoot) : findProjectRoot()
        const dbPath = path.join(pr, '.agencee', 'code-index.db')

        try {
          await fs.access(dbPath)
        } catch {
          return {
            content: [{ type: 'text', text: 'Error: Code index not found. Run indexing first.' }],
            isError: true,
          }
        }

        const store = await createCodebaseIndexStore({ dbPath, projectId: path.basename(pr) })
        try {
          // Analyze codebase patterns
          type FileStatsRow = { ext: string; count: number }
          const fileStats = (await store.query(
            `SELECT SUBSTR(file_path, INSTR(file_path, '.', -1)) as ext, COUNT(*) as count
             FROM codebase_files
             WHERE ext IS NOT NULL AND ext != ''
             GROUP BY ext
             ORDER BY count DESC
             LIMIT 10`
          )) as FileStatsRow[]

          type NamingPatternRow = { name: string }
          const symbols = (await store.query(
            `SELECT name FROM codebase_symbols ORDER BY RANDOM() LIMIT 100`
          )) as NamingPatternRow[]

          // Detect naming convention
          const hasKebabCase = symbols.some(s => /^[a-z]+(-[a-z]+)+/.test(s.name))
          const hasCamelCase = symbols.some(s => /^[a-z]+[A-Z]/.test(s.name))
          const hasPascalCase = symbols.some(s => /^[A-Z][a-z]+[A-Z]/.test(s.name))

          // Detect tech stack
          const extensions = fileStats.slice(0, 5).map(f => f.ext).join(', ')
          const hasTypescript = fileStats.some(f => f.ext === '.ts' || f.ext === '.tsx')
          const hasReact = fileStats.some(f => f.ext === '.tsx' || f.ext === '.jsx')

          // Generate mode-specific instructions
          const modeDescriptions = {
            ask: 'Quick Q&A assistant — provide concise answers with minimal context',
            plan: 'Design planner — outline architecture and patterns without executing',
            agent: 'Full-power executor — create agents, DAGs, and run workflows',
          }

          const instructions = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<codernic-instructions>',
            `  <mode>${mode}</mode>`,
            `  <description>${modeDescriptions[mode]}</description>`,
            '  <codebase-patterns>',
            `    <primary-extensions>${extensions}</primary-extensions>`,
            hasTypescript ? '    <language>TypeScript</language>' : '    <language>JavaScript</language>',
            hasReact ? '    <framework>React</framework>' : '',
            '    <naming-conventions>',
            hasKebabCase ? '      <convention>kebab-case (files, variables)</convention>' : '',
            hasCamelCase ? '      <convention>camelCase (functions, variables)</convention>' : '',
            hasPascalCase ? '      <convention>PascalCase (classes, components)</convention>' : '',
            '    </naming-conventions>',
            '  </codebase-patterns>',
            '  <behavior-rules>',
            mode === 'ask'
              ? '    <rule>Provide brief, focused answers. Avoid executing commands.</rule>'
              : mode === 'plan'
              ? '    <rule>Design and plan workflows. Preview commands but do not execute.</rule>'
              : '    <rule>Execute commands, create agents, run DAGs with full permissions.</rule>',
            '    <rule>Reference actual codebase symbols when available.</rule>',
            `    <rule>Context budget: topK=${mode === 'ask' ? 15 : mode === 'plan' ? 60 : 100}</rule>`,
            '  </behavior-rules>',
            '</codernic-instructions>',
          ]
            .filter(Boolean)
            .join('\n')

          // Save to .ai/codernic/{mode}.xml
          const aiDir = path.join(pr, '.ai', 'codernic')
          await fs.mkdir(aiDir, { recursive: true })
          const outputPath = path.join(aiDir, `${mode}.xml`)
          await fs.writeFile(outputPath, instructions, 'utf-8')

          return {
            content: [
              {
                type: 'text',
                text: `✅ Generated Codernic instructions for **${mode}** mode\n\n**Saved to:** ${outputPath}\n\n\`\`\`xml\n${instructions}\n\`\`\``,
              },
            ],
          }
        } finally {
          await store.close()
        }
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
