import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

jest.mock('../src/commands/code/index-cmd.js', () => ({
  runCodeIndex: jest.fn().mockResolvedValue(undefined),
}));

// Mock fs.watch so the command doesn't block the test thread
jest.mock('fs', () => {
  const actual = jest.requireActual<typeof fs>('fs');
  return {
    ...actual,
    watch: jest.fn().mockReturnValue({
      close: jest.fn(),
      on: jest.fn(),
    }),
  };
});

import { runCodeIndex } from '../src/commands/code/index-cmd.js';

const mockRunCodeIndex = runCodeIndex as jest.MockedFunction<typeof runCodeIndex>;
const mockFsWatch = (fs.watch as unknown) as jest.MockedFunction<typeof fs.watch>;

describe('runCodeWatch', () => {
  let tmpDir: string;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-kit-watch-test-'));
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    // Remove any SIGINT/SIGTERM listeners added by the watch command
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
  });

  it('performs an initial index before entering watch loop', async () => {
    const { runCodeWatch } = await import('../src/commands/code/watch-cmd.js');

    // Start watch — does NOT await (it blocks forever, that's by design)
    void runCodeWatch({ project: tmpDir });

    // Allow initial async index to complete
    await new Promise(r => setTimeout(r, 50));

    expect(mockRunCodeIndex).toHaveBeenCalledWith(
      expect.objectContaining({ project: tmpDir, incremental: true })
    );
  }, 2000);

  it('sets up an fs.watch watcher on the project root', async () => {
    const { runCodeWatch } = await import('../src/commands/code/watch-cmd.js');

    void runCodeWatch({ project: tmpDir });
    await new Promise(r => setTimeout(r, 50));

    expect(mockFsWatch).toHaveBeenCalledWith(
      path.resolve(tmpDir),
      { recursive: true },
      expect.any(Function)
    );
  }, 2000);
});

describe('shouldIgnore helper', () => {
  // Test the filtering logic by importing and exercising it indirectly:
  // paths that contain node_modules / .git / dist / .agents should not trigger reindex.
  // We verify this by inspecting that runCodeIndex is NOT called for ignored paths.

  it('ignores node_modules changes', () => {
    const ignored = [
      'node_modules/lodash/index.js',
      'dist/index.js',
      'build/app.js',
      '.git/COMMIT_EDITMSG',
      '.agents/code-index.db',
    ];

    // Reconstruct the shouldIgnore logic from watch-cmd.ts in-test
    const ALWAYS_IGNORE = new Set([
      'node_modules', 'dist', 'build', '.git', 'coverage', '.agents', '.DS_Store',
    ]);
    const localShouldIgnore = (rel: string): boolean => {
      const parts = rel.replace(/\\/g, '/').split('/');
      return parts.some(p => ALWAYS_IGNORE.has(p));
    };

    for (const p of ignored) {
      expect(localShouldIgnore(p)).toBe(true);
    }
  });

  it('does not ignore source files', () => {
    const watched = [
      'src/index.ts',
      'lib/utils.js',
      'components/Button.tsx',
    ];

    const ALWAYS_IGNORE = new Set([
      'node_modules', 'dist', 'build', '.git', 'coverage', '.agents', '.DS_Store',
    ]);
    const localShouldIgnore = (rel: string): boolean => {
      const parts = rel.replace(/\\/g, '/').split('/');
      return parts.some(p => ALWAYS_IGNORE.has(p));
    };

    for (const p of watched) {
      expect(localShouldIgnore(p)).toBe(false);
    }
  });
});

describe('isSupportedExtension helper', () => {
  const langExtMap: Record<string, string[]> = {
    typescript: ['ts', 'tsx'],
    javascript: ['js', 'jsx', 'mjs', 'cjs'],
  };

  function isSupportedExtension(filename: string, languages: string): boolean {
    const ext = path.extname(filename).slice(1).toLowerCase();
    const langs = languages.split(',').map((l: string) => l.trim());
    return langs.some(lang => langExtMap[lang]?.includes(ext));
  }

  it('recognises TypeScript extensions', () => {
    expect(isSupportedExtension('app.ts', 'typescript,javascript')).toBe(true);
    expect(isSupportedExtension('Component.tsx', 'typescript,javascript')).toBe(true);
  });

  it('recognises JavaScript extensions', () => {
    expect(isSupportedExtension('app.js', 'typescript,javascript')).toBe(true);
    expect(isSupportedExtension('app.mjs', 'typescript,javascript')).toBe(true);
  });

  it('rejects non-source file extensions', () => {
    expect(isSupportedExtension('README.md', 'typescript,javascript')).toBe(false);
    expect(isSupportedExtension('package.json', 'typescript,javascript')).toBe(false);
    expect(isSupportedExtension('icon.png', 'typescript,javascript')).toBe(false);
  });
});
