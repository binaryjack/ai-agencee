---
name: vitest
version: 1.0.0
description: Vitest unit test conventions
---
## Vitest Rules

- Colocate test files with source files: `foo.ts` → `foo.test.ts` in the same directory
- Use `describe` blocks to group tests by unit (function, module, or behaviour); nest for sub-cases
- Name test cases with `it('should …')` or `it('returns …')` — state the expected behaviour
- Use `vi.fn()` for function doubles and `vi.spyOn()` for existing function monitoring
- Use `vi.mock('module-path', () => ({ ... }))` at the top of the file for module mocks
- Reset mocks with `vi.clearAllMocks()` in `afterEach` — avoid state bleed between tests
- Use `vi.useFakeTimers()` + `vi.advanceTimersByTime()` to control time-dependent code
- Use `vi.importMock()` / `vi.importActual()` for selective module mocking
- Use `expect.assertions(n)` when testing async error paths to ensure the assertion runs
- Snapshot tests only for stable serialisable output — use `toMatchInlineSnapshot()` for small values
- Keep test setup in `beforeEach`; keep teardown in `afterEach`; avoid `beforeAll` / `afterAll` unless the setup is truly shared and immutable
- Use `vi.stubEnv()` for environment variable overrides in tests — restore with `vi.unstubAllEnvs()`
- Use `@vitest/coverage-v8` or `@vitest/coverage-istanbul` — target ≥95% line coverage
- Always test the unhappy path: null inputs, empty arrays, network errors, and thrown exceptions
- Avoid testing implementation details — test observable outputs and side effects only
