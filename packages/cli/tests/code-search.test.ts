import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Mock the store factory before importing the search command
jest.mock('@ai-agencee/engine/code-assistant/storage', () => ({
  createCodebaseIndexStore: jest.fn(),
}));

import { createCodebaseIndexStore } from '@ai-agencee/engine/code-assistant/storage';
import { runCodeSearch } from '../src/commands/code/search-cmd.js';

const mockCreateStore = createCodebaseIndexStore as jest.MockedFunction<typeof createCodebaseIndexStore>;

function makeStoreMock(rows: object[]) {
  return {
    query: jest.fn().mockResolvedValue(rows),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

describe('runCodeSearch', () => {
  let tmpDir: string;
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-kit-search-test-'));
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((): never => {
      throw new Error('process.exit');
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    exitSpy.mockRestore();
    jest.clearAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits with error when term is empty', async () => {
    await expect(runCodeSearch('', { project: tmpDir })).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('prints results in human-readable format', async () => {
    const rows = [
      {
        name: 'Calculator.add',
        kind: 'method',
        line_start: 10,
        line_end: 12,
        signature: 'add(a: number, b: number): number',
        file_path: 'src/calculator.ts',
      },
    ];
    mockCreateStore.mockResolvedValue(makeStoreMock(rows) as any);

    await runCodeSearch('add', { project: tmpDir });

    const output = consoleSpy.mock.calls.map((c: any[]) => c[0]).join('\n');
    expect(output).toContain('Calculator.add');
    expect(output).toContain('method');
    expect(output).toContain('src/calculator.ts');
  });

  it('exits 1 and reports no results when FTS returns empty', async () => {
    mockCreateStore.mockResolvedValue(makeStoreMock([]) as any);

    await expect(runCodeSearch('noresults', { project: tmpDir })).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('outputs valid JSON with --json flag', async () => {
    const rows = [
      {
        name: 'MyClass.method',
        kind: 'method',
        line_start: 5,
        line_end: 8,
        signature: null,
        file_path: 'src/my-class.ts',
      },
    ];
    mockCreateStore.mockResolvedValue(makeStoreMock(rows) as any);

    await runCodeSearch('method', { project: tmpDir, json: true });

    const rawJson = consoleSpy.mock.calls[0][0];
    const parsed = JSON.parse(rawJson);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].name).toBe('MyClass.method');
  });

  it('outputs empty JSON array with --json flag when no results', async () => {
    mockCreateStore.mockResolvedValue(makeStoreMock([]) as any);

    // no-results path calls process.exit(1) even with --json
    await expect(runCodeSearch('nothing', { project: tmpDir, json: true })).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
    const rawJson = consoleSpy.mock.calls[0][0];
    expect(JSON.parse(rawJson)).toEqual([]);
  });

  it('passes kind filter to query when --kind option is set', async () => {
    const storeMock = makeStoreMock([
      { name: 'myFunc', kind: 'function', line_start: 1, line_end: 3, signature: null, file_path: 'a.ts' },
    ]);
    mockCreateStore.mockResolvedValue(storeMock as any);

    await runCodeSearch('myFunc', { project: tmpDir, kind: 'function' });

    const callArgs = storeMock.query.mock.calls[0];
    const params = callArgs[1] as string[];
    expect(params).toContain('function');
  });

  it('always calls store.close() even when no results', async () => {
    const storeMock = makeStoreMock([]);
    mockCreateStore.mockResolvedValue(storeMock as any);

    await expect(runCodeSearch('x', { project: tmpDir })).rejects.toThrow('process.exit');
    expect(storeMock.close).toHaveBeenCalled();
  });
});
