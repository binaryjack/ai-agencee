---
name: playwright
version: 1.0.0
description: Playwright e2e test patterns
---
## Playwright Rules

- Use the Page Object Model (POM) to encapsulate selectors and actions — never scatter `page.locator` calls across test files
- Select elements by role (`getByRole`), label (`getByLabel`), or test id (`getByTestId`) — avoid CSS or XPath selectors
- Add `data-testid` attributes to interactive elements in the application source — keep them stable across refactors
- Use `expect(locator).toBeVisible()` and other built-in matchers — avoid manual `waitForSelector` loops
- Rely on auto-waiting — never add arbitrary `page.waitForTimeout()` delays
- Isolate tests with `test.use({ storageState: … })` for authentication state — use `globalSetup` to create auth once
- Run tests in parallel with `fullyParallel: true` in `playwright.config.ts` — keep each test independent
- Use `test.beforeEach` / `test.afterEach` for per-test setup and cleanup; `test.beforeAll` only for shared fixtures
- Use `page.route()` to intercept and mock API calls in tests that exercise UI behaviour only
- Use Playwright fixtures (`test.extend`) for complex, reusable setup instead of helper functions
- Assert network responses with `request.get(url)` + `await expect(response).toBeOK()` in API tests
- Capture screenshots on failure with `screenshot: 'only-on-failure'` in `playwright.config.ts`
- Use `trace: 'retain-on-failure'` to record traces for debugging CI failures
- Keep test files in an `e2e/` or `tests/e2e/` directory — separate from unit tests
- Run smoke tests against `@smoke` tag in CI; run full suite on PR merge to main
