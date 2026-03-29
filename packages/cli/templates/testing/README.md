# Testing Template

Multi-lane testing workflow: generate tests → run tests.

## Features

- **Lane 1 - Generate**: Create comprehensive unit tests with mocks and edge cases
- **Lane 2 - Run**: Execute tests and generate coverage reports

## Quick Start

```bash
ai-kit template:install testing
ai-kit agent:dag agents/dag.json
```

## Workflow

```
┌──────────┐    ┌─────┐
│ Generate │ -> │ Run │
│ (Haiku)  │    │(Haiku)
└──────────┘    └─────┘
```

## Configuration

### Cost Optimization

- **Default**: All Haiku (~$0.08-0.20, tests are straightforward)
- **Higher Quality**: Use Sonnet for generate (~$0.15-0.30)

## Cost Estimate

- Small project: ~$0.08
- Medium project: ~$0.12
- Large project: ~$0.20

## Support

- Issues: https://github.com/binaryjack/ai-agencee/issues
