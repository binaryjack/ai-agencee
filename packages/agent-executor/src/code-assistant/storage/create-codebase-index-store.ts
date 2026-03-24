/**
 * Factory for CodebaseIndexStore.
 *
 * Selects the appropriate SQLite backend based on the runtime environment:
 * - Electron (VS Code extension host): @sqlite.org/sqlite-wasm (WASM, ABI-safe)
 * - Node.js CLI / MCP server: node:sqlite built-in (persistent files on Windows)
 *
 * The @sqlite.org/sqlite-wasm build uses a POSIX VFS that cannot create
 * persistent files on Windows — it silently operates in-memory. Any process
 * not running inside Electron should use the native backend instead.
 */

import type { CodebaseIndexStoreInstance } from './codebase-index-store';
import { CodebaseIndexStore } from './codebase-index-store';
import { createNativeCodebaseIndexStore } from './codebase-index-store-native';
import type { CodebaseIndexStoreOptions } from './codebase-index-store.types';

/** True when running inside VS Code's Electron-based extension host. */
const isElectron = typeof process !== 'undefined' && !!process.versions?.electron;

export const createCodebaseIndexStore = async function(options: CodebaseIndexStoreOptions): Promise<CodebaseIndexStoreInstance> {
  if (!isElectron) {
    // Node.js CLI or MCP server — use built-in node:sqlite for real file persistence
    return createNativeCodebaseIndexStore(options);
  }
  // VS Code extension host — use WASM backend (no native binary ABI issues)
  const store = new (CodebaseIndexStore as any)(options);
  await store.initialize();
  return store;
};
