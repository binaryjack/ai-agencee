#!/usr/bin/env node
import { AGENTS_DIR } from '@ai-agencee/engine'
import { Command } from 'commander'
import { runAgentInstall, runAgentList } from '../src/commands/agents/index.js'
import { runBenchmark } from '../src/commands/benchmark/index.js'
import { runCheck } from '../src/commands/check/index.js'
import { runTemplateList, runTemplateInfo, runTemplateInstall } from '../src/commands/template/index.js'
import { runCodeGenerate, runCodeIndex, runCodeSearch, runCodeStats, runCodeWatch } from '../src/commands/code/index.js'
import { runAsk } from '../src/commands/ask/index.js'
import { runDag, runDagStream } from '../src/commands/dag/index.js'
import { runDataDelete, runDataExport, runDataListTenants } from '../src/commands/data/index.js'
import { runDemo } from '../src/commands/demo/index.js'
import { runDoctor } from '../src/commands/doctor/index.js'
import { runImportAutogen, runImportCrew, runImportLangGraph, runImportSkPlan } from '../src/commands/import/index.js'
import { runInit } from '../src/commands/init/index.js'
import { runMcp } from '../src/commands/mcp/index.js'
import { runPlan } from '../src/commands/plan/index.js'
import { runSetup } from '../src/commands/setup/index.js'
import { runSync } from '../src/commands/sync/index.js'
import { runVisualize } from '../src/commands/visualize/index.js'

const program = new Command();

program
  .name('ai-kit')
  .description('AI starter kit CLI - Scaffolding, validation, MCP server, and agent orchestration')
  .version('1.2.1');

program
  .command('init')
  .description('Scaffold AI rule files into the current project')
  .option('-t, --strict', 'Initialize with ULTRA_HIGH strict standards (OWNER rules)')
  .action((options) => runInit({ strict: options.strict }));

program
  .command('setup')
  .description('Interactive setup wizard for first-time users')
  .option('-v, --verbose', 'Show detailed setup information')
  .action((options) => runSetup({ verbose: options.verbose }));

program
  .command('sync')
  .description('Sync AI rule files with the latest template')
  .action(runSync);

program
  .command('check')
  .description('Validate project structure against AI rules')
  .action(runCheck);

program
  .command('doctor')
  .description('Run health checks: MCP server, model router, tech registry, .agencee/, agents, cloud API, Codernic index')
  .option('-p, --project <path>', 'Project root directory (default: cwd)')
  .action(async (options: { project?: string }) => {
    const report = await runDoctor(options.project)
    process.exit(report.allOk ? 0 : 1)
  });

program
  .command('mcp')
  .description('Start MCP server for AI assistant integration')
  .action(runMcp);

// Demo command (Phase 1.1 - Zero-config demo mode)
program
  .command('demo [scenario]')
  .description('Run zero-config demo with MockProvider (no API keys, no cost)')
  .option('-v, --verbose', 'Show detailed execution logs')
  .option('-i, --interactive', 'Pause at human-review gates')
  .action(async (scenario, options) => {
    await runDemo({
      scenario,
      verbose: options.verbose,
      interactive: options.interactive,
    });
  });

// Ask command (Phase 2.6 - ASK mode instant FTS5 results)
program
  .command('ask <query>')
  .description('Instant zero-cost code search using FTS5 (no LLM, no hallucinations)')
  .option('-p, --project <path>', 'Project root directory (default: cwd)')
  .option('--limit <n>', 'Maximum results to return', '30')
  .option('--json', 'Output machine-readable JSON')
  .action(async (query, options) => {
    await runAsk(query, {
      project: options.project,
      limit: parseInt(options.limit, 10),
      json: options.json,
    });
  });

// Code commands (E14 - Coding Assistant)
program
  .command('code:index')
  .description('Index codebase for intelligent search and assistance')
  .option('-p, --project <path>', 'Project root directory (default: cwd)')
  .option('--incremental', 'Only index changed files (default)', true)
  .option('--force', 'Force full re-index')
  .option('--languages <langs>', 'Comma-separated languages to index', 'typescript,javascript')
  .option('--exclude <patterns>', 'Comma-separated exclude patterns', 'node_modules,dist,build,.git,coverage')
  .option('--include <patterns>', 'Comma-separated include patterns')
  .option('--respect-gitignore', 'Respect .gitignore files (default: true)', true)
  .option('--force-include <patterns>', 'Force-include patterns (overrides .gitignore)')
  .option('--verbose', 'Show detailed progress')
  .option('--json', 'Output progress as JSON events (machine-readable)')
  .action(async (options) => {
    await runCodeIndex(options);
  });

program
  .command('code:search <term>')
  .description('Search the code index for symbols, functions, or patterns')
  .option('-p, --project <path>', 'Project root directory (default: cwd)')
  .option('--limit <n>', 'Maximum results to return', '10')
  .option('--kind <kind>', 'Filter by symbol kind: function | class | interface | variable | import')
  .option('--json', 'Output machine-readable JSON')
  .option('--with-deps', 'Include caller/callee relationships from dependency graph')
  .action(async (term, options) => {
    await runCodeSearch(term, {
      project: options.project,
      limit: parseInt(options.limit, 10),
      kind: options.kind,
      json: options.json,
      withDeps: options.withDeps,
    });
  });

program
  .command('code:watch')
  .description('Watch project and auto re-index on file changes')
  .option('-p, --project <path>', 'Project root directory (default: cwd)')
  .option('--languages <langs>', 'Comma-separated languages to index', 'typescript,javascript')
  .option('--exclude <patterns>', 'Comma-separated exclude patterns', 'node_modules,dist,build,.git,coverage')
  .option('--verbose', 'Show detailed progress')
  .action(async (options) => {
    await runCodeWatch(options);
  });

program
  .command('code:stats')
  .description('Show code index statistics (files, symbols, last indexed)')
  .option('-p, --project <path>', 'Project root directory (default: cwd)')
  .option('--json', 'Output machine-readable JSON')
  .action(async (options) => {
    await runCodeStats(options);
  });

program
  .command('code:generate <task>')
  .description('Generate or modify code from a natural-language task description')
  .option('-p, --project <path>', 'Project root directory (default: cwd)')
  .option('--mode <mode>', 'Execution mode: quick-fix | feature | refactor | debug', 'feature')
  .option('--dry-run', 'Preview planned changes without writing files')
  .option('--auto-approve', 'Skip interactive confirmation prompts')
  .option('--provider <name>', 'LLM provider override (anthropic | openai)', 'anthropic')
  .option('--router <path>', 'Path to model-router.json config file')
  .option('--emit-patches', 'Output file patches as NDJSON to stdout instead of writing to disk')
  .action(async (task, options) => {
    await runCodeGenerate(task, {
      project: options.project,
      mode: options.mode,
      dryRun: options.dryRun,
      autoApprove: options.autoApprove,
      provider: options.provider,
      router: options.router,
      emitPatches: options.emitPatches,
    });
  });

// Agent commands
program
  .command('agent:dag [dag-file]')
  .description('Run multi-lane supervised DAG execution (default: agents/dag.json)')
  .option('-p, --project <path>', 'Project root directory (default: cwd)')
  .option('-v, --verbose', 'Enable verbose output with per-checkpoint details')
  .option('--dry-run', 'Validate the DAG config and print execution plan without running')
  .option('--preview', 'Phase 3.1: Detailed execution preview with file analysis, cost breakdown, and interactive approval before running')
  .option('-i, --interactive', 'Pause at needs-human-review checkpoints and prompt for operator decision')
  .option('--budget <usd>', 'Abort the run when estimated LLM spend exceeds this USD amount')
  .option('--provider <name>', 'Override the LLM provider for all lanes (e.g. anthropic, openai, mock)')
  .option('--json', 'Output machine-readable JSON (suppresses human-friendly progress text)')
  .option('--dashboard', 'Show live agent dashboard (Phase 1.2 - terminal UI with ink)')
  .option('-y, --yes', 'Skip pre-flight cost confirmation prompt')
  .option('--mode <mode>', 'Execution mode preset: quick, standard, thorough, ci, dev (auto-detects if not specified)')
  .action((dagFile, options) =>
    runDag(dagFile ?? `${AGENTS_DIR}/dag.json`, {
      project: options.project,
      verbose: options.verbose,
      dryRun: options.dryRun,
      preview: options.preview,
      interactive: options.interactive,
      budget: options.budget,
      provider: options.provider,
      json: options.json,
      dashboard: options.dashboard,
      yes: options.yes,
      mode: options.mode,
    }),
  );

program
  .command('agent:run-stream <dag-file>')
  .description('Run a DAG and stream execution events as NDJSON (used by VS Code extension)')
  .option('-p, --project <path>', 'Project root directory (default: cwd)')
  .option('--provider <name>', 'Override LLM provider for all lanes')
  .option('--budget <usd>', 'Abort when estimated spend exceeds this USD amount')
  .action(async (dagFile, options) =>
    runDagStream(dagFile, {
      project:  options.project,
      provider: options.provider,
      budget:   options.budget,
    }),
  );

// Agent registry commands (G-49)
program
  .command('agent:list')
  .description('List available agents in the project')
  .option('-p, --project <path>', 'Project root directory (default: cwd)')
  .option('--json', 'Output machine-readable JSON')
  .action((options) =>
    runAgentList({ project: options.project, json: options.json }),
  );

program
  .command('agent:install <name>')
  .description('Install an agent from the ai-agencee-ressources registry')
  .option('-p, --project <path>', 'Project root directory (default: cwd)')
  .option('--registry <url>', 'Registry URL (default: https://raw.githubusercontent.com/binaryjack/ai-agencee-ressources/main)')
  .action((name, options) =>
    runAgentInstall(name, { project: options.project, registry: options.registry }),
  );

// Template commands (Phase 2.1 - DAG templates library)
program
  .command('template:list')
  .description('List all available DAG templates with cost estimates')
  .action(() => runTemplateList());

program
  .command('template:info <template-id>')
  .description('Show detailed information about a template')
  .action((templateId) => runTemplateInfo(templateId));

program
  .command('template:install <template-id>')
  .description('Install a template to the current project')
  .option('-d, --dir <path>', 'Target directory (default: agents/)')
  .option('-n, --name <name>', 'Custom name for the template')
  .option('-f, --force', 'Overwrite existing files without prompting')
  .action((templateId, options) =>
    runTemplateInstall(templateId, {
      dir: options.dir,
      name: options.name,
      force: options.force,
    }),
  );

// Plan commands
program
  .command('agent:plan')
  .description('Run the interactive 5-phase Plan System (Discovery → Synthesize → Decompose → Wire → Execute)')
  .option('-p, --project <path>',           'Project root directory (default: cwd)')
  .option('-a, --agents-dir <path>',        `Directory containing agent/supervisor JSON files (default: <project>/${AGENTS_DIR})`)
  .option('--start-from <phase>',           'Resume from a specific phase: discover · synthesize · decompose · wire · execute')
  .option('--skip-approval',                'Skip user approval gates (non-interactive / CI mode)')
  .option('-v, --verbose',                  'Enable verbose DAG output during execution phase')
  .option('--provider <name>',              'LLM provider to use: anthropic · openai · vscode (auto-detect from env if omitted)')
  .option('--model-router-config <path>',   'Path to a custom model-router.json config file')
  .action((options) =>
    runPlan({
      project:           options.project,
      agentsDir:         options.agentsDir,
      startFrom:         options.startFrom,
      skipApproval:      options.skipApproval,
      verbose:           options.verbose,
      provider:          options.provider,
      modelRouterConfig: options.modelRouterConfig,
    }),
  );

// Benchmark command
program
  .command('agent:benchmark')
  .description('Benchmark registered LLM providers — latency, throughput, cost per request')
  .option('--providers <names>', 'Comma-separated provider names to test (default: all registered)')
  .option('--suite <name>', 'Prompt suite: minimal | code-review (default: minimal)')
  .option('--runs <n>', 'Repetitions per prompt', '1')
  .option('--router-file <path>', 'Path to model-router.json (default: agents/model-router.json)')
  .option('-p, --project <path>', 'Project root directory (default: cwd)')
  .option('--output <file>', 'Write JSON report to this file')
  .action((options) =>
    runBenchmark({
      providers: options.providers,
      suite: options.suite,
      runs: options.runs ? parseInt(options.runs, 10) : 1,
      routerFile: options.routerFile,
      project: options.project,
      output: options.output,
    }),
  );

// DAG visualizer (E7)
program
  .command('dag:visualize <dag-file>')
  .description('Render a DAG JSON as a Mermaid flowchart or Graphviz DOT diagram')
  .option('-o, --output <file>', 'Write diagram to a file instead of printing to stdout')
  .option('-f, --format <fmt>', 'Output format: mermaid (default) or dot', 'mermaid')
  .action((dagFile, options) =>
    runVisualize(dagFile, {
      output: options.output,
      format: options.format,
    }),
  );

// GDPR data commands (E4)
program
  .command('data:export')
  .description('Export all run data for a tenant (GDPR Art. 20 — Data Portability)')
  .option('-t, --tenant <id>', 'Tenant ID (default: AIKIT_TENANT_ID env var or "default")')
  .requiredOption('-d, --dest <dir>', 'Destination directory for the export')
  .action((options) =>
    runDataExport({
      tenant: options.tenant,
      dest: options.dest,
    }),
  );

program
  .command('data:delete')
  .description('Permanently delete all run data for a tenant (GDPR Art. 17 — Erasure)')
  .option('-t, --tenant <id>', 'Tenant ID (default: AIKIT_TENANT_ID env var or "default")')
  .option('--confirm', 'Required: confirm you intend to delete all data irreversibly')
  .action((options) =>
    runDataDelete({
      tenant: options.tenant,
      confirm: options.confirm,
    }),
  );

program
  .command('data:list-tenants')
  .description('List all tenant IDs stored under .agencee/tenants/')
  .action(runDataListTenants);

// Framework import commands (IP-07)
// Note: Commander v14 does not support 'import X <file>' shorthand for subcommands —
// use colon-separated names consistent with the rest of the CLI.
program
  .command('import:langgraph <file>')
  .description('Convert a LangGraph StateGraph JSON → ai-agencee DAG JSON')
  .option('-o, --out <path>', 'Write DAG to this file instead of printing to stdout')
  .action((file, options) => runImportLangGraph(file, { out: options.out }))

program
  .command('import:crew <file>')
  .description('Convert a CrewAI Crew JSON definition → ai-agencee DAG JSON')
  .option('-o, --out <path>', 'Write DAG to this file instead of printing to stdout')
  .action((file, options) => runImportCrew(file, { out: options.out }))

program
  .command('import:autogen <file>')
  .description('Convert an AutoGen GroupChat config JSON → ai-agencee DAG JSON')
  .option('-o, --out <path>', 'Write DAG to this file instead of printing to stdout')
  .action((file, options) => runImportAutogen(file, { out: options.out }))

program
  .command('import:sk-plan <file>')
  .description('Convert a Semantic Kernel Planner JSON output → ai-agencee DAG JSON')
  .option('-o, --out <path>', 'Write DAG to this file instead of printing to stdout')
  .action((file, options) => runImportSkPlan(file, { out: options.out }))

program.parse(process.argv);
