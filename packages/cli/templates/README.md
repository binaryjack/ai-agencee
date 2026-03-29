# DAG Templates

Production-ready workflow templates for common use cases.

## Available Templates

### 1. Security Scan (`security-scan`)
**Purpose:** Static analysis and security vulnerability detection  
**Use Case:** Find security issues, leaked secrets, SQL injection, XSS, etc.  
**Files:**
- `dag.json` - Single-lane security workflow
- `security-agent.json` - Security analysis agent
- `security-supervisor.json` - Quality gate for security findings
- `model-router.json` - Recommended: Sonnet (accuracy over speed)

**Estimated Cost:** ~$0.05-0.15 per run (depends on codebase size)

---

### 2. Code Review (`code-review`)
**Purpose:** Automated code quality review with best practices  
**Use Case:** Check code quality, style, architecture, maintainability  
**Files:**
- `dag.json` - Single-lane review workflow
- `review-agent.json` - Code review agent
- `review-supervisor.json` - Quality gate for review findings
- `model-router.json` - Recommended: Sonnet (balanced)

**Estimated Cost:** ~$0.08-0.20 per run

---

### 3. Refactoring (`refactoring`)
**Purpose:** Multi-lane quality-gated refactoring workflow  
**Use Case:** Refactor code while maintaining quality and tests  
**Files:**
- `dag.json` - 3-lane workflow (analyze → refactor → test)
- `analyze-agent.json` - Code analysis agent
- `analyze-supervisor.json` - Analysis quality gate
- `refactor-agent.json` - Refactoring agent
- `refactor-supervisor.json` - Refactoring quality gate
- `test-agent.json` - Test execution agent
- `test-supervisor.json` - Test quality gate
- `model-router.json` - Recommended: Mixed (Haiku for analysis, Sonnet for refactoring)

**Estimated Cost:** ~$0.15-0.40 per run

---

### 4. Documentation (`documentation`)
**Purpose:** Generate comprehensive code documentation  
**Use Case:** API docs, README, inline comments, architecture diagrams  
**Files:**
- `dag.json` - Single-lane documentation workflow
- `doc-agent.json` - Documentation generator agent
- `doc-supervisor.json` - Documentation quality gate
- `model-router.json` - Recommended: Sonnet (clarity + detail)

**Estimated Cost:** ~$0.10-0.25 per run

---

### 5. Testing (`testing`)
**Purpose:** Generate and execute unit/integration tests  
**Use Case:** Increase test coverage, generate test cases  
**Files:**
- `dag.json` - 2-lane workflow (generate → run)
- `test-generator-agent.json` - Test generation agent
- `test-runner-agent.json` - Test execution agent
- `test-supervisor.json` - Test quality gate
- `model-router.json` - Recommended: Haiku (tests are straightforward)

**Estimated Cost:** ~$0.08-0.20 per run

---

### 6. Full Stack (`full-stack`)
**Purpose:** Multi-lane parallel development workflow  
**Use Case:** Build features across backend, frontend, and testing  
**Files:**
- `dag.json` - 5-lane parallel workflow with barriers
- `backend-agent.json`, `backend-supervisor.json`
- `frontend-agent.json`, `frontend-supervisor.json`
- `testing-agent.json`, `testing-supervisor.json`
- `integration-agent.json`, `integration-supervisor.json`
- `deploy-agent.json`, `deploy-supervisor.json`
- `model-router.json` - Recommended: Mixed (optimize per lane)

**Estimated Cost:** ~$0.30-0.80 per run

---

## Installation

```bash
# List all available templates
ai-kit template:list

# Install a template to your project
ai-kit template:install security-scan

# Install with custom name
ai-kit template:install security-scan --name my-security-workflow

# Install to specific directory
ai-kit template:install refactoring --dir workflows/
```

## Customization

After installation, customize files in `agents/` directory:
- **DAG file:** Adjust lane dependencies, barriers, budget
- **Agent files:** Modify checks, prompts, capabilities
- **Supervisor files:** Adjust approval criteria, retry logic
- **Model router:** Change models per lane for cost/speed optimization

## Cost Optimization Tips

1. **Use Haiku for simple tasks** (testing, analysis)
2. **Use Sonnet for complex tasks** (refactoring, architecture)
3. **Set budget caps** (`--budget 1` for $1 limit)
4. **Enable pre-flight estimates** (default in Phase 1.3)
5. **Use `--mode=quick`** for faster/cheaper runs

## Quality Gates

All templates include supervisor-based quality gates:
- ✅ **PASS** - Changes meet quality standards
- ⚠️ **RETRY** - Issues found, agent will retry
- ❌ **FAIL** - Critical issues, execution stops
- 🔄 **ROLLBACK** - Revert changes and exit safely

## Need Help?

- Docs: https://github.com/binaryjack/ai-agencee
- Issues: https://github.com/binaryjack/ai-agencee/issues
- Discussions: https://github.com/binaryjack/ai-agencee/discussions
