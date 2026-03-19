import { TenantRunRegistry } from '@ai-agencee/engine';
import { findProjectRoot } from './find-project-root.js';

export async function runDataListTenants(): Promise<void> {
  const projectRoot = await findProjectRoot(process.cwd());
  const registry = new TenantRunRegistry(projectRoot);

  try {
    const tenants = await registry.listTenants();

    if (tenants.length === 0) {
      console.log('No tenants found in .agencee/tenants/');
      return;
    }

    console.log(`Found ${tenants.length} tenant(s):\n`);

    for (const tenantId of tenants) {
      const tenantReg = new TenantRunRegistry(projectRoot, tenantId);
      const runs = await tenantReg.list();
      console.log(`  ${tenantId}  (${runs.length} run${runs.length !== 1 ? 's' : ''})`);
    }
  } catch (err) {
    console.error(`Error listing tenants: ${String(err)}`);
    process.exit(1);
  }
}
