import { TenantRunRegistry } from '@ai-agencee/engine';
import type { DataDeleteOptions } from './data-delete-options.types.js';
import { findProjectRoot } from './find-project-root.js';
import { formatBytes } from './format-bytes.js';

export async function runDataDelete(options: DataDeleteOptions): Promise<void> {
  const projectRoot = await findProjectRoot(process.cwd());
  const registry = new TenantRunRegistry(projectRoot, options.tenant);
  const tenantId = options.tenant ?? registry.tenantId;

  if (!options.confirm) {
    console.error(
      `Error: This will permanently delete ALL data for tenant "${tenantId}".\n`
      + `Re-run with --confirm to proceed.\n`
      + `Tip: Run data:export first to create a backup.`,
    );
    process.exit(1);
  }

  console.log(`Deleting all data for tenant "${tenantId}" …`);

  try {
    const summary = await registry.deleteTenant(tenantId);

    console.log(`\n✓ Deletion complete (GDPR Art. 17 — Right to Erasure)`);
    console.log(`  Tenant       : ${summary.tenantId}`);
    console.log(`  Runs deleted : ${summary.runCount}`);
    console.log(`  Space freed  : ${formatBytes(summary.totalBytesFreed)}`);
    console.log(`  Deleted at   : ${summary.deletedAt}`);
    console.log(`\nRetain this output as your deletion receipt.`);
  } catch (err) {
    console.error(`Error during deletion: ${String(err)}`);
    process.exit(1);
  }
}
