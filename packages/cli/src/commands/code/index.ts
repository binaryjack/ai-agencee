/**
 * Code commands - Parent command for code assistance features
 */

import { Command } from 'commander';
import { runCodeIndex } from './index-cmd.js';

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
    .option('--verbose', 'Show detailed progress')
    .action(async (options) => {
      try {
        await runCodeIndex(options);
      } catch (error) {
        console.error('\n❌ Command failed');
        process.exit(1);
      }
    });
  
  return command;
};

export { runCodeIndex };
