import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_REGISTRY } from './default-registry.js';
import { fetchText } from './fetch-text.js';

export const runAgentInstall = async (
  agentName: string,
  options: { project?: string; registry?: string },
): Promise<void> => {
  const projectRoot = options.project ? path.resolve(options.project) : process.cwd();
  const registry = (options.registry ?? DEFAULT_REGISTRY).replace(/\/$/, '');
  const agentsDir = path.join(projectRoot, 'agents');

  // Validate agent name (no path traversal)
  if (!/^[\w-]+$/.test(agentName)) {
    console.error(`❌ Invalid agent name: "${agentName}". Use only letters, digits, and hyphens.`);
    process.exit(1);
  }

  const url = `${registry}/agents/${agentName}/agent.json`;
  console.log(`\n📦 Fetching agent "${agentName}" from registry…`);
  console.log(`   ${url}\n`);

  const raw = await fetchText(url);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    console.error('❌ Registry returned invalid JSON.');
    process.exit(1);
  }

  fs.mkdirSync(agentsDir, { recursive: true });
  const dest = path.join(agentsDir, `${agentName}.agent.json`);
  fs.writeFileSync(dest, JSON.stringify(parsed, null, 2) + '\n', 'utf-8');
  console.log(`✅ Agent installed: ${path.relative(projectRoot, dest)}\n`);
};
