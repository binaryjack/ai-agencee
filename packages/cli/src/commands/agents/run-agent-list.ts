import * as fs from 'fs';
import * as path from 'path';

export const runAgentList = async (options: {
  project?: string;
  json?: boolean;
}): Promise<void> => {
  const projectRoot = options.project ? path.resolve(options.project) : process.cwd();
  const agentsDir = path.join(projectRoot, 'agents');

  if (!fs.existsSync(agentsDir)) {
    if (options.json) {
      process.stdout.write(JSON.stringify([]) + '\n');
    } else {
      console.log('No agents/ directory found in project root.');
    }
    return;
  }

  const files = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.agent.json'));
  const agents = files.map((file) => {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(agentsDir, file), 'utf-8')) as Record<string, unknown>;
      return {
        name: (raw['name'] as string | undefined) ?? file.replace(/\.agent\.json$/, ''),
        description: (raw['description'] as string | undefined) ?? '',
        file,
        version: (raw['version'] as string | undefined) ?? '0.0.0',
      };
    } catch {
      return { name: file.replace(/\.agent\.json$/, ''), description: '', file, version: '0.0.0' };
    }
  });

  if (options.json) {
    process.stdout.write(JSON.stringify(agents) + '\n');
  } else {
    console.log(`\nAvailable agents (${agents.length}):\n`);
    for (const a of agents) {
      console.log(`  ${a.name.padEnd(30)} ${a.description}`);
    }
    console.log('');
  }
};
