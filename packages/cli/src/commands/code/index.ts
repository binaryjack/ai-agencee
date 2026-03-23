/**
 * Code commands - Parent command for code assistance features
 */

import { Command } from 'commander'
import { runCodeGenerate } from './generate-cmd.js'
import { runCodeIndex } from './index-cmd.js'
import { runCodeSearch } from './search-cmd.js'
import { runCodeStats } from './stats-cmd.js'
import { runCodeWatch } from './watch-cmd.js'

export const codeCommand = function() {
  const command = new Command('code');
  
  command
    .description('Code assistance commands (E14 Coding Assistant)');
  
  // Add index subcommand
  command
    .command('index')
    .description('Index codebase for intelligent search and assistance')
    .option('-p, --project <path>', 'Project root directory', process.cwd())
    .option('--incremental', 'Only index changed files (default)', true)
    .option('--force', 'Force full re-index')
    .option('--languages <langs>', 'Comma-separated languages to index', 'typescript,javascript')
    .option('--exclude <patterns>', 'Comma-separated exclude patterns', 'node_modules,dist,build,.git,coverage')
    .option('--include <patterns>', 'Comma-separated include patterns (overrides .gitignore)')
    .option('--verbose', 'Show detailed progress')
    .action(async (options) => {
      try {
        await runCodeIndex(options);
      } catch (error) {
        console.error('\n❌ Command failed');
        process.exit(1);
      }
    });

  // Add stats subcommand
  command
    .command('stats')
    .description('Show statistics for the codebase index')
    .option('-p, --project <path>', 'Project root directory', process.cwd())
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        await runCodeStats(options);
      } catch (error) {
        console.error('\n❌ Command failed');
        process.exit(1);
      }
    });

  // Add search subcommand
  command
    .command('search <term>')
    .description('Search indexed symbols by name, signature, or docstring')
    .option('-p, --project <path>', 'Project root directory', process.cwd())
    .option('--kind <kind>', 'Filter by symbol kind (function, class, method, interface, type)')
    .option('--limit <n>', 'Maximum results to return', '20')
    .option('--json', 'Output as JSON')
    .option('--semantic', 'Use vector/semantic search instead of FTS5 (requires Ollama or OPENAI_API_KEY)')
    .action(async (term, options) => {
      try {
        await runCodeSearch(term, { ...options, limit: parseInt(options.limit, 10) });
      } catch (error) {
        console.error('\n❌ Command failed');
        process.exit(1);
      }
    });
  
  // Add watch subcommand
  command
    .command('watch')
    .description('Watch project directory and re-index on file changes')
    .option('-p, --project <path>', 'Project root directory', process.cwd())
    .option('--languages <langs>', 'Comma-separated languages to watch', 'typescript,javascript')
    .option('--exclude <patterns>', 'Comma-separated exclude patterns', 'node_modules,dist,build,.git,coverage')
    .option('--include <patterns>', 'Comma-separated include patterns (overrides .gitignore)')
    .option('--verbose', 'Show detailed progress on each re-index')
    .action(async (options) => {
      try {
        await runCodeWatch(options);
      } catch (error) {
        console.error('\n❌ Command failed');
        process.exit(1);
      }
    });

  // Add generate subcommand
  command
    .command('generate <task>')
    .description('Write or modify code from a natural-language task description')
    .option('-p, --project <path>', 'Project root directory', process.cwd())
    .option('--mode <mode>', 'Execution mode: quick-fix | feature | refactor | debug', 'feature')
    .option('--dry-run', 'Preview planned changes without writing files')
    .option('--auto-approve', 'Skip interactive confirmation prompts')
    .option('--provider <name>', 'LLM provider override (anthropic | openai)', 'anthropic')
    .option('--router <path>', 'Path to model-router.json config file')
    .action(async (task, options) => {
      try {
        await runCodeGenerate(task, {
          project:     options.project,
          mode:        options.mode,
          dryRun:      options.dryRun,
          autoApprove: options.autoApprove,
          provider:    options.provider,
          router:      options.router,
        });
      } catch (error) {
        console.error('\n❌ Command failed');
        process.exit(1);
      }
    });

  return command;
};

export { runCodeGenerate, runCodeIndex, runCodeSearch, runCodeStats, runCodeWatch }

