import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Mock checkIndexStatus from index-cmd before importing stats-cmd
jest.mock('../src/commands/code/index-cmd.js', () => ({
  checkIndexStatus: jest.fn(),
}));

import { checkIndexStatus } from '../src/commands/code/index-cmd.js';
import { runCodeStats } from '../src/commands/code/stats-cmd.js';

const mockCheckIndexStatus = checkIndexStatus as jest.MockedFunction<typeof checkIndexStatus>;

describe('runCodeStats', () => {
  let tmpDir: string;
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-kit-stats-test-'));
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reports "no index" when project has not been indexed', async () => {
    mockCheckIndexStatus.mockResolvedValue({
      indexed: false,
      totalFiles: 0,
      totalSymbols: 0,
      totalDependencies: 0,
    });

    await runCodeStats({ project: tmpDir });

    const output = consoleSpy.mock.calls.map((c: any[]) => c[0]).join('\n');
    expect(output).toContain('No index found');
  });

  it('prints human-readable stats when index exists', async () => {
    mockCheckIndexStatus.mockResolvedValue({
      indexed: true,
      totalFiles: 42,
      totalSymbols: 300,
      totalDependencies: 88,
    });

    await runCodeStats({ project: tmpDir });

    const output = consoleSpy.mock.calls.map((c: any[]) => c[0]).join('\n');
    expect(output).toContain('42');
    expect(output).toContain('300');
    expect(output).toContain('88');
  });

  it('outputs JSON when --json flag is set and index exists', async () => {
    mockCheckIndexStatus.mockResolvedValue({
      indexed: true,
      totalFiles: 10,
      totalSymbols: 50,
      totalDependencies: 5,
    });

    await runCodeStats({ project: tmpDir, json: true });

    const rawJson = consoleSpy.mock.calls[0][0];
    const parsed = JSON.parse(rawJson);
    expect(parsed.indexed).toBe(true);
    expect(parsed.totalFiles).toBe(10);
    expect(parsed.totalSymbols).toBe(50);
    expect(parsed.totalDependencies).toBe(5);
  });

  it('outputs JSON when --json flag is set and no index exists', async () => {
    mockCheckIndexStatus.mockResolvedValue({
      indexed: false,
      totalFiles: 0,
      totalSymbols: 0,
      totalDependencies: 0,
    });

    await runCodeStats({ project: tmpDir, json: true });

    const rawJson = consoleSpy.mock.calls[0][0];
    const parsed = JSON.parse(rawJson);
    expect(parsed.indexed).toBe(false);
  });
});
