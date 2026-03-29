# Refactoring Template

Multi-lane refactoring workflow: analyze → refactor → test.

## Features

- **Lane 1 - Analyze**: Identify refactoring opportunities (complexity, duplication, coupling)
- **Lane 2 - Refactor**: Apply clean code principles (extract method/class, simplify logic)
- **Lane 3 - Test**: Write comprehensive tests to verify correctness

## Quick Start

```bash
ai-kit template:install refactoring
ai-kit agent:dag agents/dag.json --interactive
```

## Workflow

```
┌─────────┐    ┌───────────┐    ┌──────┐
│ Analyze │ -> │ Refactor  │ -> │ Test │
│ (Haiku) │    │ (Sonnet)  │    │(Sonnet)
└─────────┘    └───────────┘    └──────┘
               ↑ Human Review
```

Human review gate after refactoring (approve changes before testing).

## Configuration

### Cost Optimization

- **Default**: analyze=Haiku, refactor=Sonnet, test=Sonnet (~$0.15-0.40)
- **Cheaper**: All Haiku (~$0.05-0.15, less accurate)
- **Best**: All Sonnet (~$0.20-0.50, highest quality)

### Skip Human Review

Edit `dag.json` → set `barriers[1].humanReview = false` for CI mode.

## Cost Estimate

- Small project: ~$0.15
- Medium project: ~$0.25
- Large project: ~$0.40

## Support

- Issues: https://github.com/binaryjack/ai-agencee/issues
