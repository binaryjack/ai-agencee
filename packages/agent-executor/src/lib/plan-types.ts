/**
 * Plan System — Type Definitions
 *
 * Hierarchy:
 *   Plan  → many Steps  → many Tasks  → one DAG each
 *
 * Execution model:
 *   Phase 0: DISCOVER    — BA ↔ User structured interview
 *   Phase 1: SYNTHESIZE  — BA produces plan skeleton, user approves
 *   Phase 2: DECOMPOSE   — each agent fills in their tasks (parallel)
 *   Phase 3: WIRE        — dependency graph + alignment gates resolved
 *   Phase 4: EXECUTE     — PlanOrchestrator runs wired plan via DagOrchestrator
 */

// ─── Actor System ─────────────────────────────────────────────────────────────

export type ActorId =
  | 'user'
  | 'ba'
  | 'architecture'
  | 'backend'
  | 'frontend'
  | 'testing'
  | 'e2e'
  | 'security'
  | 'supervisor'
  | 'system'
  | 'arbiter';

export interface Actor {
  id: ActorId;
  label: string;
  emoji: string;
  /** Role description shown during planning */
  role: string;
}

export const ACTORS: Record<ActorId, Actor> = {
  user:         { id: 'user',         emoji: '👤', label: 'PO',           role: 'Product Owner — final decision authority' },
  ba:           { id: 'ba',           emoji: '🧠', label: 'BA',           role: 'Scrum Master — orchestrates discovery, arbitrates conflicts' },
  architecture: { id: 'architecture', emoji: '🏗️', label: 'Architecture', role: 'System design, infra, API contracts' },
  backend:      { id: 'backend',      emoji: '⚙️', label: 'Backend',      role: 'Server-side implementation' },
  frontend:     { id: 'frontend',     emoji: '🎨', label: 'Frontend',     role: 'Client-side implementation' },
  testing:      { id: 'testing',      emoji: '🧪', label: 'Testing',      role: 'Unit + integration test strategy' },
  e2e:          { id: 'e2e',          emoji: '🔍', label: 'E2E',          role: 'End-to-end + acceptance testing' },
  security:     { id: 'security',     emoji: '🔒', label: 'Security',     role: 'Security review + audit' },
  supervisor:   { id: 'supervisor',   emoji: '🤖', label: 'Supervisor',   role: 'Lane quality gate' },
  system:       { id: 'system',       emoji: '⚡', label: 'System',       role: 'Orchestrator events' },
  arbiter:      { id: 'arbiter',      emoji: '⚖️', label: 'Arbiter',      role: 'Conflict resolution delegate' },
};

// ─── Discovery ────────────────────────────────────────────────────────────────

export type StoryType = 'feature' | 'fix' | 'migration' | 'poc' | 'spike' | 'refactor';
export type QualityGrade = 'mvp' | 'enterprise' | 'poc-stub';
export type ProjectLayer = 'frontend' | 'backend' | 'database' | 'infra' | 'fullstack';

export interface DiscoveryQuestion {
  id: string;
  block: string;
  text: string;
  hint?: string;
  answered: boolean;
  answer?: string;
}

export interface StoryDefinition {
  id: string;
  title: string;
  type: StoryType;
  description: string;
}

export interface DiscoveryResult {
  projectName: string;
  problem: string;
  primaryUser: string;
  successCriteria: string;
  stories: StoryDefinition[];
  layers: ProjectLayer[];
  isGreenfield: boolean;
  stackConstraints: string;
  externalIntegrations: string;
  qualityGrade: QualityGrade;
  timelinePressure: 'low' | 'medium' | 'high';
  teamSize: 'solo' | 'small' | 'large';
  budgetSensitivity: 'low' | 'medium' | 'high';
  openQuestions: string[];
  modelRecommendation: ModelRecommendation;
  completedAt: string;
}

export interface ModelRecommendation {
  discovery: string;
  planning: string;
  implementation: string;
  review: string;
  estimatedCostNote: string;
}

// ─── Backlog ──────────────────────────────────────────────────────────────────

export type BacklogItemStatus = 'open' | 'answered' | 'blocked' | 'skipped';

export interface BacklogItem {
  id: string;
  storyId?: string;
  owner: ActorId;
  question: string;
  /** What this item is waiting for before it can be answered */
  waitingFor?: string;
  status: BacklogItemStatus;
  answer?: string;
  /** IDs of items that this answer unblocks */
  unblocks?: string[];
  createdAt: string;
  resolvedAt?: string;
}

// ─── Alignment Gates ──────────────────────────────────────────────────────────

export type AlignmentGateType = 'user' | 'cross-agent' | 'auto' | 'optional';

export interface AlignmentGate {
  id: string;
  type: AlignmentGateType;
  description: string;
  /** Actors that must participate in this alignment */
  participants: ActorId[];
  /** The step after which this gate fires */
  afterStepId: string;
  /** The step(s) this gate blocks from starting */
  blocksStepIds: string[];
  resolved: boolean;
  resolution?: string;
  resolvedAt?: string;
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export interface TaskDefinition {
  id: string;
  title: string;
  description: string;
  /** DAG file that implements this task (relative to plan file) */
  dagFile?: string;
  /** Artifacts this task requires as input */
  inputs: string[];
  /** Artifacts this task produces */
  outputs: string[];
  /** IDs of tasks that must complete before this one starts */
  dependsOn: string[];
  /** Whether this task can run concurrently with sibling tasks */
  parallel: boolean;
  /** Hint added by agent during decompose phase */
  dependencyHint?: string;
  status: PlanItemStatus;
}

// ─── Step ─────────────────────────────────────────────────────────────────────

export type PlanItemStatus =
  | 'pending'
  | 'ready'
  | 'running'
  | 'complete'
  | 'failed'
  | 'gated'
  | 'skipped';

export interface StepDefinition {
  id: string;
  name: string;
  goal: string;
  storyId?: string;
  /** Primary agent for this step */
  agent: ActorId;
  /** Agent file paths (relative to plan file) */
  agentFile?: string;
  supervisorFile?: string;
  /** Step-level dependency on other steps */
  dependsOn: string[];
  /** Whether tasks within this step run in parallel by default */
  parallel: boolean;
  /** Artifacts produced by this step — available to downstream steps */
  outputs: string[];
  /** Alignment gate to fire after this step completes */
  alignmentGate?: AlignmentGate;
  tasks: TaskDefinition[];
  status: PlanItemStatus;
  /** Agent's notes added during decompose phase */
  decompositionNotes?: string;
  startedAt?: string;
  completedAt?: string;
}

// ─── Plan ─────────────────────────────────────────────────────────────────────

export type PlanPhase = 'discover' | 'synthesize' | 'decompose' | 'wire' | 'execute' | 'complete';

export interface PlanDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  phase: PlanPhase;
  qualityGrade: QualityGrade;
  discoveryRef?: string;
  steps: StepDefinition[];
  alignmentGates: AlignmentGate[];
  /** Accumulated artifact paths from all completed steps */
  artifacts: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── PlanOrchestrator Options ─────────────────────────────────────────────────

export interface PlanRunOptions {
  /** Starting phase — allows resuming mid-plan */
  startFrom?: PlanPhase;
  /** Skip the user confirmation at the synthesis approval gate */
  skipApproval?: boolean;
  /** Project root (where checks run against) */
  projectRoot?: string;
  /** Base directory for agent/supervisor JSON files */
  agentsBaseDir?: string;
  verbose?: boolean;  /**
   * Optional ModelRouter for LLM-backed phase reasoning.
   * When omitted, all phases fall back to heuristic mode.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modelRouter?: any;}

// ─── Plan Session State ───────────────────────────────────────────────────────

export interface PlanSessionState {
  planId: string;
  phase: PlanPhase;
  discovery?: DiscoveryResult;
  plan?: PlanDefinition;
  backlog: BacklogItem[];
  pendingDecisions: PendingDecision[];
  artifacts: Record<string, string>; // artifactId → file path
  startedAt: string;
  updatedAt: string;
}

export interface PendingDecision {
  id: string;
  question: string;
  context: string;
  options: DecisionOption[];
  raisedBy: ActorId;
  affectedActors: ActorId[];
  blockedItemIds: string[];
  raisedAt: string;
}

export interface DecisionOption {
  label: string;
  description: string;
  implications: string;
}

// ─── Chat Messages ────────────────────────────────────────────────────────────

export type ChatMessageType =
  | 'speech'       // normal utterance
  | 'question'     // agent asking user
  | 'answer'       // user answer
  | 'checklist'    // backlog display
  | 'decision'     // escalated decision request
  | 'phase-header' // phase banner
  | 'system'       // orchestrator event
  | 'warning'      // soft issue
  | 'error';       // hard error

export interface ChatMessage {
  type: ChatMessageType;
  actor: ActorId;
  text: string;
  items?: ChecklistDisplayItem[];  // for 'checklist' type
  decision?: PendingDecision;      // for 'decision' type
  timestamp?: string;
}

export interface ChecklistDisplayItem {
  status: BacklogItemStatus;
  owner: ActorId;
  text: string;
  answer?: string;
}
