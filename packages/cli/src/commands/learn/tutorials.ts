/**
 * Interactive Tutorial System (Phase 3.2)
 * 
 * Guided walkthroughs for mastering ai-starter-kit modes.
 */

export interface TutorialStep {
  id: string
  title: string
  explanation: string
  command?: string
  expectedOutput?: string
  validation?: (output: string) => boolean
  nextAction: 'auto' | 'manual'  // auto: proceed after validation, manual: wait for 'next'
}

export interface Tutorial {
  id: string
  name: string
  description: string
  durationMin: number
  emoji: string
  steps: TutorialStep[]
  prerequisites?: string[]
  completionMessage?: string
}

export interface TutorialProgress {
  tutorialId: string
  completedSteps: string[]
  lastStepIndex: number
  completedAt?: string
  startedAt: string
}

/**
 * Tutorial Definitions
 */

export const TUTORIALS: Tutorial[] = [
  {
    id: 'quick-start',
    name: 'Quick Start',
    description: 'Get started with ai-starter-kit in 3 minutes',
    durationMin: 3,
    emoji: '🚀',
    steps: [
      {
        id: 'init',
        title: 'Initialize Project',
        explanation: `Let's initialize ai-starter-kit in your project.\nThis creates .agencee/ directory with configuration.`,
        command: 'ai-kit init',
        nextAction: 'manual',
      },
      {
        id: 'demo',
        title: 'Run Zero-Config Demo',
        explanation: `Now let's run a demo with zero configuration.\nThis uses MockProvider (no API keys, no cost).`,
        command: 'ai-kit demo security-scan',
        nextAction: 'manual',
      },
      {
        id: 'complete',
        title: 'Quick Start Complete!',
        explanation: `✅ You've initialized the project and seen a demo run.\n\nNext steps:\n  • Try "ai-kit learn three-modes" to master ASK/PLAN/RUN\n  • Run "ai-kit setup" for API key configuration\n  • Explore templates with "ai-kit template:list"`,
        nextAction: 'auto',
      },
    ],
    completionMessage: '🎉 Quick Start tutorial complete! You\'re ready to explore the three modes.',
  },
  
  {
    id: 'three-modes',
    name: 'Three Modes (ASK/PLAN/RUN)',
    description: 'Master the three core modes of ai-starter-kit',
    durationMin: 5,
    emoji: '🎯',
    prerequisites: ['quick-start'],
    steps: [
      {
        id: 'ask-intro',
        title: 'ASK Mode — Zero-Cost Search',
        explanation: `ASK mode uses FTS5 (SQLite full-text search) for instant results.\n\n✨ Zero cost • Zero hallucinations • Instant results\n\nLet's search for TypeScript interfaces in your codebase.`,
        command: 'ai-kit ask "TypeScript interfaces"',
        nextAction: 'manual',
      },
      {
        id: 'ask-practice',
        title: 'Try ASK Yourself',
        explanation: `Now try your own ASK query!\n\nExamples:\n  • "Show me error handling code"\n  • "Find all API endpoints"\n  • "List database queries"\n\nRun any "ai-kit ask" command, then type 'next' to continue.`,
        nextAction: 'manual',
      },
      {
        id: 'plan-intro',
        title: 'PLAN Mode — Workflow Generation',
        explanation: `PLAN mode generates complete DAG workflows from requirements.\n\nIt uses a 5-phase discovery process:\n  discover → architect → decompose → wire → execute\n\nNote: PLAN mode requires an API key (skipping live demo for tutorial).`,
        nextAction: 'manual',
      },
      {
        id: 'run-intro',
        title: 'RUN Mode — Execute DAGs',
        explanation: `RUN mode executes multi-agent DAGs with supervision.\n\n🎯 Features:\n  • Parallel execution with dependency management\n  • Quality gates (supervisor approval)\n  • Live cost tracking\n  • Real-time dashboard\n\nLet's preview a DAG before running it.`,
        command: 'ai-kit agent:dag agents/dag.json --preview',
        nextAction: 'manual',
      },
      {
        id: 'complete',
        title: 'Three Modes Mastered!',
        explanation: `✅ You now understand the three core modes:\n\n  • ASK: Instant zero-cost search (FTS5)\n  • PLAN: Generate workflows from requirements\n  • RUN: Execute multi-agent DAGs with quality gates\n\nNext: Try "ai-kit learn parallel-agents" to understand DAG orchestration.`,
        nextAction: 'auto',
      },
    ],
    completionMessage: '🎯 Three Modes tutorial complete! You\'re ready for advanced features.',
  },

  {
    id: 'parallel-agents',
    name: 'Parallel Agents & DAG Topology',
    description: 'Understand multi-agent orchestration and dependencies',
    durationMin: 10,
    emoji: '🎭',
    prerequisites: ['three-modes'],
    steps: [
      {
        id: 'dag-structure',
        title: 'DAG Structure',
        explanation: `A DAG (Directed Acyclic Graph) defines agent execution flow.\n\n📋 Key concepts:\n  • Lanes: Individual agent tasks\n  • Dependencies: Execution order (dependsOn)\n  • Phases: Parallel execution groups\n  • Supervisors: Quality gates\n\nLet's look at a template DAG.`,
        command: 'ai-kit template:info code-review',
        nextAction: 'manual',
      },
      {
        id: 'preview-phases',
        title: 'Preview Execution Phases',
        explanation: `The --preview flag shows how lanes will execute in phases.\n\nLanes with no cross-dependencies run in parallel.\nLanes with dependencies run sequentially.`,
        command: 'ai-kit agent:dag examples/multi-agent.dag.json --preview',
        nextAction: 'manual',
      },
      {
        id: 'dependencies',
        title: 'Understanding Dependencies',
        explanation: `Dependencies determine execution order:\n\n  "dependsOn": ["lane-a", "lane-b"]\n\nThis lane waits for lane-a AND lane-b to complete.\n\n💡 Tip: Minimize dependencies for maximum parallelism.`,
        nextAction: 'manual',
      },
      {
        id: 'supervisors',
        title: 'Quality Gates (Supervisors)',
        explanation: `Supervisors act as quality gates.\n\nThey review agent output before proceeding:\n  ✅ Approve: Continue to next phase\n  ❌ Reject: Retry or abort\n  📝 Feedback: Request changes\n\nLook for 🔍 emoji in lane listings.`,
        nextAction: 'manual',
      },
      {
        id: 'complete',
        title: 'Parallel Agents Mastered!',
        explanation: `✅ You now understand:\n  • DAG structure (lanes, dependencies, phases)\n  • Parallel vs sequential execution\n  • Phase computation from dependencies\n  • Quality gates with supervisors\n\nNext: "ai-kit learn quality-gates" for checkpoint configuration.`,
        nextAction: 'auto',
      },
    ],
    completionMessage: '🎭 Parallel Agents tutorial complete! You understand orchestration.',
  },

  {
    id: 'quality-gates',
    name: 'Quality Gates & Checkpoints',
    description: 'Configure test-before-commit workflows',
    durationMin: 8,
    emoji: '✅',
    prerequisites: ['parallel-agents'],
    steps: [
      {
        id: 'checkpoint-types',
        title: 'Checkpoint Types',
        explanation: `Checkpoints are validation points in agent execution.\n\n📋 Types:\n  • code-syntax: Syntax validation\n  • code-compile: Compilation check\n  • code-test: Unit tests\n  • code-lint: Linting rules\n  • needs-human-review: Manual approval\n\nCheckpoints prevent bad code from propagating.`,
        nextAction: 'manual',
      },
      {
        id: 'supervisor-config',
        title: 'Supervisor Configuration',
        explanation: `Supervisors review checkpoint results.\n\nExample supervisor in DAG:\n  "supervisorFile": "agents/code-reviewer.agent.json"\n\nThe supervisor:\n  • Receives all checkpoint results\n  • Makes approve/reject decision\n  • Provides feedback for retries`,
        nextAction: 'manual',
      },
      {
        id: 'interactive-mode',
        title: 'Interactive Mode',
        explanation: `Use --interactive to pause at human-review checkpoints.\n\nThis allows you to:\n  • Review agent changes\n  • Approve or reject manually\n  • Provide custom feedback\n\nExample: ai-kit agent:dag dag.json --interactive`,
        nextAction: 'manual',
      },
      {
        id: 'rollback',
        title: 'Rollback on Failure',
        explanation: `Quality gates enable safe rollback.\n\nIf a checkpoint fails:\n  • Changes are not committed\n  • Previous state is preserved\n  • Agent can retry with feedback\n\n💡 Test-before-commit prevents broken code.`,
        nextAction: 'manual',
      },
      {
        id: 'complete',
        title: 'Quality Gates Mastered!',
        explanation: `✅ You now understand:\n  • Checkpoint types and configuration\n  • Supervisor review workflow\n  • Interactive approval gates\n  • Safe rollback mechanism\n\nNext: "ai-kit learn cost-optimization" for budget control.`,
        nextAction: 'auto',
      },
    ],
    completionMessage: '✅ Quality Gates tutorial complete! You can configure safe workflows.',
  },

  {
    id: 'cost-optimization',
    name: 'Cost Optimization & Budget Control',
    description: 'Control LLM costs with estimates and caps',
    durationMin: 7,
    emoji: '💰',
    prerequisites: ['quality-gates'],
    steps: [
      {
        id: 'preview-cost',
        title: 'Pre-Flight Cost Estimates',
        explanation: `Always preview before running expensive DAGs.\n\nThe --preview flag shows:\n  • Cost per lane\n  • Cost per phase\n  • Total estimated cost\n  • Energy consumption (Wh)\n\nPrevents surprise bills!`,
        command: 'ai-kit agent:dag examples/full-analysis.dag.json --preview',
        nextAction: 'manual',
      },
      {
        id: 'budget-cap',
        title: 'Budget Caps',
        explanation: `Set a budget cap to abort expensive runs.\n\nExample:\n  ai-kit agent:dag dag.json --budget 0.50\n\nExecution aborts if cost exceeds $0.50.\n\n💡 Use in CI/CD to prevent runaway costs.`,
        nextAction: 'manual',
      },
      {
        id: 'model-tiers',
        title: 'Model Tier Selection',
        explanation: `Choose the right model for the task:\n\n  • haiku: Fast, cheap ($0.00075/1k tokens) — syntax checks\n  • sonnet: Balanced ($0.009/1k tokens) — code review\n  • opus: Powerful ($0.045/1k tokens) — architecture design\n\nConfigure in lane providerOverride.`,
        nextAction: 'manual',
      },
      {
        id: 'mock-provider',
        title: 'Mock Provider for Testing',
        explanation: `Use mock provider for free testing.\n\nExample:\n  ai-kit agent:dag dag.json --provider mock\n\n✨ Zero cost • Deterministic • Fast\n\nPerfect for CI/CD and development.`,
        nextAction: 'manual',
      },
      {
        id: 'complete',
        title: 'Cost Optimization Mastered!',
        explanation: `✅ You now understand:\n  • Preview before execution\n  • Budget caps for safety\n  • Model tier selection\n  • Mock provider for testing\n\nNext: "ai-kit learn sustainability" for energy metrics.`,
        nextAction: 'auto',
      },
    ],
    completionMessage: '💰 Cost Optimization tutorial complete! You control your budget.',
  },

  {
    id: 'sustainability',
    name: 'Sustainability Metrics',
    description: 'Track energy consumption and carbon footprint',
    durationMin: 5,
    emoji: '♻️',
    prerequisites: ['cost-optimization'],
    steps: [
      {
        id: 'energy-tracking',
        title: 'Energy Consumption Tracking',
        explanation: `ai-starter-kit tracks energy usage (Wh) for every run.\n\nEnergy ≈ 1 Wh per 1000 tokens\n\nThis appears in:\n  • DAG preview\n  • Execution summary\n  • Sustainability dashboard`,
        nextAction: 'manual',
      },
      {
        id: 'carbon-footprint',
        title: 'Carbon Footprint Calculation',
        explanation: `Energy → Carbon calculation:\n\n  • US grid: ~0.4 kg CO₂/kWh\n  • EU grid: ~0.3 kg CO₂/kWh\n  • Wind/solar: ~0.05 kg CO₂/kWh\n\nai-starter-kit estimates based on data center location.`,
        nextAction: 'manual',
      },
      {
        id: 'sustainability-mode',
        title: 'Sustainability Mode',
        explanation: `Use --mode=eco for energy-efficient execution:\n\n  • Prefers haiku (lowest energy)\n  • Batches requests\n  • Caches aggressively\n  • Minimizes token usage\n\nExample: ai-kit agent:dag dag.json --mode=eco`,
        nextAction: 'manual',
      },
      {
        id: 'complete',
        title: 'Sustainability Mastered!',
        explanation: `✅ You now understand:\n  • Energy consumption tracking\n  • Carbon footprint estimation\n  • Eco mode for efficiency\n  • Transparent environmental impact\n\n🎉 You've completed all tutorials!\nYou're now ready to create custom workflows.`,
        nextAction: 'auto',
      },
    ],
    completionMessage: '♻️ Sustainability tutorial complete! You build responsibly.',
  },
]

/**
 * Get tutorial by ID
 */
export function getTutorial(id: string): Tutorial | undefined {
  return TUTORIALS.find((t) => t.id === id)
}

/**
 * Check if prerequisites are met
 */
export function checkPrerequisites(
  tutorialId: string,
  completedTutorials: string[]
): { met: boolean; missing: string[] } {
  const tutorial = getTutorial(tutorialId)
  if (!tutorial) {
    return { met: false, missing: [] }
  }

  const prerequisites = tutorial.prerequisites ?? []
  const missing = prerequisites.filter((p) => !completedTutorials.includes(p))

  return { met: missing.length === 0, missing }
}
