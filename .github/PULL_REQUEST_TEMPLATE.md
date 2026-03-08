## Summary

<!-- One paragraph: what does this PR do and why? -->

Fixes #<!-- issue number, or "N/A" -->

---

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that causes existing behaviour to change)
- [ ] Refactor (no functional change, code quality improvement)
- [ ] Documentation update
- [ ] CI / tooling / dependency update

---

## Affected packages

- [ ] `@ai-agencee/engine` (agent-executor)
- [ ] `@ai-agencee/cli`
- [ ] `@ai-agencee/mcp`
- [ ] `@ai-agencee/core`
- [ ] `dag-editor`
- [ ] `showcase-web`
- [ ] `ui`
- [ ] Root / CI / tooling

---

## How to test this

<!-- Exact commands a reviewer can run to verify the change. -->

```bash
# example
pnpm build
pnpm test
node packages/cli/dist/bin/ai-kit.js agent:dag ./agents/demo.dag.json --provider mock
```

---

## Checklist

- [ ] `pnpm build` passes with no TypeScript errors
- [ ] `pnpm test` passes (424+ tests, no regressions)
- [ ] `pnpm lint` (tsc --noEmit) passes for all affected packages
- [ ] New code follows the [copilot-instructions](template/.github/copilot-instructions.md): kebab-case, no `class`, no `any`, prototype pattern
- [ ] Tests added or updated for changed behaviour (target: 95% coverage)
- [ ] No API keys, secrets, or PII introduced in any file
- [ ] Docs updated if the public API / CLI interface changed
- [ ] `CHANGELOG.md` entry added (if this is a user-visible change)

---

## Screenshots / output (if applicable)

<!-- Terminal output, UI screenshot, or diff of generated files. -->

---

## Notes for reviewers

<!-- Anything the reviewer should know: trade-offs made, known limitations, follow-up issues. -->
