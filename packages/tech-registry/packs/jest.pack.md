---
name: jest
version: 1.0.0
description: Jest test conventions
---
## Jest Rules

- Colocate tests in `__tests__/` adjacent to source, or as `*.test.ts` beside each file
- Use `describe` to group related tests; use nested `describe` for sub-behaviours
- Name test cases with `it('should …')` or `it('returns …')` for readable failure messages
- Use `jest.fn()` for function doubles; use `jest.spyOn(obj, 'method')` to monitor real implementations
- Place `jest.mock('module-path')` calls at the top of the file — Jest hoists them automatically
- Reset state with `jest.clearAllMocks()` in `afterEach` to prevent cross-test pollution
- Use `jest.useFakeTimers()` + `jest.advanceTimersByTime()` for timer-driven code
- Always call `jest.useRealTimers()` in `afterEach` when you've enabled fake timers
- Use `expect.assertions(n)` for async error paths to ensure the assertion block runs
- Prefer `toEqual` for deep object equality; use `toBe` for primitive identity checks only
- Use `jest.isolateModules()` or `jest.resetModules()` when a module has singleton state
- Mock `fs`, `path`, and network calls at the module level — never mock Node built-ins per-test
- Use `--coverage` with a `coverageThreshold` configured in `jest.config.js` — target ≥95%
- Keep test setup in `beforeEach`; use `afterEach` for cleanup; avoid `beforeAll`/`afterAll` unless setup is shared and immutable
- Test the failure path: malformed inputs, rejected promises, and thrown errors
