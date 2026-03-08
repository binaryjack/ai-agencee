import { TenantRunRegistry } from '@ai-agencee/engine';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { generateRunId } from './generate-run-id.js';
import { jsonResponse } from './json-response.js';
import { readBody } from './read-body.js';
import { resolveTenantId } from './resolve-tenant-id.js';
import type { StartRunBody } from './start-run-body.types.js';
import type { TenantApiOptions } from './tenant-api-options.types.js';

export async function handleTenantApi(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  opts: TenantApiOptions = {},
): Promise<boolean> {
  const method = req.method?.toUpperCase() ?? 'GET';
  const url = new URL(req.url ?? '/', `http://localhost`);
  const pathname = url.pathname;

  if (!pathname.startsWith('/api/')) return false;

  const projectRoot = opts.projectRoot ?? process.cwd();
  const tenantId = resolveTenantId(req);
  const registry = new TenantRunRegistry(projectRoot, tenantId);

  // ── POST /api/runs/start ──────────────────────────────────────────────────
  if (method === 'POST' && pathname === '/api/runs/start') {
    let body: StartRunBody;
    try {
      body = await readBody(req) as StartRunBody;
    } catch {
      jsonResponse(res, 400, { error: 'Invalid JSON body' });
      return true;
    }

    if (!body.dagFile || typeof body.dagFile !== 'string') {
      jsonResponse(res, 400, { error: 'Missing required field: dagFile' });
      return true;
    }

    // Prevent path traversal in dagFile
    const resolvedDag = path.resolve(projectRoot, body.dagFile);
    if (!resolvedDag.startsWith(projectRoot)) {
      jsonResponse(res, 400, { error: 'dagFile path must be within the project root' });
      return true;
    }

    const runId = body.runId ?? generateRunId();
    try {
      const meta = await registry.create(runId, body.dagFile);
      jsonResponse(res, 201, { ok: true, run: meta, sseUrl: `/events?runId=${runId}` });
    } catch (err) {
      jsonResponse(res, 500, { error: String(err) });
    }
    return true;
  }

  // ── GET /api/runs ─────────────────────────────────────────────────────────
  if (method === 'GET' && pathname === '/api/runs') {
    try {
      const runs = await registry.list();
      jsonResponse(res, 200, { tenantId, runs });
    } catch (err) {
      jsonResponse(res, 500, { error: String(err) });
    }
    return true;
  }

  // ── GET /api/runs/:runId ──────────────────────────────────────────────────
  const runMatch = pathname.match(/^\/api\/runs\/([^/]+)$/);
  if (method === 'GET' && runMatch) {
    const runId = decodeURIComponent(runMatch[1]!);
    try {
      const meta = await registry.get(runId);
      jsonResponse(res, 200, meta);
    } catch {
      jsonResponse(res, 404, { error: `Run "${runId}" not found for tenant "${tenantId}"` });
    }
    return true;
  }

  // ── DELETE /api/runs/:runId ───────────────────────────────────────────────
  if (method === 'DELETE' && runMatch) {
    const runId = decodeURIComponent(runMatch[1]!);
    try {
      await registry.complete(runId, 'cancelled');
      jsonResponse(res, 200, { ok: true, runId, status: 'cancelled' });
    } catch (err) {
      jsonResponse(res, 500, { error: String(err) });
    }
    return true;
  }

  // ── GET /api/tenant/export  (GDPR Art. 20) ───────────────────────────────
  if (method === 'GET' && pathname === '/api/tenant/export') {
    const destDir = path.join(os.tmpdir(), `aikit-export-${tenantId}-${Date.now()}`);
    try {
      const summary = await registry.exportTenant(tenantId, destDir);
      jsonResponse(res, 200, { ok: true, ...summary });
    } catch (err) {
      jsonResponse(res, 500, { error: String(err) });
    }
    return true;
  }

  // ── DELETE /api/tenant  (GDPR Art. 17 — erasure) ─────────────────────────
  if (method === 'DELETE' && pathname === '/api/tenant') {
    const confirm = req.headers['x-confirm-erasure'];
    if (confirm !== 'DELETE_ALL_MY_DATA') {
      jsonResponse(res, 400, {
        error: 'Set header X-Confirm-Erasure: DELETE_ALL_MY_DATA to confirm tenant data erasure',
      });
      return true;
    }
    try {
      const summary = await registry.deleteTenant(tenantId);
      jsonResponse(res, 200, { ok: true, ...summary });
    } catch (err) {
      jsonResponse(res, 500, { error: String(err) });
    }
    return true;
  }

  // ── 404 for unmatched /api/* paths ────────────────────────────────────────
  jsonResponse(res, 404, { error: `No API endpoint: ${method} ${pathname}` });
  return true;
}
