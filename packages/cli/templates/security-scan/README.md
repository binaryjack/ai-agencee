# Security Scan Template

Comprehensive security vulnerability detection workflow.

## Features

- **SQL Injection Detection**: Finds string concatenation in SQL queries
- **XSS Prevention**: Detects unescaped user input in HTML
- **Secret Scanning**: Finds hardcoded API keys, passwords, tokens
- **Dependency Audit**: Checks for vulnerable dependencies
- **Auth/AuthZ Review**: Finds authentication and authorization issues
- **Cryptography Check**: Detects weak algorithms and insecure crypto usage
- **OWASP Top 10**: Covers most common security vulnerabilities

## Quick Start

```bash
# Install template
ai-kit template:install security-scan

# Run security scan
ai-kit agent:dag agents/dag.json

# Run with dashboard
ai-kit agent:dag agents/dag.json --dashboard

# Run in CI mode
ai-kit agent:dag agents/dag.json --mode=ci
```

## Configuration

### Cost Optimization

- **Default Model**: Sonnet (~$0.05-0.15 per run)
- **Budget Cap**: Add `--budget 0.20` to limit spending
- **Faster/Cheaper**: Edit `model-router.json`, change to `"haiku"` (~$0.01-0.03 per run)

### Custom Checks

Edit `security-agent.json` → `checks` array to add/remove vulnerability types.

### Severity Levels

- **Critical**: Exploitable vulnerabilities (SQL injection, XSS, secrets)
- **Warning**: Low-risk issues (deprecated dependencies, weak patterns)

## Output

Findings include:
- Exact file path and line number
- Vulnerability description
- Severity level
- Remediation suggestion

Example:
```
❌ Found potential SQL injection vulnerabilities

File: src/auth/database.ts:45
Severity: CRITICAL
Issue: String concatenation in SQL query
Fix: Use parameterized queries or ORM

Code:
  const query = `SELECT * FROM users WHERE id = ${userId}`;
                                                  ^^^^^^^^^
Should be:
  const query = 'SELECT * FROM users WHERE id = ?';
  db.query(query, [userId]);
```

## Integration

### CI/CD

```yaml
# GitHub Actions
- name: Security Scan
  run: ai-kit agent:dag agents/dag.json --mode=ci
```

### Pre-commit Hook

```bash
#!/bin/sh
ai-kit agent:dag agents/dag.json --mode=quick --yes
```

## False Positives

The supervisor uses FTS5 search to verify findings and eliminate false positives. If you encounter any:

1. Check `security-supervisor.json` → `approvalCriteria`
2. Adjust retry strategy if too strict
3. Report persistent issues on GitHub

## Best Practices

1. **Run regularly**: Add to CI pipeline or pre-commit hook
2. **Review findings**: Don't auto-fix critical issues without review
3. **Track over time**: Compare scans to see improvement
4. **Combine with tools**: Use alongside Snyk, SonarQube, etc.

## Cost Estimate

- Small project (< 100 files): ~$0.05
- Medium project (100-500 files): ~$0.10
- Large project (500+ files): ~$0.15

Enable pre-flight estimates: `--yes` flag to skip confirmation (default in Phase 1.3).

## Support

- Issues: https://github.com/binaryjack/ai-agencee/issues
- Docs: https://github.com/binaryjack/ai-agencee
- Discussions: https://github.com/binaryjack/ai-agencee/discussions
