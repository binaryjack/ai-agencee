# Full-Stack Development Template

Enterprise 5-lane parallel workflow for complete end-to-end development.

## Features

- **Lane 1 - Backend**: API endpoints, database, business logic (Sonnet)
- **Lane 2 - Frontend**: UI components, state, accessibility (Sonnet) [parallel to backend]
- **Lane 3 - Testing**: Unit tests for backend + frontend (Haiku)
- **Lane 4 - Integration**: E2E tests, API integration (Sonnet)
- **Lane 5 - Deploy**: CI/CD pipeline, infrastructure (Haiku)

## Quick Start

```bash
ai-kit template:install full-stack
ai-kit agent:dag agents/dag.json --interactive
```

## Workflow

```
┌─────────┐   ┌──────────┐
│ Backend │   │ Frontend │ (parallel)
│(Sonnet) │   │ (Sonnet) │
└────┬────┘   └────┬─────┘
     └────┬────────┘
        ↓ Human Review  
     ┌────────┐
     │Testing │
     │(Haiku) │
     └───┬────┘
         ↓
     ┌─────────────┐
     │ Integration │
     │  (Sonnet)   │
     └──────┬──────┘
         ↓ Human Review
     ┌────────┐
     │ Deploy │
     │(Haiku) │
     └────────┘
```

2 human review gates (after backend/frontend, after integration).

## Configuration

### Cost Optimization

- **Default**: Mixed models (~$0.30-0.80)
- **Cheaper**: All Haiku (~$0.10-0.25, lower quality)
- **Best**: All Sonnet (~$0.50-1.00, highest quality)

### Skip Human Review

Edit `dag.json` → set `barriers[].humanReview = false` for CI mode.

## Cost Estimate

- Small feature: ~$0.30
- Medium feature: ~$0.50
- Large feature: ~$0.80

## Support

- Issues: https://github.com/binaryjack/ai-agencee/issues
