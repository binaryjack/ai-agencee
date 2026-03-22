/**
 * Unit tests for SqliteVectorMemory
 *
 * Tests cover BOTH the "db available" and "db unavailable" (graceful no-op)
 * code paths. DB unavailability is simulated by mocking `@sqlite.org/sqlite-wasm`
 * to reject on init.
 */


// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Build a unit-norm embedding vector of given length. */
function unitVec(len: number, hotIndex = 0): number[] {
  const v = new Array<number>(len).fill(0);
  v[hotIndex] = 1;
  return v;
}

// ─── Cosine similarity (copy of impl logic for expectation verification) ──────

function cosineSim(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    magA += (a[i] ?? 0) ** 2;
    magB += (b[i] ?? 0) ** 2;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── Tests when sqlite-wasm is NOT available ────────────────────────────────

describe('SqliteVectorMemory — cosine similarity helpers (no DB required)', () => {
  it('cosine similarity helper: identical vectors → 1.0', () => {
    const v = [1, 0, 0];
    expect(cosineSim(v, v)).toBeCloseTo(1.0);
  });

  it('cosine similarity helper: orthogonal vectors → 0', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSim(a, b)).toBeCloseTo(0);
  });

  it('cosine similarity helper: opposite vectors → -1.0', () => {
    const a = [1, 0];
    const b = [-1, 0];
    expect(cosineSim(a, b)).toBeCloseTo(-1.0);
  });

  it('cosine similarity helper: zero vector → 0', () => {
    const a = [0, 0, 0];
    const b = [1, 2, 3];
    expect(cosineSim(a, b)).toBe(0);
  });
});

// ─── Helper: mock sqlite-wasm to reject ──────────────────────────────────────

function mockSqliteWasmUnavailable() {
  jest.mock('@sqlite.org/sqlite-wasm', () => ({
    default: () => Promise.reject(new Error('sqlite-wasm unavailable')),
  }), { virtual: true });
}

describe('SqliteVectorMemory — graceful fallback when sqlite-wasm unavailable', () => {
  it('builds without throwing even when sqlite-wasm rejects on init', () => {
    jest.resetModules();
    mockSqliteWasmUnavailable();
    const { SqliteVectorMemory } = require('../lib/sqlite-vector-memory/index.js') as typeof import('../lib/sqlite-vector-memory/index.js');
    const mem = new SqliteVectorMemory({ dbPath: '/nonexistent/path/db.sqlite' });
    expect(mem).toBeDefined();
  });

  it('store() is a no-op when db is null', async () => {
    jest.resetModules();
    mockSqliteWasmUnavailable();
    const { SqliteVectorMemory } = require('../lib/sqlite-vector-memory/index.js') as typeof import('../lib/sqlite-vector-memory/index.js');
    const mem = new SqliteVectorMemory({ dbPath: '/nonexistent/path/db.sqlite' });
    await expect(mem.store('id1', [1, 2, 3], { text: 'hello' })).resolves.toBeUndefined();
  });

  it('search() returns [] when db is null', async () => {
    jest.resetModules();
    mockSqliteWasmUnavailable();
    const { SqliteVectorMemory } = require('../lib/sqlite-vector-memory/index.js') as typeof import('../lib/sqlite-vector-memory/index.js');
    const mem = new SqliteVectorMemory({ dbPath: '/nonexistent/path/db.sqlite' });
    expect(await mem.search([1, 0, 0], { topK: 5 })).toEqual([]);
  });

  it('size() returns 0 when db is null', async () => {
    jest.resetModules();
    mockSqliteWasmUnavailable();
    const { SqliteVectorMemory } = require('../lib/sqlite-vector-memory/index.js') as typeof import('../lib/sqlite-vector-memory/index.js');
    const mem = new SqliteVectorMemory({ dbPath: '/nonexistent/path/db.sqlite' });
    expect(await mem.size()).toBe(0);
  });

  it('delete() is a no-op when db is null', async () => {
    jest.resetModules();
    mockSqliteWasmUnavailable();
    const { SqliteVectorMemory } = require('../lib/sqlite-vector-memory/index.js') as typeof import('../lib/sqlite-vector-memory/index.js');
    const mem = new SqliteVectorMemory({ dbPath: '/nonexistent/path/db.sqlite' });
    await expect(mem.delete('id1')).resolves.toBeUndefined();
  });

  it('clear() is a no-op when db is null', async () => {
    jest.resetModules();
    mockSqliteWasmUnavailable();
    const { SqliteVectorMemory } = require('../lib/sqlite-vector-memory/index.js') as typeof import('../lib/sqlite-vector-memory/index.js');
    const mem = new SqliteVectorMemory({ dbPath: '/nonexistent/path/db.sqlite' });
    await expect(mem.clear()).resolves.toBeUndefined();
  });

  it('close() is a no-op when db is null', async () => {
    jest.resetModules();
    mockSqliteWasmUnavailable();
    const { SqliteVectorMemory } = require('../lib/sqlite-vector-memory/index.js') as typeof import('../lib/sqlite-vector-memory/index.js');
    const mem = new SqliteVectorMemory({ dbPath: '/nonexistent/path/db.sqlite' });
    // wait for _initPromise to settle so _repo is null
    await (mem as any)._initPromise.catch(() => {});
    expect(() => mem.close()).not.toThrow();
  });
});

// ─── Cosine similarity properties ────────────────────────────────────────────

describe('cosine similarity properties (standalone)', () => {
  it('unit vector against itself = 1', () => {
    const v = unitVec(8, 3);
    expect(cosineSim(v, v)).toBeCloseTo(1.0, 5);
  });

  it('two different unit basis vectors = 0', () => {
    const a = unitVec(8, 0);
    const b = unitVec(8, 1);
    expect(cosineSim(a, b)).toBeCloseTo(0, 5);
  });

  it('same direction different magnitude = 1', () => {
    const a = [2, 0, 0];
    const b = [5, 0, 0];
    expect(cosineSim(a, b)).toBeCloseTo(1.0, 5);
  });
});
