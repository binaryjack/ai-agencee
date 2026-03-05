export interface AgentType {
  id:           string
  name:         string
  role:         string
  description:  string
  capabilities: string[]
  exampleTask:  string
  color:        string   // tailwind bg class for accent
}

export const AGENT_TYPES: AgentType[] = [
  {
    id:           'business-analyst',
    name:         'Business Analyst',
    role:         'Discovery & requirements',
    description:  'Drives the 5-phase discovery process — interviews you with structured questions and synthesises a precise sprint plan before a single line of code is written.',
    capabilities: ['Requirements analysis', 'Feature breakdown', 'Acceptance criteria', 'Effort estimation', 'Stakeholder translation'],
    exampleTask:  '"Analyze these requirements and produce a wired sprint plan with agent assignments."',
    color:        'bg-brand-700',
  },
  {
    id:           'architecture',
    name:         'Architect',
    role:         'System & schema design',
    description:  'Designs the system architecture, data schemas, and API contracts — producing ADRs (Architecture Decision Records) at Opus-tier quality.',
    capabilities: ['System design', 'Data schema', 'API contracts', 'ADR generation', 'Dependency analysis'],
    exampleTask:  '"Design the database schema and API surface for a real-time subscription tracking system."',
    color:        'bg-brand-600',
  },
  {
    id:           'backend',
    name:         'Backend',
    role:         'API & infrastructure',
    description:  'Implements server-side code, API handlers, database migrations, and integration tests — guided by the architect\'s ADRs.',
    capabilities: ['API implementation', 'Database migrations', 'Auth integration', 'Unit test generation', 'Performance profiling'],
    exampleTask:  '"Implement the Stripe webhook ingestion endpoint with idempotency key handling."',
    color:        'bg-neutral-700',
  },
  {
    id:           'frontend',
    name:         'Frontend',
    role:         'UI & component design',
    description:  'Builds React components, wires state, implements design tokens — running in parallel with the Backend agent behind a soft-align barrier.',
    capabilities: ['React component authoring', 'State management', 'Design token usage', 'Accessibility', 'Responsive layout'],
    exampleTask:  '"Build the subscription status dashboard component with real-time WebSocket feed."',
    color:        'bg-neutral-700',
  },
  {
    id:           'testing',
    name:         'Testing',
    role:         'Unit & integration tests',
    description:  'Generates comprehensive unit and integration tests, asserting acceptance criteria from the sprint plan.',
    capabilities: ['Unit test generation', 'Integration test stubs', 'Coverage analysis', 'Mock generation', 'Test plan authoring'],
    exampleTask:  '"Generate Jest tests for the webhook handler covering 5 Stripe event types."',
    color:        'bg-neutral-700',
  },
  {
    id:           'e2e',
    name:         'E2E',
    role:         'End-to-end validation',
    description:  'Validates the complete user flow from browser to database — blocked on Backend + Frontend completion via a hard barrier.',
    capabilities: ['Playwright / Cypress scenarios', 'Critical path coverage', 'Regression suites', 'CI gate authoring'],
    exampleTask:  '"Write E2E tests for the subscription upgrade flow from free to paid tier."',
    color:        'bg-neutral-700',
  },
  {
    id:           'supervisor',
    name:         'Supervisor',
    role:         'Quality checkpoint',
    description:  'Validates lane output deterministically at every checkpoint — issues PASS, RETRY (with injected guidance), HANDOFF, or ESCALATE verdicts.',
    capabilities: ['Deterministic checks', 'LLM review checks', 'Retry injection', 'Human escalation', 'Budget gating'],
    exampleTask:  '"Review this backend implementation against the acceptance criteria and flag any gaps."',
    color:        'bg-warning-700',
  },
]

export interface WorkflowPhase {
  phase:       number
  name:        string
  description: string
  input:       string
  output:      string
  agents:      string[]   // agent IDs
}

export const PLAN_WORKFLOW_PHASES: WorkflowPhase[] = [
  {
    phase:       0,
    name:        'DISCOVER',
    description: 'BA agent interviews you with ~12 structured questions across problem definition, primary users, stories, and stack constraints.',
    input:       'Your idea (free text)',
    output:      'discovery.json — complete DiscoveryResult',
    agents:      ['business-analyst'],
  },
  {
    phase:       1,
    name:        'SYNTHESIZE',
    description: 'BA reads the discovery result and produces a plan skeleton — Steps with rough Tasks, ownership, and acceptance criteria.',
    input:       'discovery.json',
    output:      'plan.json (phase: synthesize)',
    agents:      ['business-analyst'],
  },
  {
    phase:       2,
    name:        'DECOMPOSE',
    description: 'Each specialist agent expands their Steps into fully-detailed Tasks in parallel — description, acceptance criteria, effort, artefacts.',
    input:       'plan.json (synthesize)',
    output:      'plan.json (fully populated)',
    agents:      ['architecture', 'backend', 'frontend', 'testing', 'e2e'],
  },
  {
    phase:       3,
    name:        'WIRE',
    description: 'Dependencies between tasks are resolved — shared contracts agreed, API schemas locked, integration points mapped.',
    input:       'plan.json (decompose)',
    output:      'plan.json (wired)',
    agents:      ['architecture', 'backend', 'frontend'],
  },
  {
    phase:       4,
    name:        'EXECUTE',
    description: 'The wired plan is converted to a DAG and handed off to the orchestration engine for parallel execution.',
    input:       'plan.json (wired)',
    output:      'DAG run results + code artefacts',
    agents:      ['backend', 'frontend', 'testing', 'e2e', 'supervisor'],
  },
]
