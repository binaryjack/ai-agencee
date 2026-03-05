# Enterprise Readiness Roadmap

Status as of latest commit. All **E1–E6** items are shipped and actively enforced at runtime.

---

## Completed (E1–E7)

| ID | Feature | File(s) | Status |
|----|---------|---------|--------|
| E1 | PII scrubbing | `agent-executor/src/lib/pii-scrubber.ts` | ✅ Enforced via `createPiiSafeProvider()` wrapper |
| E2 | Security policy + CI audit | `SECURITY.md`, `.github/workflows/security-audit.yml` | ✅ `pnpm audit --audit-level=high` on every push/PR |
| E3 | Multi-tenant isolation | `agent-executor/src/lib/tenant-registry.ts` | ✅ Path-isolated run roots per tenant |
| E4 | GDPR data CLI | `cli/src/commands/data.ts` | ✅ `data:export`, `data:delete`, `data:list-tenants` |
| E5 | OIDC JWT auth | `mcp/src/oidc-auth.ts` → **wired into** `mcp/src/sse-server.ts` | ✅ RS256/ES256 Bearer token enforced on `/events`; `/health` open |
| E6 | Rate limiting | `agent-executor/src/lib/rate-limiter.ts` → **wired into** `agent-executor/src/lib/dag-orchestrator.ts` | ✅ `assertWithinLimits()` + `acquireRun()` before each DAG execution |
| E7 | DAG visualizer | `cli/src/commands/visualize.ts` | ✅ Mermaid + DOT output from DAG JSON |

**Test coverage**: 324 tests passing across all packages.

---

## E5 Runtime Enforcement Detail

`sse-server.ts` — `startSseServer()`:
- `createOidcMiddleware()` is instantiated once per server start
- If `AIKIT_OIDC_ISSUER` env var is **unset** → no-op (backwards compatible)
- If **set** → JWKS fetched from `{issuer}/.well-known/jwks.json`, RS256/ES256 Bearer JWT validated before any `/events` SSE connection is established
- `/health` is always open (safe for load balancer probes)

## E6 Runtime Enforcement Detail

`dag-orchestrator.ts` — `DagOrchestrator.execute()`:
1. After RBAC principal resolution: `rbac.getRateLimits(principal)` reads optional `rateLimits` block from `rbac.json`
2. `rateLimiter.assertWithinLimits(principal, limits)` — throws `RateLimitExceededError` synchronously before execution starts
3. `rateLimiter.acquireRun(principal)` — increments concurrent-run counter; returns `releaseRateLimit` fn
4. On completion: `releaseRateLimit()` decrements counter; `rateLimiter.recordTokens()` persists input/output totals from `CostTracker.summary()`

---

## Backlog (E8–E14)

| ID | Feature | Priority | Notes |
|----|---------|----------|-------|
| E8 | Prompt injection detection | P1 | Heuristic + regex layer before LLM call |
| E9 | Python MCP bridge | P2 | `subprocess` bridge so Python tools register as MCP servers |
| E10 | AWS Bedrock provider | P2 | Implement `BedrockProvider` in `agent-executor` |
| E11 | Jira/Linear sync | P3 | Webhook → create issue on agent run failure |
| E12 | Slack/Teams notifications | P3 | Outbound webhook on DAG completion/failure |
| E13 | Auto-tune from run history | P2 | Parse `run-registry` stats → suggest model/budget adjustments |
| E14 | Visual DAG editor (React) | P3 | Browser UI for editing `.dag.json` files |

---

## SOC2 Path (Process Work — No Code Required)

- [ ] Vanta / Drata onboarding
- [ ] External penetration test
- [ ] Change management policy doc
- [ ] Business Continuity Plan (BCP) doc
- [ ] Annual access review process
