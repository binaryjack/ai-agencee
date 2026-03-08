import { TenantRunRegistry } from '@ai-agencee/engine';
import * as path from 'path';
import type { DataExportOptions } from './data-export-options.types.js';
import { findProjectRoot } from './find-project-root.js';
import { formatBytes } from './format-bytes.js';

export async function runDataExport(options: DataExportOptions): Promise<void> {
  const projectRoot = await findProjectRoot(process.cwd());
  const registry = new TenantRunRegistry(projectRoot, options.tenant);
  const tenantId = options.tenant ?? registry.tenantId;
  const destDir = path.resolve(options.dest);

  console.log(`Exporting data for tenant "${tenantId}" → ${destDir} …`);

  try {
    const summary = await registry.exportTenant(tenantId, destDir);

    console.log(`\n✓ Export complete`);
    console.log(`  Tenant  : ${summary.tenantId}`);
    console.log(`  Runs    : ${summary.runCount}`);
    console.log(`  Bytes   : ${formatBytes(summary.totalBytes)}`);
    console.log(`  Location: ${summary.destDir}`);
    console.log(`  Time    : ${summary.exportedAt}`);
    console.log(`\nAudit receipt written to ${path.join(destDir, 'export-manifest.json')}`);
  } catch (err) {
    console.error(`Error during export: ${String(err)}`);
    process.exit(1);
  }
}
