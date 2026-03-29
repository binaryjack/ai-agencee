# Code Review Template

Automated code review for best practices, architecture, and maintainability.

## Features

- **Architecture Review**: SOLID principles, separation of concerns, modularity
- **Maintainability**: Code clarity, documentation, naming conventions
- **Performance**: O(n) complexity, unnecessary loops, memory leaks
- **Best Practices**: Language idioms, framework patterns
- **Error Handling**: Try-catch blocks, validation, edge cases
- **Testing**: Unit test coverage, test quality

## Quick Start

```bash
# Install template
ai-kit template:install code-review

# Run code review
ai-kit agent:dag agents/dag.json

# Run with dashboard
ai-kit agent:dag agents/dag.json --dashboard
```

## Configuration

### Cost Optimization

- **Default Model**: Sonnet (~$0.08-0.20 per run)
- **Budget Cap**: Add `--budget 0.25` to limit spending
- **Faster/Cheaper**: Edit `model-router.json`, change to `"haiku"` (~$0.03-0.08 per run)

### Custom Review Areas

Edit `review-agent.json` → `checks` array to enable/disable review categories.

### Severity Levels

- **Critical**: Major design flaws, security issues
- **Warning**: Code smells, potential bugs
- **Info**: Style suggestions, best practices

## Output

Findings include:
- Exact file path and line number
- Issue category (architecture, performance, etc.)
- Severity level
- Remediation suggestion

Example:
```
⚠️ Found maintainability issues

File: src/utils/helper.ts:23
Severity: WARNING
Issue: Function too complex (cyclomatic complexity: 15)
Fix: Break into smaller functions with single responsibilities

Code:
  function processOrder(order, user, config) {
    if (user.role === 'admin') {
      if (order.status === 'pending') {
        // ... 50 lines of nested logic ...
      }
    }
  }

Suggested refactor:
  function processOrder(order, user, config) {
    validateOrder(order);
    applyUserPermissions(order, user);
    executeOrderWorkflow(order, config);
  }
```

## Integration

### CI/CD

```yaml
# GitHub Actions
- name: Code Review
  run: ai-kit agent:dag agents/dag.json --mode=ci
```

### Pre-commit Hook

```bash
#!/bin/sh
ai-kit agent:dag agents/dag.json --mode=quick --yes
```

## Best Practices

1. **Run on PRs**: Add to CI pipeline for pull request reviews
2. **Focus on patterns**: Use findings to identify systemic issues
3. **Combine with linters**: Use alongside ESLint, Prettier, etc.
4. **Track over time**: Monitor code quality trends

## Cost Estimate

- Small project (< 100 files): ~$0.08
- Medium project (100-500 files): ~$0.15
- Large project (500+ files): ~$0.20

## Support

- Issues: https://github.com/binaryjack/ai-agencee/issues
- Docs: https://github.com/binaryjack/ai-agencee
